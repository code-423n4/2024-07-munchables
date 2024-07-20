import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { StorageKey } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import {
  TestERC20ContractType,
  deployTestERC20Contract,
  getTestContracts,
  getTestRoleAddresses,
} from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("LockManager: setLockDuration", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let testERC20Contract: TestERC20ContractType;
  let maxLockDuration: bigint;

  async function assertSetLockDurationSuccess({
    player,
    lockDuration,
    txHash,
  }: {
    player: `0x${string}`;
    lockDuration: bigint;
    txHash: `0x${string}`;
  }) {
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.lockManager.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "LockDuration",
          args: {
            _player: player,
            _duration: lockDuration,
          },
        },
      ],
    });

    const playerSettings = await testContracts.lockManager.contract.read.getPlayerSettings([
      player,
    ]);
    assert.ok(playerSettings);
    assert.equal(playerSettings.lockDuration, Number(lockDuration));

    const lockedTokens = await testContracts.lockManager.contract.read.getLocked([player]);
    assert(lockedTokens instanceof Array);
    for (const lockedToken of lockedTokens) {
      if (lockedToken.lockedToken.quantity === 0n) {
        assert.equal(lockedToken.lockedToken.unlockTime, 0);
      } else {
        assert.equal(
          lockedToken.lockedToken.unlockTime,
          lockedToken.lockedToken.lastLockTime + Number(lockDuration)
        );
      }
    }
  }

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice] = testRoleAddresses.users;

    maxLockDuration = await testContracts.configStorage.contract.read.getUint([
      StorageKey.MaxLockDuration,
    ]);

    await registerPlayer({ account: alice, testContracts });

    testERC20Contract = await deployTestERC20Contract({ account: alice });

    const configureTokenTxHash = await testContracts.lockManager.contract.write.configureToken([
      testERC20Contract.address,
      { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("2"), active: true, decimals: 18 },
    ]);
    await assertTxSuccess({ txHash: configureTokenTxHash });
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  it("should revert with MaximumLockDurationError when setting lock duration greater than configured max", async () => {
    await assert.rejects(
      testContracts.lockManager.contract.simulate.setLockDuration([maxLockDuration + 1n], {
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "MaximumLockDurationError")
    );
  });

  describe("when player has no locked tokens", () => {
    it("should succeed when setting to max duration", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.setLockDuration(
        [maxLockDuration],
        { account: alice }
      );
      const txHash = await testClient.writeContract(request);
      await assertSetLockDurationSuccess({
        player: alice,
        lockDuration: maxLockDuration,
        txHash,
      });
    });
  });

  describe("when player has locked tokens for less than max duration", () => {
    let initialLockDuration: bigint;
    beforeEach(async () => {
      // Set lock duration initially to less than max
      initialLockDuration = maxLockDuration - 1n;
      const { request } = await testContracts.lockManager.contract.simulate.setLockDuration(
        [initialLockDuration],
        { account: alice }
      );
      const setLockDurationTxHash = await testClient.writeContract(request);
      await assertTxSuccess({ txHash: setLockDurationTxHash });

      // Lock eth
      const lockEthTxHash = await testContracts.lockManager.contract.write.lock(
        [zeroAddress, parseEther("2")],
        {
          account: alice,
          value: parseEther("2"),
        }
      );
      await assertTxSuccess({ txHash: lockEthTxHash });

      // Aprove ERC20 for lock
      const approveERC20TxHash = await testERC20Contract.write.approve([
        testContracts.lockManager.contract.address,
        parseEther("2"),
      ]);
      await assertTxSuccess({ txHash: approveERC20TxHash });

      // Lock ERC20
      const lockERC20TxHash = await testContracts.lockManager.contract.write.lock(
        [testERC20Contract.address, parseEther("2")],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash: lockERC20TxHash });

      // Sanity check that unlock times were set as expected to less than
      // the max duration so when we assert the max duration unlock time
      // later we know it changed
      const lockedTokens = await testContracts.lockManager.contract.read.getLocked([alice]);
      assert(lockedTokens instanceof Array);
      const lockedEthToken = lockedTokens.find((t) => t.tokenContract === zeroAddress);
      assert.ok(lockedEthToken);
      assert.equal(
        lockedEthToken.lockedToken.unlockTime,
        lockedEthToken.lockedToken.lastLockTime + Number(initialLockDuration)
      );
      const lockedERC20Token = lockedTokens.find(
        (t) => t.tokenContract === testERC20Contract.address
      );
      assert.ok(lockedERC20Token);
      assert.equal(
        lockedERC20Token.lockedToken.unlockTime,
        lockedERC20Token.lockedToken.lastLockTime + Number(initialLockDuration)
      );
    });

    it("should revert with LockDurationReducedError when reducing lock duration", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.setLockDuration([initialLockDuration - 1n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "LockDurationReducedError")
      );
    });

    it("should succeed when locking for max duration and increase unlock time", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.setLockDuration(
        [maxLockDuration],
        { account: alice }
      );
      const txHash = await testClient.writeContract(request);
      await assertSetLockDurationSuccess({
        player: alice,
        lockDuration: maxLockDuration,
        txHash,
      });
    });
  });
});
