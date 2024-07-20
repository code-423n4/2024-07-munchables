import dotenv from "dotenv";
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { blast } from "viem/chains";
import { oldMunchNftAbi, proxyAdminAbi } from "../abi/generated";

import fs from "fs";
import { OLD_MUNCH_NFT_MAINNET } from "../deployments/utils/config-consts";
import { getProxyAuth, getProxyImplementation } from "../deployments/utils/deployment";
import { checkTxSuccess } from "../deployments/utils/funcs";
import OldMunchNFT from "../out/OldMunchNFT.sol/OldMunchNFT.json";

dotenv.config();

const pKey = privateKeyToAccount(process.env.PRIVATE_KEY_ADMIN as Address);

const chain: Chain = blast;
const transport = http(process.env.BLAST_MAINNET);

const walletClient = createWalletClient({
  chain,
  transport,
  account: pKey,
});
const publicClient = createPublicClient({
  chain,
  transport,
});

const deployImplementationContract = async () => {
  const abi = oldMunchNftAbi;
  const bytecode = OldMunchNFT.bytecode.object as `0x${string}`;

  const deployedHash = await walletClient.deployContract({
    abi,
    bytecode,
  });

  const txReceipt = await checkTxSuccess(publicClient, deployedHash, false);
  const deployedBlockNumber = Number(txReceipt.blockNumber);
  const deployedAddress = txReceipt.contractAddress;

  return {
    address: getAddress(deployedAddress as string),
    hash: deployedHash,
    constructorByteCode: null,
    startBlock: deployedBlockNumber,
  };
};

const createMsigJson = (
  name: string,
  safeAddress: `0x${string}`,
  transactions: any[],
  chain: Chain
) => {
  return {
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
};

const main = async () => {
  console.log(`Updating MunchNFT at ${OLD_MUNCH_NFT_MAINNET}`);

  const proxyAddress = OLD_MUNCH_NFT_MAINNET;
  const implementationAddress = await getProxyImplementation(proxyAddress, publicClient);
  console.log(
    `Updating MunchNFT with proxy at ${proxyAddress} (implementation at ${implementationAddress})`
  );
  const proxyAuth = await getProxyAuth(proxyAddress, publicClient);
  console.log("Proxy auth", proxyAuth);

  const deployJson = await deployImplementationContract();
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

  console.log(`Creating an msig json file`);
  const msigJson = createMsigJson(
    `Upgrade proxy implementation for MunchNFT to ${deployJson.address}`,
    proxyAuth.proxyOwner,
    [upgradeProxyImplementationTx],
    chain
  );
  fs.writeFileSync("upgradeMunchNFTMsig.json", JSON.stringify(msigJson, null, 2));
  console.log(`Msig file saved to upgradeMunchNFTMsig.json`);
};

main().then(() => {
  process.exit(0);
});
