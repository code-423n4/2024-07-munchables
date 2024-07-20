import { createAnvil } from "@viem/anvil";
import * as dotenv from "dotenv";
import path from "node:path";
import { createTestClient, http, publicActions, walletActions } from "viem";
import { foundry } from "viem/chains";

export const testEnv: { [key: string]: string } = {};

dotenv.config({
  path: path.resolve(process.cwd(), ".env.test.local"),
  processEnv: testEnv,
});

const testEnvDefaults: { [key: string]: string } = {
  LOGGING: "false",
  ENV: "testnet",
  ANVIL_FORK_URL: "https://sepolia.blast.io",
  ANVIL_FORK_BLOCK_NUMBER: "4314953",
};

for (const key in testEnvDefaults) {
  if (!testEnv[key]) {
    testEnv[key] = testEnvDefaults[key];
  }
}

const testEnvChainId = testEnv.ENV === "mainnet" ? 81457 : 168587773;
const anvilTestPort = 8546;

export const foundryWithTestPort = {
  ...foundry,
  id: testEnvChainId,
  rpcUrls: {
    default: {
      http: [`http://127.0.0.1:${anvilTestPort}`],
      webSocket: [`ws://127.0.0.1:${anvilTestPort}`],
    },
  },
};

export const anvilDefault = createAnvil({
  blockBaseFeePerGas: 1,
  gasPrice: 1,

  port: anvilTestPort,
  stopTimeout: 10_000,
  timeout: 90_000,

  forkBlockNumber: parseInt(testEnv.ANVIL_FORK_BLOCK_NUMBER),
  forkUrl: testEnv.ANVIL_FORK_URL,
  forkChainId: testEnvChainId,
});

export const testClient = createTestClient({
  chain: foundryWithTestPort,
  mode: "anvil",
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions);

export const ONE_DAY = 86400n;
export const ONE_WEEK = 7n * ONE_DAY;
export const STARTING_TIMESTAMP = 1871957769n;

export const BASE_TOKEN_DATA = {
  usdPrice: 100n * BigInt(1e18),
  nftCost: BigInt(1e17),
  active: true,
  decimals: 18,
};
