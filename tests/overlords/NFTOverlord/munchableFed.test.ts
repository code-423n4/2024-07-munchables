import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { checksumAddress, keccak256, toHex } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { LEVEL_THRESHOLDS } from "../../../deployments/utils/consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockNFTAttributesManagerContractType,
  MockSnuggeryManagerContractType,
  deployMockNFTAttributesManager,
  deployMockSnuggeryManager,
} from "../../utils/mock-contracts";

const tokenId = 1n;
const attributes = {
  chonks: 0n,
  level: 1,
  evolution: 1,
  lastPettedTime: BigInt(Math.floor(Date.now() / 1000)),
};

async function assertMunchableFedSuccess({
  player,
  levelFrom,
  levelTo,
  txHash,
  testContracts,
}: {
  player: `0x${string}`;
  levelFrom: number;
  levelTo: number;
  txHash: `0x${string}`;
  testContracts: DeployedContractsType;
}) {
  const txReceipt = await assertTxSuccess({ txHash });

  assertTransactionEvents({
    abi: testContracts.nftOverlord.contract.abi,
    logs: txReceipt.logs,
    expectedEvents: [
      {
        eventName: "MunchableLevelUpRequest",
        args: {
          _player: player,
          _tokenId: tokenId,
          _levelFrom: levelFrom,
          _levelTo: levelTo,
        },
      },
    ],
  });

  assert.ok(testContracts.rngProxySelfHosted, "RNG proxy contract not available");
  assertTransactionEvents({
    abi: testContracts.rngProxySelfHosted.contract.abi,
    logs: txReceipt.logs,
    expectedEvents: [
      {
        eventName: "RandomRequested",
        args: {
          _target: checksumAddress(testContracts.nftOverlord.contract.address),
          _index: undefined, // match any value here
          _selector: keccak256(toHex("levelUp(uint256,bytes)")).slice(0, 10),
        },
      },
    ],
  });
}

describe("NFTOverlord: munchableFed", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockSnuggeryManager: MockSnuggeryManagerContractType;
  let mockNFTAttributesManager: MockNFTAttributesManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockSnuggeryManager = await deployMockSnuggeryManager({ testContracts, notify: false });
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

  it("should revert with UnauthorisedError when not called by SnuggeryManager", async () => {
    await assert.rejects(
      testContracts.nftOverlord.contract.simulate.munchableFed([1n, alice], {
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
    );
  });

  describe("when level up not applicable", () => {
    beforeEach(async () => {
      const txHash = await mockNFTAttributesManager.write.setAttributesForTest([
        tokenId,
        attributes,
      ]);
      await assertTxSuccess({ txHash });
    });

    it("should succeed and do nothing", async () => {
      const txHash = await mockSnuggeryManager.write.callMunchableFedForTest([tokenId, alice]);
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: mockSnuggeryManager.abi,
        logs: txReceipt.logs,
        expectedEvents: [],
      });
    });
  });

  for (let level = 0; level < LEVEL_THRESHOLDS.length; level++) {
    const levelTo = level + 2;

    describe(`when level up to ${levelTo} applicable`, () => {
      beforeEach(async () => {
        const txHash = await mockNFTAttributesManager.write.setAttributesForTest([
          tokenId,
          {
            ...attributes,
            chonks: LEVEL_THRESHOLDS[level],
          },
        ]);
        await assertTxSuccess({ txHash });
      });

      it("should succeed", async () => {
        const txHash = await mockSnuggeryManager.write.callMunchableFedForTest([tokenId, alice]);
        await assertMunchableFedSuccess({
          player: alice,
          levelFrom: attributes.level,
          levelTo,
          txHash,
          testContracts,
        });
      });
    });
  }
});
