import dotenv from "dotenv";
import fs from "fs";
import {
  Address,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { blast, blastSepolia } from "viem/chains";
import { configStorageAbi, landManagerAbi, proxyFactoryAbi } from "../abi/generated";
import { StorageKey } from "../deployments/utils/config-consts";
import { getCurrentDeploymentFilename, getDeployment } from "../deployments/utils/deployment";
import { checkTxSuccess, sleep } from "../deployments/utils/funcs";

import LandManager from "../out/LandManager.sol/LandManager.json";
import ProxyFactory from "../out/ProxyFactory.sol/ProxyFactory.json";

dotenv.config();

if (!process.env.PRIVATE_KEY_ADMIN) {
  console.error(`Please add PRIVATE_KEY_ADMIN to .env with your private key`);
  process.exit(1);
}
const pKey = privateKeyToAccount(process.env.PRIVATE_KEY_ADMIN as Address);

const env = process.env.ENV as string;
if (env.indexOf("clone") !== -1) {
  console.error("Cannot run against a clone");
  process.exit(1);
}
let chain, transport;
if (env === "mainnet") {
  chain = blast;
  transport = http(process.env.BLAST_MAINNET);
} else {
  chain = blastSepolia;
  transport = http(process.env.BLAST_TESTNET);
}
const walletClient = createWalletClient({
  chain,
  transport,
  account: pKey,
});
const publicClient = createPublicClient({
  chain,
  transport,
});

const deployContract = async (configOwner: Address, contractName: string, deployment: any) => {
  let abi, bytecode: Address, storageKey, storageKey2, ARGS: readonly [`0x${string}`];
  switch (contractName) {
    case "landManager":
      abi = landManagerAbi;
      bytecode = LandManager.bytecode.object as Address;
      storageKey = StorageKey.PrimordialsEnabled;
      ARGS = [deployment.contracts.configStorage.address];
      break;
    default:
      console.error(`Unknown contract name ${contractName}`);
      process.exit(1);
  }

  const deployedHashRoot = await walletClient.deployContract({
    abi,
    bytecode,
  });
  const deployedRoot = await checkTxSuccess(publicClient, deployedHashRoot, true);
  const initialize = encodeFunctionData({
    abi: landManagerAbi,
    functionName: "initialize",
    args: ARGS,
  });
  const proxyArgs: readonly [`0x${string}`, `0x${string}`, `0x${string}`] = [
    deployedRoot.contractAddress!,
    configOwner,
    initialize,
  ];

  const deployedProxy = await walletClient.deployContract({
    abi: proxyFactoryAbi,
    bytecode: ProxyFactory.bytecode.object as Address,
    args: proxyArgs,
  });

  const txReceipt = await checkTxSuccess(publicClient, deployedProxy, true);
  const deployedBlockNumber = Number(txReceipt.blockNumber);
  const deployedAddress = txReceipt.contractAddress;

  const deployJsonRoot = {
    address: getAddress(deployedRoot.contractAddress! as string),
    hash: deployedHashRoot,
    constructorByteCode: null,
    startBlock: deployedBlockNumber,
  };

  const deployJsonProxy = {
    address: getAddress(deployedAddress as string),
    hash: deployedProxy,
    constructorByteCode: encodeAbiParameters(
      [
        { name: "implementation", type: "address" },
        { name: "admin", type: "address" },
        { name: "data", type: "bytes" },
      ],
      proxyArgs
    ),
    startBlock: deployedBlockNumber,
  };
  console.log(deployJsonRoot);
  console.log(deployJsonProxy);

  return { storageKey, storageKey2, deployJsonRoot, deployJsonProxy };
};

const showUsage = () => {
  console.log(`Usage : swap-upgradeable-contract.ts <contractName> [updateNotify]`);
  console.log(`contractName: Name of the contract in the deployment file (eg. migrationManager)`);
  console.log(
    `updateNotify: true|false Add new contract to notifiable contracts and remove old one (default: true)`
  );
  process.exit(1);
};

const main = async (contractName: string, updateNotify: boolean) => {
  console.log(`Replacing ${contractName}`);
  const deployment = await getDeployment(env);
  const contractNameProxy = `${contractName}Proxy`;
  const contractNameRoot = `${contractName}Root`;
  const existingProxy =
    deployment.contracts[contractNameProxy] != null
      ? deployment.contracts[contractNameProxy].address
      : null;
  const existingRoot =
    deployment.contracts[contractNameRoot] != null
      ? deployment.contracts[contractNameRoot].address
      : null;
  console.log(`Existing deploys at ${existingProxy} ${existingRoot}`);
  // give time to cancel
  await sleep(3000);

  const configStorageAddress = deployment.contracts.configStorage.address;
  const configOwner = await publicClient.readContract({
    address: configStorageAddress,
    functionName: "owner",
    abi: configStorageAbi,
    args: [],
  });

  // deploy contract
  const deployRes = await deployContract(configOwner, contractName, deployment);

  let prepareMsig = false;

  console.log(`Owner of configStorage is ${configOwner}`);
  if (pKey.address !== configOwner) {
    console.log(`Script does not have the private key for ${configOwner}`);
    prepareMsig = true;
    // process.exit(0);
  }

  // update notifiable addresses
  let removeNotifiableData, addNotifiableData;
  if (updateNotify) {
    if (existingProxy) {
      removeNotifiableData = encodeFunctionData({
        abi: configStorageAbi,
        functionName: "removeNotifiableAddress",
        args: [existingProxy],
      });
    }
    addNotifiableData = encodeFunctionData({
      abi: configStorageAbi,
      functionName: "addNotifiableAddress",
      args: [deployRes.deployJsonProxy.address],
    });
  }

  // set new config
  const swapData = encodeFunctionData({
    abi: configStorageAbi,
    functionName: "setAddress",
    args: [deployRes.storageKey, deployRes.deployJsonProxy.address, true],
  });

  let swapData2;
  if (deployRes.storageKey2) {
    swapData2 = encodeFunctionData({
      abi: configStorageAbi,
      functionName: "setAddress",
      args: [deployRes.storageKey2, deployRes.deployJsonProxy.address, true],
    });
  }

  const transactions = [
    {
      data: removeNotifiableData,
      to: configStorageAddress,
      value: "0",
    },
    {
      data: addNotifiableData,
      to: configStorageAddress,
      value: "0",
    },
    {
      data: swapData,
      to: configStorageAddress,
      value: "0",
    },
  ];
  if (swapData2) {
    transactions.push({
      data: swapData2,
      to: configStorageAddress,
      value: "0",
    });
  }

  if (prepareMsig) {
    const msigJson = {
      version: "1.0",
      chainId: `${chain.id}`,
      createdAt: Math.floor(Date.now() / 1000),
      meta: {
        name: `Swap ${contractName} contract to a new contract deployed at ${deployRes.deployJsonProxy.address}`,
        description: "",
        txBuilderVersion: "1.16.5",
        createdFromSafeAddress: configOwner,
        createdFromOwnerAddress: "",
      },
      transactions,
    };

    const msigJsonFilename = "swapMsig.json";
    fs.writeFileSync(msigJsonFilename, JSON.stringify(msigJson, null, 2));
    console.log(`Saved msig json to ${msigJsonFilename}`);
  } else {
    console.log("Submitting transactions to chain");

    for (let i = 0; i < transactions.length; i++) {
      const hash = await walletClient.sendTransaction({
        ...transactions[i],
        value: 0n,
        gas: 10000000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await sleep(3000);
    }
  }
  const prevDeployRoot = deployment.contracts[contractNameRoot];
  deployment.contracts[contractNameRoot] = deployRes.deployJsonRoot;
  if (
    deployment.contracts[contractNameRoot] == null ||
    !deployment.contracts[contractNameRoot].previousDeploys
  ) {
    deployment.contracts[contractNameRoot].previousDeploys = [];
  }
  deployment.contracts[contractNameRoot].previousDeploys.push(prevDeployRoot);

  const prevDeployProxy = deployment.contracts[contractNameProxy];
  deployment.contracts[contractNameProxy] = deployRes.deployJsonProxy;
  if (
    deployment.contracts[contractNameProxy] == null ||
    !deployment.contracts[contractNameProxy].previousDeploys
  ) {
    deployment.contracts[contractNameProxy].previousDeploys = [];
  }
  deployment.contracts[contractNameProxy].previousDeploys.push(prevDeployProxy);
  console.log(`Saving deployment`);
  const deploymentFilename = await getCurrentDeploymentFilename(env);
  fs.writeFileSync(deploymentFilename, JSON.stringify(deployment, null, 2));
};

///////////////////////////////////////////

if (process.argv.length < 3) {
  showUsage();
}
const contractName = process.argv[2];
const updateNotify =
  process.argv.length === 3 || process.argv[3] === "true" || process.argv[3] === "1";

main(contractName, updateNotify);
