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

describe("LockManager: disapproveUSDPrice", () => {
  let alice: `0x${string}`;
  let priceFeed1: `0x${string}`;
  let priceFeed2: `0x${string}`;
  let priceFeed3: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();
    [alice] = testRoleAddresses.users;
    priceFeed1 = testRoleAddresses[Role.PriceFeed_1];
    priceFeed2 = testRoleAddresses[Role.PriceFeed_2];
    priceFeed3 = testRoleAddresses[Role.PriceFeed_3];
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

  it("should revert with NoProposalError when no proposal in progress", async () => {
    await assert.rejects(
      testContracts.lockManager.contract.simulate.disapproveUSDPrice([100n], {
        account: priceFeed1,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "NoProposalError")
    );
  });

  describe("when a proposal is in progress", () => {
    const price = 1337n;

    before(async () => {
      let txHash = await testContracts.lockManager.contract.write.setUSDThresholds([3, 2]);
      await assertTxSuccess({ txHash });
      txHash = await testContracts.lockManager.contract.write.proposeUSDPrice(
        [price, [zeroAddress]],
        {
          account: priceFeed1,
        }
      );
      await assertTxSuccess({ txHash });
    });

    it("should revert with ProposalAlreadyDisapprovedError when already disapproved by sender", async () => {
      const txHash = await testContracts.lockManager.contract.write.disapproveUSDPrice([price], {
        account: priceFeed2,
      });
      await assertTxSuccess({ txHash });

      await assert.rejects(
        testContracts.lockManager.contract.simulate.disapproveUSDPrice([price], {
          account: priceFeed2,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ProposalAlreadyDisapprovedError")
      );
    });

    it("should revert when not properly defined role", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.disapproveUSDPrice([price], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });

    it("should revert with ProposalAlreadyApprovedError if sender already approved", async () => {
      const approveTxHash = await testContracts.lockManager.contract.write.approveUSDPrice(
        [price],
        {
          account: priceFeed2,
        }
      );
      await assertTxSuccess({ txHash: approveTxHash });

      await assert.rejects(
        testContracts.lockManager.contract.simulate.disapproveUSDPrice([price], {
          account: priceFeed2,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ProposalAlreadyApprovedError")
      );
    });

    it("should revert with ProposalPriceNotMatchedError when called with incorrect price", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.disapproveUSDPrice([price + 1n], {
          account: priceFeed2,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ProposalPriceNotMatchedError")
      );
    });

    it("should succeed and remove proposal when disapproval threshold is reached", async () => {
      const disapproveTxHash = await testContracts.lockManager.contract.write.disapproveUSDPrice(
        [price],
        {
          account: priceFeed2,
        }
      );
      await assertTxSuccess({ txHash: disapproveTxHash });

      const secondDisapproveHash =
        await testContracts.lockManager.contract.write.disapproveUSDPrice([price], {
          account: priceFeed3,
        });
      const txReceipt = await assertTxSuccess({ txHash: secondDisapproveHash });

      assertTransactionEvents({
        abi: testContracts.lockManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "DisapprovedUSDPrice",
            args: {
              _disapprover: priceFeed3,
            },
          },
          {
            eventName: "RemovedUSDProposal",
            args: undefined,
          },
        ],
      });

      await assert.rejects(
        testContracts.lockManager.contract.simulate.disapproveUSDPrice([price], {
          account: priceFeed2,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoProposalError")
      );
    });
  });
});
