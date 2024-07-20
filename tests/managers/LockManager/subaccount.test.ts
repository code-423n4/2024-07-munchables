import { after, afterEach, before, beforeEach, describe } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { configureDefaultLock } from "../../utils/lock-configure";
import { registerPlayer, registerSubAccount } from "../../utils/players";

describe("LockManager: subacount prevention", () => {
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
  describe("subaccount proper locking/unlocking behavior", () => {
    beforeEach(async () => {
      await configureDefaultLock({ testContracts, admin: admin });
      await registerPlayer({ account: bob, testContracts });
      await registerSubAccount({
        account: bob,
        subAccount: janice,
        testContracts,
      });
    });
  });
});
