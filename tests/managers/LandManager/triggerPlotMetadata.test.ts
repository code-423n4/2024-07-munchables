import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockLockManagerContractType, deployMockLockManager } from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("LandManager: triggerPlotMetadata", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockLockManager: MockLockManagerContractType;
  const usdPrice = 3000n * BigInt(1e18);

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();

    [alice, bob] = testRoleAddresses.users;
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: bob,
      value: parseEther("10"),
    });
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

  describe("all path - mock lock manager", () => {
    beforeEach(async () => {
      mockLockManager = await deployMockLockManager({ testContracts, notify: false });
      const configureTokenTxHash = await mockLockManager.write.configureToken([
        zeroAddress,
        {
          usdPrice,
          nftCost: BigInt(1e18),
          active: true,
          decimals: 18,
        },
      ]);
      await assertTxSuccess({ txHash: configureTokenTxHash });
      await registerPlayer({
        account: alice,
        testContracts,
      });
    });
    it("prior lock but no update called should pass", async () => {
      const block = await testClient.getBlock();
      const setLockedTokenTxHash = await mockLockManager.write.setLockedTokenForTest([
        alice,
        zeroAddress,
        {
          quantity: 2n * 1n,
          remainder: 0n,
          unlockTime: Number(block.timestamp + 10000n),
          lastLockTime: Number(block.timestamp),
        },
      ]);
      await assertTxSuccess({ txHash: setLockedTokenTxHash });
      const { request } =
        await testContracts.landManagerProxy.contract.simulate.triggerPlotMetadata({
          account: alice,
        });
      const txHash = await testClient.writeContract(request);
      const receipt = await assertTxSuccess({ txHash: txHash });
      assertTransactionEvents({
        abi: testContracts.landManagerRoot.contract.abi,
        logs: receipt.logs,
        expectedEvents: [
          {
            eventName: "UpdatePlotsMeta",
            args: {
              landlord: alice,
            },
          },
        ],
      });
    });
    it("no trigger calls twice -> first call signifies success", async () => {
      const block = await testClient.getBlock();
      const setLockedTokenTxHash = await mockLockManager.write.setLockedTokenForTest([
        alice,
        zeroAddress,
        {
          quantity: 2n * 1n,
          remainder: 0n,
          unlockTime: Number(block.timestamp + 10000n),
          lastLockTime: Number(block.timestamp),
        },
      ]);
      await assertTxSuccess({ txHash: setLockedTokenTxHash });
      const { request } =
        await testContracts.landManagerProxy.contract.simulate.triggerPlotMetadata({
          account: alice,
        });
      const txHash = await testClient.writeContract(request);
      const receipt = await assertTxSuccess({ txHash: txHash });
      assertTransactionEvents({
        abi: testContracts.landManagerRoot.contract.abi,
        logs: receipt.logs,
        expectedEvents: [
          {
            eventName: "UpdatePlotsMeta",
            args: {
              landlord: alice,
            },
          },
        ],
      });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.triggerPlotMetadata({ account: alice }),
        (err: Error) => assertContractFunctionRevertedError(err, "PlotMetadataTriggeredError")
      );
    });
  });

  describe("path - normal lock manager", () => {
    beforeEach(async () => {
      await registerPlayer({
        account: alice,
        testContracts,
      });
    });
    it("no trigger calls after update called", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const txHash = await testClient.writeContract(request);
      const receipt = await assertTxSuccess({ txHash: txHash });
      assertTransactionEvents({
        abi: testContracts.landManagerRoot.contract.abi,
        logs: receipt.logs,
        expectedEvents: [
          {
            eventName: "UpdatePlotsMeta",
            args: {
              landlord: alice,
            },
          },
        ],
      });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.triggerPlotMetadata({ account: alice }),
        (err: Error) => assertContractFunctionRevertedError(err, "PlotMetadataTriggeredError")
      );
    });
  });
});
