import { Address, encodeAbiParameters, encodeFunctionData, getContract } from "viem";
import {
  ContractNames,
  Contracts,
  IndividualConfigType,
  Role,
  TOKEN_ATTRIBUTES,
} from "../utils/config-consts";
import { checkTxSuccess, makeLogger } from "../utils/funcs";
import { StoredData, getScratchFilename, saveDeployedContracts } from "../utils/store";
import { deployOldNFT } from "./deploy-oldnft";

// Will deploy the contract unless stored data is provided, in that case it will get the contract only
// using the existing address, this is needed so that we can revive StoredData
export async function getDeployedContract({
  config,
  logging,
  abi,
  readAbi,
  bytecode,
  args,
  deployedAddress,
  deployedHash,
  deployedBlockNumber,
}: {
  config: IndividualConfigType;
  logging?: boolean;
  abi: any;
  readAbi?: any;
  bytecode: `0x${string}`;
  args?: `0x${string}`[] | null;
  deployedAddress?: Address | null;
  deployedHash?: `0x${string}` | null;
  deployedBlockNumber?: number | null;
}) {
  const { walletClient, publicClient } = config;
  if (!readAbi) readAbi = abi;

  if (!deployedAddress) {
    deployedHash = await walletClient.deployContract({
      abi,
      bytecode,
      args,
    });
    const txReceipt = await checkTxSuccess(publicClient, deployedHash, logging);
    deployedBlockNumber = Number(txReceipt.blockNumber);
    deployedAddress = txReceipt.contractAddress;
  }

  return [
    getContract({
      address: deployedAddress,
      abi: readAbi,
      client: {
        wallet: walletClient,
        public: publicClient,
      },
    }),
    deployedHash,
    deployedBlockNumber,
  ];
}

const proxyArgsGeneral = (argsInput: readonly [`0x${string}`, `0x${string}`, `0x${string}`]) =>
  encodeAbiParameters(
    [
      { name: "implementation", type: "address" },
      { name: "admin", type: "address" },
      { name: "data", type: "bytes" },
    ],
    argsInput
  );

const emptyContracts = {
  [ContractNames.ConfigStorage]: null,
  [ContractNames.AccountManagerRoot]: null,
  [ContractNames.AccountManagerProxy]: null,
  [ContractNames.ClaimManagerRoot]: null,
  [ContractNames.ClaimManagerProxy]: null,
  [ContractNames.LockManager]: null,
  [ContractNames.MigrationManager]: null,
  [ContractNames.SnuggeryManagerRoot]: null,
  [ContractNames.SnuggeryManagerProxy]: null,
  [ContractNames.MunchadexManager]: null,
  [ContractNames.NFTOverlord]: null,
  [ContractNames.NFTAttributesManagerV1]: null,
  [ContractNames.RewardsManager]: null,
  [ContractNames.MunchNFT]: null,
  [ContractNames.FundTreasuryDistributor]: null,
  [ContractNames.RNGProxySelfHosted]: null,
  [ContractNames.RNGProxyApi3]: null,
  [ContractNames.BonusManager]: null,
  [ContractNames.PrimordialManager]: null,
  [ContractNames.OldMunchNFT]: null,
  [ContractNames.OldMunchNFTProxy]: null,
  [ContractNames.LandManagerRoot]: null,
  [ContractNames.LandManagerProxy]: null,
};

// @TODO: Figure out what is going on with contract write typing issues
export async function deployContracts({
  config,
  contracts,
  logging = true,
  storedData = null,
}: {
  config: IndividualConfigType;
  contracts: Contracts;
  logging?: boolean;
  storedData?: StoredData | null;
}) {
  const _log = makeLogger(logging);
  const scratchFile = getScratchFilename();

  const deployedContracts = emptyContracts;

  const {
    configStorage,
    accountManagerRoot,
    accountManagerProxy,
    claimManagerRoot,
    claimManagerProxy,
    lockManager,
    migrationManager,
    snuggeryManagerRoot,
    snuggeryManagerProxy,
    munchadexManager,
    nftOverlord,
    nftAttributesManagerV1,
    rewardsManager,
    munchNFT,
    fundTreasuryDistributor,
    rngProxySelfHosted,
    rngProxyApi3,
    bonusManager,
    primordialManager,
    landManagerProxy,
    landManagerRoot,
  } = contracts;

  /// Deploy Config Storage
  _log("Deploying Config Storage");
  const [configStorageContract, configStorageHash, configStorageBlockNumber] =
    await getDeployedContract({
      config,
      abi: configStorage.abi,
      bytecode: configStorage.bytecode,
      deployedAddress: storedData?.contracts.configStorage?.address,
      deployedHash: storedData?.contracts.configStorage?.hash,
      deployedBlockNumber: storedData?.contracts.configStorage?.startBlock,
    });
  deployedContracts[ContractNames.ConfigStorage] = {
    contract: configStorageContract,
    hash: configStorageHash,
    constructorByteCode: null,
    startBlock: configStorageBlockNumber,
  };
  if (!storedData?.contracts.configStorage?.address) {
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  }
  _log("Config Storage Address:", configStorageContract?.address);

  // Consistent arguments for all future contracts
  const ARGS: readonly [`0x${string}`] = [configStorageContract?.address];
  const argsEncoded = encodeAbiParameters([{ name: "_configStore", type: "address" }], ARGS);
  /// Deploy Managers
  // Deploy Rewards Manager (governor)
  _log("Deploying Rewards Manager");
  const [rewardsManagerContract, rewardsManagerHash, rewardsManagerBlockNumber] =
    await getDeployedContract({
      config,
      abi: rewardsManager.abi,
      bytecode: rewardsManager.bytecode,
      deployedAddress: storedData?.contracts.rewardsManager?.address,
      deployedHash: storedData?.contracts.rewardsManager?.hash,
      deployedBlockNumber: storedData?.contracts.rewardsManager?.startBlock,
      args: ARGS,
    });
  deployedContracts[ContractNames.RewardsManager] = {
    contract: rewardsManagerContract,
    hash: rewardsManagerHash,
    constructorByteCode: argsEncoded,
    startBlock: rewardsManagerBlockNumber,
  };
  if (!storedData?.contracts.rewardsManager?.address) {
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  }
  _log("Rewards Manager Address:", rewardsManagerContract?.address);

  // Deploy Account Manager
  _log("Deploying Account Manager");
  const [accountManagerRootContract, accountsManagerRootHash, accountsManagerRootBlockNumber] =
    await getDeployedContract({
      config,
      abi: accountManagerRoot.abi,
      bytecode: accountManagerRoot.bytecode,
      deployedAddress: storedData?.contracts.accountManagerRoot?.address,
      deployedHash: storedData?.contracts.accountManagerRoot?.hash,
      deployedBlockNumber: storedData?.contracts.accountManagerRoot?.startBlock,
    });
  deployedContracts[ContractNames.AccountManagerRoot] = {
    contract: accountManagerRootContract,
    hash: accountsManagerRootHash,
    constructorByteCode: null,
    startBlock: accountsManagerRootBlockNumber,
  };
  if (!storedData?.contracts.accountManagerRoot?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Account Manager Root Address:", accountManagerRootContract.address);
  const accountManagerInitialize = encodeFunctionData({
    abi: accountManagerRoot.abi,
    functionName: "initialize",
    args: ARGS,
  });
  _log("Deploy & Initialize Account Manager Proxy");
  const accountManagerProxyArgs: readonly [`0x${string}`, `0x${string}`, `0x${string}`] = [
    accountManagerRootContract.address,
    config.universalRoles[Role.Admin],
    accountManagerInitialize,
  ];
  const [accountManagerProxyContract, accountManagerProxyHash, accountManagerProxyBlockNumber] =
    await getDeployedContract({
      config,
      abi: accountManagerProxy.abi,
      readAbi: accountManagerRoot.abi,
      bytecode: accountManagerProxy.bytecode,
      args: accountManagerProxyArgs,
      deployedAddress: storedData?.contracts.accountManagerProxy?.address,
      deployedHash: storedData?.contracts.accountManagerProxy?.hash,
      deployedBlockNumber: storedData?.contracts.accountManagerProxy?.startBlock,
    });
  deployedContracts[ContractNames.AccountManagerProxy] = {
    contract: accountManagerProxyContract,
    hash: accountManagerProxyHash,
    constructorByteCode: proxyArgsGeneral(accountManagerProxyArgs),
    startBlock: accountManagerProxyBlockNumber,
  };
  if (!storedData?.contracts.accountManagerProxy?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Account Manager Proxy Address:", accountManagerProxyContract.address);

  // Deploy Bonus Manager
  _log("Deploying Bonus Manager");
  const [bonusManagerContract, bonusManagerHash, bonusManagerBlockNumber] =
    await getDeployedContract({
      config,
      abi: bonusManager.abi,
      bytecode: bonusManager.bytecode,
      deployedAddress: storedData?.contracts.bonusManager?.address,
      deployedHash: storedData?.contracts.bonusManager?.hash,
      deployedBlockNumber: storedData?.contracts.bonusManager?.startBlock,
      args: ARGS,
    });
  deployedContracts[ContractNames.BonusManager] = {
    contract: bonusManagerContract,
    hash: bonusManagerHash,
    constructorByteCode: argsEncoded,
    startBlock: bonusManagerBlockNumber,
  };
  if (!storedData?.contracts.bonusManager?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Bonus Manager Address:", bonusManagerContract?.address);

  // Deploy Claim Manager
  _log("Deploying Claim Manager");
  const [claimManagerRootContract, claimManagerRootHash, claimManagerRootBlockNumber] =
    await getDeployedContract({
      config,
      abi: claimManagerRoot.abi,
      bytecode: claimManagerRoot.bytecode,
      deployedAddress: storedData?.contracts.claimManagerRoot?.address,
      deployedHash: storedData?.contracts.claimManagerRoot?.hash,
      deployedBlockNumber: storedData?.contracts.claimManagerRoot?.startBlock,
    });
  deployedContracts[ContractNames.ClaimManagerRoot] = {
    contract: claimManagerRootContract,
    hash: claimManagerRootHash,
    constructorByteCode: null,
    startBlock: claimManagerRootBlockNumber,
  };
  if (!storedData?.contracts.claimManagerRoot?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Claim Manager Root Address:", claimManagerRootContract?.address);
  const claimManagerInitialize = encodeFunctionData({
    abi: claimManagerRoot.abi,
    functionName: "initialize",
    args: ARGS,
  });
  const claimManagerProxyArgs: readonly [`0x${string}`, `0x${string}`, `0x${string}`] = [
    claimManagerRootContract?.address,
    config.universalRoles[Role.Admin],
    claimManagerInitialize,
  ];

  const [claimManagerProxyContract, claimManagerProxyHash, claimManagerProxyBlockNumber] =
    await getDeployedContract({
      config,
      abi: claimManagerProxy.abi,
      readAbi: claimManagerRoot.abi,
      bytecode: claimManagerProxy.bytecode,
      args: claimManagerProxyArgs,
      deployedAddress: storedData?.contracts.claimManagerProxy?.address,
      deployedHash: storedData?.contracts.claimManagerProxy?.hash,
      deployedBlockNumber: storedData?.contracts.claimManagerProxy?.startBlock,
    });
  deployedContracts[ContractNames.ClaimManagerProxy] = {
    contract: claimManagerProxyContract,
    hash: claimManagerProxyHash,
    constructorByteCode: proxyArgsGeneral(claimManagerProxyArgs),
    startBlock: claimManagerProxyBlockNumber,
  };
  if (!storedData?.contracts.claimManagerProxy?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Claim Manager Proxy Address:", claimManagerProxyContract?.address);

  // Deploy Lock Manager
  _log("Deploying Lock Manager");
  const [lockManagerContract, lockManagerHash, lockManagerBlockNumber] = await getDeployedContract({
    config,
    abi: lockManager.abi,
    bytecode: lockManager.bytecode,
    deployedAddress: storedData?.contracts.lockManager?.address,
    deployedHash: storedData?.contracts.lockManager?.hash,
    deployedBlockNumber: storedData?.contracts.lockManager?.startBlock,
    args: ARGS,
  });
  deployedContracts[ContractNames.LockManager] = {
    contract: lockManagerContract,
    hash: lockManagerHash,
    constructorByteCode: argsEncoded,
    startBlock: lockManagerBlockNumber,
  };
  if (!storedData?.contracts.lockManager?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Lock Manager Address:", lockManagerContract?.address);

  // Deploy Snuggery Manager
  _log("Deploying Snuggery Manager");
  const [snuggeryManagerRootContract, snuggeryManagerRootHash, snuggeryManagerRootBlockNumber] =
    await getDeployedContract({
      config,
      abi: snuggeryManagerRoot.abi,
      bytecode: snuggeryManagerRoot.bytecode,
      deployedAddress: storedData?.contracts.snuggeryManagerRoot?.address,
      deployedHash: storedData?.contracts.snuggeryManagerRoot?.hash,
      deployedBlockNumber: storedData?.contracts.snuggeryManagerRoot?.startBlock,
    });
  deployedContracts[ContractNames.SnuggeryManagerRoot] = {
    contract: snuggeryManagerRootContract,
    hash: snuggeryManagerRootHash,
    constructorByteCode: null,
    startBlock: snuggeryManagerRootBlockNumber,
  };
  if (!storedData?.contracts.snuggeryManagerRoot?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Snuggery Manager Root Address:", snuggeryManagerRootContract?.address);
  const snuggeryManagerInitialize = encodeFunctionData({
    abi: snuggeryManagerRoot.abi,
    functionName: "initialize",
    args: ARGS,
  });
  const snuggeryManagerProxyArgs: readonly [`0x${string}`, `0x${string}`, `0x${string}`] = [
    snuggeryManagerRootContract?.address,
    config.universalRoles[Role.Admin],
    snuggeryManagerInitialize,
  ];

  const [snuggeryManagerProxyContract, snuggeryManagerProxyHash, snuggeryManagerProxyBlockNumber] =
    await getDeployedContract({
      config,
      abi: snuggeryManagerProxy.abi,
      readAbi: snuggeryManagerRoot.abi,
      bytecode: snuggeryManagerProxy.bytecode,
      args: snuggeryManagerProxyArgs,
      deployedAddress: storedData?.contracts.snuggeryManagerProxy?.address,
      deployedHash: storedData?.contracts.snuggeryManagerProxy?.hash,
      deployedBlockNumber: storedData?.contracts.snuggeryManagerProxy?.startBlock,
    });
  deployedContracts[ContractNames.SnuggeryManagerProxy] = {
    contract: snuggeryManagerProxyContract,
    hash: snuggeryManagerProxyHash,
    constructorByteCode: proxyArgsGeneral(snuggeryManagerProxyArgs),
    startBlock: snuggeryManagerProxyBlockNumber,
  };
  if (!storedData?.contracts.snuggeryManagerProxy?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Snuggery Manager Proxy Address:", snuggeryManagerProxyContract?.address);

  // Deploy Munchadex Manager
  _log("Deploying Munchadex Manager");
  const [munchadexManagerContract, munchadexManagerHash, munchadexManagerBlockNumber] =
    await getDeployedContract({
      config,
      abi: munchadexManager.abi,
      bytecode: munchadexManager.bytecode,
      deployedAddress: storedData?.contracts.munchadexManager?.address,
      deployedHash: storedData?.contracts.munchadexManager?.hash,
      deployedBlockNumber: storedData?.contracts.munchadexManager?.startBlock,
      args: ARGS,
    });
  deployedContracts[ContractNames.MunchadexManager] = {
    contract: munchadexManagerContract,
    hash: munchadexManagerHash,
    constructorByteCode: argsEncoded,
    startBlock: munchadexManagerBlockNumber,
  };
  if (!storedData?.contracts.munchadexManager?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("MunchaDEX Manager Address:", munchadexManagerContract?.address);

  // Deploy Migration Manager
  _log("Deploying Migration Manager");
  const [migrationManagerContract, migrationManagerHash, migrationManagerBlockNumber] =
    await getDeployedContract({
      config,
      abi: migrationManager.abi,
      bytecode: migrationManager.bytecode,
      deployedAddress: storedData?.contracts.migrationManager?.address,
      deployedHash: storedData?.contracts.migrationManager?.hash,
      deployedBlockNumber: storedData?.contracts.migrationManager?.startBlock,
      args: ARGS,
    });
  deployedContracts[ContractNames.MigrationManager] = {
    contract: migrationManagerContract,
    hash: migrationManagerHash,
    constructorByteCode: argsEncoded,
    startBlock: migrationManagerBlockNumber,
  };
  if (!storedData?.contracts.migrationManager?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Migration Manager Address:", migrationManagerContract?.address);

  // Deploy NFT Attributes Manager
  _log("Deploying NFT Attributes Manager");
  const [nftAttributesManagerV1Contract, nftAttributesHash, nftAttributesManagerV1BlockNumber] =
    await getDeployedContract({
      config,
      abi: nftAttributesManagerV1.abi,
      bytecode: nftAttributesManagerV1.bytecode,
      deployedAddress: storedData?.contracts.nftAttributesManagerV1?.address,
      deployedHash: storedData?.contracts.nftAttributesManagerV1?.hash,
      deployedBlockNumber: storedData?.contracts.nftAttributesManagerV1?.startBlock,
      args: ARGS,
    });
  deployedContracts[ContractNames.NFTAttributesManagerV1] = {
    contract: nftAttributesManagerV1Contract,
    hash: nftAttributesHash,
    constructorByteCode: argsEncoded,
    startBlock: nftAttributesManagerV1BlockNumber,
  };
  if (!storedData?.contracts.nftAttributesManagerV1?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("NFT Attributes Manager Address:", nftAttributesManagerV1Contract?.address);

  // Deploy NFT Overlord
  _log("Deploying NFT Overlord");
  const [nftOverlordContract, nftOverlordHash, nftOverlordBlockNumber] = await getDeployedContract({
    config,
    abi: nftOverlord.abi,
    bytecode: nftOverlord.bytecode,
    deployedAddress: storedData?.contracts.nftOverlord?.address,
    deployedHash: storedData?.contracts.nftOverlord?.hash,
    deployedBlockNumber: storedData?.contracts.nftOverlord?.startBlock,
    args: ARGS,
  });
  deployedContracts[ContractNames.NFTOverlord] = {
    contract: nftOverlordContract,
    hash: nftOverlordHash,
    constructorByteCode: argsEncoded,
    startBlock: nftOverlordBlockNumber,
  };
  if (!storedData?.contracts.nftOverlord?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("NFT Overlord Address:", nftOverlordContract?.address);

  // Deploy Munch NFT
  _log("Deploying Munch NFT");
  const [munchNFTContract, munchNFTHash, munchNFTBlockNumber] = await getDeployedContract({
    config,
    abi: munchNFT.abi,
    bytecode: munchNFT.bytecode,
    deployedAddress: storedData?.contracts.munchNFT?.address,
    deployedHash: storedData?.contracts.munchNFT?.hash,
    deployedBlockNumber: storedData?.contracts.munchNFT?.startBlock,
    args: [...ARGS, TOKEN_ATTRIBUTES.nft.name, TOKEN_ATTRIBUTES.nft.symbol],
  });
  deployedContracts[ContractNames.MunchNFT] = {
    contract: munchNFTContract,
    hash: munchNFTHash,
    constructorByteCode: encodeAbiParameters(
      [
        { name: "_configStore", type: "address" },
        { name: "_name", type: "string" },
        { name: "_symbol", type: "string" },
      ],
      [...ARGS, TOKEN_ATTRIBUTES.nft.name, TOKEN_ATTRIBUTES.nft.symbol]
    ),
    startBlock: munchNFTBlockNumber,
  };
  if (!storedData?.contracts.munchNFT?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Munch NFT Address:", munchNFTContract?.address);

  /// Deploy Distributors
  _log("Deploy Fund Treasury Distributor");
  const [
    fundTreasuryDistributorContract,
    fundTreasuryDistributorHash,
    fundTreasuryDistributorBlockNumber,
  ] = await getDeployedContract({
    config,
    abi: fundTreasuryDistributor.abi,
    bytecode: fundTreasuryDistributor.bytecode,
    deployedAddress: storedData?.contracts.fundTreasuryDistributor?.address,
    deployedHash: storedData?.contracts.fundTreasuryDistributor?.hash,
    deployedBlockNumber: storedData?.contracts.fundTreasuryDistributor?.startBlock,
    args: ARGS,
  });
  deployedContracts[ContractNames.FundTreasuryDistributor] = {
    contract: fundTreasuryDistributorContract,
    hash: fundTreasuryDistributorHash,
    constructorByteCode: argsEncoded,
    startBlock: fundTreasuryDistributorBlockNumber,
  };
  if (!storedData?.contracts.fundTreasuryDistributor?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Fund Treasury Distributor Address:", fundTreasuryDistributorContract?.address);

  /// Deploy PrimordialManager
  _log("Deploy Primordial Manager");
  const [primordialManagerContract, primordialManagerHash, primordialManagerBlockNumber] =
    await getDeployedContract({
      config,
      abi: primordialManager.abi,
      bytecode: primordialManager.bytecode,
      deployedAddress: storedData?.contracts.primordialManager?.address,
      deployedHash: storedData?.contracts.primordialManager?.hash,
      deployedBlockNumber: storedData?.contracts.primordialManager?.startBlock,
      args: ARGS,
    });
  deployedContracts[ContractNames.PrimordialManager] = {
    contract: primordialManagerContract,
    hash: primordialManagerHash,
    constructorByteCode: argsEncoded,
    startBlock: primordialManagerBlockNumber,
  };
  if (!storedData?.contracts.primordialManager?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Primordial Manager Address:", primordialManagerContract?.address);

  // Deploy Land Manager
  _log("Deploying Land Manager");
  const [landManagerRootContract, landManagerRootHash, landManagerRootBlockNumber] =
    await getDeployedContract({
      config,
      abi: landManagerRoot.abi,
      bytecode: landManagerRoot.bytecode,
      deployedAddress: storedData?.contracts.landManagerRoot?.address,
      deployedHash: storedData?.contracts.landManagerRoot?.hash,
      deployedBlockNumber: storedData?.contracts.landManagerRoot?.startBlock,
    });
  deployedContracts[ContractNames.LandManagerRoot] = {
    contract: landManagerRootContract,
    hash: landManagerRootHash,
    constructorByteCode: null,
    startBlock: landManagerRootBlockNumber,
  };
  if (!storedData?.contracts.landManagerRoot?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Land Manager Root Address:", landManagerRootContract?.address);
  const landManagerInitialize = encodeFunctionData({
    abi: landManagerRoot.abi,
    functionName: "initialize",
    args: ARGS,
  });
  const landManagerProxyArgs: readonly [`0x${string}`, `0x${string}`, `0x${string}`] = [
    landManagerRootContract?.address,
    config.universalRoles[Role.Admin],
    landManagerInitialize,
  ];

  const [landManagerProxyContract, landManagerProxyHash, landManagerProxyBlockNumber] =
    await getDeployedContract({
      config,
      abi: landManagerProxy.abi,
      readAbi: landManagerRoot.abi,
      bytecode: landManagerProxy.bytecode,
      args: landManagerProxyArgs,
      deployedAddress: storedData?.contracts.landManagerProxy?.address,
      deployedHash: storedData?.contracts.landManagerProxy?.hash,
      deployedBlockNumber: storedData?.contracts.landManagerProxy?.startBlock,
    });
  deployedContracts[ContractNames.LandManagerProxy] = {
    contract: landManagerProxyContract,
    hash: landManagerProxyHash,
    constructorByteCode: proxyArgsGeneral(landManagerProxyArgs),
    startBlock: landManagerProxyBlockNumber,
  };
  if (!storedData?.contracts.landManagerProxy?.address)
    await saveDeployedContracts(config, scratchFile, deployedContracts);
  _log("Land Manager Proxy Address:", landManagerProxyContract?.address);

  let rngProxyHash, encodedApi3Args, rngProxyBlockNumber, rngProxyContractDeployed;
  let rngProxySelfHostedContract, rngProxyApi3Contract;
  let selfHostProxy = config.selfHostProxy;
  if (storedData) {
    selfHostProxy = storedData.selfHostProxy;
  }
  if (selfHostProxy) {
    _log("Deploying Self Hosted RNG Proxy");
    [rngProxyContractDeployed, rngProxyHash, rngProxyBlockNumber] = await getDeployedContract({
      config,
      abi: rngProxySelfHosted.abi,
      bytecode: rngProxySelfHosted.bytecode,
      deployedAddress: storedData?.contracts.rngProxySelfHosted?.address,
      deployedHash: storedData?.contracts.rngProxySelfHosted?.hash,
      deployedBlockNumber: storedData?.contracts.rngProxySelfHosted?.startBlock,
      args: ARGS,
    });

    rngProxySelfHostedContract = {
      contract: rngProxyContractDeployed,
      hash: rngProxyHash,
      constructorByteCode: argsEncoded,
      startBlock: rngProxyBlockNumber,
    };

    rngProxyApi3Contract = null;

    deployedContracts[ContractNames.RNGProxySelfHosted] = rngProxySelfHostedContract;
    deployedContracts[ContractNames.RNGProxyApi3] = rngProxyApi3Contract;
    if (!storedData?.contracts.rngProxySelfHosted?.address)
      await saveDeployedContracts(config, scratchFile, deployedContracts);
  } else {
    _log("Deploying API3 RNG Proxy");
    const API3ARGS: readonly [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
    ] = [
      config.externalAddresses.airnodeRpv,
      configStorageContract?.address,
      config.externalAddresses.airnodeContract,
      config.externalAddresses.airnodeSponsor,
      config.externalAddresses.airnodeSponsorWallet,
      config.externalAddresses.airnodeEndpointId,
    ];

    [rngProxyContractDeployed, rngProxyHash, rngProxyBlockNumber] = await getDeployedContract({
      config,
      abi: rngProxyApi3.abi,
      bytecode: rngProxyApi3.bytecode,
      deployedAddress: storedData?.contracts.rngProxyApi3?.address,
      deployedHash: storedData?.contracts.rngProxyApi3?.hash,
      deployedBlockNumber: storedData?.contracts.rngProxyApi3?.startBlock,
      args: API3ARGS,
    });
    encodedApi3Args = encodeAbiParameters(
      [
        { name: "_airnodeRrp", type: "address" },
        { name: "_configStorage", type: "address" },
        { name: "airnodeContract", type: "address" },
        { name: "sponsor", type: "address" },
        { name: "sponsorWallet", type: "address" },
        { name: "endpointId", type: "bytes32" },
      ],
      API3ARGS
    );

    rngProxyApi3Contract = {
      contract: rngProxyContractDeployed,
      hash: rngProxyHash,
      constructorByteCode: encodedApi3Args,
      startBlock: rngProxyBlockNumber,
    };

    rngProxySelfHostedContract = null;
    deployedContracts[ContractNames.RNGProxySelfHosted] = rngProxySelfHostedContract;
    deployedContracts[ContractNames.RNGProxyApi3] = rngProxyApi3Contract;
    if (!storedData?.contracts.rngProxyApi3?.address)
      await saveDeployedContracts(config, scratchFile, deployedContracts);
  }
  _log("RNG Proxy Address:", rngProxyContractDeployed?.address);

  let oldMunchNFT, oldMunchNFTProxy;
  if (config.deployOldNFT) {
    const nftResult = await deployOldNFT({ config, contracts, storedData, logging });
    oldMunchNFT = nftResult[ContractNames.OldMunchNFT];
    oldMunchNFTProxy = nftResult[ContractNames.OldMunchNFTProxy];
  } else {
    oldMunchNFT = null;
    oldMunchNFTProxy = null;
  }
  deployedContracts[ContractNames.OldMunchNFT] = oldMunchNFT;
  deployedContracts[ContractNames.OldMunchNFTProxy] = oldMunchNFTProxy;
  await saveDeployedContracts(config, scratchFile, deployedContracts);

  _log("Completed Deployment");

  return deployedContracts;
}

export type DeployedContractsType = Awaited<ReturnType<typeof deployContracts>>;
