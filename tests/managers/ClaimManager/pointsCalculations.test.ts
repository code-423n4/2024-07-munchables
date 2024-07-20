import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { getAddress, parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import { assertTransactionEvents, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockAccountManagerType,
  MockNFTOverlordContractType,
  deployMockAccountManager,
  deployMockNFTOverlord,
} from "../../utils/mock-contracts";
import { registerMockPlayer } from "../../utils/players";

describe("ClaimManager: points calculations", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let charlie: `0x${string}`;
  let danny: `0x${string}`;
  let newPeriodRole: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let pointsAvailable: bigint;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;
  let mockAccountManager: MockAccountManagerType;

  const importAndFeed = async (account: `0x${string}`, tokenId: bigint, schnibbles: bigint) => {
    let txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
      [testContracts.snuggeryManagerProxy.contract.address, true],
      { account }
    );
    await assertTxSuccess({ txHash });

    txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable([tokenId], {
      account,
    });
    await assertTxSuccess({ txHash });
    txHash = await testContracts.snuggeryManagerProxy.contract.write.feed([tokenId, schnibbles], {
      account,
    });
    await assertTxSuccess({ txHash });
  };

  const setupSnuggeries = async () => {
    for await (const a of [alice, bob, charlie, danny]) {
      await registerMockPlayer({
        account: a,
        realm: 1,
        mockAccountManager,
      });

      await mockNFTOverlord.write.addReveal([a, 100], { account: a });

      for (let i = 0; i < 10; i++) {
        await mockNFTOverlord.write.startReveal([a], { account: a });
        await mockNFTOverlord.write.reveal([a, 4, 12], { account: a });
      }

      const txHash = await mockAccountManager.write.giveSchnibbles([a, 1000000n * BigInt(1e18)], {
        account: a,
      });
      await assertTxSuccess({ txHash });
    }
  };

  const claimPoints = async (account: `0x${string}`): Promise<bigint> => {
    const prevPoints = await testContracts.claimManagerProxy.contract.read.getPoints([account]);
    const txHash = await testContracts.claimManagerProxy.contract.write.claimPoints([], {
      account,
    });
    await assertTxSuccess({ txHash });
    const points = await testContracts.claimManagerProxy.contract.read.getPoints([account]);

    return BigInt(points - prevPoints);
  };

  const periodOneSetup = async () => {
    // 3 accounts share the pot equally, should have remainder of 1
    await importAndFeed(alice, 1n, 1000n * BigInt(1e18));
    await importAndFeed(bob, 11n, 1000n * BigInt(1e18));
    await importAndFeed(charlie, 21n, 1000n * BigInt(1e18));

    // start new period
    const txHash = await testContracts.claimManagerProxy.contract.write.newPeriod([], {
      account: newPeriodRole,
    });
    await assertTxSuccess({ txHash });

    const currentPeriod = await testContracts.claimManagerProxy.contract.read.getCurrentPeriod([]);
    assert.equal(currentPeriod.id, 1);
    assert.equal(currentPeriod.available + currentPeriod.claimed, BigInt(1e7) * BigInt(1e18));
  };

  const nextPeriod = async () => {
    const prevPeriod = await testContracts.claimManagerProxy.contract.read.getCurrentPeriod([]);
    // forward in time to end of period
    await testClient.setNextBlockTimestamp({
      timestamp: BigInt(prevPeriod.endTime),
    });
    await testClient.mine({ blocks: 1 });

    const txHash = await testContracts.claimManagerProxy.contract.write.newPeriod([], {
      account: newPeriodRole,
    });
    const txReceipt = await assertTxSuccess({ txHash });

    const currentPeriod = await testContracts.claimManagerProxy.contract.read.getCurrentPeriod([]);
    assert.equal(currentPeriod.id, prevPeriod.id + 1);

    return { prevPeriod, currentPeriod, txHash, txReceipt };
  };

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [bob, alice, charlie, danny] = testRoleAddresses.users;
    newPeriodRole = testRoleAddresses[Role.NewPeriod];
    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
    mockAccountManager = await deployMockAccountManager({ testContracts });
    pointsAvailable = await testContracts.configStorage.contract.read.getUint([
      StorageKey.PointsPerPeriod,
    ]);

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

  describe("verify points", () => {
    before(setupSnuggeries);

    it("claiming in period 0 does not award points", async () => {
      await importAndFeed(alice, 1n, 1000n * BigInt(1e18));

      // try to manually claim, should not give points, try 3 times to be sure of no wierdness
      for (let i = 0; i < 3; i++) {
        await importAndFeed(alice, BigInt(i) + 2n, 1000n * BigInt(1e18));
        const pointsAlice = await claimPoints(alice);
        assert.equal(pointsAlice, 0n);

        // check global chonks, should not be 0
        const globalChonks =
          await testContracts.snuggeryManagerProxy.contract.read.getGlobalTotalChonk([]);
        assert.notEqual(globalChonks, 0n);
      }
    });

    describe("period 1", async () => {
      beforeEach(periodOneSetup);

      it("claiming in period 1", async () => {
        // alice claim
        const pointsAlice = await claimPoints(alice);
        let currentPeriod = await testContracts.claimManagerProxy.contract.read.getCurrentPeriod(
          []
        );
        assert.equal(pointsAlice, pointsAvailable / 3n);
        assert.equal(currentPeriod.claimed, pointsAlice);

        // bob claim
        const pointsBob = await claimPoints(bob);
        currentPeriod = await testContracts.claimManagerProxy.contract.read.getCurrentPeriod([]);
        assert.equal(pointsBob, pointsAvailable / 3n);
        assert.equal(currentPeriod.claimed, pointsAlice + pointsBob);

        // charlie claim
        const pointsCharlie = await claimPoints(charlie);
        currentPeriod = await testContracts.claimManagerProxy.contract.read.getCurrentPeriod([]);
        assert.equal(pointsCharlie, pointsAvailable / 3n);
        assert.equal(currentPeriod.claimed, pointsAlice + pointsBob + pointsCharlie);
      });

      it("ineligible claim", async () => {
        await claimPoints(alice);
        await claimPoints(bob);
        await claimPoints(charlie);
        const pointsDanny = await claimPoints(danny);

        assert.equal(pointsDanny, 0n);
      });

      it("late import and claim", async () => {
        // danny imports and feeds in period 1, he should not claim anything
        await importAndFeed(danny, 31n, 1000n * BigInt(1e18));

        let pointsDanny = await claimPoints(danny);
        assert.equal(pointsDanny, 0n);

        await importAndFeed(danny, 32n, 1000n * BigInt(1e18));

        pointsDanny = await claimPoints(danny);
        assert.equal(pointsDanny, 0n);
      });
    });

    describe("period 2", async () => {
      before(async () => {
        await periodOneSetup();
      });

      it("check remainder is carried forward and can be claimed", async () => {
        await claimPoints(alice);
        await claimPoints(bob);
        const globalChonks =
          await testContracts.snuggeryManagerProxy.contract.read.getGlobalTotalChonk([]);

        const { prevPeriod, txReceipt } = await nextPeriod();
        const excess = BigInt(prevPeriod.available - prevPeriod.claimed);
        assertTransactionEvents({
          abi: testContracts.claimManagerRoot.contract.abi,
          logs: txReceipt.logs,
          expectedEvents: [
            {
              eventName: "NewPeriodStarted",
              args: {
                _periodId: 2,
                _startTime: prevPeriod.endTime + 1,
                _endTime: prevPeriod.endTime + 1 + 60 * 60 * 24,
                _availablePoints: pointsAvailable,
                _totalGlobalChonk: globalChonks,
                _prevPeriodPointsClaimed: prevPeriod.claimed,
                _excessPoints: excess,
              },
            },
          ],
        });

        const claimedAlice = await claimPoints(alice);
        const expectedClaimedAlice = (excess + pointsAvailable) / 3n;
        assert.equal(claimedAlice, expectedClaimedAlice);
      });

      it("multiple claims", async () => {
        await claimPoints(alice);
        await claimPoints(bob);

        await nextPeriod();

        await claimPoints(alice);
        const claimedAlice2 = await claimPoints(alice);

        assert.equal(claimedAlice2, 0n);
      });

      it("export triggers claim", async () => {
        await nextPeriod();

        const txHash = await testContracts.snuggeryManagerProxy.contract.write.exportMunchable(
          [1n],
          {
            account: alice,
          }
        );
        const txReceipt = await assertTxSuccess({ txHash });

        assertTransactionEvents({
          abi: testContracts.claimManagerRoot.contract.abi,
          logs: txReceipt.logs,
          expectedEvents: [
            {
              eventName: "Claimed",
              args: {
                _sender: getAddress(testContracts.snuggeryManagerProxy.contract.address),
                _player: alice,
                _referrer: zeroAddress,
                _periodId: 2,
                _pointsClaimed: (pointsAvailable * 2n) / 3n, // double because period 1 had no claims
                _referralBonus: 0n,
              },
            },
          ],
        });

        const claimedAlice2 = await claimPoints(alice);

        assert.equal(claimedAlice2, 0n);
      });
    });
  });
});
