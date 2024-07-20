import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertTransactionEvents, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockAccountManagerType, deployMockAccountManager } from "../../utils/mock-contracts";
import { registerMockPlayer, registerMockSubAccount, registerPlayer } from "../../utils/players";

describe("LandManager: updatePlotMetadata", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockAccountManager: MockAccountManagerType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob] = testRoleAddresses.users;
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: bob,
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

  describe("all paths - mock account manager", () => {
    let innerSnapshot: `0x${string}`;
    beforeEach(async () => {
      innerSnapshot = await testClient.snapshot();
      mockAccountManager = await deployMockAccountManager({ testContracts });
      await registerMockPlayer({
        account: alice,
        realm: 1,
        mockAccountManager: mockAccountManager,
      });
      await registerMockSubAccount({
        account: alice,
        subAccount: bob,
        mockAccountManager: mockAccountManager,
      });
    });

    it("should update plot metadata if lock is > 0 prior to updating", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const txHash = await testClient.writeContract(request);
      await assertTxSuccess({ txHash: txHash });

      const { request: mockRequest } = await mockAccountManager.simulate.updatePlotMetadata(
        [testContracts.landManagerProxy.contract.address, alice],
        {
          account: alice,
        }
      );
      const txHashMock = await testClient.writeContract(mockRequest);
      const receipt2 = await assertTxSuccess({ txHash: txHashMock });
      assertTransactionEvents({
        abi: testContracts.landManagerRoot.contract.abi,
        logs: receipt2.logs,
        expectedEvents: [
          {
            eventName: "UpdatePlotsMeta",
            args: {
              landlord: alice,
            },
          },
        ],
      });
    });
    after(async () => {
      await testClient.revert({ id: innerSnapshot });
    });
  });
  describe("all path - normal account manager", () => {
    beforeEach(async () => {
      await registerPlayer({
        account: alice,
        testContracts,
      });
    });
    it("should update plot metadata from lock call", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: alice, value: parseEther("1") }
      );
      const txHash = await testClient.writeContract(request);
      const receipt = await assertTxSuccess({ txHash: txHash });
      assertTransactionEvents({
        abi: testContracts.landManagerRoot.contract.abi,
        logs: receipt.logs,
        expectedEvents: [
          {
            eventName: "UpdatePlotsMeta",
            args: {
              landlord: alice,
            },
          },
        ],
      });
    });
  });
});
