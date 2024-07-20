import { DeployedContractsType } from "../actions/deploy-contracts";
import { migrationEndDate } from "../actions/migration-end-date";
import { getConfig } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { getInput } from "../utils/funcs";
import { StoredData, load, toDeployedContracts } from "../utils/store";

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);

  const deployFilename = process.argv[2] as `0x${string}`;
  if (!deployFilename || deployFilename.substring(0, 11) !== "deployment-") {
    console.log(`Usage : migration-end-date.ts <deploy_cache_filename>`);
    process.exit(1);
  }

  const now = Math.floor(new Date().getTime() / 1000);
  const fiftyDays = 60 * 60 * 24 * 50;
  const startTime: string = await getInput(
    `Enter the unix timestamp for end of migration [${now + fiftyDays}] (${new Date((now + fiftyDays) * 1000)}) `
  );
  let intStartTime = parseInt(startTime);
  if (isNaN(intStartTime)) {
    intStartTime = now;
  }
  const intEndTime = intStartTime + fiftyDays;

  const storedData: StoredData | null = await load<StoredData>(env, deployFilename);
  if (!storedData) {
    console.error(`File ${deployFilename} not found for environment ${env}`);
    process.exit(1);
  }
  console.log("Loading contracts...");
  const deployedContracts: DeployedContractsType = await toDeployedContracts(config, storedData);
  console.log("Contracts loaded");

  await migrationEndDate({
    deployedContracts,
    config,
    logging: true,
    endTime: intEndTime,
  });
};

main();
