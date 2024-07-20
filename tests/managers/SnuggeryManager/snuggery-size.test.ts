import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockClaimManagerType,
  MockNFTOverlordContractType,
  deployMockClaimManager,
  deployMockNFTOverlord,
} from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("SnuggeryManager: snuggery size", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;
  let mockClaimManager: MockClaimManagerType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];

    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
    mockClaimManager = await deployMockClaimManager({ testContracts });
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

  describe("Increase snuggery size", () => {
    beforeEach(async () => {
      await registerPlayer({
        account: alice,
        realm: 2,
        testContracts,
      });
      await registerPlayer({
        account: bob,
        realm: 1,
        testContracts,
      });
    });

    it("must fail if price is not configured", async () => {
      const txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.NewSlotCost, 0n, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.increaseSnuggerySize([1], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotConfiguredError")
      );
    });

    it("must fail if player does not have enough points", async () => {
      const txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.NewSlotCost, BigInt(1000e18), true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.increaseSnuggerySize([1], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotEnoughPointsError")
      );
    });

    it("successful increase in size", async () => {
      let txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.NewSlotCost, BigInt(1000e18), true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
        [testContracts.snuggeryManagerProxy.contract.address, true],
        { account: alice }
      );
      await assertTxSuccess({ txHash });
      for (let i = 1; i <= 6; i++) {
        const txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
          [BigInt(i)],
          { account: alice }
        );
        await assertTxSuccess({ txHash });
      }

      txHash = await mockClaimManager.write.givePoints([alice, BigInt(1000e18)], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      txHash = await testContracts.snuggeryManagerProxy.contract.write.increaseSnuggerySize([1], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable([7n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      const snuggeryResp = await testContracts.snuggeryManagerProxy.contract.read.getSnuggery(
        [alice],
        { account: alice }
      );
      const snuggerySize = snuggeryResp.length;

      assert.equal(snuggerySize, 7);
    });

    it("increase beyond max size fails", async () => {
      let txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.NewSlotCost, BigInt(1e18), true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setSmallInt(
        [StorageKey.MaxSnuggerySize, 12, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      txHash = await mockClaimManager.write.givePoints([alice, 1000n * BigInt(1e18)], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      for (let i = 0; i < 6; i++) {
        txHash = await testContracts.snuggeryManagerProxy.contract.write.increaseSnuggerySize([1], {
          account: alice,
        });
        await assertTxSuccess({ txHash });
      }

      const playerResp = await testContracts.accountManagerProxy.contract.read.getPlayer([alice], {
        account: alice,
      });
      assert.equal(playerResp[1].maxSnuggerySize, 12);

      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.increaseSnuggerySize([1], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "SnuggeryMaxSizeError")
      );
    });

    it("increase beyond max size fails", async () => {
      let txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.NewSlotCost, BigInt(1e18), true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setSmallInt(
        [StorageKey.MaxSnuggerySize, 12, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      txHash = await mockClaimManager.write.givePoints([alice, 1000n * BigInt(1e18)], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      for (let i = 0; i < 6; i++) {
        txHash = await testContracts.snuggeryManagerProxy.contract.write.increaseSnuggerySize([1], {
          account: alice,
        });
        await assertTxSuccess({ txHash });
      }

      const playerResp = await testContracts.accountManagerProxy.contract.read.getPlayer([alice], {
        account: alice,
      });
      assert.equal(playerResp[1].maxSnuggerySize, 12);

      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.increaseSnuggerySize([1], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "SnuggeryMaxSizeError")
      );
    });
  });
});
