import { Address, zeroAddress } from "viem";
import {
  DEFAULT_VARIABLES,
  IndividualConfigType,
  LOCKDROP_CONFIG_TOKENS,
  Role,
  StorageKey,
} from "../utils/config-consts";
import { checkTxSuccess, makeLogger } from "../utils/funcs";
import { configureRoles } from "./configure-roles";
import { DeployedContractsType } from "./deploy-contracts";

export async function configureContracts({
  deployedContracts,
  config,
  logging = true,
}: {
  deployedContracts: DeployedContractsType;
  config: IndividualConfigType;
  logging?: boolean;
}) {
  const _log = makeLogger(logging);

  const { publicClient } = config;
  let hash: Address;
  let oldMunchNFTAddress = config.externalAddresses.oldMunchNFT;
  // Set config storage blast, USDB, and WETH addresses so we can continue deployment
  _log("Setting gas and yield collector addresses");
  const addresses = [
    deployedContracts.lockManager.contract.address,
    deployedContracts.accountManagerProxy.contract.address,
    deployedContracts.claimManagerProxy.contract.address,
    deployedContracts.munchNFT.contract.address,
    deployedContracts.nftOverlord.contract.address,
    deployedContracts.nftAttributesManagerV1.contract.address,
    deployedContracts.rewardsManager.contract.address,
    deployedContracts.snuggeryManagerProxy.contract.address,
    deployedContracts.munchadexManager.contract.address,
    deployedContracts.migrationManager.contract.address,
    deployedContracts.bonusManager.contract.address,
    deployedContracts.primordialManager.contract.address,
    deployedContracts.landManagerProxy.contract.address,
  ];

  _log("Setting Config Storage notifiable addresses");
  if (config.deployOldNFT) {
    if (!deployedContracts.oldMunchNFTProxy) {
      throw new Error("Did not deploy Old Munch NFT proxy");
    }

    oldMunchNFTAddress = deployedContracts.oldMunchNFTProxy.contract.address;
  }
  // Conditionally add rngProxySelfHosted address if it exists
  if (deployedContracts.rngProxySelfHosted) {
    addresses.unshift(deployedContracts.rngProxySelfHosted.contract.address);
  }
  if (deployedContracts.rngProxyApi3) {
    addresses.unshift(deployedContracts.rngProxyApi3.contract.address);
  }
  // always add fundTreasuryDistributor, it is not included in yield/gas collectors
  addresses.unshift(deployedContracts.fundTreasuryDistributor.contract.address);

  // add notifiable addresses, ones which extend BaseConfig
  const configStorageNotifiableHash =
    await deployedContracts.configStorage.contract.write.addNotifiableAddresses([addresses]);
  await checkTxSuccess(publicClient, configStorageNotifiableHash, logging);
  _log("Setting Config Storage root addresses");
  const configStorageWriteHash = await deployedContracts.configStorage.contract.write.setAddresses([
    [
      StorageKey.BlastContract,
      StorageKey.BlastPointsContract,
      StorageKey.USDBContract,
      StorageKey.WETHContract,
      StorageKey.BlastPointsOperator,
      StorageKey.LockManager,
      StorageKey.AccountManager,
      StorageKey.ClaimManager,
      StorageKey.MunchNFT,
      StorageKey.RNGProxyContract,
      StorageKey.NFTOverlord,
      StorageKey.NFTAttributesManager,
      StorageKey.RewardsManager,
      StorageKey.Treasury,
      StorageKey.OldMunchNFT,
      StorageKey.YieldDistributor,
      StorageKey.GasFeeDistributor,
      StorageKey.BonusManager,
      StorageKey.SnuggeryManager,
      StorageKey.MunchadexManager,
      StorageKey.MigrationManager,
      StorageKey.PrimordialManager,
      StorageKey.PrimordialsEnabled,
    ],
    [
      config.externalAddresses.blast,
      config.externalAddresses.blastPoints,
      config.externalAddresses.usdb,
      config.externalAddresses.weth,
      config.externalAddresses.pointsOperator,
      deployedContracts.lockManager.contract.address,
      deployedContracts.accountManagerProxy.contract.address,
      deployedContracts.claimManagerProxy.contract.address,
      deployedContracts.munchNFT.contract.address,
      deployedContracts.rngProxySelfHosted
        ? deployedContracts.rngProxySelfHosted.contract.address
        : deployedContracts.rngProxyApi3.contract.address,
      deployedContracts.nftOverlord.contract.address,
      deployedContracts.nftAttributesManagerV1.contract.address,
      deployedContracts.rewardsManager.contract.address,
      config.externalAddresses.treasury,
      oldMunchNFTAddress,
      deployedContracts.fundTreasuryDistributor.contract.address,
      deployedContracts.fundTreasuryDistributor.contract.address,
      deployedContracts.bonusManager.contract.address,
      deployedContracts.snuggeryManagerProxy.contract.address,
      deployedContracts.munchadexManager.contract.address,
      deployedContracts.migrationManager.contract.address,
      deployedContracts.primordialManager.contract.address,
      deployedContracts.landManagerProxy.contract.address,
    ],
    false,
  ]);
  await checkTxSuccess(publicClient, configStorageWriteHash, logging);

  _log("Setting Config Store Variables");
  for (const [key, defaultVariable] of Object.entries(DEFAULT_VARIABLES)) {
    _log(`Setting ${key} to: ${defaultVariable.value}`);
    // @ts-expect-error TS7053
    const configSetTx = await deployedContracts.configStorage.contract.write[defaultVariable.func]([
      key,
      defaultVariable.value,
      false,
    ]);
    await checkTxSuccess(publicClient, configSetTx, logging);
  }

  const numIterations = Math.ceil(addresses.length / 5);
  for (let i = 0; i < numIterations; i++) {
    _log(`Manually notify addresses ${i + 1}/${numIterations} [${i * 5}, ${i * 5 + 5}]`);
    const configStorageNotify = await deployedContracts.configStorage.contract.write.manualNotify([
      i * 5,
      5,
    ]);
    await checkTxSuccess(publicClient, configStorageNotify, logging);
  }

  /// ADMIN UPDATE
  _log("Temporary Universal Admin Role");
  hash = await deployedContracts.configStorage.contract.write.setUniversalRole([
    Role.Admin,
    config.walletClient.account.address,
  ]);
  await checkTxSuccess(publicClient, hash, logging);

  /// Lock Manager Configure Token
  _log("Lock Manager - Configure Token");
  _log("USDB");
  hash = await deployedContracts.lockManager.contract.write.configureToken([
    config.externalAddresses.usdb,
    LOCKDROP_CONFIG_TOKENS.usdb,
  ]);
  await checkTxSuccess(publicClient, hash, logging);
  _log("WETH");
  hash = await deployedContracts.lockManager.contract.write.configureToken([
    config.externalAddresses.weth,
    LOCKDROP_CONFIG_TOKENS.weth,
  ]);
  await checkTxSuccess(publicClient, hash, logging);
  _log("ETH");
  hash = await deployedContracts.lockManager.contract.write.configureToken([
    zeroAddress,
    LOCKDROP_CONFIG_TOKENS.eth,
  ]);
  await checkTxSuccess(publicClient, hash, logging);

  /// Configure Roles
  _log("Configuring Roles to deployer");
  await configureRoles({
    deployedContracts,
    config,
    logging,
  });

  _log("Pausing contracts");
  hash = await deployedContracts.configStorage.contract.write.setBool([
    StorageKey.Paused,
    true,
    true,
  ]);
  await checkTxSuccess(publicClient, hash, logging);

  _log("Finished configuring!");
}
