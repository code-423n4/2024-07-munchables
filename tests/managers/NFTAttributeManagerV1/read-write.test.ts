import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertTransactionEvents, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";

async function setAttributes({ account, testContracts }) {
  await testClient.impersonateAccount({
    address: account,
  });
  const attributes = {
    chonks: 0n,
    level: 1,
    evolution: 0,
    lastPettedTime: BigInt(Math.floor(new Date().getTime() / 1000)),
  };
  const txHash = await testContracts.nftAttributesManagerV1.contract.write.setAttributes(
    [1n, attributes],
    { account }
  );
  const txReceipt = await assertTxSuccess({ txHash });

  assertTransactionEvents({
    abi: testContracts.nftAttributesManagerV1.contract.abi,
    logs: txReceipt.logs,
    expectedEvents: [
      {
        eventName: "AttributesUpdated",
        args: {
          _tokenId: 1n,
        },
      },
    ],
  });
}

describe("NFTAttributeManagerV1: read/write", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob] = testRoleAddresses.users;

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
      address: mockNFTOverlord.address,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: testContracts.snuggeryManagerProxy.contract.address,
      value: parseEther("10"),
    });

    await mockNFTOverlord.write.addReveal([alice, 100], { account: alice });
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 1
    await mockNFTOverlord.write.reveal([alice, 4, 12], { account: alice }); // 1
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 2
    await mockNFTOverlord.write.reveal([alice, 0, 13], { account: alice }); // 2
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 3
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 3
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("Setting attributes", () => {
    it("createWithImmutable()", async () => {
      await testClient.impersonateAccount({
        address: mockNFTOverlord.address,
      });
      const immutableAttributes = {
        rarity: 1,
        species: 25,
        realm: 2,
        generation: 1,
        hatchedDate: Math.floor(new Date().getTime() / 1000),
      };
      const txHash = await testContracts.nftAttributesManagerV1.contract.write.createWithImmutable(
        [1n, immutableAttributes],
        { account: mockNFTOverlord.address }
      );
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.nftAttributesManagerV1.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "CreatedWithImmutable",
            args: {
              _tokenId: 1n,
              _immutableAttributes: immutableAttributes,
            },
          },
        ],
      });
    });

    it("setAttributes() - NFTOverlord", async () => {
      await setAttributes({
        account: mockNFTOverlord.address,
        testContracts,
      });
    });

    it("setAttributes() - SnuggeryManager", async () => {
      await setAttributes({
        account: testContracts.snuggeryManagerProxy.contract.address,
        testContracts,
      });
    });

    it("setGameAttributes()", async () => {
      await testClient.impersonateAccount({
        address: mockNFTOverlord.address,
      });
      const gameAttributes = [
        {
          dataType: 1,
          value: "0x12345",
        },
      ];
      const txHash = await testContracts.nftAttributesManagerV1.contract.write.setGameAttributes(
        [1n, gameAttributes],
        { account: mockNFTOverlord.address }
      );
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: testContracts.nftAttributesManagerV1.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "GameAttributesUpdated",
            args: {
              _tokenId: 1n,
            },
          },
        ],
      });
    });

    it("getImmutableAttributes()", async () => {
      await testClient.impersonateAccount({
        address: mockNFTOverlord.address,
      });
      const immutableAttributes = {
        rarity: 1,
        species: 25,
        realm: 2,
        generation: 1,
        hatchedDate: Math.floor(new Date().getTime() / 1000),
      };
      const txHash = await testContracts.nftAttributesManagerV1.contract.write.createWithImmutable(
        [1n, immutableAttributes],
        { account: mockNFTOverlord.address }
      );
      await assertTxSuccess({ txHash });

      const immutableAttributesRead =
        await testContracts.nftAttributesManagerV1.contract.read.getImmutableAttributes([1n], {
          account: alice,
        });
      assert.equal(immutableAttributesRead.rarity, 1);
      assert.equal(immutableAttributesRead.species, 25);
      assert.equal(immutableAttributesRead.realm, 2);
      assert.equal(immutableAttributesRead.generation, 1);
    });

    it("getAttributes()", async () => {
      await setAttributes({
        account: mockNFTOverlord.address,
        testContracts,
      });

      const attributes = await testContracts.nftAttributesManagerV1.contract.read.getAttributes(
        [1n],
        { account: alice }
      );
      assert.equal(attributes.chonks, 0n);
      assert.equal(attributes.level, 1);
      assert.equal(attributes.evolution, 0);
    });

    it("getGameAttributes()", async () => {
      await testClient.impersonateAccount({
        address: mockNFTOverlord.address,
      });
      const gameAttributes = [
        {
          dataType: 1,
          value: "0x123450",
        },
      ];
      const txHash = await testContracts.nftAttributesManagerV1.contract.write.setGameAttributes(
        [1n, gameAttributes],
        { account: mockNFTOverlord.address }
      );
      await assertTxSuccess({ txHash });

      const gameAttributesRead =
        await testContracts.nftAttributesManagerV1.contract.read.getGameAttributes([1n, []], {
          account: alice,
        });

      assert.equal(gameAttributesRead.length, 16);
      assert.equal(gameAttributesRead[0].dataType, 1);
      assert.equal(gameAttributesRead[0].value, "0x123450");
    });
  });
});
