import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import MockConfigNotifiable from "../../../out/MockConfigNotifiable.sol/MockConfigNotifiable.json";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockNotifiableContractType,
  deployMockNotifiableContract,
} from "../../utils/mock-contracts";

describe("ConfigStorage: Notify", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockConfigNotifiableContract: MockNotifiableContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const addresses = await getTestRoleAddresses();
    [alice] = addresses.users;
    admin = addresses[Role.Admin];
    mockConfigNotifiableContract = await deployMockNotifiableContract({
      account: alice,
      configStorageAddress: testContracts.configStorage.contract.address,
    });
    const txHash = await testContracts.configStorage.contract.write.addNotifiableAddresses(
      [[mockConfigNotifiableContract.address]],
      { account: admin }
    );
    await assertTxSuccess({ txHash });
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

  describe("notifications", () => {
    it("receives notification after changing config", async () => {
      const uintVal = BigInt(123e18);
      const key = 14;
      const txHash = await testContracts.configStorage.contract.write.setUint(
        [key, uintVal, true],
        { account: admin }
      );
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: MockConfigNotifiable.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "ConfigUpdated",
            args: undefined,
          },
        ],
      });
      await assert.doesNotReject(
        mockConfigNotifiableContract.read.verifyDirtyUint([uintVal], { account: alice })
      );
    });

    it("does not receive notification if notify set to false", async () => {
      const uintVal = BigInt(123e18);
      const key = 14;
      const txHash = await testContracts.configStorage.contract.write.setUint(
        [key, uintVal, false],
        { account: admin }
      );
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: MockConfigNotifiable.abi,
        logs: txReceipt.logs,
        expectedEvents: [],
      });

      await assert.rejects(
        mockConfigNotifiableContract.read.verifyDirtyUint([uintVal], { account: alice }),
        (err: Error) => assertContractFunctionRevertedError(err, "VerificationFailError")
      );
    });

    it("notifications stop after being removed", async () => {
      const txHashRemove = await testContracts.configStorage.contract.write.removeNotifiableAddress(
        [mockConfigNotifiableContract.address],
        { account: admin }
      );
      await assertTxSuccess({ txHash: txHashRemove });

      const uintVal = BigInt(123e18);
      const key = 14;
      const txHash = await testContracts.configStorage.contract.write.setUint(
        [key, uintVal, true],
        { account: admin }
      );
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: MockConfigNotifiable.abi,
        logs: txReceipt.logs,
        expectedEvents: [],
      });
    });
  });
});
