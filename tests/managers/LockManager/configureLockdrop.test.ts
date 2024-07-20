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

describe("LockManager: configureLockdrop", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  async function assertConfigureLockdropSuccess({
    start,
    end,
    minLockDuration,
    txHash,
  }: {
    start: number;
    end: number;
    minLockDuration: number;
    txHash: `0x${string}`;
  }) {
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.lockManager.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "LockDropConfigured",
          args: {
            _lockdrop_data: {
              start,
              end,
              minLockDuration,
            },
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
    const block = await testClient.getBlock();
    await assert.rejects(
      testContracts.lockManager.contract.simulate.configureLockdrop(
        [
          {
            start: Number(block.timestamp) - 2000,
            end: Number(block.timestamp) - 1000,
            minLockDuration: 1000,
          },
        ],
        {
          account: alice,
        }
      ),
      (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
    );
  });

  it("should revert with LockdropEndedError when setting lockdrop end in past", async () => {
    const block = await testClient.getBlock();
    await assert.rejects(
      testContracts.lockManager.contract.simulate.configureLockdrop(
        [
          {
            start: Number(block.timestamp) - 2000,
            end: Number(block.timestamp) - 1000,
            minLockDuration: 1000,
          },
        ],
        {
          account: admin,
        }
      ),
      (err: Error) => assertContractFunctionRevertedError(err, "LockdropEndedError")
    );
  });

  it("should revert with LockdropInvalidError when setting lockdrop start > end", async () => {
    const block = await testClient.getBlock();
    await assert.rejects(
      testContracts.lockManager.contract.simulate.configureLockdrop(
        [
          {
            start: Number(block.timestamp) + 2000,
            end: Number(block.timestamp) + 1000,
            minLockDuration: 1000,
          },
        ],
        {
          account: admin,
        }
      ),
      (err: Error) => assertContractFunctionRevertedError(err, "LockdropInvalidError")
    );
  });

  it("should revert with LockdropInvalidError when setting lockdrop start == end", async () => {
    const block = await testClient.getBlock();
    await assert.rejects(
      testContracts.lockManager.contract.simulate.configureLockdrop(
        [
          {
            start: Number(block.timestamp) + 1000,
            end: Number(block.timestamp) + 1000,
            minLockDuration: 1000,
          },
        ],
        {
          account: admin,
        }
      ),
      (err: Error) => assertContractFunctionRevertedError(err, "LockdropInvalidError")
    );
  });

  it("should succeed when lockdrop starts in past and ends in future", async () => {
    const block = await testClient.getBlock();

    const start = Number(block.timestamp) - 1000;
    const end = Number(block.timestamp) + 1000;
    const minLockDuration = 1000;

    const { request } = await testContracts.lockManager.contract.simulate.configureLockdrop(
      [
        {
          start,
          end,
          minLockDuration,
        },
      ],
      {
        account: admin,
      }
    );
    const txHash = await testClient.writeContract(request);
    await assertConfigureLockdropSuccess({
      start,
      end,
      minLockDuration,
      txHash,
    });
  });

  it("should succeed when overwriting lockdrop with start in future", async () => {
    const block1 = await testClient.getBlock();

    const start1 = Number(block1.timestamp) - 1000;
    const end1 = Number(block1.timestamp) + 1000;
    const minLockDuration1 = 1000;

    const { request: request1 } =
      await testContracts.lockManager.contract.simulate.configureLockdrop(
        [
          {
            start: start1,
            end: end1,
            minLockDuration: minLockDuration1,
          },
        ],
        {
          account: admin,
        }
      );
    const txHash1 = await testClient.writeContract(request1);
    await assertConfigureLockdropSuccess({
      start: start1,
      end: end1,
      minLockDuration: minLockDuration1,
      txHash: txHash1,
    });

    const block2 = await testClient.getBlock();

    const start2 = Number(block2.timestamp) + 1000;
    const end2 = Number(block2.timestamp) + 3000;
    const minLockDuration2 = 2000;

    const { request: request2 } =
      await testContracts.lockManager.contract.simulate.configureLockdrop(
        [
          {
            start: start2,
            end: end2,
            minLockDuration: minLockDuration2,
          },
        ],
        {
          account: admin,
        }
      );
    const txHash2 = await testClient.writeContract(request2);
    await assertConfigureLockdropSuccess({
      start: start2,
      end: end2,
      minLockDuration: minLockDuration2,
      txHash: txHash2,
    });
  });
});
