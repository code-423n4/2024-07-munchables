import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertContractFunctionRevertedError } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("AccountManager: inaccessible external functions check", () => {
  let admin: `0x${string}`;
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
    admin = testRoleAddresses[Role.Admin];
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
      address: admin,
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

  describe("try calling functions that are only accessible via contracts or never accessible", () => {
    beforeEach(async () => {
      await registerPlayer({ account: bob, testContracts });
    });
    it("initialize() - proxy", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.initialize([zeroAddress], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidInitialization")
      );
    });
    it("initialize() - base", async () => {
      await assert.rejects(
        testContracts.accountManagerRoot.contract.simulate.initialize([zeroAddress], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidInitialization")
      );
    });
    it("updatePlayer()", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.updatePlayer(
          [
            bob,
            {
              registrationDate: 0,
              lastPetMunchable: 0,
              lastHarvestDate: 0,
              snuggeryRealm: 0,
              maxSnuggerySize: 0,
              unfedSchnibbles: 0n,
              referrer: alice,
            },
          ],
          { account: bob }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
    it("forceHarvest()", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.forceHarvest([bob], { account: bob }),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
    it("configUpdated()", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.configUpdated({
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OnlyStorageError")
      );
    });
  });
});
