import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockAccountManagerType,
  MockNFTOverlordContractType,
  deployMockAccountManager,
  deployMockNFTOverlord,
} from "../../utils/mock-contracts";
import { registerMockPlayer } from "../../utils/players";

describe("SnuggeryManager: import export Munchables", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;
  let mockAccountManager: MockAccountManagerType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob] = testRoleAddresses.users;

    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
    mockAccountManager = await deployMockAccountManager({ testContracts });
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: bob,
      value: parseEther("10"),
    });

    await mockNFTOverlord.write.addReveal([alice, 100], { account: alice });
    await mockNFTOverlord.write.addReveal([bob, 100], { account: bob });
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 1
    await mockNFTOverlord.write.reveal([alice, 4, 12], { account: alice }); // 1
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 2
    await mockNFTOverlord.write.reveal([alice, 0, 13], { account: alice }); // 2
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 3
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 3
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 4
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 4
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 5
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 5
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 6
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 6
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 7
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 7
    await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 8
    await mockNFTOverlord.write.reveal([bob, 0, 22], { account: bob }); // 8
    await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 9
    await mockNFTOverlord.write.reveal([bob, 0, 23], { account: bob }); // 9
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("importing munchables", () => {
    beforeEach(async () => {
      await registerMockPlayer({
        account: alice,
        realm: 2,
        mockAccountManager,
      });
      await registerMockPlayer({
        account: bob,
        realm: 1,
        mockAccountManager,
      });
    });

    it("importMunchable fails without approval", async () => {
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.importMunchable([1n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotApprovedError")
      );
    });

    it("importMunchable succeeds with approval for all", async () => {
      let txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
        [testContracts.snuggeryManagerProxy.contract.address, true],
        { account: alice }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable([1n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      const snuggery = await testContracts.snuggeryManagerProxy.contract.read.getSnuggery([alice], {
        account: alice,
      });

      const snuggerySize = snuggery.length;

      assert.equal(snuggery[0].tokenId, 1n);
      assert.equal(snuggerySize, 1);
    });

    it("importMunchable succeeds with individual approval", async () => {
      let txHash = await testContracts.munchNFT.contract.write.approve(
        [testContracts.snuggeryManagerProxy.contract.address, 1n],
        { account: alice }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable([1n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      const snuggery = await testContracts.snuggeryManagerProxy.contract.read.getSnuggery([alice], {
        account: alice,
      });

      const snuggerySize = snuggery.length;

      assert.equal(snuggery[0].tokenId, 1n);
      assert.equal(snuggerySize, 1);
    });

    it("importMunchable fails if not owner", async () => {
      const txHash = await testContracts.munchNFT.contract.write.approve(
        [testContracts.snuggeryManagerProxy.contract.address, 1n],
        { account: alice }
      );
      await assertTxSuccess({ txHash });

      // token is approved, so should fail ownership test if bob tries to import
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.importMunchable([1n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidOwnerError")
      );
    });

    it("importMunchable fails if max snuggery size is reached", async () => {
      let txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
        [testContracts.snuggeryManagerProxy.contract.address, true],
        { account: alice }
      );
      await assertTxSuccess({ txHash });

      for (let i = 1; i <= 6; i++) {
        txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
          [BigInt(i)],
          {
            account: alice,
          }
        );
        await assertTxSuccess({ txHash });
      }

      // 7th import should fail
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.importMunchable([7n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "SnuggeryFullError")
      );
    });
  });

  describe("exporting munchables", () => {
    beforeEach(async () => {
      await registerMockPlayer({
        account: alice,
        realm: 2,
        mockAccountManager,
      });
      await registerMockPlayer({
        account: bob,
        realm: 1,
        mockAccountManager,
      });

      const txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
        [testContracts.snuggeryManagerProxy.contract.address, true],
        { account: alice }
      );
      await assertTxSuccess({ txHash });
    });

    it("exportMunchable fails if player does not own token", async () => {
      for (let i = 1; i <= 6; i++) {
        const txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
          [BigInt(i)],
          { account: alice }
        );
        await assertTxSuccess({ txHash });
      }

      // bob trying to export alice's munchable should fail
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.exportMunchable([1n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "MunchableNotInSnuggeryError")
      );
    });

    it("exportMunchable fails if token is not in snuggery", async () => {
      for (let i = 1; i <= 6; i++) {
        const txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
          [BigInt(i)],
          { account: alice }
        );
        await assertTxSuccess({ txHash });
      }

      // bob trying to export munchable that is not in the snuggery should fail
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.exportMunchable([7n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "MunchableNotInSnuggeryError")
      );
    });

    it("exportMunchable succeeds with event", async () => {
      for (let i = 1; i <= 6; i++) {
        const txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
          [BigInt(i)],
          { account: alice }
        );
        await assertTxSuccess({ txHash });
      }

      const txHash = await testContracts.snuggeryManagerProxy.contract.write.exportMunchable([4n], {
        account: alice,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.snuggeryManagerProxy.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MunchableExported",
            args: {
              _player: alice,
              _tokenId: 4n,
            },
          },
        ],
      });
    });
    it("exportMunchable succeeds after being fed", async () => {
      let txHash;
      for (let i = 1; i <= 6; i++) {
        txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
          [BigInt(i)],
          {
            account: alice,
          }
        );
        await assertTxSuccess({ txHash });
      }

      txHash = await mockAccountManager.write.giveSchnibbles([alice, 1000000n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      txHash = await testContracts.snuggeryManagerProxy.contract.write.feed([4n, 10000n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      txHash = await testContracts.snuggeryManagerProxy.contract.write.feed([2n, 5000n], {
        account: alice,
      });
      let txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.snuggeryManagerProxy.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MunchableFed",
            args: {
              _player: alice,
              _tokenId: 2n,
              _baseChonks: 5000n,
              _bonusChonks: 500n,
            },
          },
        ],
      });

      txHash = await testContracts.snuggeryManagerProxy.contract.write.exportMunchable([4n], {
        account: alice,
      });
      txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.snuggeryManagerProxy.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MunchableExported",
            args: {
              _player: alice,
              _tokenId: 4n,
            },
          },
        ],
      });

      const globalChonk =
        await testContracts.snuggeryManagerProxy.contract.read.getGlobalTotalChonk();
      assert.equal(globalChonk, 5500n);
    });
  });
});
