import { exec as execCallback } from "child_process";
import { promisify } from "util";
import { CONFIG } from "../utils/config";
import { CONTRACTS, ENV, IndividualConfigType } from "../utils/config-consts";
import { StoredData, load } from "../utils/store";
const exec = promisify(execCallback);

const main = async () => {
  const env = process.env.ENV as ENV;

  const filename = process.argv[2]; // Get the filename from command line arguments

  if (!filename) {
    console.error("Please provide a filename as an argument.");
    process.exit(1);
  }

  let currentConfig: IndividualConfigType;
  switch (env) {
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
  const loadedData = await load<StoredData>(env, filename);
  if (!loadedData) {
    console.error("There was a problem loading in the store.");
    process.exit(1);
  }

  for (const [key, value] of Object.entries(loadedData.contracts)) {
    if (value) {
      const contractTitle = (CONTRACTS as { [k: string]: { contractTitle: string } })[key]
        .contractTitle;
      const forgeCommand = `forge verify-contract \\
                --chain-id ${currentConfig.chainId} \\
                --watch \\
                --etherscan-api-key ${currentConfig.verifierApiKey} \\
                --verifier-url ${currentConfig.verifierUrl} \\
                ${value.constructorByteCode ? `--constructor-args ${value.constructorByteCode}` : ""} \\
                ${value.address} \\
                ${contractTitle}`;

      try {
        const { stdout } = await exec(forgeCommand);
        console.log(`Output: ${stdout}`);
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
      }
    }
  }
};

main();
