import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";

describe("ConfigStorage: Roles", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const addresses = await getTestRoleAddresses();
    [alice] = addresses.users;
    admin = addresses[Role.Admin];
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("add/remove roles", () => {
    it("add role to a specific contract", async () => {
      const role = 2;
      const txHash = await testContracts.configStorage.contract.write.setRole(
        [role, testContracts.lockManager.contract.address, alice],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getRole([role], {
        account: testContracts.lockManager.contract.address,
      });
      assert.equal(res, alice);
    });

    it("add universal role", async () => {
      const role = 2;
      const txHash = await testContracts.configStorage.contract.write.setUniversalRole(
        [role, alice],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getUniversalRole([role], {
        account: alice,
      });
      assert.equal(res, alice);
    });
  });
});
