import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { getAddress, keccak256, parseEther, toHex } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertTransactionEvents, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { MockNFTOverlordContractType, deployMockNFTOverlord } from "../../utils/mock-contracts";

describe("RNGProxySelfHosted: requestRandom", () => {
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  let mockNFTOverlord: MockNFTOverlordContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [bob] = testRoleAddresses.users;
    await testClient.setBalance({
      address: bob,
      value: parseEther("10"),
    });
    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
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

  it("requestRandom() - Ensure proper event emission", async () => {
    const txHash = await mockNFTOverlord.write.requestRandom([1n], {
      account: bob,
    });
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.rngProxySelfHosted!.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "RandomRequested",
          args: {
            _target: getAddress(mockNFTOverlord.address),
            _selector: keccak256(toHex("reveal(uint256,bytes)")).slice(0, 10),
            _index: 1n,
          },
        },
      ],
    });
  });
});
