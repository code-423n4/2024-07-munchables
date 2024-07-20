import { IndividualConfigType, Role, StorageKey } from "../utils/config-consts";
import { checkTxSuccess, makeLogger } from "../utils/funcs";
import { DeployedContractsType } from "./deploy-contracts";

export async function migrationEndDate({
  deployedContracts,
  config,
  endTime,
  logging = true,
}: {
  deployedContracts: DeployedContractsType;
  config: IndividualConfigType;
  endTime: number;
  logging?: boolean;
}) {
  const _log = makeLogger(logging);

  const { publicClient, walletClient } = config;
  const [deployer] = await walletClient.getAddresses();

  /// check who is admin now
  const admin = await deployedContracts.configStorage.contract.read.getUniversalRole([Role.Admin]);
  if (deployer !== admin) {
    console.error(
      `This script does not have admin role for this deployment (admin = ${admin}, script = ${deployer})`
    );
    process.exit(1);
  }

  _log(`Setting MigrationBonusEndTime to ${endTime}`);
  const hash = await deployedContracts.configStorage.contract.write.setUint([
    StorageKey.MigrationBonusEndTime,
    endTime,
    true,
  ]);
  await checkTxSuccess(publicClient, hash, logging);
  _log(`Migration End time configured`);
}
