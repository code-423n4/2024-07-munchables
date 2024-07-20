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

describe("ClaimManager: newPeriod", () => {
  let admin: `0x${string}`;
  let newPeriodRole: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    admin = testRoleAddresses[Role.Admin];
    newPeriodRole = testRoleAddresses[Role.NewPeriod];
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

  it("paused", async () => {
    await testContracts.configStorage.contract.write.setBool([1, true, true], { account: admin });
    await assert.rejects(
      testContracts.claimManagerProxy.contract.simulate.newPeriod({ account: newPeriodRole }),
      (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
    );
  });

  it("period not ended", async () => {
    const txHash = await testContracts.claimManagerProxy.contract.write.newPeriod({
      account: newPeriodRole,
    });
    const txReceipt = await assertTxSuccess({ txHash });
    const block = await testClient.getBlock({ blockHash: txReceipt.blockHash });
    await testClient.setNextBlockTimestamp({ timestamp: block.timestamp + 1000n });

    await assert.rejects(
      testContracts.claimManagerProxy.contract.simulate.newPeriod({ account: newPeriodRole }),
      (err: Error) => assertContractFunctionRevertedError(err, "CurrentPeriodNotEndedError")
    );
  });

  it("successful successive calls", async () => {
    let txHash = await testContracts.claimManagerProxy.contract.write.newPeriod({
      account: newPeriodRole,
    });
    const txReceipt = await assertTxSuccess({ txHash });
    const block = await testClient.getBlock({ blockHash: txReceipt.blockHash });
    assertTransactionEvents({
      abi: testContracts.claimManagerRoot.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "NewPeriodStarted",
          args: {
            _periodId: 1,
            _startTime: Number(block.timestamp),
            _endTime: Number(block.timestamp + 86400n),
            _availablePoints: 10000000000000000000000000n,
            _prevPeriodPointsClaimed: 0n,
            _excessPoints: 0n,
            _totalGlobalChonk: 0n,
          },
        },
      ],
    });

    await testClient.setNextBlockTimestamp({ timestamp: block.timestamp + 86401n });
    txHash = await testContracts.claimManagerProxy.contract.write.newPeriod({
      account: newPeriodRole,
    });
    await assertTxSuccess({ txHash });
  });
});
