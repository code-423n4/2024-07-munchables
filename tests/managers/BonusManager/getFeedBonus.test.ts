import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { RARITY_BONUSES, REALM_BONUSES, Rarity, Realm } from "../../../deployments/utils/consts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockNFTAttributesManagerContractType,
  deployMockNFTAttributesManager,
} from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

const validRarities = Object.values(Rarity).filter(
  (r) => !isNaN(Number(r)) && Number(r) !== Rarity.Invalid
) as Rarity[];
const validRealms = Object.values(Realm).filter(
  (r) => !isNaN(Number(r)) && Number(r) !== Realm.Invalid
) as Realm[];

const tokenId = 1n;

describe("BonusManager: getFeedBonus", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTAttributesManager: MockNFTAttributesManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockNFTAttributesManager = await deployMockNFTAttributesManager({ testContracts });
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

  describe("when NFT rarity is invalid", () => {
    beforeEach(async () => {
      await registerPlayer({ account: alice, realm: Realm.Everfrost, testContracts });
      const setImmutableAttrsTxHash =
        await mockNFTAttributesManager.write.setImmutableAttributesForTest([
          tokenId,
          {
            rarity: Rarity.Invalid,
            species: 1,
            realm: Realm.Everfrost,
            generation: 1,
            hatchedDate: Math.floor(Date.now() / 1000),
          },
        ]);
      await assertTxSuccess({ txHash: setImmutableAttrsTxHash });
    });

    it("should revert with InvalidRarityError", async () => {
      await assert.rejects(
        testContracts.bonusManager.contract.read.getFeedBonus([alice, tokenId]),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRarityError")
      );
    });
  });

  describe("when NFT realm is invalid", () => {
    beforeEach(async () => {
      await registerPlayer({ account: alice, realm: Realm.Everfrost, testContracts });
      const setImmutableAttrsTxHash =
        await mockNFTAttributesManager.write.setImmutableAttributesForTest([
          tokenId,
          {
            rarity: Rarity.Common,
            species: 1,
            realm: Realm.Invalid,
            generation: 1,
            hatchedDate: Math.floor(Date.now() / 1000),
          },
        ]);
      await assertTxSuccess({ txHash: setImmutableAttrsTxHash });
    });

    it("should revert with InvalidRealmBonus", async () => {
      await assert.rejects(
        testContracts.bonusManager.contract.read.getFeedBonus([alice, tokenId]),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRealmBonus")
      );
    });
  });

  for (const rarity of validRarities) {
    for (const nftRealm of validRealms) {
      for (const snuggeryRealm of validRealms) {
        it(`should return correct bonus for rarity ${rarity}, NFT realm ${nftRealm}, snuggery realm ${snuggeryRealm}`, async () => {
          await registerPlayer({ account: alice, realm: snuggeryRealm, testContracts });

          const setImmutableAttrsTxHash =
            await mockNFTAttributesManager.write.setImmutableAttributesForTest([
              tokenId,
              {
                rarity,
                species: 1,
                realm: nftRealm,
                generation: 1,
                hatchedDate: Math.floor(Date.now() / 1000),
              },
            ]);
          await assertTxSuccess({ txHash: setImmutableAttrsTxHash });

          const feedBonus = await testContracts.bonusManager.contract.read.getFeedBonus([
            alice,
            tokenId,
          ]);
          assert(feedBonus >= BigInt(-20e16));
          assert(feedBonus <= BigInt(100e16));
          const expectedRarityBonus = RARITY_BONUSES[rarity];
          assert(expectedRarityBonus !== undefined); // Sanity check rarity bonus
          const expectedRealmBonus = REALM_BONUSES[nftRealm * 5 + snuggeryRealm];
          assert(expectedRealmBonus !== undefined); // Sanity check realm bonus
          assert.equal(feedBonus, BigInt(1e16 * (expectedRarityBonus + expectedRealmBonus)));
        });
      }
    }
  }
});
