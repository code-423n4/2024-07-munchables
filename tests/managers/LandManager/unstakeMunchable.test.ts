import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("LandManager: unstakeMunchable", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let jirard: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
    [alice, bob, jirard] = testRoleAddresses.users;
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: bob,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: jirard,
      value: parseEther("10"),
    });
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

  describe("all paths", () => {
    beforeEach(async () => {
      await registerPlayer({
        account: alice,
        testContracts,
      });
      await registerPlayer({
        account: bob,
        testContracts,
      });
      await registerPlayer({
        account: jirard,
        testContracts,
      });

      const { request } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const txHash = await testClient.writeContract(request);
      await assertTxSuccess({ txHash: txHash });

      await mockNFTOverlord.write.addReveal([alice, 100], { account: alice });
      await mockNFTOverlord.write.addReveal([bob, 100], { account: bob });
      await mockNFTOverlord.write.addReveal([bob, 100], { account: bob });
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 1
      await mockNFTOverlord.write.reveal([bob, 4, 12], { account: bob }); // 1
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 2
      await mockNFTOverlord.write.reveal([bob, 0, 13], { account: bob }); // 2
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 3
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 3
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 4
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 4
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 5
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 5
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 6
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 6
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 7
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 7
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 1
      await mockNFTOverlord.write.reveal([bob, 4, 12], { account: bob }); // 1
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 2
      await mockNFTOverlord.write.reveal([bob, 0, 13], { account: bob }); // 2
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 3
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 3
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 4
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 4
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 5
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 5
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 6
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 6
      await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 7
      await mockNFTOverlord.write.reveal([bob, 1, 14], { account: bob }); // 7
      await mockNFTOverlord.write.startReveal([jirard], { account: jirard }); // 8
      await mockNFTOverlord.write.reveal([jirard, 0, 22], { account: jirard }); // 8
      await mockNFTOverlord.write.startReveal([jirard], { account: jirard }); // 9
      await mockNFTOverlord.write.reveal([jirard, 0, 23], { account: jirard }); // 9
    });
    it("not staked token id", async () => {
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.unstakeMunchable([1], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotStakedError")
      );
    });
    it("invalid owner", async () => {
      const txHash = await testContracts.munchNFT.contract.write.approve(
        [testContracts.landManagerProxy.contract.address, 1],
        { account: bob }
      );
      const { request } = await testContracts.landManagerProxy.contract.simulate.stakeMunchable(
        [alice, 1, 0],
        {
          account: bob,
        }
      );
      await assertTxSuccess({ txHash });
      const stakeMunchableTxHash = await testClient.writeContract(request);
      await assertTxSuccess({ txHash: stakeMunchableTxHash });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.unstakeMunchable([1], {
          account: jirard,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidOwnerError")
      );
    });
    it("successful path", async () => {
      const txHash = await testContracts.munchNFT.contract.write.approve(
        [testContracts.landManagerProxy.contract.address, 1],
        { account: bob }
      );
      await assertTxSuccess({ txHash });
      const { request: stakeRequest } =
        await testContracts.landManagerProxy.contract.simulate.stakeMunchable([alice, 1, 0], {
          account: bob,
        });
      const stakeMunchableTxHash = await testClient.writeContract(stakeRequest);
      await assertTxSuccess({ txHash: stakeMunchableTxHash });
      const { request: unstakeRequest } =
        await testContracts.landManagerProxy.contract.simulate.unstakeMunchable([1], {
          account: bob,
        });
      const unstakeHash = await testClient.writeContract(unstakeRequest);
      await assertTxSuccess({ txHash: unstakeHash });
    });
  });
});
