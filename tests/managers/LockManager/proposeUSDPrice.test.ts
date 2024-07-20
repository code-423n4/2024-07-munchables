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

describe("LockManager: proposeUSDPrice", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  async function assertProposeUSDPriceSuccess({
    sender,
    price,
    txHash,
  }: {
    sender: `0x${string}`;
    price: bigint;
    txHash: `0x${string}`;
  }) {
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.lockManager.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "ProposedUSDPrice",
          args: {
            _proposer: sender,
            _price: price,
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

  it("should revert with InvalidRoleError when called as non price-feed", async () => {
    await assert.rejects(
      testContracts.lockManager.contract.simulate.proposeUSDPrice([100n, [zeroAddress]], {
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
    );
  });

  it("should revert with ProposalInvalidContractsError when called with no contracts", async () => {
    await assert.rejects(
      testContracts.lockManager.contract.simulate.proposeUSDPrice([100n, []], {
        account: admin,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "ProposalInvalidContractsError")
    );
  });

  it("should succeed when called as price-feed", async () => {
    const price = 1337n;
    const { request } = await testContracts.lockManager.contract.simulate.proposeUSDPrice(
      [price, [zeroAddress]],
      {
        account: admin,
      }
    );
    const txHash = await testClient.writeContract(request);
    await assertProposeUSDPriceSuccess({
      sender: admin,
      price,
      txHash,
    });
  });

  describe("when a proposal is in progress", () => {
    before(async () => {
      const txHash = await testContracts.lockManager.contract.write.proposeUSDPrice(
        [1337n, [zeroAddress]],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
    });

    it("should revert with ProposalInProgressError", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.proposeUSDPrice([42n, [zeroAddress]], {
          account: admin,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ProposalInProgressError")
      );
    });
  });
});
