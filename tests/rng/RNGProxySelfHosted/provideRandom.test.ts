import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { hexToBigInt, parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertTransactionEvents, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";

describe("RNGProxySelfHosted: provideRandom", () => {
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let rngOracle: `0x${string}`;

  let mockNFTOverlord: MockNFTOverlordContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [bob] = testRoleAddresses.users;
    rngOracle = testRoleAddresses[Role.NFTOracle];
    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
    await testClient.setBalance({
      address: bob,
      value: parseEther("10"),
    });
    const txHash = await mockNFTOverlord.write.addReveal([bob, 5], { account: bob });
    await assertTxSuccess({ txHash });
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("ensure proper callback", () => {
    beforeEach(async () => {
      const txHash = await mockNFTOverlord.write.requestRandom([hexToBigInt(bob)], {
        account: bob,
      });
      await assertTxSuccess({ txHash });
    });
    it("provideRandom() - Ensure proper event emission", async () => {
      const txHash = await testContracts.rngProxySelfHosted!.contract.write.provideRandom(
        [hexToBigInt(bob), "0xffffffffff"],
        { account: rngOracle }
      );
      const txReceipt = await assertTxSuccess({ txHash });

      assertTransactionEvents({
        abi: [...testContracts.rngProxySelfHosted!.contract.abi, ...mockNFTOverlord.abi],
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MockNFTReveal",
            args: {
              player: bob,
              rng: "0xffffffffff",
            },
          },
          {
            eventName: "RandomRequestComplete",
            args: {
              _index: hexToBigInt(bob),
              _success: true,
              _data: "0x0000000000000000000000000000000000000000000000000000000000000007",
            },
          },
        ],
      });
    });
  });
});
