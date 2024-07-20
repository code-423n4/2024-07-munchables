import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("MunchadexManager: inaccessible external functions check", () => {
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [bob] = testRoleAddresses.users;
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
    it("updateMunchadex()", async () => {
      await assert.rejects(
        testContracts.munchadexManager.contract.simulate.updateMunchadex(
          [zeroAddress, zeroAddress, 1n],
          {
            account: bob,
          }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "UnauthorisedError")
      );
    });
  });
});
