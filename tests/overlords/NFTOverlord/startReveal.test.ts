import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { checksumAddress, keccak256, toHex } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { StorageKey } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockLockManagerContractType, deployMockLockManager } from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("NFTOverlord: startReveal", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockLockManager: MockLockManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockLockManager = await deployMockLockManager({ testContracts });
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

  it("should revert with PlayerNotRegisteredError when player not registered", async () => {
    await assert.rejects(
      testContracts.nftOverlord.contract.simulate.startReveal({
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "PlayerNotRegisteredError")
    );
  });

  describe("when player is registered", () => {
    beforeEach(async () => {
      await registerPlayer({ account: alice, testContracts });
    });

    it("should revert with NoUnrevealedMunchablesError when player has no unrevealed NFTs", async () => {
      await assert.rejects(
        testContracts.nftOverlord.contract.simulate.startReveal({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoUnrevealedMunchablesError")
      );
    });

    describe("when player has unrevealed NFTs", () => {
      beforeEach(async () => {
        const txHash = await mockLockManager.write.callAddRevealForTest([alice, 2]);
        await assertTxSuccess({ txHash });
      });

      it("should succeed", async () => {
        const txHash = await testContracts.nftOverlord.contract.write.startReveal({
          account: alice,
        });
        const txReceipt = await assertTxSuccess({ txHash });

        assertTransactionEvents({
          abi: testContracts.nftOverlord.contract.abi,
          logs: txReceipt.logs,
          expectedEvents: [
            {
              eventName: "MunchableRevealRequested",
              args: {
                _player: alice,
              },
            },
          ],
        });

        assert.ok(testContracts.rngProxySelfHosted, "RNG proxy contract not available");
        assertTransactionEvents({
          abi: testContracts.rngProxySelfHosted.contract.abi,
          logs: txReceipt.logs,
          expectedEvents: [
            {
              eventName: "RandomRequested",
              args: {
                _target: checksumAddress(testContracts.nftOverlord.contract.address),
                _index: BigInt(alice),
                _selector: keccak256(toHex("reveal(uint256,bytes)")).slice(0, 10),
              },
            },
          ],
        });
      });

      describe("when reveal queue is full", () => {
        beforeEach(async () => {
          // make sure max queue is 1
          let txHash = await testContracts.configStorage.contract.write.setSmallInt([
            StorageKey.MaxRevealQueue,
            1,
            true,
          ]);
          await assertTxSuccess({ txHash });

          txHash = await testContracts.nftOverlord.contract.write.startReveal({
            account: alice,
          });
          await assertTxSuccess({ txHash });
        });

        it("should revert with RevealQueueFullError when player reveal queue is full", async () => {
          await assert.rejects(
            testContracts.nftOverlord.contract.simulate.startReveal({
              account: alice,
            }),
            (err: Error) => assertContractFunctionRevertedError(err, "RevealQueueFullError")
          );
        });
      });
    });
  });
});
