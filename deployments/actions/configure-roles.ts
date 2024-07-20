import { Address } from "viem";
import { IndividualConfigType } from "../utils/config-consts";
import { checkTxSuccess, makeLogger } from "../utils/funcs";
import { DeployedContractsType } from "./deploy-contracts";

export async function configureRoles({
  deployedContracts,
  config,
  logging = true,
  overrideAccount = null,
}: {
  deployedContracts: DeployedContractsType;
  config: IndividualConfigType;
  logging?: boolean;
  overrideAccount?: Address;
}) {
  const _log = makeLogger(logging);

  const { publicClient } = config;

  /// Configure Roles
  if (overrideAccount) {
    _log("Configuring Roles to deployer");
  } else {
    _log("Configuring Roles");
  }

  // TODO: Make this more type-safe
  for (const contractName in config.contractRoles) {
    const contract = config.contractRoles[contractName as keyof typeof config.contractRoles];
    for (const role in contract) {
      // @ts-expect-error TS7053
      let assignee = contract[role];
      if (overrideAccount) {
        assignee = overrideAccount;
      }
      // @ts-expect-error TS7053
      const currentDeployedContract = deployedContracts[contractName];
      if (currentDeployedContract) {
        _log(`Contract: ${contractName} - Role: ${role}, Assignee: ${assignee}`);
        const contractAddress = currentDeployedContract.contract.address;
        const hash = await deployedContracts.configStorage.contract.write.setRole([
          role,
          contractAddress,
          assignee,
        ]);
        await checkTxSuccess(publicClient, hash, logging);
      }
    }
  }

  _log("Configured Roles");
}
