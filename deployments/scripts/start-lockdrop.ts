import { DeployedContractsType } from "../actions/deploy-contracts";
import { startLockdrop } from "../actions/start-lockdrop";
import { getConfig } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { getInput } from "../utils/funcs";
import { StoredData, load, toDeployedContracts } from "../utils/store";

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);

  const deployFilename = process.argv[2] as `0x${string}`;
  if (!deployFilename || deployFilename.substring(0, 11) !== "deployment-") {
    console.log(`Usage : start-lockdrop.ts <deploy_cache_filename>`);
    process.exit(1);
  }

  const now = Math.floor(new Date().getTime() / 1000);
  const startTime: string = await getInput(
    `Enter the unix timestamp for the start of the lockdrop [${now}]`
  );
  let intStartTime = parseInt(startTime);
  if (isNaN(intStartTime)) {
    intStartTime = now;
  }
  console.log(`Setting start time to ${intStartTime}`);
  const endTime: string = await getInput(`Enter the unix timestamp for the end of the lockdrop: `);
  let intEndTime = parseInt(endTime);
  if (isNaN(intEndTime)) {
    intEndTime = now + 60 * 60 * 24 * 30;
  }
  console.log(`Setting end time to ${intEndTime}`);

  const storedData: StoredData | null = await load<StoredData>(env, deployFilename);
  if (!storedData) {
    console.error(`File ${deployFilename} not found for environment ${env}`);
    process.exit(1);
  }
  console.log("Loading contracts...");
  const deployedContracts: DeployedContractsType = await toDeployedContracts(config, storedData);
  console.log("Contracts loaded");

  await startLockdrop({
    deployedContracts,
    config,
    logging: true,
    startTime: intStartTime,
    endTime: intEndTime,
  });
};

main();
