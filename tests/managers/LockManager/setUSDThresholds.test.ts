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

describe("LockManager: setUSDThresholds", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  async function assertSetUSDThresholdsSuccess({
    approve,
    disapprove,
    txHash,
  }: {
    approve: number;
    disapprove: number;
    txHash: `0x${string}`;
  }) {
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.lockManager.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "USDThresholdUpdated",
          args: {
            _approve: approve,
            _disapprove: disapprove,
          },
        },
      ],
    });
  }

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

  it("should revert with InvalidRoleError when called as non-admin", async () => {
    await assert.rejects(
      testContracts.lockManager.contract.simulate.setUSDThresholds([2, 3], {
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
    );
  });

  it("should succeed when called as admin", async () => {
    const approve = 2;
    const disapprove = 3;
    const { request } = await testContracts.lockManager.contract.simulate.setUSDThresholds(
      [approve, disapprove],
      {
        account: admin,
      }
    );
    const txHash = await testClient.writeContract(request);
    await assertSetUSDThresholdsSuccess({
      approve,
      disapprove,
      txHash,
    });
  });
});
