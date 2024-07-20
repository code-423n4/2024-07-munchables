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

const price = 1337n;

describe("LockManager: approveUSDPrice", () => {
  let alice: `0x${string}`;
  let priceFeed1: `0x${string}`;
  let priceFeed2: `0x${string}`;
  let priceFeed3: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  async function assertApproveUSDPriceSuccess({
    tokenPrices,
  }: {
    tokenPrices: { tokenContractAddress: `0x${string}`; price: bigint }[];
  }) {
    for (const tokenPrice of tokenPrices) {
      const configuredToken = await testContracts.lockManager.contract.read.getConfiguredToken([
        tokenPrice.tokenContractAddress,
      ]);
      assert.equal(configuredToken.usdPrice, tokenPrice.price);
    }
  }

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();
    [alice] = testRoleAddresses.users;
    priceFeed1 = testRoleAddresses[Role.PriceFeed_1];
    priceFeed2 = testRoleAddresses[Role.PriceFeed_2];
    priceFeed3 = testRoleAddresses[Role.PriceFeed_3];
    admin = testRoleAddresses[Role.Admin];

    const configureTokenTxHash = await testContracts.lockManager.contract.write.configureToken(
      [zeroAddress, { usdPrice: 0n, nftCost: 10n, active: true, decimals: 18 }],
      { account: admin }
    );
    await assertTxSuccess({ txHash: configureTokenTxHash });
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
      testContracts.lockManager.contract.simulate.approveUSDPrice([100n], {
        account: priceFeed1,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "NoProposalError")
    );
  });

  describe("when a proposal is in progress", () => {
    beforeEach(async () => {
      const { request } = await testContracts.lockManager.contract.simulate.proposeUSDPrice(
        [price, [zeroAddress]],
        {
          account: priceFeed1,
        }
      );
      const txHash = await testClient.writeContract(request);
      await assertTxSuccess({ txHash });
    });

    it("should revert with InvalidRoleError when called as non price-feed", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.approveUSDPrice([price], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });

    it("should revert with ProposerCannotApproveError when called as proposer", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.approveUSDPrice([price], {
          account: priceFeed1,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ProposerCannotApproveError")
      );
    });

    it("should revert with ProposalPriceNotMatchedError when called with incorrect price", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.approveUSDPrice([price + 1n], {
          account: priceFeed2,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ProposalPriceNotMatchedError")
      );
    });

    it("should revert with ProposalAlreadyApprovedError", async () => {
      const txHash = await testContracts.lockManager.contract.write.approveUSDPrice([price], {
        account: priceFeed2,
      });
      await assertTxSuccess({ txHash });

      await assert.rejects(
        testContracts.lockManager.contract.simulate.approveUSDPrice([price], {
          account: priceFeed2,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ProposalAlreadyApprovedError")
      );
    });
  });

  describe("2 approvals needed", () => {
    beforeEach(async () => {
      const setUSDThresholdsTxHash =
        await testContracts.lockManager.contract.write.setUSDThresholds([2, 2], { account: admin });
      await assertTxSuccess({ txHash: setUSDThresholdsTxHash });

      const txHash = await testContracts.lockManager.contract.write.proposeUSDPrice(
        [price, [zeroAddress]],
        {
          account: priceFeed1,
        }
      );
      await assertTxSuccess({ txHash });
    });

    it("should succeed and update price with 2 approvals", async () => {
      const txHash = await testContracts.lockManager.contract.write.approveUSDPrice([price], {
        account: priceFeed2,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.lockManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "ApprovedUSDPrice",
            args: {
              _approver: priceFeed2,
            },
          },
        ],
      });

      assertTransactionEvents({
        abi: testContracts.lockManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "USDPriceUpdated",
            args: {
              _tokenContract: zeroAddress,
              _newPrice: price,
            },
          },
        ],
      });

      await assertApproveUSDPriceSuccess({
        tokenPrices: [{ tokenContractAddress: zeroAddress, price }],
      });
    });
  });

  describe("3 approvals needed", () => {
    beforeEach(async () => {
      const setUSDThresholdsTxHash =
        await testContracts.lockManager.contract.write.setUSDThresholds([3, 3], { account: admin });
      await assertTxSuccess({ txHash: setUSDThresholdsTxHash });

      const txHash = await testContracts.lockManager.contract.write.proposeUSDPrice(
        [price, [zeroAddress]],
        {
          account: priceFeed1,
        }
      );
      await assertTxSuccess({ txHash });
    });

    it("should succeed and NOT update price with 2/3", async () => {
      const txHash = await testContracts.lockManager.contract.write.approveUSDPrice([price], {
        account: priceFeed2,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.lockManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "ApprovedUSDPrice",
            args: {
              _approver: priceFeed2,
            },
          },
        ],
      });

      await assertApproveUSDPriceSuccess({
        tokenPrices: [{ tokenContractAddress: zeroAddress, price: 0n }],
      });
    });

    it("should succeed and update price with 3/3", async () => {
      let txHash = await testContracts.lockManager.contract.write.approveUSDPrice([price], {
        account: priceFeed2,
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.lockManager.contract.write.approveUSDPrice([price], {
        account: priceFeed3,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.lockManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "ApprovedUSDPrice",
            args: {
              _approver: priceFeed3,
            },
          },
        ],
      });

      await assertApproveUSDPriceSuccess({
        tokenPrices: [{ tokenContractAddress: zeroAddress, price }],
      });
    });
  });
});
