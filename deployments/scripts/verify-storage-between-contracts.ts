import { DeployedContractsType } from "../actions/deploy-contracts";
import { verifyStorageSlotDataBetweenContracts } from "../actions/verify-snapshot-data";
import { getConfig } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { StoredData, load, toDeployedContracts } from "../utils/store";

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);

  const deployFilename = process.argv[2] as `0x${string}`;
  if (!deployFilename || deployFilename.substring(0, 11) !== "deployment-") {
    console.log(`Usage : verify-snapshot-between-contracts.ts <deploy_cache_filename>`);
    process.exit(1);
  }
  const storedData: StoredData | null = await load<StoredData>(env, deployFilename);
  const deployedContracts: DeployedContractsType = await toDeployedContracts(config, storedData!);

  await verifyStorageSlotDataBetweenContracts({
    deployedContracts,
    config,
  });
};

main();
