import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";

describe("MigrationManager: burnUnrevealedForPoints", () => {
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
    beforeEach(async () => {
      const txHash = await testContracts.migrationManager.contract.write.loadUnrevealedSnapshot(
        [[alice], [2]],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash: txHash });
    });
    it("Revert - Not sealed", async () => {
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.burnUnrevealedForPoints({
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
        testContracts.migrationManager.contract.simulate.burnUnrevealedForPoints({
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoUnrevealedError")
      );
    });
    it("Revert - Tried to burn twice", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const txHash = await testContracts.migrationManager.contract.write.burnUnrevealedForPoints({
        account: alice,
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.burnUnrevealedForPoints({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoUnrevealedError")
      );
    });
    it("Success", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      const txHash = await testContracts.migrationManager.contract.write.burnUnrevealedForPoints({
        account: alice,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "UnrevealedSwapSucceeded",
            args: {
              user: alice,
              amountSwapped: 2n,
            },
          },
        ],
      });
    });
  });
});
