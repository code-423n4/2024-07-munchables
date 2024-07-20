import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { checksumAddress, keccak256, toHex } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { StorageKey } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockPrimordialManagerContractType,
  deployMockPrimordialManager,
} from "../../utils/mock-contracts";

describe("NFTOverlord: mintFromPrimordial", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockPrimordialManager: MockPrimordialManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockPrimordialManager = await deployMockPrimordialManager({ testContracts });
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

  it("should revert with UnauthorisedError when not called by PrimordialManager", async () => {
    await assert.rejects(
      testContracts.nftOverlord.contract.simulate.mintFromPrimordial([alice], {
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
    );
  });

  it("should succeed when called by PrimordialManager", async () => {
    // make sure max queue is 1
    let txHash = await testContracts.configStorage.contract.write.setSmallInt([
      StorageKey.MaxRevealQueue,
      1,
      true,
    ]);
    await assertTxSuccess({ txHash });

    txHash = await mockPrimordialManager.write.callMintFromPrimordialForTest([alice]);
    const txReceipt = await assertTxSuccess({ txHash });

    assert.ok(testContracts.rngProxySelfHosted, "RNG proxy contract not available");
    assertTransactionEvents({
      abi: testContracts.rngProxySelfHosted.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "RandomRequested",
          args: {
            _target: checksumAddress(testContracts.nftOverlord.contract.address),
            _index: BigInt(alice),
            _selector: keccak256(toHex("revealFromPrimordial(uint256,bytes)")).slice(0, 10),
          },
        },
      ],
    });

    await assert.rejects(
      mockPrimordialManager.simulate.callMintFromPrimordialForTest([alice]),
      (err: Error) =>
        assertContractFunctionRevertedError(
          err,
          "RevealQueueFullError",
          testContracts.nftOverlord.contract.abi
        )
    );
  });
});
