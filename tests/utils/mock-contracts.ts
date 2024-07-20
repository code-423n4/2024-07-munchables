import assert from "node:assert/strict";
import { Address, checksumAddress, createWalletClient, getContract, http } from "viem";
import {
  mockAccountManagerAbi,
  mockClaimManagerAbi,
  mockConfigNotifiableAbi,
  mockLockManagerAbi,
  mockMigrationManager2Abi,
  mockMigrationManagerAbi,
  mockMunchNftAbi,
  mockMunchadexManagerAbi,
  mockNftAttributesManagerV1Abi,
  mockNftOverlordAbi,
  mockPrimordialManagerAbi,
  mockRngProxyAbi,
  mockSnuggeryManagerAbi,
} from "../../abi/generated";
import { DeployedContractsType } from "../../deployments/actions/deploy-contracts";
import { StorageKey } from "../../deployments/utils/config-consts";
import MockAccountManager from "../../out/MockAccountManager.sol/MockAccountManager.json";
import MockClaimManager from "../../out/MockClaimManager.sol/MockClaimManager.json";
import MockConfigNotifiable from "../../out/MockConfigNotifiable.sol/MockConfigNotifiable.json";
import MockLockManager from "../../out/MockLockManager.sol/MockLockManager.json";
import MockMigrationManager from "../../out/MockMigrationManager.sol/MockMigrationManager.json";
import MockMigrationManager2 from "../../out/MockMigrationManager2.sol/MockMigrationManager2.json";
import MockMunchNFT from "../../out/MockMunchNFT.sol/MockMunchNFT.json";
import MockMunchadexManager from "../../out/MockMunchadexManager.sol/MockMunchadexManager.json";
import MockNFTAttributesManagerV1 from "../../out/MockNFTAttributeManagerV1.sol/MockNFTAttributesManagerV1.json";
import MockNFTOverlord from "../../out/MockNFTOverlord.sol/MockNFTOverlord.json";
import MockPrimordialManager from "../../out/MockPrimordialManager.sol/MockPrimordialManager.json";
import MockRNGProxy from "../../out/MockRNGProxy.sol/MockRNGProxy.json";
import MockSnuggeryManager from "../../out/MockSnuggeryManager.sol/MockSnuggeryManager.json";
import { assertTxSuccess } from "./asserters";
import { foundryWithTestPort, testClient } from "./consts";
import { getTestRoleAddresses } from "./contracts";

export async function deployMockAccountManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const ARGS: readonly [`0x${string}`] = [testContracts.configStorage.contract.address];
  const mockAccountManagerTxHash = await testClient.deployContract({
    abi: mockAccountManagerAbi,
    account: deployer,
    bytecode: MockAccountManager.bytecode.object as `0x${string}`,
    args: ARGS,
  });
  const mockAccountManagerTxReceipt = await assertTxSuccess({
    txHash: mockAccountManagerTxHash,
  });
  assert.ok(mockAccountManagerTxReceipt.contractAddress);

  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockAccountManager = getContract({
    address: checksumAddress(mockAccountManagerTxReceipt.contractAddress),
    abi: mockAccountManagerAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.AccountManager,
    mockAccountManager.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockAccountManager;
}

export type MockAccountManagerType = Awaited<ReturnType<typeof deployMockAccountManager>>;

export async function deployMockClaimManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const ARGS: readonly [`0x${string}`] = [testContracts.configStorage.contract.address];
  const mockClaimManagerTxHash = await testClient.deployContract({
    abi: mockClaimManagerAbi,
    account: deployer,
    bytecode: MockClaimManager.bytecode.object as `0x${string}`,
    args: ARGS,
  });
  const mockClaimManagerTxReceipt = await assertTxSuccess({
    txHash: mockClaimManagerTxHash,
  });
  assert.ok(mockClaimManagerTxReceipt.contractAddress);

  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockClaimManager = getContract({
    address: checksumAddress(mockClaimManagerTxReceipt.contractAddress),
    abi: mockClaimManagerAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.ClaimManager,
    mockClaimManager.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockClaimManager;
}

export type MockClaimManagerType = Awaited<ReturnType<typeof deployMockClaimManager>>;

export async function deployMockLockManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockLockManagerContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockLockManagerAbi,
    account: deployer,
    bytecode: MockLockManager.bytecode.object as `0x${string}`,
  });
  const mockLockManagerTxReceipt = await assertTxSuccess({
    txHash: mockLockManagerContractTxHash,
  });
  assert.ok(mockLockManagerTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockLockManager = getContract({
    address: mockLockManagerTxReceipt.contractAddress,
    abi: mockLockManagerAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.LockManager,
    mockLockManager.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockLockManager;
}

export type MockLockManagerContractType = Awaited<ReturnType<typeof deployMockLockManager>>;

export async function deployMockMigrationManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockMigrationManagerContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockMigrationManagerAbi,
    account: deployer,
    bytecode: MockMigrationManager.bytecode.object as `0x${string}`,
  });
  const mockMigrationManagerTxReceipt = await assertTxSuccess({
    txHash: mockMigrationManagerContractTxHash,
  });
  assert.ok(mockMigrationManagerTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockMigrationManager = getContract({
    address: mockMigrationManagerTxReceipt.contractAddress,
    abi: mockMigrationManagerAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.MigrationManager,
    mockMigrationManager.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockMigrationManager;
}

export type MockMigrationManagerContractType = Awaited<
  ReturnType<typeof deployMockMigrationManager>
>;

export async function deployMockMigrationManager2({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockMigrationManager2ContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockMigrationManager2Abi,
    account: deployer,
    bytecode: MockMigrationManager2.bytecode.object as `0x${string}`,
  });
  const mockMigrationManager2TxReceipt = await assertTxSuccess({
    txHash: mockMigrationManager2ContractTxHash,
  });
  assert.ok(mockMigrationManager2TxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockMigrationManager2 = getContract({
    address: mockMigrationManager2TxReceipt.contractAddress,
    abi: mockMigrationManager2Abi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.MigrationManager,
    mockMigrationManager2.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockMigrationManager2;
}

export type MockMigrationManager2ContractType = Awaited<
  ReturnType<typeof deployMockMigrationManager2>
>;

export async function deployMockMunchadexManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockMunchadexManagerContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockMunchadexManagerAbi,
    account: deployer,
    bytecode: MockMunchadexManager.bytecode.object as `0x${string}`,
  });
  const mockMunchadexManagerTxReceipt = await assertTxSuccess({
    txHash: mockMunchadexManagerContractTxHash,
  });
  assert.ok(mockMunchadexManagerTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockMunchadexManager = getContract({
    address: mockMunchadexManagerTxReceipt.contractAddress,
    abi: mockMunchadexManagerAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.MunchadexManager,
    mockMunchadexManager.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockMunchadexManager;
}

export type MockMunchadexManagerContractType = Awaited<
  ReturnType<typeof deployMockMunchadexManager>
>;

export async function deployMockNFTAttributesManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockNFTAttributesManagerV1ContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockNftAttributesManagerV1Abi,
    account: deployer,
    bytecode: MockNFTAttributesManagerV1.bytecode.object as `0x${string}`,
  });
  const mockNFTAttributesManagerV1TxReceipt = await assertTxSuccess({
    txHash: mockNFTAttributesManagerV1ContractTxHash,
  });
  assert.ok(mockNFTAttributesManagerV1TxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockNFTAttributesManagerV1 = getContract({
    address: mockNFTAttributesManagerV1TxReceipt.contractAddress,
    abi: mockNftAttributesManagerV1Abi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.NFTAttributesManager,
    mockNFTAttributesManagerV1.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockNFTAttributesManagerV1;
}

export type MockNFTAttributesManagerContractType = Awaited<
  ReturnType<typeof deployMockNFTAttributesManager>
>;

export async function deployMockNFTOverlord({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockNFTOverlordContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockNftOverlordAbi,
    account: deployer,
    bytecode: MockNFTOverlord.bytecode.object as `0x${string}`,
  });
  const mockNFTOverlordTxReceipt = await assertTxSuccess({
    txHash: mockNFTOverlordContractTxHash,
  });
  assert.ok(mockNFTOverlordTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockNFTOverlord = getContract({
    address: mockNFTOverlordTxReceipt.contractAddress,
    abi: mockNftOverlordAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.NFTOverlord,
    mockNFTOverlord.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockNFTOverlord;
}

export type MockNFTOverlordContractType = Awaited<ReturnType<typeof deployMockNFTOverlord>>;

export async function deployMockNotifiableContract({
  account,
  configStorageAddress,
}: {
  account: Address;
  configStorageAddress: Address;
}) {
  const ARGS: readonly [`0x${string}`] = [configStorageAddress];
  const mockNotifiableContractTxHash = await testClient.deployContract({
    abi: mockConfigNotifiableAbi,
    account,
    bytecode: MockConfigNotifiable.bytecode.object as `0x${string}`,
    args: ARGS,
  });
  const mockNotifiableTxReceipt = await assertTxSuccess({
    txHash: mockNotifiableContractTxHash,
  });
  assert.ok(mockNotifiableTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account,
  });
  return getContract({
    address: checksumAddress(mockNotifiableTxReceipt.contractAddress),
    abi: mockConfigNotifiableAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });
}

export type MockNotifiableContractType = Awaited<ReturnType<typeof deployMockNotifiableContract>>;

export async function deployMockRNGProxy({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockRNGProxyContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockRngProxyAbi,
    account: deployer,
    bytecode: MockRNGProxy.bytecode.object as `0x${string}`,
  });
  const mockRNGProxyTxReceipt = await assertTxSuccess({
    txHash: mockRNGProxyContractTxHash,
  });
  assert.ok(mockRNGProxyTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockRNGProxy = getContract({
    address: mockRNGProxyTxReceipt.contractAddress,
    abi: mockRngProxyAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.RNGProxyContract,
    mockRNGProxy.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockRNGProxy;
}

export type MockRNGProxyContractType = Awaited<ReturnType<typeof deployMockRNGProxy>>;

export async function deployMockSnuggeryManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockSnuggeryManagerContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockSnuggeryManagerAbi,
    account: deployer,
    bytecode: MockSnuggeryManager.bytecode.object as `0x${string}`,
  });
  const mockSnuggeryManagerTxReceipt = await assertTxSuccess({
    txHash: mockSnuggeryManagerContractTxHash,
  });
  assert.ok(mockSnuggeryManagerTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockSnuggeryManager = getContract({
    address: mockSnuggeryManagerTxReceipt.contractAddress,
    abi: mockSnuggeryManagerAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.SnuggeryManager,
    mockSnuggeryManager.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockSnuggeryManager;
}

export type MockSnuggeryManagerContractType = Awaited<ReturnType<typeof deployMockSnuggeryManager>>;

export async function deployMockMunchNFT({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockMunchNFTContractTxHash = await testClient.deployContract({
    abi: mockMunchNftAbi,
    account: deployer,
    bytecode: MockMunchNFT.bytecode.object as `0x${string}`,
  });
  const mockMunchNFTTxReceipt = await assertTxSuccess({
    txHash: mockMunchNFTContractTxHash,
  });
  assert.ok(mockMunchNFTTxReceipt.contractAddress);
  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });
  const mockMunchNFT = getContract({
    address: mockMunchNFTTxReceipt.contractAddress,
    abi: mockMunchNftAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.OldMunchNFT,
    mockMunchNFT.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockMunchNFT;
}

export type MockMunchNFTContractType = Awaited<ReturnType<typeof deployMockMunchNFT>>;

export async function deployMockPrimordialManager({
  testContracts,
  notify = true,
}: {
  testContracts: DeployedContractsType;
  notify?: boolean;
}) {
  const { deployer } = await getTestRoleAddresses();

  const mockPrimordialManagerContractTxHash = await testClient.deployContract({
    args: [testContracts.configStorage.contract.address],
    abi: mockPrimordialManagerAbi,
    account: deployer,
    bytecode: MockPrimordialManager.bytecode.object as `0x${string}`,
  });
  const mockPrimordialManagerTxReceipt = await assertTxSuccess({
    txHash: mockPrimordialManagerContractTxHash,
  });
  assert.ok(mockPrimordialManagerTxReceipt.contractAddress);

  const walletClient = createWalletClient({
    chain: foundryWithTestPort,
    transport: http(),
    account: deployer,
  });

  const mockPrimordialManager = getContract({
    address: mockPrimordialManagerTxReceipt.contractAddress,
    abi: mockPrimordialManagerAbi,
    client: {
      wallet: walletClient,
      public: testClient,
    },
  });

  const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
    StorageKey.PrimordialManager,
    mockPrimordialManager.address,
    notify,
  ]);
  await assertTxSuccess({ txHash: configSetAddressTxHash });

  return mockPrimordialManager;
}

export type MockPrimordialManagerContractType = Awaited<
  ReturnType<typeof deployMockPrimordialManager>
>;
