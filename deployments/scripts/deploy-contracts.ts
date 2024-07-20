import { deployContracts } from "../actions/deploy-contracts";
import { getConfig } from "../utils/config";
import { CONTRACTS, ENV, IndividualConfigType } from "../utils/config-consts";
import { getInput } from "../utils/funcs";
import { StoredData, getScratchFilename, load, remove } from "../utils/store";

const main = async () => {
  const env = process.env.ENV as ENV;

  const currentConfig: IndividualConfigType = getConfig(env);

  const scratchFile = getScratchFilename();
  let existingStoredData = await load<StoredData>(currentConfig.env, scratchFile);
  if (existingStoredData) {
    const resume: string = await getInput(`Found existing deploy, resume? [y/N] `);
    if (resume.toLowerCase() !== "y") {
      console.log("Starting new deploy");
      remove(currentConfig.env, scratchFile);
      existingStoredData = null;
    }
  }
  // STAGE 1: Deploy contracts
  await deployContracts({
    config: currentConfig,
    contracts: CONTRACTS,
    storedData: existingStoredData,
  });
};

main();
