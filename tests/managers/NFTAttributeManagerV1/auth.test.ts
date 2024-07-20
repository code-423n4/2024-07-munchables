import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";

describe("NFTAttributeManagerV1: auth", () => {
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

  describe("Authorisation", () => {
    it("setAttributes() - invalid auth", async () => {
      const attributes = {
        chonks: 5000n,
        level: 1,
        evolution: 0,
        lastPettedTime: BigInt(Math.floor(new Date().getTime() / 1000)),
      };
      await assert.rejects(
        testContracts.nftAttributesManagerV1.contract.simulate.setAttributes([1n, attributes], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });

    it("setGameAttributes() - invalid auth", async () => {
      const gameAttributes = [
        {
          dataType: 1,
          value: "0x12345",
        },
      ];
      await assert.rejects(
        testContracts.nftAttributesManagerV1.contract.simulate.setGameAttributes(
          [1n, gameAttributes],
          { account: alice }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });

    it("createWithImmutable() - invalid auth", async () => {
      const immutableAttributes = {
        rarity: 1,
        species: 25,
        realm: 2,
        generation: 1,
        hatchedDate: Math.floor(new Date().getTime() / 1000),
      };
      await assert.rejects(
        testContracts.nftAttributesManagerV1.contract.simulate.createWithImmutable(
          [1n, immutableAttributes],
          { account: alice }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
  });
});
