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

describe("MigrationManager: loadUnrevealedSnapshot", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice] = testRoleAddresses.users;
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
        testContracts.migrationManager.contract.simulate.loadUnrevealedSnapshot(
          [[zeroAddress], [2]],
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
        testContracts.migrationManager.contract.simulate.loadUnrevealedSnapshot(
          [[zeroAddress], [2]],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "MigrationDataSealedError")
      );
    });
    it("Revert - args not equal length", async () => {
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.loadUnrevealedSnapshot(
          [[zeroAddress], [1, 2]],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidDataLengthError")
      );
    });
    it("Succeed - Load multiple times", async () => {
      const firstHash = await testContracts.migrationManager.contract.write.loadUnrevealedSnapshot(
        [[zeroAddress], [2]],
        {
          account: admin,
        }
      );
      const firstTxReceipt = await assertTxSuccess({ txHash: firstHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: firstTxReceipt.logs,
        expectedEvents: [
          {
            eventName: "UnrevealedSnapshotLoaded",
            args: {
              users: [zeroAddress],
              unrevealed: [2],
            },
          },
        ],
      });

      const secondHash = await testContracts.migrationManager.contract.write.loadUnrevealedSnapshot(
        [["0x0000000000000000000000000000000000000001"], [2]],
        {
          account: admin,
        }
      );
      const secondTxReceipt = await assertTxSuccess({ txHash: secondHash });
      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: secondTxReceipt.logs,
        expectedEvents: [
          {
            eventName: "UnrevealedSnapshotLoaded",
            args: {
              users: ["0x0000000000000000000000000000000000000001"],
              unrevealed: [2],
            },
          },
        ],
      });
    });
  });
});
