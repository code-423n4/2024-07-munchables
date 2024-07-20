import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockAccountManagerType, deployMockAccountManager } from "../../utils/mock-contracts";
import { registerMockPlayer, registerMockSubAccount } from "../../utils/players";

describe("PrimordialManager: hatchPrimordialToMunchable", () => {
  let admin: `0x${string}`;
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let jirard: `0x${string}`;
  let oracleRole: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockAccountManager: MockAccountManagerType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob, jirard] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
    oracleRole = testRoleAddresses[Role.NFTOracle];

    mockAccountManager = await deployMockAccountManager({
      testContracts,
    });

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
      await registerMockPlayer({
        account: jirard,
        realm: 1,
        mockAccountManager,
      });
      await registerMockPlayer({
        account: alice,
        realm: 1,
        mockAccountManager,
      });
      await registerMockSubAccount({
        account: alice,
        subAccount: bob,
        mockAccountManager,
      });
      let txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.PrimordialsEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      txHash = await testContracts.primordialManager.contract.write.approvePrimordial(
        [alice, true],
        {
          account: oracleRole,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.primordialManager.contract.write.approvePrimordial(
        [jirard, true],
        {
          account: oracleRole,
        }
      );
      await assertTxSuccess({ txHash });

      txHash = await mockAccountManager.write.giveSchnibbles([alice, 1000n * BigInt(1e18)], {
        account: admin,
      });
      await assertTxSuccess({ txHash });

      txHash = await mockAccountManager.write.giveSchnibbles([jirard, 1000n * BigInt(1e18)], {
        account: admin,
      });
      await assertTxSuccess({ txHash });

      txHash = await testContracts.primordialManager.contract.write.claimPrimordial({
        account: alice,
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.primordialManager.contract.write.feedPrimordial(
        [500n * BigInt(1e18)],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash });
    });
    it("revert hatching when paused", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.Paused, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.hatchPrimordialToMunchable({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
      );
    });
    it("revert if primordial not approved", async () => {
      const txHash = await testContracts.primordialManager.contract.write.approvePrimordial(
        [jirard, false],
        {
          account: oracleRole,
        }
      );
      await assertTxSuccess({ txHash });

      await assert.rejects(
        testContracts.primordialManager.contract.simulate.hatchPrimordialToMunchable({
          account: jirard,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialNotApprovedError")
      );
    });
    it("revert if primordial doesn't exist", async () => {
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.hatchPrimordialToMunchable({
          account: jirard,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialDoesntExistError")
      );
    });
    it("revert if primordial not ready", async () => {
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.hatchPrimordialToMunchable({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialNotReadyError")
      );
    });
    it("mint if ready", async () => {
      let txHash = await testContracts.primordialManager.contract.write.feedPrimordial(
        [250n * BigInt(1e18)],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.primordialManager.contract.write.hatchPrimordialToMunchable({
        account: alice,
      });
      await assertTxSuccess({ txHash });

      const primordial = await testContracts.primordialManager.contract.read.getPrimordial([alice]);
      assert.equal(primordial.hatched, true);
    });
    it("cant claim again if already hatched", async () => {
      let txHash = await testContracts.primordialManager.contract.write.feedPrimordial(
        [250n * BigInt(1e18)],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.primordialManager.contract.write.hatchPrimordialToMunchable({
        account: alice,
      });
      await assertTxSuccess({ txHash });

      await assert.rejects(
        testContracts.primordialManager.contract.simulate.claimPrimordial({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialAlreadyClaimedError")
      );
    });
    it("mint if ready - subaccount", async () => {
      let txHash = await testContracts.primordialManager.contract.write.feedPrimordial(
        [250n * BigInt(1e18)],
        {
          account: bob,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.primordialManager.contract.write.hatchPrimordialToMunchable({
        account: bob,
      });
      await assertTxSuccess({ txHash });

      const primordial = await testContracts.primordialManager.contract.read.getPrimordial([alice]);
      assert.equal(primordial.hatched, true);
    });
  });
});
