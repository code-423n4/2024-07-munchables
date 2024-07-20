import { configureContracts } from "../actions/configure-contracts";
import { deployContracts } from "../actions/deploy-contracts";
import { getConfig } from "../utils/config";
import { CONTRACTS, ENV, IndividualConfigType } from "../utils/config-consts";
import { StoredData, getScratchFilename, load } from "../utils/store";

const main = async () => {
  const env = process.env.ENV as ENV;

  const currentConfig: IndividualConfigType = getConfig(env);

  const scratchFile = getScratchFilename();
  const existingStoredData = await load<StoredData>(currentConfig.env, scratchFile);
  if (!existingStoredData) {
    console.error("No scratch file found for this environment", currentConfig.env);
    process.exit(1);
  }
  // Use deploy to defrost the scratch file
  console.log("Loading contracts");
  const deployedContracts = await deployContracts({
    config: currentConfig,
    contracts: CONTRACTS,
    storedData: existingStoredData,
    logging: false,
  });

  await configureContracts({ deployedContracts, config: currentConfig });
};

main();
