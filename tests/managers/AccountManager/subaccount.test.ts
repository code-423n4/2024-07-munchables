import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { ONE_DAY, STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { configureDefaultLock } from "../../utils/lock-configure";
import { registerPlayer, registerSubAccount } from "../../utils/players";

describe("AccountManager: subacount functionality", () => {
  let admin: `0x${string}`;
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let janice: `0x${string}`;
  let jirard: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob, jirard, janice] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];

    await testClient.setNextBlockTimestamp({ timestamp: STARTING_TIMESTAMP });
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: bob,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: janice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: jirard,
      value: parseEther("10"),
    });
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("successful: add and remove multiple subaccounts", () => {
    beforeEach(async () => {
      await registerPlayer({ account: bob, testContracts });
    });
    it("add multiple subaccounts", async () => {
      await registerSubAccount({
        account: bob,
        subAccount: janice,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: jirard,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: alice,
        testContracts,
      });
      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([janice]))[0],
        bob
      );
      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([jirard]))[0],
        bob
      );
      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([alice]))[0],
        bob
      );
      assert.deepStrictEqual(
        (await testContracts.accountManagerProxy.contract.read.getSubAccounts([bob, 0n]))[0],
        [janice, jirard, alice, ...new Array(17).fill(zeroAddress)]
      );
    });
    it("add/remove multiple subaccounts out of order", async () => {
      await registerSubAccount({
        account: bob,
        subAccount: janice,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: jirard,
        testContracts,
      });
      const removeSubAccount =
        await testContracts.accountManagerProxy.contract.write.removeSubAccount([janice], {
          account: bob,
        });
      await assertTxSuccess({ txHash: removeSubAccount });
      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([janice]))[0],
        janice
      );

      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([jirard]))[0],
        bob
      );
      assert.deepStrictEqual(
        (await testContracts.accountManagerProxy.contract.read.getSubAccounts([bob, 0n]))[0],
        [jirard, ...new Array(19).fill(zeroAddress)]
      );
      const removeSubAccount2 =
        await testContracts.accountManagerProxy.contract.write.removeSubAccount([jirard], {
          account: bob,
        });
      await assertTxSuccess({ txHash: removeSubAccount2 });
    });
    it("add/remove multiple subaccounts out of order back to", async () => {
      await registerSubAccount({
        account: bob,
        subAccount: janice,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: jirard,
        testContracts,
      });
      const removeSubAccount =
        await testContracts.accountManagerProxy.contract.write.removeSubAccount([janice], {
          account: bob,
        });
      await assertTxSuccess({ txHash: removeSubAccount });
      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([janice]))[0],
        janice
      );

      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([jirard]))[0],
        bob
      );
      assert.deepStrictEqual(
        (await testContracts.accountManagerProxy.contract.read.getSubAccounts([bob, 0n]))[0],
        [jirard, ...new Array(19).fill(zeroAddress)]
      );
    });
    it("remove all sub accounts", async () => {
      await registerSubAccount({
        account: bob,
        subAccount: janice,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: jirard,
        testContracts,
      });
      const removeSubAccount =
        await testContracts.accountManagerProxy.contract.write.removeSubAccount([janice], {
          account: bob,
        });
      await assertTxSuccess({ txHash: removeSubAccount });
      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([janice]))[0],
        janice
      );

      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([jirard]))[0],
        bob
      );

      const removeSubAccount2 =
        await testContracts.accountManagerProxy.contract.write.removeSubAccount([jirard], {
          account: bob,
        });
      await assertTxSuccess({ txHash: removeSubAccount2 });

      assert.deepStrictEqual(
        (await testContracts.accountManagerProxy.contract.read.getSubAccounts([bob, 0n]))[0],
        new Array(20).fill(zeroAddress)
      );
    });
    it("remove all sub accounts", async () => {
      await registerSubAccount({
        account: bob,
        subAccount: janice,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: jirard,
        testContracts,
      });
      const removeSubAccount =
        await testContracts.accountManagerProxy.contract.write.removeSubAccount([janice], {
          account: bob,
        });
      await assertTxSuccess({ txHash: removeSubAccount });
      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([janice]))[0],
        janice
      );

      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([jirard]))[0],
        bob
      );

      const removeSubAccount2 =
        await testContracts.accountManagerProxy.contract.write.removeSubAccount([jirard], {
          account: bob,
        });
      await assertTxSuccess({ txHash: removeSubAccount2 });

      assert.deepStrictEqual(
        (await testContracts.accountManagerProxy.contract.read.getSubAccounts([bob, 0n]))[0],
        new Array(20).fill(zeroAddress)
      );
    });
  });
  describe("subaccount calls when paused", () => {
    beforeEach(async () => {
      await registerPlayer({ account: bob, testContracts });
      await registerSubAccount({
        account: bob,
        subAccount: alice,
        testContracts,
      });
    });
    it("reject addSubaccount when paused", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool([1, true, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.addSubAccount([janice], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
      );
    });
    it("reject removeSubaccount when paused", async () => {
      await registerSubAccount({
        account: bob,
        subAccount: jirard,
        testContracts,
      });
      const txHash = await testContracts.configStorage.contract.write.setBool([1, true, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.removeSubAccount([jirard], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
      );
    });
  });
  describe("subaccount does malintent", () => {
    beforeEach(async () => {
      await registerPlayer({ account: bob, testContracts });
      await registerSubAccount({
        account: bob,
        subAccount: alice,
        testContracts,
      });
    });
    it("tries to add subaccount twice", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.addSubAccount([alice], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "SubAccountAlreadyRegisteredError")
      );
    });
    it("tries to register as player", async () => {
      const txHash = await testContracts.accountManagerProxy.contract.write.register(
        [0, zeroAddress],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash });

      assert.equal(
        (await testContracts.accountManagerProxy.contract.read.getPlayer([alice]))[0],
        alice
      );
    });
    it("tries to remove itself as subaccount", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.removeSubAccount([alice], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PlayerNotRegisteredError")
      );
    });
    it("tries to remove subaccount that doesn't exist", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.removeSubAccount([janice], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "SubAccountNotRegisteredError")
      );
    });
    it("tries to add subaccount", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.addSubAccount([janice], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PlayerNotRegisteredError")
      );
    });
  });
  describe("subaccount does good functions", () => {
    beforeEach(async () => {
      await configureDefaultLock({ admin: admin, testContracts });
      await registerPlayer({ account: bob, testContracts });
      await registerSubAccount({
        account: bob,
        subAccount: alice,
        testContracts,
      });

      await testContracts.lockManager.contract.write.lock([zeroAddress, parseEther("1")], {
        account: bob,
        value: parseEther("1"),
      });
    });

    it("subaccount harvests", async () => {
      // Simulate harvest
      await testClient.setNextBlockTimestamp({
        timestamp: STARTING_TIMESTAMP + ONE_DAY,
      });
      const [, { unfedSchnibbles: unfedSchnibblesPrior }] =
        await testContracts.accountManagerProxy.contract.read.getPlayer([bob]);

      const harvestTx = await testContracts.accountManagerProxy.contract.write.harvest({
        account: alice,
      });
      await assertTxSuccess({ txHash: harvestTx });
      const [, { unfedSchnibbles: unfedSchnibblesPost }] =
        await testContracts.accountManagerProxy.contract.read.getPlayer([bob]);
      assert.ok(
        unfedSchnibblesPost > unfedSchnibblesPrior,
        "check not harvesting 0 and benefits main account"
      );
    });
  });

  describe("subaccount additional getter tests", async () => {
    beforeEach(async () => {
      await registerPlayer({ account: bob, testContracts });
      await registerSubAccount({
        account: bob,
        subAccount: janice,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: jirard,
        testContracts,
      });
      await registerSubAccount({
        account: bob,
        subAccount: alice,
        testContracts,
      });
    });
    it("getSubAccounts", async () => {
      const mainAccount = await testContracts.accountManagerProxy.contract.read.getMainAccount([
        janice,
      ]);
      const mainAccount1 = await testContracts.accountManagerProxy.contract.read.getMainAccount([
        jirard,
      ]);
      const mainAccount2 = await testContracts.accountManagerProxy.contract.read.getMainAccount([
        alice,
      ]);
      const mainAccount3 = await testContracts.accountManagerProxy.contract.read.getMainAccount([
        bob,
      ]);
      assert.equal(mainAccount, bob);
      assert.equal(mainAccount1, bob);
      assert.equal(mainAccount2, bob);
      assert.equal(mainAccount3, bob);
    });
  });
});
