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

describe("MigrationManager: sealData", () => {
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
        testContracts.migrationManager.contract.simulate.sealData({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });
    it("Revert - Already sealed", async () => {
      const sealHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: sealHash });
      await assert.rejects(
        testContracts.migrationManager.contract.simulate.sealData({ account: admin }),
        (err: Error) => assertContractFunctionRevertedError(err, "MigrationDataSealedError")
      );
    });
    it("Succeed - Seal", async () => {
      const firstHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      const receipt = await assertTxSuccess({ txHash: firstHash });

      await assertTransactionEvents({
        abi: testContracts.migrationManager.contract.abi,
        logs: receipt.logs,
        expectedEvents: [
          {
            eventName: "MigrationDataSealed",
            args: undefined,
          },
        ],
      });
    });
  });
});
