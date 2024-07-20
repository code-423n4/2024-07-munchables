import dotenv from "dotenv";
import {
  Chain,
  createPublicClient,
  createTestClient,
  encodeFunctionData,
  http,
  parseEther,
  publicActions,
  walletActions,
} from "viem";
import { blast } from "viem/chains";
import { oldMunchNftAbi } from "../abi/generated";

import fs from "fs";
import { OLD_MUNCH_NFT_MAINNET } from "../deployments/utils/config-consts";
import { getProxyAuth, getProxyImplementation } from "../deployments/utils/deployment";

dotenv.config();

const chain: Chain = blast;
const transport = http(process.env.BLAST_NODE);

const testClient = createTestClient({
  chain,
  transport,
  mode: "anvil",
})
  .extend(publicActions)
  .extend(walletActions);

const publicClient = createPublicClient({
  chain,
  transport,
});

const oldProxyAdminAbi = [
  {
    type: "function",
    inputs: [
      {
        name: "proxy",
        internalType: "contract ITransparentUpgradeableProxy",
        type: "address",
      },
      { name: "implementation", internalType: "address", type: "address" },
    ],
    name: "upgrade",
    outputs: [],
    stateMutability: "payable",
  },
];

const mainnetDeploy = {
  address: "0x837E2f89a3c8004164328DA65220AFB7bdC7eAaD",
  hash: "0xc57677bf24954a93c8b6b30547c01d96fe3d058c247bd04a969f7a97bbd2cfdd",
  constructorByteCode: null,
  startBlock: 4092859,
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

  const nftAdmin = "0xf90593235b08c2d97d71b65462c5dbc72d7f30cb";
  const testAccount = "0x34Da93ece7091E8a21Fd08DFAFfCD16cDd1D715a";

  const proxyAddress = OLD_MUNCH_NFT_MAINNET;
  const implementationAddress = await getProxyImplementation(proxyAddress, publicClient);
  console.log(
    `Updating MunchNFT with proxy at ${proxyAddress} (implementation at ${implementationAddress})`
  );
  const proxyAuth = await getProxyAuth(proxyAddress, publicClient);
  console.log("Proxy auth", proxyAuth);

  const deployJson = mainnetDeploy;
  console.log("Deploy details", deployJson);

  // set the proxy implementation
  const upgradeProxyData = encodeFunctionData({
    abi: oldProxyAdminAbi,
    functionName: "upgrade",
    args: [proxyAddress, deployJson.address],
  });

  const upgradeProxyImplementationTx = {
    data: upgradeProxyData,
    to: proxyAuth.proxyAdmin,
    value: "0",
  };

  console.log(`Impersonating ${proxyAuth.proxyOwner}`);
  testClient.impersonateAccount({
    address: proxyAuth.proxyOwner,
  });
  await testClient.setBalance({
    address: proxyAuth.proxyOwner,
    value: parseEther("1"),
  });
  const res = await testClient.sendTransaction({
    ...upgradeProxyImplementationTx,
    account: proxyAuth.proxyOwner,
  });
  const setImplementationReceipt = await testClient.waitForTransactionReceipt({ hash: res });
  if (setImplementationReceipt.status !== "success") {
    console.error(`Failed to update proxy implementation`, setImplementationReceipt);
    process.exit(1);
  }
  const newImplementationAddress = await getProxyImplementation(proxyAddress, publicClient);
  console.log(`New implementation is ${newImplementationAddress}`);

  console.log(`Creating an msig json file`);
  const msigJson = createMsigJson(
    `Upgrade proxy implementation for MunchNFT to ${deployJson.address}`,
    proxyAuth.proxyOwner,
    [upgradeProxyImplementationTx],
    chain
  );
  fs.writeFileSync("upgradeMunchNFTMsig.json", JSON.stringify(msigJson, null, 2));
  console.log(`Msig file saved to upgradeMunchNFTMsig.json`);

  console.log(`Testing burn function`);
  await testClient.impersonateAccount({
    address: testAccount,
  });
  await testClient.setBalance({
    address: testAccount,
    value: parseEther("1"),
  });
  try {
    await testClient.simulateContract({
      abi: oldMunchNftAbi,
      functionName: "burn",
      address: proxyAddress,
      account: testAccount,
      args: [1],
    });

    console.error(`Burn succeeded when not migration manager`);
    process.exit(1);
  } catch (e) {
    if (e.message.indexOf("Only MigratonManager") > -1) {
      console.log(`Burn is restricted to migration manager`);
    } else {
      console.error("Burn failed for another reason", e.message);
      process.exit(1);
    }
  }

  console.log("Testing transfer");
  const numberOneOwner = await testClient.readContract({
    abi: oldMunchNftAbi,
    functionName: "ownerOf",
    address: proxyAddress,
    args: [1],
  });
  console.log(`Owner of token 1 is ${numberOneOwner}`);
  await testClient.impersonateAccount({
    address: numberOneOwner,
  });
  try {
    await testClient.simulateContract({
      abi: oldMunchNftAbi,
      functionName: "transferFrom",
      address: proxyAddress,
      account: numberOneOwner,
      args: [numberOneOwner, testAccount, 1],
    });

    console.error(`Transfer succeeded when should be paused`);
    process.exit(1);
  } catch (e) {
    if (e.message.indexOf("EnforcedPause()") > -1) {
      console.log(`Transfer failed with paused error`);
    } else {
      console.error("Transfer failed for another reason", e.message);
      process.exit(1);
    }
  }

  console.log("Setting Migration Manager");
  await testClient.impersonateAccount({
    address: nftAdmin,
  });
  await testClient.setBalance({
    address: nftAdmin,
    value: parseEther("1"),
  });
  const setMMTxHash = await testClient.writeContract({
    abi: oldMunchNftAbi,
    functionName: "setMigrationManager",
    address: proxyAddress,
    account: nftAdmin,
    args: [testAccount],
  });
  const setMMReceipt = await testClient.waitForTransactionReceipt({ hash: setMMTxHash });
  if (setMMReceipt.status !== "success") {
    console.error("Failed to set Migration Manager");
    process.exit(1);
  }

  console.log(`Burning as Migration Manager`);
  await testClient.impersonateAccount({
    address: testAccount,
  });

  try {
    await testClient.simulateContract({
      abi: oldMunchNftAbi,
      functionName: "burn",
      address: proxyAddress,
      account: testAccount,
      args: [1],
    });

    console.error(`Burn succeeded when not migration manager`);
    process.exit(1);
  } catch (e) {
    console.error("Burn failed when migration manager!", e.message);
    process.exit(1);
  }
};

main().then(() => {
  process.exit(0);
});
