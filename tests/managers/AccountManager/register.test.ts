import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("AccountManager: register functionality", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let jirard: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob, jirard] = testRoleAddresses.users;
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

  describe("improper use", () => {
    beforeEach(async () => {
      await registerPlayer({ account: bob, testContracts });
    });

    it("should revert if the player is already registered", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.register([2, zeroAddress], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PlayerAlreadyRegisteredError")
      );
    });

    it("should revert if the player puts an invalid realm", async () => {
      // Invalid Realm
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.register([5, zeroAddress], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRealmError")
      );
      // Above Invalid Realm (so it crashes on input instead of at InvalidRealmError)
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.register([6, zeroAddress], {
          account: alice,
        })
      );
    });
  });

  describe("proper register", () => {
    it("should register a player", async () => {
      await registerPlayer({ account: bob, testContracts });
    });
  });
});
