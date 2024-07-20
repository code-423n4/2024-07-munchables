import { IndividualConfigType, Role } from "../utils/config-consts";
import { checkTxSuccess, makeLogger } from "../utils/funcs";
import { DeployedContractsType } from "./deploy-contracts";

export async function resignContracts({
  deployedContracts,
  config,
  logging = true,
}: {
  deployedContracts: DeployedContractsType;
  config: IndividualConfigType;
  logging?: boolean;
}) {
  const _log = makeLogger(logging);

  const { publicClient, walletClient } = config;
  const [deployer] = await walletClient.getAddresses();

  /// check who is admin now
  const admin = await deployedContracts.configStorage.contract.read.getUniversalRole([Role.Admin]);
  // const PKEY = privateKeyToAccount(process.env.PRIVATE_KEY as Address);
  if (admin === deployer) {
    /// ADMIN UPDATE
    _log("Configuring Universal Admin Role");
    let hash = await deployedContracts.configStorage.contract.write.setUniversalRole([
      Role.Admin,
      config.universalRoles[Role.Admin],
    ]);
    await checkTxSuccess(publicClient, hash, logging);

    /// Final Config Storage change
    _log("Final Config Storage transfer owner to admin");
    hash = await deployedContracts.configStorage.contract.write.transferOwnership([
      config.universalRoles[Role.Admin],
    ]);
    await checkTxSuccess(publicClient, hash, logging);

    _log("Contracts resigned to ", config.universalRoles[Role.Admin]);
  } else {
    _log("Contracts already resigned to ", admin);
  }
}
