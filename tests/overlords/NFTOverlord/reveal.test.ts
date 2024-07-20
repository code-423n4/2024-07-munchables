import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { numberToBytes, toHex } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { DEFAULT_VARIABLES, StorageKey } from "../../../deployments/utils/config-consts";
import { REALM_LOOKUPS, Rarity } from "../../../deployments/utils/consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockLockManagerContractType,
  MockRNGProxyContractType,
  deployMockLockManager,
  deployMockRNGProxy,
} from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

const commonPct = DEFAULT_VARIABLES[StorageKey.CommonPercentage].value as number;
const rarePct = DEFAULT_VARIABLES[StorageKey.RarePercentage].value as number;
const epicPct = DEFAULT_VARIABLES[StorageKey.EpicPercentage].value as number;
const legendaryPct = DEFAULT_VARIABLES[StorageKey.LegendaryPercentage].value as number;

const maxRNG = 2 ** 40 - 1;

const testCases = [
  {
    rng: 0,
    expectedRarity: Rarity.Common,
    expectedSpecies: DEFAULT_VARIABLES[StorageKey.CommonSpecies].value as number[],
  },
  {
    rng: Math.floor((commonPct * maxRNG) / 1e6),
    expectedRarity: Rarity.Common,
    expectedSpecies: DEFAULT_VARIABLES[StorageKey.CommonSpecies].value as number[],
  },
  {
    rng: Math.floor(((commonPct + rarePct) * maxRNG) / 1e6),
    expectedRarity: Rarity.Rare,
    expectedSpecies: DEFAULT_VARIABLES[StorageKey.RareSpecies].value as number[],
  },
  {
    rng: Math.floor(((commonPct + rarePct + epicPct) * maxRNG) / 1e6),
    expectedRarity: Rarity.Epic,
    expectedSpecies: DEFAULT_VARIABLES[StorageKey.EpicSpecies].value as number[],
  },
  {
    rng: Math.floor(((commonPct + rarePct + epicPct + legendaryPct) * maxRNG) / 1e6),
    expectedRarity: Rarity.Legendary,
    expectedSpecies: DEFAULT_VARIABLES[StorageKey.LegendarySpecies].value as number[],
  },
  {
    rng: maxRNG,
    expectedRarity: Rarity.Mythic,
    expectedSpecies: DEFAULT_VARIABLES[StorageKey.MythicSpecies].value as number[],
  },
];

async function assertRevealSuccess({
  player,
  tokenId,
  expectedRarity,
  expectedSpecies,
  txHash,
  testContracts,
}: {
  player: `0x${string}`;
  tokenId: bigint;
  expectedRarity: Rarity;
  expectedSpecies: number[];
  txHash: `0x${string}`;
  testContracts: DeployedContractsType;
}) {
  const txReceipt = await assertTxSuccess({ txHash });

  const block = await testClient.getBlock({ blockNumber: txReceipt.blockNumber });

  const immutableAttributes =
    await testContracts.nftAttributesManagerV1.contract.read.getImmutableAttributes([tokenId]);
  assert.equal(immutableAttributes.rarity, expectedRarity);
  assert(expectedSpecies.includes(immutableAttributes.species));
  assert.equal(immutableAttributes.realm, REALM_LOOKUPS[immutableAttributes.species]);
  assert.equal(immutableAttributes.generation, 2);
  assert.equal(immutableAttributes.hatchedDate, Number(block.timestamp));

  const attributes = await testContracts.nftAttributesManagerV1.contract.read.getAttributes([
    tokenId,
  ]);
  assert.equal(attributes.level, 1);

  const nftOwner = await testContracts.munchNFT.contract.read.ownerOf([tokenId]);
  assert.equal(nftOwner, player);

  assertTransactionEvents({
    abi: testContracts.nftOverlord.contract.abi,
    logs: txReceipt.logs,
    expectedEvents: [
      {
        eventName: "Revealed",
        args: {
          _owner: player,
          _tokenId: tokenId,
          _immutableAttributes: immutableAttributes,
        },
      },
    ],
  });
}

describe("NFTOverlord: reveal", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockLockManager: MockLockManagerContractType;
  let mockRNGProxy: MockRNGProxyContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockLockManager = await deployMockLockManager({ testContracts, notify: false });
    mockRNGProxy = await deployMockRNGProxy({ testContracts });

    await registerPlayer({ account: alice, testContracts });
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

  it("should revert with UnauthorisedError when not called by RNGProxy", async () => {
    await assert.rejects(
      testContracts.nftOverlord.contract.simulate.reveal(
        [BigInt(alice), toHex(numberToBytes(123456789, { size: 5 }))],
        {
          account: alice,
        }
      ),
      (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
    );
  });

  it("should revert with RevealQueueEmptyError when nothing in queue", async () => {
    await assert.rejects(
      mockRNGProxy.simulate.callRevealForTest([
        BigInt(alice),
        toHex(numberToBytes(123456789, { size: 5 })),
      ]),
      (err: Error) =>
        assertContractFunctionRevertedError(
          err,
          "RevealQueueEmptyError",
          testContracts.nftOverlord.contract.abi
        )
    );
  });

  describe("when there is a reveal in queue", () => {
    beforeEach(async () => {
      const addRevealTxHash = await mockLockManager.write.callAddRevealForTest([alice, 1]);
      await assertTxSuccess({ txHash: addRevealTxHash });

      const startRevealTxHash = await testContracts.nftOverlord.contract.write.startReveal({
        account: alice,
      });
      await assertTxSuccess({ txHash: startRevealTxHash });
    });

    it("should revert with NotEnoughRandomError when called with not enough RNG", async () => {
      await assert.rejects(
        mockRNGProxy.simulate.callRevealForTest([
          BigInt(alice),
          toHex(numberToBytes(123456789, { size: 4 })),
        ]),
        (err: Error) =>
          assertContractFunctionRevertedError(
            err,
            "NotEnoughRandomError",
            testContracts.nftOverlord.contract.abi
          )
      );
    });

    for (const testCase of testCases) {
      it(`should reveal NFT with rarity ${testCase.expectedRarity}`, async () => {
        const txHash = await mockRNGProxy.write.callRevealForTest([
          BigInt(alice),
          toHex(numberToBytes(testCase.rng, { size: 5 })),
        ]);
        await assertRevealSuccess({
          player: alice,
          tokenId: 1n,
          expectedRarity: testCase.expectedRarity,
          expectedSpecies: testCase.expectedSpecies,
          txHash,
          testContracts,
        });
      });
    }
  });

  it("allow reveal queue > 1", async () => {
    const setConfigTxHash = await testContracts.configStorage.contract.write.setSmallInt([
      StorageKey.MaxRevealQueue,
      7,
      true,
    ]);
    await assertTxSuccess({ txHash: setConfigTxHash });

    const addRevealTxHash = await mockLockManager.write.callAddRevealForTest([alice, 10]);
    await assertTxSuccess({ txHash: addRevealTxHash });

    const startRevealTxHash = await testContracts.nftOverlord.contract.write.startReveal({
      account: alice,
    });
    await assertTxSuccess({ txHash: startRevealTxHash });

    const startRevealTxHash2 = await testContracts.nftOverlord.contract.write.startReveal({
      account: alice,
    });
    await assertTxSuccess({ txHash: startRevealTxHash2 });

    // reveal 1
    const txHash = await mockRNGProxy.write.callRevealForTest([
      (BigInt(0) << BigInt(96)) | BigInt(alice),
      toHex(numberToBytes(testCases[0].rng, { size: 5 })),
    ]);
    await assertRevealSuccess({
      player: alice,
      tokenId: 1n,
      expectedRarity: testCases[0].expectedRarity,
      expectedSpecies: testCases[0].expectedSpecies,
      txHash,
      testContracts,
    });

    // reveal 2
    const txHash2 = await mockRNGProxy.write.callRevealForTest([
      (BigInt(1) << BigInt(96)) | BigInt(alice),
      toHex(numberToBytes(testCases[0].rng, { size: 5 })),
    ]);
    await assertRevealSuccess({
      player: alice,
      tokenId: 2n,
      expectedRarity: testCases[0].expectedRarity,
      expectedSpecies: testCases[0].expectedSpecies,
      txHash: txHash2,
      testContracts,
    });
  });
});
