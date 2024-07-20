import { deployRNGRequester } from "../actions/deploy-rngrequester";
import { CONFIG } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";

const main = async () => {
  const env = process.env.ENV as ENV;

  let currentConfig: IndividualConfigType;
  switch (env) {
    case ENV.MAINNET:
      currentConfig = CONFIG[ENV.MAINNET];
      break;
    case ENV.TESTNET:
      currentConfig = CONFIG[ENV.TESTNET] as IndividualConfigType;
      break;
    default:
      console.error("Please assign ENV to one of: mainnet, or testnet - will not run on clones");
      process.exit(1);
  }

  const configStorageAddress = process.argv[2];
  if (configStorageAddress.substring(0, 2) !== "0x" || configStorageAddress.length !== 42) {
    console.log(`Usage : deploy-rngrequester.ts <configStorage address>`);
    process.exit(1);
  }
  await deployRNGRequester({ config: currentConfig, logging: true, configStorageAddress });
};

main();
