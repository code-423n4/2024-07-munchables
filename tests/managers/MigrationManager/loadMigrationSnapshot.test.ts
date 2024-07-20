import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, USDB_TESTNET } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";

describe("MigrationManager: loadMigrationSnapshot", () => {
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
    [alice, bob] = testRoleAddresses.users;
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
    it("Revert - Not Admin", async () => {
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.loadMigrationSnapshot(
          [
            [alice],
            [
              {
                tokenId: 1n,
                lockAmount: 0n,

                token: zeroAddress,
                attributes: {
                  chonks: 0n,
                  level: 0,
                  evolution: 0,
                  lastPettedTime: 0n,
                },
                immutableAttributes: {
                  rarity: 0,
                  species: 0,
                  realm: 0,
                  generation: 1,
                  hatchedDate: 0,
                },
                gameAttributes: [],
                claimed: false,
              },
            ],
          ],
          {
            account: alice,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });
    it("Revert - Already sealed", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.loadMigrationSnapshot(
          [
            [alice],
            [
              {
                tokenId: 1n,
                lockAmount: 0n,

                token: zeroAddress,
                attributes: {
                  chonks: 0n,
                  level: 0,
                  evolution: 0,
                  lastPettedTime: 0n,
                },
                immutableAttributes: {
                  rarity: 0,
                  species: 0,
                  realm: 0,
                  generation: 1,
                  hatchedDate: 0,
                },
                gameAttributes: [],
                claimed: false,
              },
            ],
          ],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "MigrationDataSealedError")
      );
    });
    it("Revert - Same token for same user more than once", async () => {
      const initToken = [
        {
          tokenId: 1n,
          lockAmount: 0n,

          token: zeroAddress,
          attributes: {
            chonks: 0n,
            level: 0,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 0,
            species: 0,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
      ];
      const firstHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [[zeroAddress], initToken],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: firstHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.loadMigrationSnapshot(
          [[zeroAddress], initToken],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "DataAlreadyLoadedError")
      );
    });
    it("Revert - non-ETH/USDB/WETH token", async () => {
      const initToken = [
        {
          tokenId: 1n,
          lockAmount: parseEther("1"),

          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          attributes: {
            chonks: 0n,
            level: 0,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 0,
            species: 0,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
      ];
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.loadMigrationSnapshot(
          [[alice], initToken],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidMigrationTokenError")
      );
    });
    it("Revert - No lock amount for non-ETH token", async () => {
      const initToken = [
        {
          tokenId: 1n,
          lockAmount: 0n,

          token: USDB_TESTNET,
          attributes: {
            chonks: 0n,
            level: 0,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 0,
            species: 0,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
      ];
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.loadMigrationSnapshot(
          [[alice], initToken],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidMigrationTokenError")
      );
    });
    it("Succeed - Load multiple times", async () => {
      const initToken = [
        {
          tokenId: 1n,
          lockAmount: 0n,

          token: zeroAddress,
          attributes: {
            chonks: 0n,
            level: 0,
            evolution: 0,
            lastPettedTime: 0n,
          },
          immutableAttributes: {
            rarity: 0,
            species: 0,
            realm: 0,
            generation: 1,
            hatchedDate: 0,
          },
          gameAttributes: [],
          claimed: false,
        },
      ];
      const firstHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [[alice], initToken],
        {
          account: admin,
        }
      );
      const receipt = await assertTxSuccess({ txHash: firstHash });

      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: receipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationSnapshotLoaded",
            args: {
              users: [alice],
              data: initToken,
            },
          },
        ],
      });

      const secondHash = await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
        [
          [bob],
          [
            {
              tokenId: 2n,
              lockAmount: parseEther("1"),

              token: USDB_TESTNET,
              attributes: {
                chonks: 0n,
                level: 0,
                evolution: 0,
                lastPettedTime: 0n,
              },
              immutableAttributes: {
                rarity: 0,
                species: 0,
                realm: 0,
                generation: 1,
                hatchedDate: 0,
              },
              gameAttributes: [],
              claimed: false,
            },
          ],
        ],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: secondHash });

      const [, aliceMigrationTotals] =
        await testContracts.migrationManager.contract.read.getUserMigrationCompletedData([alice]);
      assert.equal(aliceMigrationTotals.totalPurchasedAmount, parseEther("2"));
      assert.equal(aliceMigrationTotals.totalLockedAmount, 0n);
      assert.equal(aliceMigrationTotals.tokenLocked, zeroAddress);

      const [, bobMigrationTotals] =
        await testContracts.migrationManager.contract.read.getUserMigrationCompletedData([bob]);
      assert.equal(bobMigrationTotals.totalPurchasedAmount, 0n);
      assert.equal(bobMigrationTotals.totalLockedAmount, parseEther("1"));
      assert.equal(bobMigrationTotals.tokenLocked, USDB_TESTNET);
    });
  });
});
