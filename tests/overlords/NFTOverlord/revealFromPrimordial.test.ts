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
  MockPrimordialManagerContractType,
  MockRNGProxyContractType,
  deployMockPrimordialManager,
  deployMockRNGProxy,
} from "../../utils/mock-contracts";

const commonPct = DEFAULT_VARIABLES[StorageKey.CommonPercentage].value as number;
const rarePct = DEFAULT_VARIABLES[StorageKey.RarePercentage].value as number;

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
    rng: 2 ** 40 - 1,
    expectedRarity: Rarity.Rare,
    expectedSpecies: DEFAULT_VARIABLES[StorageKey.RareSpecies].value as number[],
  },
];

async function assertRevealFromPrimordialSuccess({
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
  assert(expectedSpecies.includes(immutableAttributes.species));
  assert.equal(immutableAttributes.generation, 2);
  assert.equal(immutableAttributes.hatchedDate, Number(block.timestamp));
  assert.equal(immutableAttributes.rarity, expectedRarity);
  assert.equal(immutableAttributes.realm, REALM_LOOKUPS[immutableAttributes.species]);

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
        eventName: "PrimordialHatched",
        args: {
          _player: player,
          _immutableAttributes: immutableAttributes,
        },
      },
    ],
  });
}

describe("NFTOverlord: revealFromPrimordial", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockPrimordialManager: MockPrimordialManagerContractType;
  let mockRNGProxy: MockRNGProxyContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockPrimordialManager = await deployMockPrimordialManager({ testContracts, notify: false });
    mockRNGProxy = await deployMockRNGProxy({ testContracts });
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
      testContracts.nftOverlord.contract.simulate.revealFromPrimordial(
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
      mockRNGProxy.simulate.callRevealFromPrimordialForTest([
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
      const txHash = await mockPrimordialManager.write.callMintFromPrimordialForTest([alice]);
      await assertTxSuccess({ txHash });
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
        const txHash = await mockRNGProxy.write.callRevealFromPrimordialForTest([
          BigInt(alice),
          toHex(numberToBytes(testCase.rng, { size: 5 })),
        ]);
        await assertRevealFromPrimordialSuccess({
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
});
