import isEqual from "lodash.isequal";
import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertTransactionEvents, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";

const rarityPct = 0;
const speciesPct = 1;

describe("MunchadexManager: updateMunchadex tests", () => {
  let admin: `0x${string}`;
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;

  before(async () => {
    testContracts = await getTestContracts();
    const testRoleAddresses = await getTestRoleAddresses();
    admin = testRoleAddresses[Role.Admin];
    [alice, bob] = testRoleAddresses.users;
    beforeSnapshot = await testClient.snapshot();
    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
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
    await testClient.setBalance({
      address: admin,
      value: parseEther("10"),
    });
    const txHash = await mockNFTOverlord.write.addReveal([alice, 5], { account: alice });
    await assertTxSuccess({ txHash });
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  it("should correctly handle minting and Munchadex update", async () => {
    let txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
    await assertTxSuccess({ txHash });

    txHash = await mockNFTOverlord.write.reveal([alice, rarityPct, speciesPct], { account: alice });
    await assertTxSuccess({ txHash });

    const munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([
      alice,
    ]);
    assert.equal(munchadexInfo[2], 1n);
  });

  it("should correctly handle NFT transfers between users", async () => {
    let txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
    await assertTxSuccess({ txHash });

    txHash = await mockNFTOverlord.write.reveal([alice, rarityPct, speciesPct], { account: alice });
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.munchadexManager.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "MunchadexUpdated",
          args: {
            _player: alice,
            _tokenId: 1n,
            realm: 3,
            rarity: 0,
            _numInRealm: 1n,
            _numInRarity: 1n,
            _numUnique: 1n,
          },
        },
      ],
    });

    txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 1n], {
      account: alice,
    });
    await assertTxSuccess({ txHash });

    const aliceMunchadex = await testContracts.munchadexManager.contract.read.getMunchadexInfo([
      alice,
    ]);
    const bobMunchadex = await testContracts.munchadexManager.contract.read.getMunchadexInfo([bob]);

    assert.equal(aliceMunchadex[2], 0n);
    assert.equal(bobMunchadex[2], 1n);
  });

  describe("proper ignoring", () => {
    beforeEach(async () => {
      let txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });

      txHash = await mockNFTOverlord.write.reveal([alice, rarityPct, speciesPct], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      txHash = await testContracts.accountManagerProxy.contract.write.register([1, zeroAddress], {
        account: alice,
      });
      await assertTxSuccess({ txHash });
    });

    it("import/export snuggery", async () => {
      const approvalTxHash = await testContracts.munchNFT.contract.write.approve(
        [testContracts.snuggeryManagerProxy.contract.address, 1n],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash: approvalTxHash });
      let txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable([1n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      let aliceOwnership = await testContracts.munchNFT.contract.read.ownerOf([1n]);
      assert(
        isEqual(
          aliceOwnership.toLowerCase(),
          testContracts.snuggeryManagerProxy.contract.address.toLowerCase()
        )
      );

      let aliceMunchadex = await testContracts.munchadexManager.contract.read.getMunchadexInfo([
        alice,
      ]);
      assert.equal(aliceMunchadex[2], 1n);

      txHash = await testContracts.snuggeryManagerProxy.contract.write.exportMunchable([1n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      aliceOwnership = await testContracts.munchNFT.contract.read.ownerOf([1n]);
      assert.equal(aliceOwnership.toLowerCase(), alice.toLowerCase());

      aliceMunchadex = await testContracts.munchadexManager.contract.read.getMunchadexInfo([alice]);
      assert.equal(aliceMunchadex[2], 1n);
    });
  });
  describe("proper counting", () => {
    beforeEach(async () => {
      let txHash = await testContracts.accountManagerProxy.contract.write.register(
        [1, zeroAddress],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash });

      txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });

      txHash = await mockNFTOverlord.write.reveal([alice, rarityPct, speciesPct], {
        account: alice,
      });
      await assertTxSuccess({ txHash });
    });

    it("should correctly add unique munchables to same realm", async () => {
      let txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });
      const revealAnother = await mockNFTOverlord.write.reveal([alice, 0, 2], { account: alice });
      const block = await testClient.getBlock();
      const receipt = await assertTxSuccess({ txHash: revealAnother });

      assertTransactionEvents({
        abi: mockNFTOverlord.abi,
        logs: receipt.logs,
        expectedEvents: [
          {
            eventName: "Revealed",
            args: {
              _owner: alice,
              _tokenId: 2n,
              _immutableAttributes: {
                rarity: 0,
                species: 2,
                realm: 3,
                generation: 2,
                hatchedDate: Number(block.timestamp),
              },
            },
          },
        ],
      });

      // Mint another munchable in the same realm
      txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });

      const revealAnother2 = await mockNFTOverlord.write.reveal([alice, 0, 3], { account: alice });
      await assertTxSuccess({ txHash: revealAnother2 });

      const munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([
        alice,
      ]);
      assert.equal(munchadexInfo[0][3], 3n, "Should have three unique in the same realm");
      assert.equal(munchadexInfo[1][0], 3n, "Should have three unique in the same rarity");
      assert.equal(munchadexInfo[2], 3n, "Should have 3 unique");
    });
    it("should correctly add new munchables to different realms and transfers reduce unique", async () => {
      let txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });
      const revealAnother = await mockNFTOverlord.write.reveal([alice, 0, 45], { account: alice });
      await assertTxSuccess({ txHash: revealAnother });

      let munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([
        alice,
      ]);
      assert.equal(munchadexInfo[0][1], 1n, "Should have one unique in realm 1");
      assert.equal(munchadexInfo[0][3], 1n, "Should have one unique in realm 3");
      assert.equal(munchadexInfo[1][0], 2n, "Should have one unique in rarity 0");
      assert.equal(munchadexInfo[2], 2n, "Should have 2 unique");

      txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 1n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([alice]);
      assert.equal(munchadexInfo[0][1], 1n, "Should have one unique in realm 1 - P2");
      assert.equal(munchadexInfo[0][3], 0n, "Should have zero unique in realm 3 - P2");
      assert.equal(munchadexInfo[1][0], 1n, "Should have one unique in rarity 0 - P2");
      assert.equal(munchadexInfo[2], 1n, "Should have 1 unique");
    });
    it("should correctly add non-unique munchables and not decrement numUnique until all copies are transferred", async () => {
      let txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });
      const revealAnother = await mockNFTOverlord.write.reveal([alice, rarityPct, speciesPct], {
        account: alice,
      });
      await assertTxSuccess({ txHash: revealAnother });

      let munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([
        alice,
      ]);

      assert.equal(munchadexInfo[0][3], 1n, "Should have two unique in realm 1 - P1");
      assert.equal(munchadexInfo[1][0], 1n, "Should have one unique in rarity 0 - P1");
      assert.equal(munchadexInfo[2], 1n, "Should have 1 unique - P1");

      txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });
      const revealAnother2 = await mockNFTOverlord.write.reveal([alice, rarityPct, speciesPct], {
        account: alice,
      });
      await assertTxSuccess({ txHash: revealAnother2 });

      munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([alice]);
      assert.equal(munchadexInfo[0][3], 1n, "Should have three unique in realm 1");
      assert.equal(munchadexInfo[1][0], 1n, "Should have one unique in rarity 0");
      assert.equal(munchadexInfo[2], 1n, "Should have 1 unique");

      txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 1n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([alice]);
      assert.equal(munchadexInfo[0][3], 1n, "Should have one unique in realm 1 - P2");
      assert.equal(munchadexInfo[1][0], 1n, "Should have one unique in rarity 0 - P2");
      assert.equal(munchadexInfo[2], 1n, "Should have 1 unique - P2");

      txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 2n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 3n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      munchadexInfo = await testContracts.munchadexManager.contract.read.getMunchadexInfo([alice]);
      assert.equal(munchadexInfo[0][3], 0n, "Should have 0 unique in realm 1");
      assert.equal(munchadexInfo[1][0], 0n, "Should have 0 unique in rarity 0");
      assert.equal(munchadexInfo[2], 0n, "Should have 0 unique");
    });
  });
});
