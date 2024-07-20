import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("LandManager: stakeMunchable", () => {
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
      await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 7
      await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 7
      await mockNFTOverlord.write.startReveal([jirard], { account: jirard }); // 8
      await mockNFTOverlord.write.reveal([jirard, 0, 22], { account: jirard }); // 8
      await mockNFTOverlord.write.startReveal([jirard], { account: jirard }); // 9
      await mockNFTOverlord.write.reveal([jirard, 0, 23], { account: jirard }); // 9
    });
    it("success and occupied plot", async () => {
      const txHash = await testContracts.munchNFT.contract.write.approve(
        [testContracts.landManagerProxy.contract.address, 1n],
        { account: bob }
      );
      await assertTxSuccess({ txHash });
      const txHash2 = await testContracts.munchNFT.contract.write.approve(
        [testContracts.landManagerProxy.contract.address, 2n],
        { account: bob }
      );
      await assertTxSuccess({ txHash: txHash2 });
      const stakeMunchableTxHash =
        await testContracts.landManagerProxy.contract.write.stakeMunchable([alice, 1, 0], {
          account: bob,
        });
      await assertTxSuccess({ txHash: stakeMunchableTxHash });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.stakeMunchable([alice, 2, 0], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OccupiedPlotError")
      );
    });
    it("plot too high", async () => {
      const txHash = await testContracts.munchNFT.contract.write.approve(
        [testContracts.landManagerProxy.contract.address, 1n],
        { account: bob }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.stakeMunchable([alice, 1, 126], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PlotTooHighError")
      );
    });
    it("too many staked", async () => {
      for (let i = 1; i < 12; i++) {
        const txHash = await testContracts.munchNFT.contract.write.approve(
          [testContracts.landManagerProxy.contract.address, i],
          { account: bob }
        );
        const { request } = await testContracts.landManagerProxy.contract.simulate.stakeMunchable(
          [alice, i, i - 1],
          {
            account: bob,
          }
        );
        await assertTxSuccess({ txHash });
        const stakeMunchableTxHash = await testClient.writeContract(request);
        await assertTxSuccess({ txHash: stakeMunchableTxHash });
      }
      const { request: finalApproval } = await testContracts.munchNFT.contract.simulate.approve(
        [testContracts.landManagerProxy.contract.address, 12],
        { account: bob }
      );
      const approvalHash = await testClient.writeContract(finalApproval);
      await assertTxSuccess({ txHash: approvalHash });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.stakeMunchable([alice, 12, 11], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "TooManyStakedMunchiesError")
      );
    });
    it("not approved", async () => {
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.stakeMunchable([alice, 1, 0], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotApprovedError")
      );
    });
    it("tried to stake to self", async () => {
      const txHashApproval = await testContracts.munchNFT.contract.write.approve(
        [testContracts.landManagerProxy.contract.address, 14n],
        { account: alice }
      );
      await assertTxSuccess({ txHash: txHashApproval });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.stakeMunchable([alice, 14, 0], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "CantStakeToSelfError")
      );
    });
    it("not owner", async () => {
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.stakeMunchable([alice, 8, 0], {
          account: jirard,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidOwnerError")
      );
    });
  });
});
