import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { configureDefaultLock } from "../../utils/lock-configure";
import { deployMockMunchNFT } from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("MigrationManager: migratePurchasedNFTs", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    await deployMockMunchNFT({ testContracts });

    [alice, bob] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
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
      await registerPlayer({ account: alice, testContracts });
      await registerPlayer({ account: bob, testContracts });
      await configureDefaultLock({ admin, testContracts });
      const initToken = [
        {
          tokenId: 17n,
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
          lockAmount: BigInt(1e18),

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
      ];
      let txHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [[alice, alice, alice], initToken],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: txHash });
      const initToken2 = [
        {
          tokenId: 5n,
          lockAmount: BigInt(1e18),

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
      ];
      txHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [[bob], initToken2],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: txHash });
      await testClient.setBalance({
        address: testContracts.migrationManager.contract.address,
        value: parseEther("100"),
      });
    });
    it("Revert - Not sealed", async () => {
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migratePurchasedNFTs([[17n]], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "MigrationDataNotSealedError")
      );
    });
    it("Revert - Not bought", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migratePurchasedNFTs([[5n]], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotBoughtNFTError")
      );
    });
    it("Revert - Not 0 lock amount", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migratePurchasedNFTs([[18n]], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotBoughtNFTError")
      );
    });
    it("Revert - invalid token id", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migratePurchasedNFTs([[69n]], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoMigrationExistsError")
      );
    });
    it("Revert - Didn't send enough ETH", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migratePurchasedNFTs([[19n]], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidMigrationAmountError")
      );
    });
    it("Revert - Tries to call migratePurchasedNFTs after burning", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });

      const txHash = await testContracts.migrationManager.contract.write.burnRemainingPurchasedNFTs(
        [alice, 2],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.migratePurchasedNFTs([[19n]], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "DifferentLockActionError")
      );
    });
    it("Success - Migrate nothing (token id 0 skipped)", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const txHash = await testContracts.migrationManager.contract.write.migratePurchasedNFTs(
        [[0n]],
        {
          account: alice,
          value: 0n,
        }
      );
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSucceeded",
            args: {
              user: alice,
              _oldTokenIds: [0n],
              _newTokenIds: [0n],
            },
          },
        ],
      });
    });
    it("Success - One (and nothing when redoing the call)", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      let txHash = await testContracts.migrationManager.contract.write.migratePurchasedNFTs(
        [[17n]],
        {
          account: alice,
          value: parseEther("1"),
        }
      );
      let txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSucceeded",
            args: {
              user: alice,
              _oldTokenIds: [17n],
              _newTokenIds: [1n],
            },
          },
        ],
      });

      txHash = await testContracts.migrationManager.contract.write.migratePurchasedNFTs([[17n]], {
        account: alice,
        value: 0n,
      });
      txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSucceeded",
            args: {
              user: alice,
              _oldTokenIds: [0n],
              _newTokenIds: [0n],
            },
          },
        ],
      });
    });
    it("Success - Multiple", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const txHash = await testContracts.migrationManager.contract.write.migratePurchasedNFTs(
        [[17n, 19n]],
        {
          account: alice,
          value: parseEther("2"),
        }
      );
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSucceeded",
            args: {
              user: alice,
              _oldTokenIds: [17n, 19n],
              _newTokenIds: [1n, 2n],
            },
          },
        ],
      });
    });
  });
});
