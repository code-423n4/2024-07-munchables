import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertContractFunctionRevertedError } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("ClaimManager: inaccessible external functions check", () => {
  let bob: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [bob] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
    await testClient.setBalance({
      address: bob,
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
        testContracts.claimManagerProxy.contract.simulate.initialize(
          [testContracts.configStorage.contract.address],
          {
            account: admin,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidInitialization")
      );
    });
    it("initialize() - root", async () => {
      await assert.rejects(
        testContracts.claimManagerRoot.contract.simulate.initialize(
          [testContracts.configStorage.contract.address],
          {
            account: bob,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidInitialization")
      );
    });
    it("configUpdated()", async () => {
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.configUpdated({
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OnlyStorageError")
      );
    });
    it("newPeriod()", async () => {
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.newPeriod({
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });
    it("burnNFTsForPoints()", async () => {
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.burnNFTsForPoints([bob, []], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
    it("burnUnrevealedForPoints()", async () => {
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.burnUnrevealedForPoints([bob, 3n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
    it("forceClaimPoints()", async () => {
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.forceClaimPoints([bob], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
    it("spendPoints()", async () => {
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.spendPoints([bob, 10n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
  });
});
