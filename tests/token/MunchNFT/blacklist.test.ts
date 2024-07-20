import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";

describe("MunchNFT: blacklist", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });

    [alice, bob] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();

    for (let i = 0; i < 10; i++) {
      // alice owns odd numbers
      await mockNFTOverlord.write.mintTest([alice], { account: alice });
      await mockNFTOverlord.write.mintTest([bob], { account: bob });
    }
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  it("non-admin cannot blacklist", async () => {
    await assert.rejects(
      testContracts.munchNFT.contract.simulate.blAccount([bob], {
        account: alice,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
    );
  });

  it("admin can blacklist", async () => {
    const txHash = await testContracts.munchNFT.contract.write.blAccount([bob], {
      account: admin,
    });
    await assertTxSuccess({ txHash });
  });

  it("blacklisting works while paused", async () => {
    let txHash = await testContracts.configStorage.contract.write.setBool(
      [StorageKey.Paused, true, true],
      { account: admin }
    );
    await assertTxSuccess({ txHash });

    txHash = await testContracts.munchNFT.contract.write.blAccount([bob], {
      account: admin,
    });
    await assertTxSuccess({ txHash });
  });

  it("blacklisting account", async () => {
    let txHash = await testContracts.munchNFT.contract.write.blAccount([bob], {
      account: admin,
    });
    await assertTxSuccess({ txHash });

    // bob tries to transfer to alice (should fail)
    await assert.rejects(
      testContracts.munchNFT.contract.simulate.transferFrom([bob, alice, 2n], {
        account: bob,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "ForbiddenTransferError")
    );

    // alice transfers to bob (should work)
    txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 1n], {
      account: alice,
    });
    await assertTxSuccess({ txHash });
  });

  it("blacklisting token", async () => {
    let txHash = await testContracts.munchNFT.contract.write.blToken([2n], {
      account: admin,
    });
    await assertTxSuccess({ txHash });

    // bob tries to transfer blacklisted token
    await assert.rejects(
      testContracts.munchNFT.contract.simulate.transferFrom([bob, alice, 2n], {
        account: bob,
      }),
      (err: Error) => assertContractFunctionRevertedError(err, "ForbiddenTransferError")
    );

    // transfer non-blacklisted token
    txHash = await testContracts.munchNFT.contract.write.transferFrom([bob, alice, 4n], {
      account: bob,
    });
    await assertTxSuccess({ txHash });
  });
});
