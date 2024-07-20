import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
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

const lockDuration = 1000n;

describe("LockManager: unlock", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let testERC20Contract: TestERC20ContractType;

  async function assertUnlockSuccess({
    player,
    quantity,
    lockedQuantity,
    balance,
    tokenContractAddress,
    txHash,
  }: {
    player: `0x${string}`;
    quantity: bigint;
    lockedQuantity: bigint;
    balance: bigint;
    tokenContractAddress: `0x${string}`;
    txHash: `0x${string}`;
  }) {
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.lockManager.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "Unlocked",
          args: {
            _player: player,
            _tokenContract: tokenContractAddress,
            _quantity: quantity,
          },
        },
      ],
    });

    if (tokenContractAddress === zeroAddress) {
      const ethBalance = await testClient.getBalance({
        address: player,
      });
      // Subtract gas used on the unlock call from the expected balance
      assert.equal(ethBalance, balance - txReceipt.gasUsed);
    } else {
      const lockManagerERC20Balance = await testERC20Contract.read.balanceOf([player]);
      assert.equal(lockManagerERC20Balance, balance);
    }

    const lockedTokens = await testContracts.lockManager.contract.read.getLocked([player]);
    assert(lockedTokens instanceof Array);
    const lockedToken = lockedTokens.find((t) => t.tokenContract === tokenContractAddress);
    assert.ok(lockedToken);
    assert.equal(lockedToken.lockedToken.quantity, lockedQuantity);
  }

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice] = testRoleAddresses.users;

    await registerPlayer({ account: alice, testContracts });

    testERC20Contract = await deployTestERC20Contract({ account: alice });

    const configureTokenTxHash = await testContracts.lockManager.contract.write.configureToken([
      testERC20Contract.address,
      { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("2"), active: true, decimals: 18 },
    ]);
    await assertTxSuccess({ txHash: configureTokenTxHash });

    const setLockDurationTxHash = await testContracts.lockManager.contract.write.setLockDuration(
      [lockDuration],
      { account: alice }
    );
    await assertTxSuccess({ txHash: setLockDurationTxHash });
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

  describe("when player has no locked tokens", () => {
    it("should revert with InsufficientLockAmountError", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.unlock([zeroAddress, parseEther("1")], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InsufficientLockAmountError")
      );
    });
  });

  describe("when player has locked zero-address", () => {
    const lockQuantity = parseEther("2");
    let unlockTime: number;

    beforeEach(async () => {
      const lockTxHash = await testContracts.lockManager.contract.write.lock(
        [zeroAddress, lockQuantity],
        {
          account: alice,
          value: lockQuantity,
        }
      );
      await assertTxSuccess({ txHash: lockTxHash });
      const lockedTokens = await testContracts.lockManager.contract.read.getLocked([alice]);
      assert(lockedTokens instanceof Array);
      const lockedToken = lockedTokens.find((t) => t.tokenContract === zeroAddress);
      assert.ok(lockedToken);
      unlockTime = lockedToken.lockedToken.unlockTime;
    });

    it("should revert with TokenStillLockedError when unlock time is in future", async () => {
      // Lock time is in the future because the chain is still at the same block
      await assert.rejects(
        testContracts.lockManager.contract.simulate.unlock([zeroAddress, lockQuantity], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "TokenStillLockedError")
      );
    });

    describe("when unlock time is past", () => {
      let aliceEthBalanceBeforeUnlock: bigint;
      beforeEach(async () => {
        // Get alice's current balance to account for gas used on the lock call
        aliceEthBalanceBeforeUnlock = await testClient.getBalance({
          address: alice,
        });

        // Fast-forward the chain to put unlock time in past
        await testClient.setNextBlockTimestamp({
          timestamp: BigInt(unlockTime + 1),
        });
        await testClient.mine({ blocks: 1 });
      });

      it("should revert with InsufficientLockAmountError when attempting to unlock a different token", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.unlock(
            [testERC20Contract.address, parseEther("1")],
            { account: alice }
          ),
          (err: Error) => assertContractFunctionRevertedError(err, "InsufficientLockAmountError")
        );
      });

      it("should revert with InsufficientLockAmountError when quantity > locked quantity", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.unlock([zeroAddress, lockQuantity + 1n], {
            account: alice,
          }),
          (err: Error) => assertContractFunctionRevertedError(err, "InsufficientLockAmountError")
        );
      });

      it("should succeed when quantity == locked quantity", async () => {
        const unlockQuantity = lockQuantity;
        const { request } = await testContracts.lockManager.contract.simulate.unlock(
          [zeroAddress, unlockQuantity],
          { account: alice }
        );
        const txHash = await testClient.writeContract(request);
        await assertUnlockSuccess({
          player: alice,
          quantity: unlockQuantity,
          lockedQuantity: 0n,
          balance: aliceEthBalanceBeforeUnlock + unlockQuantity,
          tokenContractAddress: zeroAddress,
          txHash,
        });
      });

      it("should succeed and leave some locked when quantity < locked quantity", async () => {
        const unlockQuantity = parseEther("1");
        const { request } = await testContracts.lockManager.contract.simulate.unlock(
          [zeroAddress, unlockQuantity],
          { account: alice }
        );
        const txHash = await testClient.writeContract(request);
        const expectedLockedQuantity = lockQuantity - unlockQuantity;
        await assertUnlockSuccess({
          player: alice,
          quantity: unlockQuantity,
          lockedQuantity: expectedLockedQuantity,
          balance: aliceEthBalanceBeforeUnlock + unlockQuantity,
          tokenContractAddress: zeroAddress,
          txHash,
        });
      });
    });
  });

  describe("when player has locked ERC20 tokens", () => {
    const erc20Balance = parseEther("100");
    let unlockTime: number;

    beforeEach(async () => {
      // Approve 2 tokens on the test ERC20
      const approveERC20TxHash = await testERC20Contract.write.approve([
        testContracts.lockManager.contract.address,
        parseEther("2"),
      ]);
      await assertTxSuccess({ txHash: approveERC20TxHash });

      const lockTxHash = await testContracts.lockManager.contract.write.lock(
        [testERC20Contract.address, parseEther("2")],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash: lockTxHash });
      const lockedTokens = await testContracts.lockManager.contract.read.getLocked([alice]);
      assert(lockedTokens instanceof Array);
      const lockedToken = lockedTokens.find((t) => t.tokenContract === testERC20Contract.address);
      assert.ok(lockedToken);
      unlockTime = lockedToken.lockedToken.unlockTime;

      const lockManagerERC20Balance = await testERC20Contract.read.balanceOf([alice]);
      // Sanity check the ERC20 balance so we can test that it gets returned
      assert.equal(lockManagerERC20Balance, erc20Balance - parseEther("2"));
    });

    describe("when unlock time is past", () => {
      beforeEach(async () => {
        // Fast-forward the chain to put unlock time in past
        await testClient.setNextBlockTimestamp({
          timestamp: BigInt(unlockTime + 1),
        });
        await testClient.mine({ blocks: 1 });
      });

      it("should revert with InsufficientLockAmountError when attempting to unlock a different token", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.unlock([zeroAddress, parseEther("1")], {
            account: alice,
          }),
          (err: Error) => assertContractFunctionRevertedError(err, "InsufficientLockAmountError")
        );
      });

      it("should succeed when quantity == locked quantity", async () => {
        const { request } = await testContracts.lockManager.contract.simulate.unlock(
          [testERC20Contract.address, parseEther("2")],
          { account: alice }
        );
        const txHash = await testClient.writeContract(request);
        await assertUnlockSuccess({
          player: alice,
          quantity: parseEther("2"),
          lockedQuantity: 0n,
          balance: erc20Balance,
          tokenContractAddress: testERC20Contract.address,
          txHash,
        });
      });
    });
  });
});
