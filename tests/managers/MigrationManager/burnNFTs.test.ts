import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { deployMockMunchNFT } from "../../utils/mock-contracts";

describe("MigrationManager: burnNFTs", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let jirard: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  const baseTokenData = {
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
  };

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    await deployMockMunchNFT({ testContracts });

    [alice, bob, jirard] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
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
      const initTokens = [
        {
          ...baseTokenData,
          tokenId: 17n,
        },
        {
          ...baseTokenData,
          tokenId: 18n,
          lockAmount: 0n, // Should be skipped because no amount
        },
        {
          ...baseTokenData,
          tokenId: 19n,
        },
        {
          ...baseTokenData,
          tokenId: 20n,
        },
        {
          ...baseTokenData,
          tokenId: 21n,
        },
        {
          ...baseTokenData,
          tokenId: 22n,
        },
      ];
      let txHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [[alice, alice, alice, alice, alice, alice], initTokens],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: txHash });
      const initToken2 = [
        {
          ...baseTokenData,
          tokenId: 120n,
        },
      ];
      txHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [[bob], initToken2],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: txHash });
    });

    it("Revert - Loading token id 0", async () => {
      const initToken2 = [
        {
          ...baseTokenData,
          tokenId: 0n,
        },
      ];
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.loadMigrationSnapshot(
          [[bob], initToken2],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidMigrationTokenIdError")
      );
    });

    it("Revert - Not sealed", async () => {
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.burnNFTs([alice, 0], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "MigrationDataNotSealedError")
      );
    });
    it("Revert - Nothing available", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.burnNFTs([jirard, 0], {
          account: jirard,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoNFTsToBurnError")
      );
    });
    it("Revert - user hasn't locked action", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.burnNFTs([alice, 0], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "SelfNeedsToChooseError")
      );
    });
    it("Revert - user has locked full migration", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const readTokenBalances =
        await testContracts.migrationManager.contract.read.getUserMigrateQuantityAll([alice]);
      const txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
        account: alice,
        value: readTokenBalances[0],
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.burnNFTs([alice, 0], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "DifferentLockActionError")
      );
    });
    it("Success - burns 4 of first 5 on first call, nothing on second call", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });

      const firstBurnTxHash = await testContracts.migrationManager.contract.write.burnNFTs(
        [alice, 0],
        {
          account: alice,
        }
      );
      const firstBurnTxReceipt = await assertTxSuccess({ txHash: firstBurnTxHash });

      const userMigrationData17 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 17n]);
      assert.ok(userMigrationData17);
      assert.equal(userMigrationData17.claimed, true);

      const userMigrationData18 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 18n]);
      assert.ok(userMigrationData18);
      assert.equal(userMigrationData18.claimed, false);

      const userMigrationData19 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 19n]);
      assert.ok(userMigrationData19);
      assert.equal(userMigrationData19.claimed, true);

      const userMigrationData20 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 20n]);
      assert.ok(userMigrationData20);
      assert.equal(userMigrationData20.claimed, true);

      const userMigrationData21 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 21n]);
      assert.ok(userMigrationData21);
      assert.equal(userMigrationData21.claimed, true);

      const userMigrationData22 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 22n]);
      assert.ok(userMigrationData22);
      assert.equal(userMigrationData22.claimed, false);

      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: firstBurnTxReceipt.logs,
        expectedEvents: [
          {
            eventName: "BurnSucceeded",
            args: {
              user: alice,
              _oldTokenIds: [17n, 0n, 19n, 20n, 21n],
            },
          },
        ],
      });

      const secondBurnTxHash = await testContracts.migrationManager.contract.write.burnNFTs(
        [alice, 0],
        {
          account: alice,
        }
      );
      const secondBurnTxReceipt = await assertTxSuccess({ txHash: secondBurnTxHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: secondBurnTxReceipt.logs,
        expectedEvents: [
          {
            eventName: "BurnSucceeded",
            args: {
              user: alice,
              _oldTokenIds: [0n, 0n, 0n, 0n, 0n],
            },
          },
        ],
      });
    });
    it("Success with skip - burns last token", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });

      const txHash = await testContracts.migrationManager.contract.write.burnNFTs([alice, 5], {
        account: alice,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      const userMigrationData17 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 17n]);
      assert.ok(userMigrationData17);
      assert.equal(userMigrationData17.claimed, false);

      const userMigrationData18 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 18n]);
      assert.ok(userMigrationData18);
      assert.equal(userMigrationData18.claimed, false);

      const userMigrationData19 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 19n]);
      assert.ok(userMigrationData19);
      assert.equal(userMigrationData19.claimed, false);

      const userMigrationData20 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 20n]);
      assert.ok(userMigrationData20);
      assert.equal(userMigrationData20.claimed, false);

      const userMigrationData21 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 21n]);
      assert.ok(userMigrationData21);
      assert.equal(userMigrationData21.claimed, false);

      const userMigrationData22 =
        await testContracts.migrationManager.contract.read.getUserMigrationData([alice, 22n]);
      assert.ok(userMigrationData22);
      assert.equal(userMigrationData22.claimed, true);

      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "BurnSucceeded",
            args: {
              user: alice,
              _oldTokenIds: [22n],
            },
          },
        ],
      });
    });
  });
});
