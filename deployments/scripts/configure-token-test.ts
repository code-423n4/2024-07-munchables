import { zeroAddress } from "viem";
import { DeployedContractsType } from "../actions/deploy-contracts";
import { getConfig } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { StoredData, load, toDeployedContracts } from "../utils/store";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
const LOCKDROP_CONFIG_TOKENS_TEST = {
  usdb: {
    usdPrice: BigInt(1e18),
    nftCost: BigInt(3500e18),
    decimals: 18,
    active: true,
  },
  weth: {
    usdPrice: BigInt(3500e18),
    nftCost: BigInt(1e18),
    decimals: 18,
    active: true,
  },
  eth: {
    usdPrice: BigInt(3500e18),
    nftCost: BigInt(1e18),
    decimals: 18,
    active: true,
  },
};

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);

  const deployFilename = process.argv[2] as `0x${string}`;
  if (!deployFilename || deployFilename.substring(0, 11) !== "deployment-") {
    console.log(`Usage : configure-token-test.ts <deploy_cache_filename>`);
    process.exit(1);
  }

  const storedData: StoredData | null = await load<StoredData>(env, deployFilename);
  if (!storedData) {
    console.error(`File ${deployFilename} not found for environment ${env}`);
    process.exit(1);
  }
  console.log("Loading contracts...");
  const deployedContracts: DeployedContractsType = await toDeployedContracts(config, storedData);
  console.log("Contracts loaded");

  /// Lock Manager Configure Token
  console.log("Lock Manager - Configure Token");
  console.log("USDB");
  await deployedContracts.lockManager.contract.write.configureToken([
    config.externalAddresses.usdb,
    LOCKDROP_CONFIG_TOKENS_TEST.usdb,
  ]);
  await delay(5000);
  console.log("WETH");
  await deployedContracts.lockManager.contract.write.configureToken([
    config.externalAddresses.weth,
    LOCKDROP_CONFIG_TOKENS_TEST.weth,
  ]);
  await delay(5000);
  console.log("ETH");
  await deployedContracts.lockManager.contract.write.configureToken([
    zeroAddress,
    LOCKDROP_CONFIG_TOKENS_TEST.eth,
  ]);
  await delay(5000);
};

main();
