import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockNFTAttributesManagerContractType,
  MockSnuggeryManagerContractType,
  deployMockNFTAttributesManager,
  deployMockSnuggeryManager,
} from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("ClaimManager: spendPoints", () => {
  let admin: `0x${string}`;
  let bob: `0x${string}`;
  let alice: `0x${string}`;
  let newPeriodRole: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockSnuggeryManager: MockSnuggeryManagerContractType;
  let mockNFTAttributesManager: MockNFTAttributesManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [bob, alice] = testRoleAddresses.users;
    newPeriodRole = testRoleAddresses[Role.NewPeriod];
    admin = testRoleAddresses[Role.Admin];
    mockNFTAttributesManager = await deployMockNFTAttributesManager({
      testContracts,
    });
    mockSnuggeryManager = await deployMockSnuggeryManager({ testContracts });

    await testClient.setBalance({
      address: newPeriodRole,
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

  describe("all paths", () => {
    beforeEach(async () => {
      await registerPlayer({
        account: alice,
        realm: 1,
        testContracts,
      });
      await registerPlayer({
        account: bob,
        realm: 1,
        referrer: alice,
        testContracts,
      });

      const snuggery: { tokenId: bigint; importedDate: number }[] = [];
      for (let i = 1; i < 6; i++) {
        const setNFTAttrsTxHash = await mockNFTAttributesManager.write.setAttributesForTest([
          BigInt(i),
          {
            chonks: 1000n,
            level: i,
            evolution: 0,
            lastPettedTime: 0n,
          },
        ]);
        await assertTxSuccess({ txHash: setNFTAttrsTxHash });

        snuggery.push({ tokenId: BigInt(i), importedDate: 0 });
      }

      let setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([bob, snuggery]);
      await assertTxSuccess({ txHash: setSnuggeryTxHash });

      setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([alice, snuggery]);
      await assertTxSuccess({ txHash: setSnuggeryTxHash });

      let txHash = await mockSnuggeryManager.write.setGlobalTotalChonk([45000n], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      await testClient.setNextBlockTimestamp({ timestamp: STARTING_TIMESTAMP });
      txHash = await testContracts.claimManagerProxy.contract.write.newPeriod({
        account: newPeriodRole,
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.claimManagerProxy.contract.write.claimPoints({ account: bob });
      await assertTxSuccess({ txHash });
    });
    it("revert if tries to spend too much", async () => {
      const t25 = BigInt(1e18) * BigInt(1e7);
      await assert.rejects(
        mockSnuggeryManager.simulate.spendPoints([bob, t25], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotEnoughPointsError")
      );
    });
    it("spend points properly", async () => {
      const beforePoints = await testContracts.claimManagerProxy.contract.read.getPoints([bob]);
      const txHash = await mockSnuggeryManager.write.spendPoints([bob, BigInt(1e3)], {
        account: bob,
      });
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.claimManagerRoot.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "PointsSpent",
            args: {
              _player: bob,
              _pointsSpent: 1000n,
            },
          },
        ],
      });
      const afterPoints = await testContracts.claimManagerProxy.contract.read.getPoints([bob]);
      assert.equal(beforePoints - 1000n, afterPoints);
    });
  });
});
