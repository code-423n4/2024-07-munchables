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
import {
  bonusManagerAbi,
  configStorageAbi,
  fundTreasuryDistributorAbi,
  lockManagerAbi,
  migrationManagerAbi,
  munchNftAbi,
  munchadexManagerAbi,
  nftAttributesManagerV1Abi,
  nftOverlordAbi,
  primordialManagerAbi,
  rewardsManagerAbi,
  rngProxySelfHostedAbi,
} from "../abi/generated";
import { StorageKey } from "../deployments/utils/config-consts";
import { getCurrentDeploymentFilename, getDeployment } from "../deployments/utils/deployment";
import { checkTxSuccess, sleep } from "../deployments/utils/funcs";

import BonusManager from "../out/BonusManager.sol/BonusManager.json";
import FundTreasuryDistributor from "../out/FundTreasuryDistributor.sol/FundTreasuryDistributor.json";
import LockManager from "../out/LockManager.sol/LockManager.json";
import MigrationManager from "../out/MigrationManager.sol/MigrationManager.json";
import MunchNFT from "../out/MunchNFT.sol/MunchNFT.json";
import MunchadexManager from "../out/MunchadexManager.sol/MunchadexManager.json";
import NFTAttributesManagerV1 from "../out/NFTAttributeManagerV1.sol/NFTAttributesManagerV1.json";
import NFTOverlord from "../out/NFTOverlord.sol/NFTOverlord.json";
import PrimordialManager from "../out/PrimordialManager.sol/PrimordialManager.json";
import RNGProxySelfHosted from "../out/RNGProxySelfHosted.sol/RNGProxySelfHosted.json";
import RewardsManager from "../out/RewardsManager.sol/RewardsManager.json";

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

const deployContract = async (contractName: string, deployment: any) => {
  let abi, bytecode: Address, storageKey, storageKey2;
  switch (contractName) {
    case "lockManager":
      abi = lockManagerAbi;
      bytecode = LockManager.bytecode.object as Address;
      storageKey = StorageKey.LockManager;
      break;
    case "migrationManager":
      abi = migrationManagerAbi;
      bytecode = MigrationManager.bytecode.object as Address;
      storageKey = StorageKey.MigrationManager;
      break;
    case "munchadexManager":
      abi = munchadexManagerAbi;
      bytecode = MunchadexManager.bytecode.object as Address;
      storageKey = StorageKey.MunchadexManager;
      break;
    case "nftOverlord":
      abi = nftOverlordAbi;
      bytecode = NFTOverlord.bytecode.object as Address;
      storageKey = StorageKey.NFTOverlord;
      break;
    case "nftAttributesManagerV1":
      abi = nftAttributesManagerV1Abi;
      bytecode = NFTAttributesManagerV1.bytecode.object as Address;
      storageKey = StorageKey.NFTAttributesManager;
      break;
    case "rewardsManager":
      abi = rewardsManagerAbi;
      bytecode = RewardsManager.bytecode.object as Address;
      storageKey = StorageKey.RewardsManager;
      break;
    case "munchNFT":
      abi = munchNftAbi;
      bytecode = MunchNFT.bytecode.object as Address;
      storageKey = StorageKey.MunchNFT;
      break;
    case "fundTreasuryDistributor":
      abi = fundTreasuryDistributorAbi;
      bytecode = FundTreasuryDistributor.bytecode.object as Address;
      storageKey = StorageKey.GasFeeDistributor;
      storageKey2 = StorageKey.YieldDistributor;
      break;
    case "bonusManager":
      abi = bonusManagerAbi;
      bytecode = BonusManager.bytecode.object as Address;
      storageKey = StorageKey.BonusManager;
      break;
    case "primordialManager":
      abi = primordialManagerAbi;
      bytecode = PrimordialManager.bytecode.object as Address;
      storageKey = StorageKey.PrimordialManager;
      break;
    case "rngProxySelfHosted":
      abi = rngProxySelfHostedAbi;
      bytecode = RNGProxySelfHosted.bytecode.object as Address;
      storageKey = StorageKey.RNGProxyContract;
      break;
    default:
      console.error(`Unknown contract name ${contractName}`);
      process.exit(1);
  }

  const ARGS: readonly [`0x${string}`] = [deployment.contracts.configStorage.address];
  const argsEncoded = encodeAbiParameters([{ name: "_configStore", type: "address" }], ARGS);

  const deployedHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: ARGS,
  });
  const txReceipt = await checkTxSuccess(publicClient, deployedHash, true);
  const deployedBlockNumber = Number(txReceipt.blockNumber);
  const deployedAddress = txReceipt.contractAddress;

  const deployJson = {
    address: getAddress(deployedAddress as string),
    hash: deployedHash,
    constructorByteCode: argsEncoded,
    startBlock: deployedBlockNumber,
  };
  console.log(deployJson);

  return { storageKey, storageKey2, deployJson };
};

const showUsage = () => {
  console.log(`Usage : swap-contract.ts <contractName> [updateNotify]`);
  console.log(`contractName: Name of the contract in the deployment file (eg. migrationManager)`);
  console.log(
    `updateNotify: true|false Add new contract to notifiable contracts and remove old one (default: true)`
  );
  process.exit(1);
};

const main = async (contractName: string, updateNotify: boolean) => {
  console.log(`Replacing ${contractName}`);
  const deployment = await getDeployment(env);
  const existing = deployment.contracts[contractName].address;
  console.log(`Existing deploy at ${existing}`);
  // give time to cancel
  await sleep(3000);

  // deploy contract
  const deployRes = await deployContract(contractName, deployment);
  const configStorageAddress = deployment.contracts.configStorage.address;

  const configOwner = await publicClient.readContract({
    address: configStorageAddress,
    functionName: "owner",
    abi: configStorageAbi,
    args: [],
  });

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
    removeNotifiableData = encodeFunctionData({
      abi: configStorageAbi,
      functionName: "removeNotifiableAddress",
      args: [existing],
    });
    addNotifiableData = encodeFunctionData({
      abi: configStorageAbi,
      functionName: "addNotifiableAddress",
      args: [deployRes.deployJson.address],
    });
  }

  // set new config
  const swapData = encodeFunctionData({
    abi: configStorageAbi,
    functionName: "setAddress",
    args: [deployRes.storageKey, deployRes.deployJson.address, true],
  });

  let swapData2;
  if (deployRes.storageKey2) {
    swapData2 = encodeFunctionData({
      abi: configStorageAbi,
      functionName: "setAddress",
      args: [deployRes.storageKey2, deployRes.deployJson.address, true],
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
        name: `Swap ${contractName} contract to a new contract deployed at ${deployRes.deployJson.address}`,
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
    }
  }

  const prevDeploy = deployment.contracts[contractName];
  deployment.contracts[contractName] = deployRes.deployJson;
  if (!deployment.contracts[contractName].previousDeploys) {
    deployment.contracts[contractName].previousDeploys = [];
  }
  deployment.contracts[contractName].previousDeploys.push(prevDeploy);
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
