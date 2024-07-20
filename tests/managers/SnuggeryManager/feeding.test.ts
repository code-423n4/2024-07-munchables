import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockAccountManagerType,
  MockNFTOverlordContractType,
  deployMockAccountManager,
  deployMockNFTOverlord,
} from "../../utils/mock-contracts";
import { registerMockPlayer } from "../../utils/players";

describe("SnuggeryManager: feeding", () => {
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

    await registerMockPlayer({ account: alice, mockAccountManager });
    await registerMockPlayer({ account: bob, mockAccountManager });

    let txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
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

    txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
      [testContracts.snuggeryManagerProxy.contract.address, true],
      { account: bob }
    );
    await assertTxSuccess({ txHash });
    for (let i = 8; i <= 9; i++) {
      const txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
        [BigInt(i)],
        { account: bob }
      );
      await assertTxSuccess({ txHash });
    }
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("Feed own munchable", () => {
    it("feed without any schnibbles", async () => {
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.feed([1n, BigInt(10e18)], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InsufficientSchnibblesError")
      );
    });

    it("feed with schnibbles", async () => {
      let txHash = await mockAccountManager.write.giveSchnibbles([alice, BigInt(10000e18)], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      let playerRes = await mockAccountManager.read.getPlayer([alice]);
      assert.equal(playerRes[1].unfedSchnibbles, 10000n * BigInt(1e18));

      txHash = await testContracts.snuggeryManagerProxy.contract.write.feed([1n, BigInt(10e18)], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      playerRes = await mockAccountManager.read.getPlayer([alice]);
      assert.equal(playerRes[1].unfedSchnibbles, 9990n * BigInt(1e18));

      // check chonks
      const attrsRes = await testContracts.nftAttributesManagerV1.contract.read.getAttributes([1n]);
      assert.equal(attrsRes.chonks, 13n * BigInt(1e18)); // 30% rarity bonus
    });
  });
});
