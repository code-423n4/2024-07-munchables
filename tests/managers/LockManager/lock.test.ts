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
import { registerPlayer, registerSubAccount } from "../../utils/players";

const lockDuration = 1000n;

export async function assertLockSuccess({
  testContracts,
  testERC20Contract,
  numberNFTs,
  unrevealedNFTs,
  player,
  quantity,
  lockedQuantity,
  remainder,
  sender,
  tokenContractAddress,
  txHash,
  _lockDuration = lockDuration,
}: {
  numberNFTs: bigint;
  unrevealedNFTs?: number;
  player: `0x${string}`;
  quantity: bigint;
  lockedQuantity: bigint;
  remainder: bigint;
  sender: `0x${string}`;
  tokenContractAddress: `0x${string}`;
  txHash: `0x${string}`;
  testContracts: DeployedContractsType;
  testERC20Contract?: TestERC20ContractType;
  _lockDuration?: bigint;
}) {
  if (unrevealedNFTs === undefined) {
    unrevealedNFTs = Number(numberNFTs);
  }

  const txReceipt = await assertTxSuccess({ txHash });
  assertTransactionEvents({
    abi: testContracts.lockManager.contract.abi,
    logs: txReceipt.logs,
    expectedEvents: [
      {
        eventName: "Locked",
        args: {
          _player: player,
          _sender: sender,
          _tokenContract: tokenContractAddress,
          _quantity: quantity,
          _remainder: remainder,
          _numberNFTs: numberNFTs,
          _lockDuration: _lockDuration,
        },
      },
    ],
  });

  if (tokenContractAddress !== zeroAddress && testERC20Contract) {
    const lockManagerERC20Balance = await testERC20Contract.read.balanceOf([
      testContracts.lockManager.contract.address,
    ]);
    assert.equal(lockManagerERC20Balance, quantity);
  }

  const lockedTokens = await testContracts.lockManager.contract.read.getLocked([player]);
  assert(lockedTokens instanceof Array);
  const lockedToken = lockedTokens.find((t) => t.tokenContract === tokenContractAddress);
  assert.ok(lockedToken);
  assert.equal(
    lockedToken.lockedToken.quantity,
    lockedQuantity,
    `Locked token quantity mismatch (expected: ${lockedToken.lockedToken.quantity}, actual: ${lockedQuantity})`
  );
  assert.equal(
    lockedToken.lockedToken.remainder,
    remainder,
    `Locked token remainder mismatch (expected: ${lockedToken.lockedToken.quantity}, actual: ${lockedQuantity})`
  );
  const txBlock = await testClient.getBlock({
    blockHash: txReceipt.blockHash,
  });
  assert.equal(
    lockedToken.lockedToken.lastLockTime,
    Number(txBlock.timestamp),
    `Locked token lastLockTime mismatch (expected: ${lockedToken.lockedToken.quantity}, actual: ${lockedQuantity})`
  );
  assert.equal(
    lockedToken.lockedToken.unlockTime,
    Number(txBlock.timestamp + _lockDuration),
    `Locked token unlockTime mismatch (expected: ${lockedToken.lockedToken.quantity}, actual: ${lockedQuantity})`
  );

  const actualUnrevealedNFTs = await testContracts.nftOverlord.contract.read.getUnrevealedNFTs([
    player,
  ]);
  assert.equal(actualUnrevealedNFTs, unrevealedNFTs);
}

describe("LockManager: lock", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let testERC20Contract: TestERC20ContractType;
  let testSecondERC20Contract: TestERC20ContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob] = testRoleAddresses.users;

    testERC20Contract = await deployTestERC20Contract({ account: alice });
    testSecondERC20Contract = await deployTestERC20Contract({ account: alice });

    await registerPlayer({ account: alice, testContracts });

    const setLockDurationTxHash = await testContracts.lockManager.contract.write.setLockDuration(
      [lockDuration],
      { account: alice }
    );
    assertTxSuccess({ txHash: setLockDurationTxHash });
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

  describe("when zero-address token is configured on the contract", () => {
    beforeEach(async () => {
      const configureTokenTxHash = await testContracts.lockManager.contract.write.configureToken([
        zeroAddress,
        { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("2"), active: true, decimals: 18 },
      ]);
      await assertTxSuccess({ txHash: configureTokenTxHash });
    });

    it("should revert with AccountNotRegisteredError when player not registered for account", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.lock([zeroAddress, parseEther("1")], {
          account: bob,
          value: parseEther("1"),
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "AccountNotRegisteredError")
      );
    });

    describe("when sub-account is available", () => {
      beforeEach(async () => {
        await registerSubAccount({
          account: alice,
          subAccount: bob,
          testContracts,
        });
      });

      it("should revert with SubAccountCannotLockError when sub-account is used", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.lock([zeroAddress, parseEther("1")], {
            account: bob,
            value: parseEther("1"),
          }),
          (err: Error) => assertContractFunctionRevertedError(err, "SubAccountCannotLockError")
        );
      });
    });

    it("should revert with ETHValueIncorrectError when quantity != value", async () => {
      await assert.rejects(
        testContracts.lockManager.contract.simulate.lock([zeroAddress, parseEther("2")], {
          account: alice,
          value: parseEther("1"),
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ETHValueIncorrectError")
      );
    });

    it("should succeed when quantity == value", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const txHash = await testClient.writeContract(request);
      await assertLockSuccess({
        testContracts,
        testERC20Contract,
        numberNFTs: 0n,
        player: alice,
        quantity: parseEther("1"),
        lockedQuantity: parseEther("1"),
        remainder: 0n,
        sender: alice,
        tokenContractAddress: zeroAddress,
        txHash,
      });
    });

    it("should succeed twice and increase quantity of lock", async () => {
      const { request: request1 } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const txHash1 = await testClient.writeContract(request1);
      await assertLockSuccess({
        testContracts,
        testERC20Contract,
        numberNFTs: 0n,
        player: alice,
        quantity: parseEther("1"),
        lockedQuantity: parseEther("1"),
        remainder: 0n,
        sender: alice,
        tokenContractAddress: zeroAddress,
        txHash: txHash1,
      });

      const { request: request2 } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const txHash2 = await testClient.writeContract(request2);
      await assertLockSuccess({
        testContracts,
        testERC20Contract,
        numberNFTs: 0n,
        player: alice,
        quantity: parseEther("1"),
        lockedQuantity: parseEther("2"),
        remainder: 0n,
        sender: alice,
        tokenContractAddress: zeroAddress,
        txHash: txHash2,
      });
    });

    describe("when lockdrop is active", () => {
      beforeEach(async () => {
        const block = await testClient.getBlock();
        const configureLockdropTxHash =
          await testContracts.lockManager.contract.write.configureLockdrop([
            {
              start: Number(block.timestamp),
              end: Number(block.timestamp + lockDuration),
              minLockDuration: Number(lockDuration),
            },
          ]);
        await assertTxSuccess({ txHash: configureLockdropTxHash });
      });

      describe("when lock duration is too short", () => {
        beforeEach(async () => {
          const setLockDurationTxHash =
            await testContracts.lockManager.contract.write.setLockDuration([lockDuration - 1n], {
              account: alice,
            });
          await assertTxSuccess({ txHash: setLockDurationTxHash });
        });

        it("should revert with InvalidLockDurationError", async () => {
          await assert.rejects(
            testContracts.lockManager.contract.simulate.lock([zeroAddress, parseEther("1")], {
              account: alice,
              value: parseEther("1"),
            }),
            (err: Error) => assertContractFunctionRevertedError(err, "InvalidLockDurationError")
          );
        });
      });

      describe("when lock duration is too long", () => {
        beforeEach(async () => {
          const setMaxLockDurationTxHash = await testContracts.configStorage.contract.write.setUint(
            [StorageKey.MaxLockDuration, lockDuration - 1n, false]
          );
          await assertTxSuccess({ txHash: setMaxLockDurationTxHash });
        });

        it("should revert with InvalidLockDurationError", async () => {
          await assert.rejects(
            testContracts.lockManager.contract.simulate.lock([zeroAddress, parseEther("1")], {
              account: alice,
              value: parseEther("1"),
            }),
            (err: Error) => assertContractFunctionRevertedError(err, "InvalidLockDurationError")
          );
        });
      });

      it("should succeed with remainder and numberNFTs", async () => {
        const { request } = await testContracts.lockManager.contract.simulate.lock(
          [zeroAddress, parseEther("3")],
          { account: alice, value: parseEther("3") }
        );
        const txHash = await testClient.writeContract(request);
        await assertLockSuccess({
          testContracts,
          testERC20Contract,
          numberNFTs: 1n,
          player: alice,
          quantity: parseEther("3"),
          lockedQuantity: parseEther("3"),
          remainder: parseEther("1"),
          sender: alice,
          tokenContractAddress: zeroAddress,
          txHash,
        });
      });

      describe("when lock duration is 0", () => {
        beforeEach(async () => {
          const setLockDurationTxHash =
            await testContracts.lockManager.contract.write.setLockDuration([0n], {
              account: alice,
            });
          await assertTxSuccess({ txHash: setLockDurationTxHash });
        });

        it("should succeed with min lock duration from lockdrop", async () => {
          const { request } = await testContracts.lockManager.contract.simulate.lock(
            [zeroAddress, parseEther("1")],
            { account: alice, value: parseEther("1") }
          );
          const txHash = await testClient.writeContract(request);
          await assertLockSuccess({
            testContracts,
            testERC20Contract,
            numberNFTs: 0n,
            player: alice,
            quantity: parseEther("1"),
            lockedQuantity: parseEther("1"),
            remainder: parseEther("1"),
            sender: alice,
            tokenContractAddress: zeroAddress,
            txHash,
          });
        });
      });
    });
  });

  describe("when an ERC20 token is used", () => {
    describe("when the token is not configured on the contract", () => {
      it("should revert with TokenNotConfiguredError", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.lock(
            [testERC20Contract.address, parseEther("1")],
            { account: alice, value: parseEther("1") }
          ),
          (err: Error) => assertContractFunctionRevertedError(err, "TokenNotConfiguredError")
        );
      });
    });

    describe("when the token is configured but is inactive on the contract", () => {
      beforeEach(async () => {
        const configureTokenTxHash = await testContracts.lockManager.contract.write.configureToken([
          testERC20Contract.address,
          { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("2"), active: false, decimals: 18 },
        ]);
        await assertTxSuccess({ txHash: configureTokenTxHash });
      });

      it("should revert with TokenNotConfiguredError", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.lock(
            [testERC20Contract.address, parseEther("1")],
            { account: alice, value: parseEther("1") }
          ),
          (err: Error) => assertContractFunctionRevertedError(err, "TokenNotConfiguredError")
        );
      });
    });

    describe("when the token is configured on the contract", () => {
      beforeEach(async () => {
        const configureTokenTxHash = await testContracts.lockManager.contract.write.configureToken([
          testERC20Contract.address,
          { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("2"), active: true, decimals: 18 },
        ]);
        await assertTxSuccess({ txHash: configureTokenTxHash });

        // Approve 10 of the 100 tokens on the test ERC20
        const approveERC20TxHash = await testERC20Contract.write.approve([
          testContracts.lockManager.contract.address,
          parseEther("10"),
        ]);
        await assertTxSuccess({ txHash: approveERC20TxHash });
      });

      it("should revert with InvalidMessageValueError when value is not 0", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.lock(
            [testERC20Contract.address, parseEther("1")],
            { account: alice, value: parseEther("1") }
          ),
          (err: Error) => assertContractFunctionRevertedError(err, "InvalidMessageValueError")
        );
      });

      it("should revert with InsufficientAllowanceError when quanity > allowance", async () => {
        await assert.rejects(
          testContracts.lockManager.contract.simulate.lock(
            [testERC20Contract.address, parseEther("20")], // 10 has been approved so 20 is too much
            { account: alice, value: 0n }
          ),
          (err: Error) => assertContractFunctionRevertedError(err, "InsufficientAllowanceError")
        );
      });

      it("should succeed when quantity <= allowance", async () => {
        const { request } = await testContracts.lockManager.contract.simulate.lock(
          [testERC20Contract.address, parseEther("10")],
          { account: alice, value: 0n }
        );
        const txHash = await testClient.writeContract(request);
        await assertLockSuccess({
          testContracts,
          testERC20Contract,
          numberNFTs: 0n,
          player: alice,
          quantity: parseEther("10"),
          lockedQuantity: parseEther("10"),
          remainder: 0n,
          sender: alice,
          tokenContractAddress: testERC20Contract.address,
          txHash,
        });
      });

      describe("when lockdrop is active", () => {
        beforeEach(async () => {
          const block = await testClient.getBlock();
          const configureLockdropTxHash =
            await testContracts.lockManager.contract.write.configureLockdrop([
              {
                start: Number(block.timestamp),
                end: Number(block.timestamp + lockDuration),
                minLockDuration: Number(lockDuration),
              },
            ]);
          await assertTxSuccess({ txHash: configureLockdropTxHash });
        });

        it("should succeed with remainder and numberNFTs", async () => {
          const { request } = await testContracts.lockManager.contract.simulate.lock(
            [testERC20Contract.address, parseEther("3")],
            { account: alice, value: 0n }
          );
          const txHash = await testClient.writeContract(request);
          await assertLockSuccess({
            testContracts,
            testERC20Contract,
            numberNFTs: 1n,
            player: alice,
            quantity: parseEther("3"),
            lockedQuantity: parseEther("3"),
            remainder: parseEther("1"),
            sender: alice,
            tokenContractAddress: testERC20Contract.address,
            txHash,
          });
        });
      });
    });
  });

  describe("when ETH and multiple ERC20 tokens are used", () => {
    beforeEach(async () => {
      let txHash = await testContracts.lockManager.contract.write.configureToken([
        zeroAddress,
        { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("2"), active: true, decimals: 18 },
      ]);
      await assertTxSuccess({ txHash });

      txHash = await testContracts.lockManager.contract.write.configureToken([
        testERC20Contract.address,
        { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("3"), active: true, decimals: 18 },
      ]);
      await assertTxSuccess({ txHash });

      txHash = await testERC20Contract.write.approve([
        testContracts.lockManager.contract.address,
        parseEther("10"),
      ]);
      await assertTxSuccess({ txHash });

      txHash = await testContracts.lockManager.contract.write.configureToken([
        testSecondERC20Contract.address,
        { usdPrice: 100n * BigInt(1e18), nftCost: parseEther("4"), active: true, decimals: 18 },
      ]);
      await assertTxSuccess({ txHash });

      txHash = await testSecondERC20Contract.write.approve([
        testContracts.lockManager.contract.address,
        parseEther("10"),
      ]);
      await assertTxSuccess({ txHash });
    });

    it("should allow all 3 tokens to be locked at once", async () => {
      const lock1TxHash = await testContracts.lockManager.contract.write.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const lock2TxHash = await testContracts.lockManager.contract.write.lock(
        [testERC20Contract.address, parseEther("10")],
        { account: alice, value: 0n }
      );
      const lock3TxHash = await testContracts.lockManager.contract.write.lock(
        [testSecondERC20Contract.address, parseEther("5")],
        { account: alice, value: 0n }
      );

      await assertLockSuccess({
        testContracts,
        testERC20Contract,
        numberNFTs: 0n,
        player: alice,
        quantity: parseEther("1"),
        lockedQuantity: parseEther("1"),
        remainder: 0n,
        sender: alice,
        tokenContractAddress: zeroAddress,
        txHash: lock1TxHash,
      });
      await assertLockSuccess({
        testContracts,
        testERC20Contract,
        numberNFTs: 0n,
        player: alice,
        quantity: parseEther("10"),
        lockedQuantity: parseEther("10"),
        remainder: 0n,
        sender: alice,
        tokenContractAddress: testERC20Contract.address,
        txHash: lock2TxHash,
      });
      await assertLockSuccess({
        testContracts,
        testERC20Contract: testSecondERC20Contract,
        numberNFTs: 0n,
        player: alice,
        quantity: parseEther("5"),
        lockedQuantity: parseEther("5"),
        remainder: 0n,
        sender: alice,
        tokenContractAddress: testSecondERC20Contract.address,
        txHash: lock3TxHash,
      });
    });

    describe("when lockdrop is active", () => {
      beforeEach(async () => {
        const block = await testClient.getBlock();
        const configureLockdropTxHash =
          await testContracts.lockManager.contract.write.configureLockdrop([
            {
              start: Number(block.timestamp),
              end: Number(block.timestamp + lockDuration),
              minLockDuration: Number(lockDuration),
            },
          ]);
        await assertTxSuccess({ txHash: configureLockdropTxHash });
      });

      it("should allow all 3 tokens to be locked at once with remainder and numberNFTs set", async () => {
        const lock1TxHash = await testContracts.lockManager.contract.write.lock(
          [zeroAddress, parseEther("3")],
          { account: alice, value: parseEther("3") }
        );
        const lock2TxHash = await testContracts.lockManager.contract.write.lock(
          [testERC20Contract.address, parseEther("10")],
          { account: alice, value: 0n }
        );
        const lock3TxHash = await testContracts.lockManager.contract.write.lock(
          [testSecondERC20Contract.address, parseEther("5")],
          { account: alice, value: 0n }
        );

        const unrevealedNFTs = 5; // 1 + 3 + 1
        await assertLockSuccess({
          testContracts,
          testERC20Contract,
          numberNFTs: 1n,
          unrevealedNFTs,
          player: alice,
          quantity: parseEther("3"),
          lockedQuantity: parseEther("3"),
          remainder: parseEther("1"),
          sender: alice,
          tokenContractAddress: zeroAddress,
          txHash: lock1TxHash,
        });
        await assertLockSuccess({
          testContracts,
          testERC20Contract,
          numberNFTs: 3n,
          unrevealedNFTs,
          player: alice,
          quantity: parseEther("10"),
          lockedQuantity: parseEther("10"),
          remainder: parseEther("1"),
          sender: alice,
          tokenContractAddress: testERC20Contract.address,
          txHash: lock2TxHash,
        });
        await assertLockSuccess({
          testContracts,
          testERC20Contract: testSecondERC20Contract,
          numberNFTs: 1n,
          unrevealedNFTs,
          player: alice,
          quantity: parseEther("5"),
          lockedQuantity: parseEther("5"),
          remainder: parseEther("1"),
          sender: alice,
          tokenContractAddress: testSecondERC20Contract.address,
          txHash: lock3TxHash,
        });
      });
    });
  });
});
