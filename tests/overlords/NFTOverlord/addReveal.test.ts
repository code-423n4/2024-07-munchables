import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockLockManagerContractType, deployMockLockManager } from "../../utils/mock-contracts";

describe("NFTOverlord: addReveal", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockLockManager: MockLockManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockLockManager = await deployMockLockManager({ testContracts });
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

  it("should revert with UnauthorisedError when not called by LockManager", async () => {
    await assert.rejects(
      testContracts.nftOverlord.contract.simulate.addReveal([alice, 1], {
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
    );
  });

  it("should add quantity to unrevealedNFTs for player when called by LockManager", async () => {
    const quantity = 3;
    const txHash = await mockLockManager.write.callAddRevealForTest([alice, quantity]);
    await assertTxSuccess({ txHash });

    const unrevealedNFTs = await testContracts.nftOverlord.contract.read.getUnrevealedNFTs([alice]);
    assert.equal(unrevealedNFTs, quantity);
  });
});
