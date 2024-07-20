import dotenv from "dotenv";
import { Address, createPublicClient, createWalletClient, http, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { blast, blastSepolia } from "viem/chains";
import {
  AIRNODE_CONTRACT_MAINNET,
  AIRNODE_CONTRACT_TESTNET,
  AIRNODE_ENDPOINT_ID_MAINNET,
  AIRNODE_ENDPOINT_ID_TESTNET,
  AIRNODE_RPV0_MAINNET,
  AIRNODE_RPV0_TESTNET,
  AIRNODE_SPONSOR_MAINNET,
  AIRNODE_SPONSOR_TESTNET,
  AIRNODE_SPONSOR_WALLET_MAINNET,
  AIRNODE_SPONSOR_WALLET_TESTNET,
  BLAST,
  BLAST_POINTS_MAINNET,
  BLAST_POINTS_TESTNET,
  BLAST_TOKEN_MAINNET,
  BLAST_TOKEN_TESTNET,
  ConfigType,
  ContractNames,
  ENV,
  IndividualConfigType,
  IndividualConfigTypeWithoutClients,
  MSIG_MAINNET,
  MSIG_TESTNET,
  OLD_MUNCH_NFT_MAINNET,
  OLD_MUNCH_NFT_TESTNET,
  POINTS_OPERATOR,
  Role,
  USDB_MAINNET,
  USDB_TESTNET,
  WETH_MAINNET,
  WETH_TESTNET,
} from "./config-consts";

dotenv.config();

const PKEY = privateKeyToAccount(process.env.PRIVATE_KEY as Address);

/// ALL PUBLIC CLIENTS
const blastTestnetPublicClient = createPublicClient({
  chain: blastSepolia,
  transport: http(process.env.BLAST_TESTNET),
  batch: {
    multicall: true,
  },
});
const cloneTestnetPublicClient = createPublicClient({
  chain: blastSepolia,
  transport: http(process.env.BLAST_NODE),
  batch: {
    multicall: true,
  },
});

const blastMainnetPublicClient = createPublicClient({
  chain: blast,
  transport: http(process.env.BLAST_MAINNET),
  batch: {
    multicall: true,
  },
});
const cloneMainnetPublicClient = createPublicClient({
  chain: blast,
  transport: http(process.env.BLAST_NODE),
  batch: {
    multicall: true,
  },
});

/// ALL WALLET CLIENTS
const sepoliaWalletClient = createWalletClient({
  chain: blastSepolia,
  transport: http(process.env.BLAST_TESTNET),
  account: PKEY,
});
const cloneTestnetWalletClient = createWalletClient({
  chain: blastSepolia,
  transport: http(process.env.BLAST_NODE),
  account: PKEY,
});

const mainnetWalletClient = createWalletClient({
  chain: blast,
  transport: http(process.env.BLAST_MAINNET),
  account: PKEY,
});

const cloneMainnetWalletClient = createWalletClient({
  chain: blast,
  transport: http(process.env.BLAST_NODE),
  account: PKEY,
});

/// EXTERNAL CONFIG

const configTestnet: IndividualConfigTypeWithoutClients = {
  chainId: 168587773,
  verifierUrl: "https://api-sepolia.blastscan.io/api",
  verifierApiKey: process.env.VERIFIER_API_KEY,
  externalAddresses: {
    pointsOperator: POINTS_OPERATOR,
    usdb: USDB_TESTNET,
    weth: WETH_TESTNET,
    blastToken: BLAST_TOKEN_TESTNET,
    blast: BLAST,
    blastPoints: BLAST_POINTS_TESTNET,
    oldMunchNFT: OLD_MUNCH_NFT_TESTNET,
    treasury: MSIG_TESTNET,
    airnodeRpv: AIRNODE_RPV0_TESTNET,
    airnodeContract: AIRNODE_CONTRACT_TESTNET,
    airnodeSponsor: AIRNODE_SPONSOR_TESTNET,
    airnodeSponsorWallet: AIRNODE_SPONSOR_WALLET_TESTNET,
    airnodeEndpointId: AIRNODE_ENDPOINT_ID_TESTNET,
  },
  universalRoles: {
    [Role.Admin]: MSIG_TESTNET,
  },
  contractRoles: {
    [ContractNames.AccountManagerProxy]: {
      [Role.SocialApproval_1]: PKEY.address,
      [Role.Social_1]: PKEY.address,
      [Role.SocialApproval_2]: zeroAddress,
      [Role.Social_2]: zeroAddress,
      [Role.SocialApproval_3]: zeroAddress,
      [Role.Social_3]: zeroAddress,
      [Role.SocialApproval_4]: zeroAddress,
      [Role.Social_4]: zeroAddress,
      [Role.SocialApproval_5]: zeroAddress,
      [Role.Social_5]: zeroAddress,
    },
    [ContractNames.ClaimManagerProxy]: {
      [Role.NewPeriod]: PKEY.address,
    },
    [ContractNames.LockManager]: {
      [Role.PriceFeed_1]: PKEY.address,
      [Role.PriceFeed_2]: zeroAddress, // TODO : We need another address here to approve
      [Role.PriceFeed_3]: zeroAddress,
      [Role.PriceFeed_4]: zeroAddress,
      [Role.PriceFeed_5]: zeroAddress,
    },
    [ContractNames.RewardsManager]: {
      [Role.ClaimYield]: PKEY.address,
    },
    [ContractNames.MunchNFT]: {
      [Role.NFTOracle]: PKEY.address,
    },
    [ContractNames.RNGProxySelfHosted]: {
      [Role.NFTOracle]: PKEY.address,
    },
    [ContractNames.RNGProxyApi3]: {
      [Role.NFTOracle]: AIRNODE_RPV0_TESTNET,
    },
    [ContractNames.NFTOverlord]: {
      [Role.Minter]: PKEY.address,
    },
  },
  deployOldNFT: true,
  selfHostProxy: false,
  storeOutput: true,
};

const configMainnet: IndividualConfigTypeWithoutClients = {
  chainId: 81457,
  verifierUrl: "https://api.blastscan.io/api",
  verifierApiKey: process.env.VERIFIER_API_KEY,
  externalAddresses: {
    pointsOperator: POINTS_OPERATOR,
    usdb: USDB_MAINNET,
    weth: WETH_MAINNET,
    blastToken: BLAST_TOKEN_MAINNET,
    blast: BLAST,
    blastPoints: BLAST_POINTS_MAINNET,
    oldMunchNFT: OLD_MUNCH_NFT_MAINNET,
    treasury: MSIG_MAINNET,
    airnodeRpv: AIRNODE_RPV0_MAINNET,
    airnodeContract: AIRNODE_CONTRACT_MAINNET,
    airnodeSponsor: AIRNODE_SPONSOR_MAINNET,
    airnodeSponsorWallet: AIRNODE_SPONSOR_WALLET_MAINNET,
    airnodeEndpointId: AIRNODE_ENDPOINT_ID_MAINNET,
  },
  universalRoles: {
    [Role.Admin]: MSIG_MAINNET,
  },
  // TODO: Set these to real mainnet roles
  contractRoles: {
    [ContractNames.AccountManagerProxy]: {
      [Role.SocialApproval_1]: "0x7B7cE4a705DAD8F1363a604C5Ca728e35f281e61",
      [Role.SocialApproval_2]: "0x4d608e07E56F1758955a8bf428d8a0c7F0A230D7",
      [Role.SocialApproval_3]: "0x39C4B563f4D6B4C8bBc1B5fcE269c081Fb8f3DDa",
      [Role.SocialApproval_4]: zeroAddress,
      [Role.SocialApproval_5]: zeroAddress,
      [Role.Social_1]: "0xCc5159170cd237Ef63d15148316f761fa9e8fe6F",
      [Role.Social_2]: "0x694ADFEBA681bEC95952B63B50f2bCc13c7567F2",
      [Role.Social_3]: "0x5867960182C26B6D49E492F2D9aEf325bE15A324",
      [Role.Social_4]: "0x52237014802F77C1B117C2F61011B371cad56AEa",
      [Role.Social_5]: zeroAddress,
    },
    [ContractNames.ClaimManagerProxy]: {
      [Role.NewPeriod]: "0x1ec5127D2D0893Eb4bDe47C4808f80AD5839FA03",
    },
    [ContractNames.LockManager]: {
      [Role.PriceFeed_1]: "0xbB05c531B695cDbc1835d6BC7942C7Cb9CdE4feE",
      [Role.PriceFeed_2]: "0x71AD7Db5D0529224c39b77Ab1EB298F54Dc2d19f",
      [Role.PriceFeed_3]: "0xe72D88bb84206b4757f963e5c0de8849d21F313d",
      [Role.PriceFeed_4]: zeroAddress,
      [Role.PriceFeed_5]: zeroAddress,
    },
    [ContractNames.RewardsManager]: {
      [Role.ClaimYield]: "0x670464C401aE38e9B1fA4aD299B30618Aa9B3138",
    },
    [ContractNames.MunchNFT]: {
      [Role.NFTOracle]: "0x87Bd5bEaF72fbA3B380592441D6ad1cFdA70E83E",
    },
    [ContractNames.RNGProxySelfHosted]: {
      [Role.NFTOracle]: "0x87Bd5bEaF72fbA3B380592441D6ad1cFdA70E83E",
    },
    [ContractNames.RNGProxyApi3]: {
      [Role.NFTOracle]: AIRNODE_RPV0_MAINNET,
    },
    [ContractNames.NFTOverlord]: {
      [Role.Minter]: "0x47AFD4F00fCC66d9CB99B1970d3E6d0a3E4A8791",
    },
  },
  deployOldNFT: false,
  selfHostProxy: true,
  storeOutput: true,
};

export const CONFIG: ConfigType = {
  [ENV.TESTNET]: {
    publicClient: blastTestnetPublicClient,
    walletClient: sepoliaWalletClient,
    ...configTestnet,
  },
  [ENV.CLONE_TESTNET]: {
    publicClient: cloneTestnetPublicClient,
    walletClient: cloneTestnetWalletClient,
    ...configTestnet,
  },
  [ENV.MAINNET]: {
    publicClient: blastMainnetPublicClient,
    walletClient: mainnetWalletClient,
    ...configMainnet,
  },
  [ENV.CLONE_MAINNET]: {
    publicClient: cloneMainnetPublicClient,
    walletClient: cloneMainnetWalletClient,
    ...configMainnet,
  },
};

export function getConfig(env: string) {
  const selfHostProxy = process.env.SELF_HOST_RNG === "true";
  const storeOutputClones = process.env.STORE_OUTPUT_CLONES === "true";
  let currentConfig: IndividualConfigType;
  switch (env) {
    case ENV.CLONE_TESTNET:
      currentConfig = CONFIG[ENV.CLONE_TESTNET] as IndividualConfigType;
      currentConfig.storeOutput = storeOutputClones;
      break;
    case ENV.CLONE_MAINNET:
      currentConfig = CONFIG[ENV.CLONE_MAINNET] as IndividualConfigType;
      currentConfig.storeOutput = storeOutputClones;
      break;
    case ENV.MAINNET:
      currentConfig = CONFIG[ENV.MAINNET] as IndividualConfigType;
      break;
    case ENV.TESTNET:
      currentConfig = CONFIG[ENV.TESTNET] as IndividualConfigType;
      break;
    default:
      console.error(
        "Please assign ENV to one of: clone-testnet, clone-mainnet, mainnet, or testnet"
      );
      process.exit(1);
  }

  currentConfig.selfHostProxy = selfHostProxy;
  currentConfig.env = env;

  return currentConfig;
}
