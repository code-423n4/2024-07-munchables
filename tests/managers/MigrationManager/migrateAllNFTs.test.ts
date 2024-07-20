import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { BASE_TOKEN_DATA, testClient } from "../../utils/consts";
import {
  TestERC20ContractType,
  deployTestERC20Contract,
  getTestContracts,
  getTestRoleAddresses,
} from "../../utils/contracts";
import { configureDefaultLock } from "../../utils/lock-configure";
import { deployMockMunchNFT } from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("MigrationManager: migrateAllNFTs", () => {
  let aliceETH: `0x${string}`;
  let bobWETH: `0x${string}`;
  let jirardUSDB: `0x${string}`;
  let empty: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockUSDB: TestERC20ContractType;
  let mockWETH: TestERC20ContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    await deployMockMunchNFT({ testContracts });

    [aliceETH, bobWETH, jirardUSDB, empty] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
    await testClient.setBalance({
      address: aliceETH,
      value: parseEther("100"),
    });
    mockUSDB = await deployTestERC20Contract({ account: admin });
    mockWETH = await deployTestERC20Contract({ account: admin });

    let configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
      StorageKey.USDBContract,
      mockUSDB.address,
      true,
    ]);
    await assertTxSuccess({ txHash: configSetAddressTxHash });

    configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
      StorageKey.WETHContract,
      mockWETH.address,
      true,
    ]);
    await assertTxSuccess({ txHash: configSetAddressTxHash });

    await mockUSDB.write.mint([jirardUSDB, BigInt(1000e18)], { account: admin });
    await mockWETH.write.mint([bobWETH, BigInt(1000e18)], { account: admin });
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("All paths", () => {
    beforeEach(async () => {
      await registerPlayer({ account: aliceETH, testContracts });
      await registerPlayer({ account: bobWETH, testContracts });
      await registerPlayer({ account: jirardUSDB, testContracts });
      await configureDefaultLock({ admin, testContracts });

      let txHash = await testContracts.lockManager.contract.write.configureToken(
        [mockUSDB.address, BASE_TOKEN_DATA],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      txHash = await testContracts.lockManager.contract.write.configureToken(
        [mockWETH.address, BASE_TOKEN_DATA],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      const initToken = [
        {
          tokenId: 7n,
          lockAmount: 0n,

          token: zeroAddress,
          attributes: {
            chonks: 1000n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 1,
            species: 3,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
        {
          tokenId: 19n,
          lockAmount: 0n,

          token: zeroAddress,
          attributes: {
            chonks: 1000n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 1,
            species: 3,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
        {
          tokenId: 18n,
          lockAmount: BigInt(3e18),
          token: zeroAddress,
          attributes: {
            chonks: 1000n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 1,
            species: 3,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
        {
          tokenId: 25n,
          lockAmount: BigInt(4e18),

          token: zeroAddress,
          attributes: {
            chonks: 1000n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 1,
            species: 3,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
        {
          tokenId: 97n,
          lockAmount: BigInt(1e18),

          token: mockUSDB.address,
          attributes: {
            chonks: 1000n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 1,
            species: 3,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
        {
          tokenId: 17n,
          lockAmount: BigInt(3e18),

          token: mockUSDB.address,
          attributes: {
            chonks: 1000n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 1,
            species: 3,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
        {
          tokenId: 27n,
          lockAmount: BigInt(1e18),

          token: mockWETH.address,
          attributes: {
            chonks: 1000n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 1,
            species: 3,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
      ];
      txHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [[aliceETH, aliceETH, aliceETH, aliceETH, jirardUSDB, jirardUSDB, bobWETH], initToken],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: txHash });
    });
    it("Revert - Not locked", async () => {
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migrateAllNFTs([aliceETH, 0], {
          account: aliceETH,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "DifferentLockActionError")
      );
    });
    it("Revert - Invalid Skip", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const readTokenBalances =
        await testContracts.migrationManager.contract.read.getUserMigrateQuantityAll([aliceETH]);
      const txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
        account: aliceETH,
        value: readTokenBalances[0],
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migrateAllNFTs([aliceETH, 10000], {
          account: aliceETH,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidSkipAmountError")
      );
    });
    it("Revert - Tried to burn then migrate", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const txHash = await testContracts.migrationManager.contract.write.burnNFTs([aliceETH, 0], {
        account: aliceETH,
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migrateAllNFTs([empty, 0], {
          account: aliceETH,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "DifferentLockActionError")
      );
    });
    it("Success - Migrate Purchased then rest of all then migrate again for nothing", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      let txHash = await testContracts.migrationManager.contract.write.migratePurchasedNFTs(
        [[19n]],
        {
          account: aliceETH,
          value: parseEther("1"),
        }
      );
      await assertTxSuccess({ txHash });
      const remainingLock =
        await testContracts.migrationManager.contract.read.getUserMigrateQuantityAll([aliceETH]);
      txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
        account: aliceETH,
        value: remainingLock[0],
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.migrationManager.contract.write.migrateAllNFTs([aliceETH, 0], {
        account: aliceETH,
      });
      let txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSucceeded",
            args: {
              user: aliceETH,
              _oldTokenIds: [0n, 0n, 18n, 25n],
              _newTokenIds: [0n, 0n, 2n, 3n],
            },
          },
        ],
      });

      txHash = await testContracts.migrationManager.contract.write.migrateAllNFTs([aliceETH, 0], {
        account: aliceETH,
      });
      txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSucceeded",
            args: {
              user: aliceETH,
              _oldTokenIds: [0n, 0n, 0n, 0n],
              _newTokenIds: [0n, 0n, 0n, 0n],
            },
          },
        ],
      });
    });
    it("Success - ERC-20s", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const remainingLock =
        await testContracts.migrationManager.contract.read.getUserMigrateQuantityAll([jirardUSDB]);
      const allowanceHash = await mockUSDB.write.approve(
        [testContracts.migrationManager.contract.address, remainingLock[0]],
        {
          account: jirardUSDB,
        }
      );
      await assertTxSuccess({ txHash: allowanceHash });
      let txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
        account: jirardUSDB,
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.migrationManager.contract.write.migrateAllNFTs([jirardUSDB, 0], {
        account: jirardUSDB,
      });
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSucceeded",
            args: {
              user: jirardUSDB,
              _oldTokenIds: [97n, 17n],
              _newTokenIds: [1n, 2n],
            },
          },
        ],
      });
    });
  });
});
