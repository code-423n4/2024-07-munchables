import isEqual from "lodash.isequal";
import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { Address, pad, toHex } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Rarity, Realm } from "../../../deployments/utils/consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockMigrationManagerContractType,
  deployMockMigrationManager,
} from "../../utils/mock-contracts";

const immutableAttributes = {
  rarity: Rarity.Common,
  species: 1,
  realm: Realm.Everfrost,
  generation: 1,
  hatchedDate: Math.floor(Date.now() / 1000),
};
const attributes = {
  chonks: 0n,
  level: 1,
  evolution: 1,
  lastPettedTime: BigInt(Math.floor(Date.now() / 1000)),
};
const gameAttributes: { dataType: number; value: Address }[] = [
  { dataType: 3, value: pad(toHex(1)) },
  { dataType: 3, value: pad(toHex(2)) },
  { dataType: 3, value: pad(toHex(0)) },
  { dataType: 3, value: pad(toHex(1)) },
  { dataType: 3, value: pad(toHex(2)) },
  { dataType: 3, value: pad(toHex(0)) },
  { dataType: 3, value: pad(toHex(1)) },
  { dataType: 3, value: pad(toHex(2)) },
  { dataType: 3, value: pad(toHex(0)) },
  { dataType: 3, value: pad(toHex(1)) },
  { dataType: 3, value: pad(toHex(2)) },
  { dataType: 3, value: pad(toHex(0)) },
  { dataType: 3, value: pad(toHex(1)) },
  { dataType: 3, value: pad(toHex(2)) },
  { dataType: 3, value: pad(toHex(0)) },
  { dataType: 0, value: "0x" },
];

async function assertMintForMigrationSuccess({
  player,
  tokenId,
  txHash,
  testContracts,
}: {
  player: `0x${string}`;
  tokenId: bigint;
  txHash: `0x${string}`;
  testContracts: DeployedContractsType;
}) {
  const txReceipt = await assertTxSuccess({ txHash });

  assertTransactionEvents({
    abi: testContracts.nftOverlord.contract.abi,
    logs: txReceipt.logs,
    expectedEvents: [
      {
        eventName: "MintedForMigration",
        args: {
          _player: player,
          _tokenId: tokenId,
          _immutableAttributes: immutableAttributes,
          _attributes: attributes,
          _gameAttributes: gameAttributes,
        },
      },
    ],
  });

  const actualAttributes = await testContracts.nftAttributesManagerV1.contract.read.getAttributes([
    tokenId,
  ]);
  assert(isEqual(actualAttributes, attributes));

  const actualImmutableAttributes =
    await testContracts.nftAttributesManagerV1.contract.read.getImmutableAttributes([tokenId]);
  assert(isEqual(actualImmutableAttributes, immutableAttributes));

  const actualGameAttributes =
    await testContracts.nftAttributesManagerV1.contract.read.getGameAttributes([tokenId, []]);
  assert(isEqual(actualGameAttributes, gameAttributes));

  const actualNFTOwner = await testContracts.munchNFT.contract.read.ownerOf([tokenId]);
  assert.equal(actualNFTOwner, player);
}

describe("NFTOverlord: mintForMigration", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockMigrationManager: MockMigrationManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockMigrationManager = await deployMockMigrationManager({ testContracts });
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

  it("should revert with UnauthorisedError when not called by MigrationManager", async () => {
    await assert.rejects(
      testContracts.nftOverlord.contract.simulate.mintForMigration(
        [alice, attributes, immutableAttributes, gameAttributes],
        {
          account: alice,
        }
      ),
      (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
    );
  });

  it("should succeed when called by MigrationManager", async () => {
    const txHash = await mockMigrationManager.write.callMintForMigrationForTest([
      alice,
      attributes,
      immutableAttributes,
      gameAttributes,
    ]);
    await assertMintForMigrationSuccess({
      player: alice,
      tokenId: 1n,
      txHash,
      testContracts,
    });
  });

  it("should succeed when called twice by MigrationManager", async () => {
    const tx1Hash = await mockMigrationManager.write.callMintForMigrationForTest([
      alice,
      attributes,
      immutableAttributes,
      gameAttributes,
    ]);
    await assertMintForMigrationSuccess({
      player: alice,
      tokenId: 1n,
      txHash: tx1Hash,
      testContracts,
    });

    const tx2Hash = await mockMigrationManager.write.callMintForMigrationForTest([
      alice,
      attributes,
      immutableAttributes,
      gameAttributes,
    ]);
    await assertMintForMigrationSuccess({
      player: alice,
      tokenId: 2n,
      txHash: tx2Hash,
      testContracts,
    });
  });
});
