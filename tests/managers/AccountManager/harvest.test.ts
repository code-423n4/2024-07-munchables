import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { BASE_TOKEN_DATA, ONE_DAY, STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { configureDefaultLock } from "../../utils/lock-configure";
import { registerPlayer } from "../../utils/players";

describe("AccountManager: harvest functionality", () => {
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

  describe("improper harvest calls", () => {
    it("harvest() - paused", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool([1, true, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.harvest({
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
      );
    });
    it("harvest() - player not registered", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.harvest({
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "MainAccountNotRegisteredError")
      );
    });
  });

  describe("harvest() - successful", () => {
    const ONE_ETH = parseEther("1");
    beforeEach(async () => {
      await configureDefaultLock({ admin: admin, testContracts });
      await registerPlayer({ account: bob, testContracts });
      await testClient.setNextBlockTimestamp({
        timestamp: STARTING_TIMESTAMP,
      });
      await testContracts.lockManager.contract.write.lock([zeroAddress, ONE_ETH], {
        account: bob,
        value: ONE_ETH,
      });
      await testClient.setNextBlockTimestamp({
        timestamp: STARTING_TIMESTAMP + ONE_DAY,
      });
    });

    it("no-bonus harvest", async () => {
      const txHash = await testContracts.accountManagerProxy.contract.write.harvest({
        account: bob,
      });
      const txReceipt = await assertTxSuccess({ txHash });

      const calculatedOneDaySchnibblesNoBonus =
        (ONE_ETH * BASE_TOKEN_DATA.usdPrice) / BigInt(10e18);
      assertTransactionEvents({
        abi: testContracts.accountManagerProxy.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "Harvested",
            args: {
              _player: bob,
              _harvestedSchnibbles: calculatedOneDaySchnibblesNoBonus,
            },
          },
        ],
      });
    });
  });
});
