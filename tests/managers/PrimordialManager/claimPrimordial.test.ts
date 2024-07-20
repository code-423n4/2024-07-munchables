import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer, registerSubAccount } from "../../utils/players";

describe("PrimordialManager: claimPrimordial", () => {
  let admin: `0x${string}`;
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let oracleRole: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
    oracleRole = testRoleAddresses[Role.NFTOracle];
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: bob,
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
        realm: 1,
        testContracts,
      });
      await registerSubAccount({
        account: alice,
        subAccount: bob,
        testContracts,
      });
    });
    it("revert claiming when paused", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.Paused, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.claimPrimordial({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
      );
    });
    it("revert claiming when primordials not enabled", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.PrimordialsEnabled, false, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.claimPrimordial({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialsNotEnabledError")
      );
    });
    it("revert claiming when not approved", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.PrimordialsEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.claimPrimordial({
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialNotApprovedError")
      );
    });
    it("try claiming double", async () => {
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
      txHash = await testContracts.primordialManager.contract.write.claimPrimordial({
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
    it("claim normal", async () => {
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
      txHash = await testContracts.primordialManager.contract.write.claimPrimordial({
        account: alice,
      });
      const txReceipt = await assertTxSuccess({ txHash });
      const block = await testClient.getBlock({ blockHash: txReceipt.blockHash });
      assertTransactionEvents({
        abi: testContracts.primordialManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "PrimordialClaimed",
            args: {
              _player: alice,
            },
          },
        ],
      });
      const primordialData = await testContracts.primordialManager.contract.read.getPrimordial([
        alice,
      ]);
      assert.equal(primordialData.chonks, 0n);
      assert.equal(primordialData.createdDate, Number(block.timestamp));
      assert.equal(primordialData.level, -3);
      assert.equal(primordialData.hatched, false);
    });
    it("claim by subaccount", async () => {
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
      txHash = await testContracts.primordialManager.contract.write.claimPrimordial({
        account: bob,
      });
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.primordialManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "PrimordialClaimed",
            args: {
              _player: alice,
            },
          },
        ],
      });
    });
  });
});
