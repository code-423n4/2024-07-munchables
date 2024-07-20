import dotenv from "dotenv";
import {
  Address,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { blast, blastSepolia } from "viem/chains";
import {
  accountManagerAbi,
  claimManagerAbi,
  landManagerAbi,
  proxyAdminAbi,
  snuggeryManagerAbi,
} from "../abi/generated";

import fs from "fs";
import {
  getCurrentDeploymentFilename,
  getDeployment,
  getProxyAuth,
  getProxyImplementation,
} from "../deployments/utils/deployment";
import { checkTxSuccess } from "../deployments/utils/funcs";
import AccountManager from "../out/AccountManager.sol/AccountManager.json";
import ClaimManager from "../out/ClaimManager.sol/ClaimManager.json";
import LandManager from "../out/LandManager.sol/LandManager.json";
import SnuggeryManager from "../out/SnuggeryManager.sol/SnuggeryManager.json";

dotenv.config();

const pKey = privateKeyToAccount(process.env.PRIVATE_KEY_ADMIN as Address);
const env = process.env.ENV as string;

console.log(`Deploying to ${env}`);
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

const showUsage = () => {
  console.log(`Usage : upgrade-proxy-contract.ts <contractName>`);
  console.log(`contractName: Name of the contract in the deployment file (eg. migrationManager)`);
  process.exit(1);
};

const deployImplementationContract = async (contractName: string) => {
  let abi, bytecode;
  switch (contractName) {
    case "snuggeryManager":
      abi = snuggeryManagerAbi;
      bytecode = SnuggeryManager.bytecode.object;
      break;
    case "accountManager":
      abi = accountManagerAbi;
      bytecode = AccountManager.bytecode.object;
      break;
    case "claimManager":
      abi = claimManagerAbi;
      bytecode = ClaimManager.bytecode.object;
      break;
    case "landManager":
      abi = landManagerAbi;
      bytecode = LandManager.bytecode.object;
      break;
    default:
      console.error(`Unknown contract name ${contractName}`);
      process.exit(1);
  }

  const deployedHash = await walletClient.deployContract({
    abi,
    bytecode,
  });

  const txReceipt = await checkTxSuccess(publicClient, deployedHash, false);
  const deployedBlockNumber = Number(txReceipt.blockNumber);
  const deployedAddress = txReceipt.contractAddress;

  return {
    abi,
    deployJson: {
      address: getAddress(deployedAddress as string),
      hash: deployedHash,
      constructorByteCode: null,
      startBlock: deployedBlockNumber,
    },
  };
};

const createMsigJson = (name: string, safeAddress: `0x${string}`, transactions: any[], chain) => {
  const json = {
    version: "1.0",
    chainId: `${chain.id}`,
    createdAt: Math.floor(Date.now() / 1000),
    meta: {
      name: name,
      description: "",
      txBuilderVersion: "1.16.5",
      createdFromSafeAddress: safeAddress,
      createdFromOwnerAddress: "",
    },
    transactions,
  };
  return json;
};

const main = async (contractName: string) => {
  const existingDeploy = await getDeployment(env);
  const proxyAddress = existingDeploy.contracts[`${contractName}Proxy`]?.address;
  if (!proxyAddress) {
    console.error(`Could not find proxy for ${contractName}`);
    process.exit(1);
  }
  const implementationAddress = await getProxyImplementation(proxyAddress, publicClient);
  console.log(
    `Updating ${contractName} with proxy at ${proxyAddress} (implementation at ${implementationAddress})`
  );
  const proxyAuth = await getProxyAuth(proxyAddress, publicClient);
  console.log("Proxy auth", proxyAuth);
  const { deployJson } = await deployImplementationContract(contractName);
  console.log("Deploy details", deployJson);

  // set the proxy implementation
  const upgradeProxyData = encodeFunctionData({
    abi: proxyAdminAbi,
    functionName: "upgradeAndCall",
    args: [proxyAddress, deployJson.address, "0x"],
  });

  const upgradeProxyImplementationTx = {
    data: upgradeProxyData,
    to: proxyAuth.proxyAdmin,
    value: "0",
  };
  console.log(upgradeProxyImplementationTx);

  if (pKey.address === proxyAuth.proxyOwner) {
    console.log("Submitting transactions to chain");
    const { request } = await publicClient.simulateContract({
      address: proxyAuth.proxyAdmin,
      account: pKey,
      abi: proxyAdminAbi,
      functionName: "upgradeAndCall",
      args: [proxyAddress, deployJson.address, "0x"],
    });
    const resHash = await walletClient.writeContract(request);
    const txReceipt = await checkTxSuccess(publicClient, resHash, true);

    // const hash = await walletClient.sendTransaction(upgradeProxyImplementationTx);
    // const txReceipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(txReceipt);

    const implementationAddressNew = await getProxyImplementation(proxyAddress, publicClient);
    console.log(`Contract updated, new implementation at ${implementationAddressNew}`);
  } else {
    console.log(`Do not have the owner key, creating an msig json file`);
    const msigJson = createMsigJson(
      `Upgrade proxy implementation for ${contractName} to ${deployJson.address}`,
      proxyAuth.proxyOwner,
      [upgradeProxyImplementationTx],
      chain
    );
    fs.writeFileSync("upgradeMsig.json", JSON.stringify(msigJson, null, 2));
    console.log(`Msig file saved to upgradeMsig.json`);
  }

  existingDeploy.contracts[contractName] = deployJson;
  console.log(`Saving deployment`);
  const deploymentFilename = await getCurrentDeploymentFilename();
  fs.writeFileSync(deploymentFilename, JSON.stringify(existingDeploy, null, 2));
};

if (process.argv.length < 3) {
  showUsage();
}
main(process.argv[2]).then(() => {
  process.exit(0);
});
