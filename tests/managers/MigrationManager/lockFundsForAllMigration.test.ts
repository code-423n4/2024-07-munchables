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

describe("MigrationManager: lockFundsForAllMigration", () => {
  let aliceETH: `0x${string}`;
  let bobWETH: `0x${string}`;
  let empty: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockWETH: TestERC20ContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    await deployMockMunchNFT({ testContracts });

    [aliceETH, bobWETH, empty] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
    await testClient.setBalance({
      address: aliceETH,
      value: parseEther("100"),
    });
    mockWETH = await deployTestERC20Contract({ account: admin });

    const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
      StorageKey.WETHContract,
      mockWETH.address,
      true,
    ]);
    await assertTxSuccess({ txHash: configSetAddressTxHash });

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
      await configureDefaultLock({ admin, testContracts });

      let txHash = await testContracts.lockManager.contract.write.configureToken(
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
        [[aliceETH, aliceETH, aliceETH, aliceETH, bobWETH], initToken],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: txHash });
    });
    it("Revert - Not sealed", async () => {
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.lockFundsForAllMigration({
          account: aliceETH,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "MigrationDataNotSealedError")
      );
    });
    it("Revert - Locked", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const txHash = await testContracts.migrationManager.contract.write.burnNFTs([aliceETH, 0], {
        account: aliceETH,
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.lockFundsForAllMigration({
          account: aliceETH,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "DifferentLockActionError")
      );
    });
    it("Revert - Nothing to migrate", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.lockFundsForAllMigration({
          account: empty,
          value: 0n,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoMigrationExistsError")
      );
    });
    it("Revert - Not enough ETH sent", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.lockFundsForAllMigration({
          account: aliceETH,
          value: 0n,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidMigrationAmountError")
      );
    });
    it("Revert - ETH sent for ERC20 lock", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.lockFundsForAllMigration({
          account: bobWETH,
          value: BigInt(1e18),
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidMigrationAmountError")
      );
    });
    it("Success - ETH", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });

      const remainingLock =
        await testContracts.migrationManager.contract.read.getUserMigrateQuantityAll([aliceETH]);
      const txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
        account: aliceETH,
        value: remainingLock[0],
      });
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "LockedForMigration",
            args: {
              user: aliceETH,
              amount: remainingLock[0],
              token: zeroAddress,
            },
          },
        ],
      });

      await assert.rejects(
        testContracts.migrationManager.contract.simulate.lockFundsForAllMigration({
          account: aliceETH,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "DifferentLockActionError")
      );
    });
    it("Success - ERC20", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });

      const remainingLock =
        await testContracts.migrationManager.contract.read.getUserMigrateQuantityAll([bobWETH]);

      const allowanceHash = await mockWETH.write.approve(
        [testContracts.migrationManager.contract.address, remainingLock[0]],
        {
          account: bobWETH,
        }
      );
      await assertTxSuccess({ txHash: allowanceHash });

      const txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
        account: bobWETH,
        value: 0n,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "LockedForMigration",
            args: {
              user: bobWETH,
              amount: remainingLock[0],
              token: mockWETH.address,
            },
          },
        ],
      });

      await assert.rejects(
        testContracts.migrationManager.contract.simulate.lockFundsForAllMigration({
          account: bobWETH,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "DifferentLockActionError")
      );
    });
  });
});
