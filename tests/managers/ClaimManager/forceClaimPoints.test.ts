import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { getAddress, parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionExecutionError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { ONE_DAY, STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockNFTAttributesManagerContractType,
  MockSnuggeryManagerContractType,
  deployMockNFTAttributesManager,
  deployMockSnuggeryManager,
} from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

const t25 = BigInt(1e18) * BigInt(1e7);

const claimAmount = (t25 * 5000n) / 45000n;

describe("ClaimManager: forceClaimPoints", () => {
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

  describe("normal behavior", () => {
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
    });
    it("claim, with referral, no excess", async () => {
      const txHash = await mockSnuggeryManager.write.forceClaimPoints([bob], { account: bob });
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.claimManagerRoot.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "Claimed",
            args: {
              _sender: getAddress(mockSnuggeryManager.address),
              _player: bob,
              _referrer: alice,
              _periodId: 1,
              _pointsClaimed: claimAmount,
              _referralBonus: (claimAmount * 2n * BigInt(1e16)) / BigInt(1e18),
            },
          },
        ],
      });
    });
    it("claim, no referrer, no excess", async () => {
      const txHash = await mockSnuggeryManager.write.forceClaimPoints([alice], { account: alice });
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.claimManagerRoot.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "Claimed",
            args: {
              _sender: getAddress(mockSnuggeryManager.address),
              _player: alice,
              _referrer: zeroAddress,
              _periodId: 1,
              _pointsClaimed: claimAmount,
              _referralBonus: 0n,
            },
          },
        ],
      });
    });
    it("claim, successive calls, zero points", async () => {
      let txHash = await mockSnuggeryManager.write.forceClaimPoints([alice], { account: alice });
      let txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.claimManagerRoot.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "Claimed",
            args: {
              _sender: getAddress(mockSnuggeryManager.address),
              _player: alice,
              _referrer: zeroAddress,
              _periodId: 1,
              _pointsClaimed: claimAmount,
              _referralBonus: 0n,
            },
          },
        ],
      });
      txHash = await testContracts.claimManagerProxy.contract.write.claimPoints({ account: alice });
      txReceipt = await assertTxSuccess({ txHash });
      const points = await testContracts.claimManagerProxy.contract.read.getPoints([alice]);
      assert.equal(claimAmount, points);
    });
    it("claim, successive calls on successive periods, excess skips over", async () => {
      let txHash = await mockSnuggeryManager.write.forceClaimPoints([alice], { account: alice });
      let txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.claimManagerRoot.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "Claimed",
            args: {
              _sender: getAddress(mockSnuggeryManager.address),
              _player: alice,
              _referrer: zeroAddress,
              _periodId: 1,
              _pointsClaimed: claimAmount,
              _referralBonus: 0n,
            },
          },
        ],
      });

      await testClient.setNextBlockTimestamp({ timestamp: STARTING_TIMESTAMP + ONE_DAY });
      txHash = await testContracts.claimManagerProxy.contract.write.newPeriod({
        account: newPeriodRole,
      });
      await assertTxSuccess({ txHash });

      txHash = await mockSnuggeryManager.write.forceClaimPoints([alice], { account: alice });
      txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.claimManagerRoot.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "Claimed",
            args: {
              _sender: getAddress(mockSnuggeryManager.address),
              _player: alice,
              _referrer: zeroAddress,
              _periodId: 2,
              _pointsClaimed: ((t25 + t25 - claimAmount) * 5000n) / 45000n,
              _referralBonus: 0n,
            },
          },
        ],
      });
    });
    it("revert claim outside of valid period", async () => {
      await testClient.setNextBlockTimestamp({ timestamp: STARTING_TIMESTAMP + ONE_DAY * 3n });
      await testClient.mine({ blocks: 1 });
      await assert.rejects(
        mockSnuggeryManager.simulate.forceClaimPoints([alice], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionExecutionError(err, "InvalidPeriodError")
      );
    });
  });
});
