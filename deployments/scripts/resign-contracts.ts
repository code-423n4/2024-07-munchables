import { configureRoles } from "../actions/configure-roles";
import { DeployedContractsType } from "../actions/deploy-contracts";
import { resignContracts } from "../actions/resign-contracts";
import { getConfig } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { StoredData, load, toDeployedContracts } from "../utils/store";

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);

  const deployFilename = process.argv[2] as `0x${string}`;
  if (!deployFilename || deployFilename.substring(0, 11) !== "deployment-") {
    console.log(`Usage : resign-contracts.ts <deploy_cache_filename>`);
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

  console.log("Resigning roles");
  await configureRoles({ deployedContracts, config, logging: true });

  console.log("Resigning contract admin");
  await resignContracts({ deployedContracts, config, logging: true });
};

main();
