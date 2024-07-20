import * as dotenv from "dotenv";
import assert from "node:assert/strict";
import { Address, checksumAddress, createWalletClient, getContract, http } from "viem";
import { testErc20TokenAbi } from "../../abi/generated";
import { configureContracts } from "../../deployments/actions/configure-contracts";
import { configureRoles } from "../../deployments/actions/configure-roles";
import { DeployedContractsType, deployContracts } from "../../deployments/actions/deploy-contracts";
import {
  BLAST,
  BLAST_POINTS_MAINNET,
  BLAST_POINTS_TESTNET,
  BLAST_TOKEN_MAINNET,
  BLAST_TOKEN_TESTNET,
  CONTRACTS,
  ContractNames,
  IndividualConfigType,
  MSIG_MAINNET,
  MSIG_TESTNET,
  OLD_MUNCH_NFT_MAINNET,
  OLD_MUNCH_NFT_TESTNET,
  POINTS_OPERATOR,
  RNG_PROXY_MAINNET,
  RNG_PROXY_TESTNET,
  Role,
  StorageKey,
  USDB_MAINNET,
  USDB_TESTNET,
  WETH_MAINNET,
  WETH_TESTNET,
} from "../../deployments/utils/config-consts";
import { checkTxSuccess } from "../../deployments/utils/funcs";
import TestERC20Token from "../../out/TestERC20Token.sol/TestERC20Token.json";
import { assertTxSuccess } from "./asserters";
import { foundryWithTestPort, testClient, testEnv } from "./consts";

let testContracts: DeployedContractsType | undefined = undefined;

// getTestContracts should always be executed in a test suite before a snapshot is taken
// so that the contracts don't have to be deployed and configured repeatedly within
// a test suite or across test suites
export async function getTestContracts(): Promise<DeployedContractsType> {
  if (!testContracts) {
    testContracts = await getTestContractsFromProcess();
  }

  if (!testContracts) {
    testContracts = await setupTestContracts();
    saveTestContractsToProcess();
  }

  return testContracts;
}

async function setupTestContracts({
  config: configOverrides = {},
}: {
  config?: Partial<IndividualConfigType>;
} = {}): Promise<DeployedContractsType> {
  const testRoleAddresses = await getTestRoleAddresses();

  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: testRoleAddresses.deployer,
  });

  let config: IndividualConfigType = {
    chainId: 168587773,
    verifierUrl: "https://api-sepolia.blastscan.io/api",
    verifierApiKey: "",
    externalAddresses: {
      pointsOperator: POINTS_OPERATOR,
      rngProxy: RNG_PROXY_TESTNET,
      rngOracle: testRoleAddresses.deployer,
      usdb: USDB_TESTNET,
      weth: WETH_TESTNET,
      blastToken: BLAST_TOKEN_TESTNET,
      blast: BLAST,
      blastPoints: BLAST_POINTS_TESTNET,
      oldMunchNFT: OLD_MUNCH_NFT_TESTNET,
      treasury: MSIG_TESTNET,
    },
    universalRoles: {
      [Role.Admin]: testRoleAddresses[Role.Admin],
    },
    contractRoles: {
      [ContractNames.AccountManagerProxy]: {
        [Role.SocialApproval_1]: testRoleAddresses[Role.SocialApproval_1],
        [Role.SocialApproval_2]: testRoleAddresses[Role.SocialApproval_2],
        [Role.SocialApproval_3]: testRoleAddresses[Role.SocialApproval_3],
        [Role.Social_1]: testRoleAddresses[Role.Social_1],
        [Role.Social_2]: testRoleAddresses[Role.Social_2],
        [Role.Social_3]: testRoleAddresses[Role.Social_3],
      },
      [ContractNames.ClaimManagerProxy]: {
        [Role.NewPeriod]: testRoleAddresses[Role.NewPeriod],
      },
      [ContractNames.LockManager]: {
        [Role.PriceFeed_1]: testRoleAddresses[Role.PriceFeed_1],
        [Role.PriceFeed_2]: testRoleAddresses[Role.PriceFeed_2],
        [Role.PriceFeed_3]: testRoleAddresses[Role.PriceFeed_3],
      },
      [ContractNames.RewardsManager]: {
        [Role.ClaimYield]: testRoleAddresses[Role.ClaimYield],
      },
      [ContractNames.RNGProxySelfHosted]: {
        [Role.NFTOracle]: testRoleAddresses[Role.NFTOracle],
      },
      [ContractNames.PrimordialManager]: {
        [Role.NFTOracle]: testRoleAddresses[Role.NFTOracle],
      },
    },
    selfHostProxy: true,
    deployOldNFT: false,
    publicClient: testClient,
    walletClient,
  };

  if (testEnv.ENV === "mainnet") {
    config = {
      chainId: 81457,
      verifierUrl: "https://api.blastscan.io/api",
      verifierApiKey: "",
      externalAddresses: {
        pointsOperator: POINTS_OPERATOR,
        rngProxy: RNG_PROXY_MAINNET,
        rngOracle: testRoleAddresses.deployer,
        usdb: USDB_MAINNET,
        weth: WETH_MAINNET,
        blastToken: BLAST_TOKEN_MAINNET,
        blast: BLAST,
        blastPoints: BLAST_POINTS_MAINNET,
        oldMunchNFT: OLD_MUNCH_NFT_MAINNET,
        treasury: MSIG_MAINNET,
      },
      universalRoles: {
        [Role.Admin]: testRoleAddresses[Role.Admin],
      },
      contractRoles: {
        [ContractNames.AccountManagerProxy]: {
          [Role.SocialApproval_1]: testRoleAddresses[Role.SocialApproval_1],
          [Role.SocialApproval_2]: testRoleAddresses[Role.SocialApproval_2],
          [Role.SocialApproval_3]: testRoleAddresses[Role.SocialApproval_3],
          [Role.Social_1]: testRoleAddresses[Role.Social_1],
          [Role.Social_2]: testRoleAddresses[Role.Social_2],
          [Role.Social_3]: testRoleAddresses[Role.Social_3],
        },
        [ContractNames.ClaimManagerProxy]: {
          [Role.NewPeriod]: testRoleAddresses[Role.NewPeriod],
        },
        [ContractNames.LockManager]: {
          [Role.PriceFeed_1]: testRoleAddresses[Role.PriceFeed_1],
          [Role.PriceFeed_2]: testRoleAddresses[Role.PriceFeed_2],
          [Role.PriceFeed_3]: testRoleAddresses[Role.PriceFeed_3],
        },
        [ContractNames.RewardsManager]: {
          [Role.ClaimYield]: testRoleAddresses[Role.ClaimYield],
        },
      },
      selfHostProxy: false,
      deployOldNFT: false,
      publicClient: testClient,
      walletClient,
    };
  }

  config = {
    ...config,
    ...configOverrides,
    env: testEnv.ENV,
  };

  const logging = testEnv.LOGGING === "true";

  console.log("Deploying test contracts...");

  const deployedContracts = await deployContracts({
    config,
    contracts: CONTRACTS,
    logging,
  });

  console.log("Configuring test contracts...");

  await configureContracts({
    config,
    deployedContracts,
    logging,
  });

  /// Configure roles to those in the config, configure leaves them in an unconfigured state
  console.log("Configuring test roles...");
  await configureRoles({
    deployedContracts,
    config,
    logging,
  });

  const { publicClient } = config;
  console.log("Pausing contracts...");
  const hash = await deployedContracts.configStorage.contract.write.setBool([
    StorageKey.Paused,
    false,
    true,
  ]);
  await checkTxSuccess(publicClient, hash, logging);
  return deployedContracts;
}

export async function getTestRoleAddresses() {
  const testClientAddresses = await testClient.getAddresses();
  // Assert room for at least 4 normal user addresses + 3 role addresses
  assert(testClientAddresses.length >= 7);
  // If changing the role addresses  extracted here, adjust the assertion
  // above and the slice below accordingly
  const [adminAddress, multiRole2Address, multiRole3Address] = testClientAddresses;
  return {
    deployer: adminAddress,
    users: testClientAddresses.slice(3),
    [Role.Admin]: adminAddress,
    [Role.SocialApproval_1]: adminAddress,
    [Role.SocialApproval_2]: multiRole2Address,
    [Role.SocialApproval_3]: multiRole3Address,
    [Role.Social_1]: adminAddress,
    [Role.Social_2]: multiRole2Address,
    [Role.Social_3]: multiRole3Address,
    [Role.NewPeriod]: adminAddress,
    [Role.PriceFeed_1]: adminAddress,
    [Role.PriceFeed_2]: multiRole2Address,
    [Role.PriceFeed_3]: multiRole3Address,
    [Role.ClaimYield]: adminAddress,
    [Role.NFTOracle]: adminAddress,
  };
}

export async function deployTestERC20Contract({ account }: { account: Address }) {
  const erc20ContractTxHash = await testClient.deployContract({
    abi: testErc20TokenAbi,
    account,
    bytecode: TestERC20Token.bytecode.object as `0x${string}`,
  });
  const erc20TxReceipt = await assertTxSuccess({
    txHash: erc20ContractTxHash,
  });
  assert.ok(erc20TxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account,
  });
  return getContract({
    address: checksumAddress(erc20TxReceipt.contractAddress),
    abi: testErc20TokenAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });
}

export type TestERC20ContractType = Awaited<ReturnType<typeof deployTestERC20Contract>>;

// Save test contracts to process.env so that when the Node Test Runner
// spawns a new process for each test file that test suite won't have to
// deploy and configure the contracts, making the tests faster
function saveTestContractsToProcess() {
  const testContractsSerializable: { [key: string]: any } = {};
  for (const key in testContracts) {
    const testContract = (testContracts as { [k: string]: any })[key];
    testContractsSerializable[key] = testContract
      ? {
          ...testContract,
          // Save the address instead of the whole contract and we rebuild the
          // contract later
          address: testContract.contract.address,
          // Convert startBlock to string for JSON.stringify
          startBlock: testContract.startBlock.toString(),
          // Remove contract and we rebuild it later from the address and key
          contract: undefined,
        }
      : testContract;
  }

  // Persist contracts to process.env using dotenv
  dotenv.populate(
    process.env as dotenv.DotenvPopulateInput,
    {
      TEST_CONTRACTS_SERIALIZED: JSON.stringify(testContractsSerializable),
    },
    { override: true }
  );
}

// Parse the test contracts from process.env (if available). This is
// a little hacky, but it makes the tests significantly faster
async function getTestContractsFromProcess(): Promise<DeployedContractsType | undefined> {
  if (!process.env.TEST_CONTRACTS_SERIALIZED) {
    return;
  }

  const testContractsDeserialized = JSON.parse(process.env.TEST_CONTRACTS_SERIALIZED);

  const { deployer } = await getTestRoleAddresses();

  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });

  const testContractsReconstructed: { [key: string]: any } = {};

  for (const key in testContractsDeserialized) {
    testContractsReconstructed[key] = testContractsDeserialized[key]
      ? {
          ...testContractsDeserialized[key],
          // Remove address since we added that
          address: undefined,
          // Convert startBlock back to bigint since we had to make it a
          // string for JSON.stringify
          startBlock: BigInt(testContractsDeserialized[key].startBlock),
          // Build the contract again since we couldn't serialize it
          contract: getContract({
            address: testContractsDeserialized[key].address as Address,
            // Use root abi instead of proxy abi
            abi: (CONTRACTS as { [k: string]: any })[key.replace(/^(.*)Proxy$/, "$1Root")].abi,
            client: {
              wallet: walletClient,
              public: testClient,
            },
          }),
        }
      : testContractsDeserialized[key];
  }

  return testContractsReconstructed as DeployedContractsType;
}
