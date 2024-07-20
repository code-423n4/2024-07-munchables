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
import { MockAccountManagerType, deployMockAccountManager } from "../../utils/mock-contracts";
import { registerMockPlayer, registerMockSubAccount } from "../../utils/players";

describe("PrimordialManager: feedPrimordial", () => {
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

      txHash = await mockAccountManager.write.giveSchnibbles([alice, 10000n * BigInt(1e18)], {
        account: admin,
      });
      await assertTxSuccess({ txHash });

      txHash = await mockAccountManager.write.giveSchnibbles([jirard, 10000n * BigInt(1e18)], {
        account: admin,
      });
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

      txHash = await testContracts.primordialManager.contract.write.claimPrimordial({
        account: alice,
      });
      await assertTxSuccess({ txHash });
    });
    it("revert feeding when paused", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool([1, true, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.feedPrimordial([100n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
      );
    });
    it("revert feeding when primordials not enabled", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.PrimordialsEnabled, false, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.feedPrimordial([100n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialsNotEnabledError")
      );
    });
    it("revert feeding when primordial not approved", async () => {
      const txHash = await testContracts.primordialManager.contract.write.approvePrimordial(
        [alice, false],
        {
          account: oracleRole,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.feedPrimordial([100n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialNotApprovedError")
      );
    });
    it("revert - tries to feed too much", async () => {
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.feedPrimordial([100000n * BigInt(1e18)], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InsufficientSchnibblesError")
      );
    });
    it("revert - primordial doesn't exist", async () => {
      await assert.rejects(
        testContracts.primordialManager.contract.simulate.feedPrimordial([100n], {
          account: jirard,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PrimordialDoesntExistError")
      );
    });
    it("normal primordial feeding", async () => {
      const [, playerInfoBefore] = await mockAccountManager.read.getPlayer([alice]);
      const txHash = await testContracts.primordialManager.contract.write.feedPrimordial([1000n], {
        account: alice,
      });
      await assertTxSuccess({ txHash });

      const primordial = await testContracts.primordialManager.contract.read.getPrimordial([alice]);
      assert.equal(primordial.chonks, 1000n);

      const [, playerInfoAfter] = await mockAccountManager.read.getPlayer([alice]);
      assert.equal(playerInfoAfter.unfedSchnibbles, playerInfoBefore.unfedSchnibbles - 1000n);
    });
    it("normal subaccount feeding", async () => {
      const [, playerInfoBefore] = await mockAccountManager.read.getPlayer([alice]);
      const txHash = await testContracts.primordialManager.contract.write.feedPrimordial([1000n], {
        account: bob,
      });
      await assertTxSuccess({ txHash });

      const primordial = await testContracts.primordialManager.contract.read.getPrimordial([alice]);
      assert.equal(primordial.chonks, 1000n);

      const [, playerInfoAfter] = await mockAccountManager.read.getPlayer([alice]);
      assert.equal(playerInfoAfter.unfedSchnibbles, playerInfoBefore.unfedSchnibbles - 1000n);
    });
    it("normal primordial feeding - levelup", async () => {
      const txHash = await testContracts.primordialManager.contract.write.feedPrimordial(
        [500n * BigInt(1e18)],
        {
          account: alice,
        }
      );
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.primordialManager.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "PrimordialLevelledUp",
            args: {
              _player: alice,
              _levelFrom: -3,
              _levelTo: -1,
            },
          },
        ],
      });
    });
    it("capped primordial feeding", async () => {
      const txHash = await testContracts.primordialManager.contract.write.feedPrimordial(
        [5000n * BigInt(1e18)],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash });

      const player = await mockAccountManager.read.getPlayer([alice]);
      assert.equal(player[1].unfedSchnibbles, 10000n * BigInt(1e18) - 750n * BigInt(1e18));
    });
  });
});
