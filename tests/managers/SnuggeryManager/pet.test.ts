import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockAccountManagerType,
  MockNFTOverlordContractType,
  deployMockAccountManager,
  deployMockNFTOverlord,
} from "../../utils/mock-contracts";
import { registerMockPlayer, registerMockSubAccount } from "../../utils/players";

describe("SnuggeryManager: petting", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let jirard: `0x${string}`;
  let alex: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;
  let mockAccountManager: MockAccountManagerType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob, jirard, alex] = testRoleAddresses.users;

    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
    mockAccountManager = await deployMockAccountManager({ testContracts });
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

    await mockNFTOverlord.write.addReveal([alice, 100], { account: alice });
    await mockNFTOverlord.write.addReveal([bob, 100], { account: bob });
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 1
    await mockNFTOverlord.write.reveal([alice, 4, 12], { account: alice }); // 1
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 2
    await mockNFTOverlord.write.reveal([alice, 0, 13], { account: alice }); // 2
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 3
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 3
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 4
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 4
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 5
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 5
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 6
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 6
    await mockNFTOverlord.write.startReveal([alice], { account: alice }); // 7
    await mockNFTOverlord.write.reveal([alice, 1, 14], { account: alice }); // 7
    await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 8
    await mockNFTOverlord.write.reveal([bob, 0, 22], { account: bob }); // 8
    await mockNFTOverlord.write.startReveal([bob], { account: bob }); // 9
    await mockNFTOverlord.write.reveal([bob, 0, 23], { account: bob }); // 9

    await registerMockPlayer({ account: alex, mockAccountManager });
    await registerMockPlayer({ account: alice, mockAccountManager });
    await registerMockPlayer({ account: bob, mockAccountManager });
    await registerMockSubAccount({ account: alice, subAccount: jirard, mockAccountManager });

    let txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
      [testContracts.snuggeryManagerProxy.contract.address, true],
      { account: alice }
    );
    await assertTxSuccess({ txHash });
    for (let i = 1; i <= 5; i++) {
      const txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
        [BigInt(i)],
        { account: alice }
      );
      await assertTxSuccess({ txHash });
    }

    txHash = await testContracts.munchNFT.contract.write.setApprovalForAll(
      [testContracts.snuggeryManagerProxy.contract.address, true],
      { account: bob }
    );
    await assertTxSuccess({ txHash });
    for (let i = 8; i <= 9; i++) {
      const txHash = await testContracts.snuggeryManagerProxy.contract.write.importMunchable(
        [BigInt(i)],
        { account: bob }
      );
      await assertTxSuccess({ txHash });
    }
    await testClient.setNextBlockTimestamp({
      timestamp: STARTING_TIMESTAMP,
    });
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("Pet paths", () => {
    it("Try petting ones own Munchie", async () => {
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.pet([alice, BigInt(1)], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "CannotPetOwnError")
      );
    });
    it("Try petting a subaccount", async () => {
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.pet([jirard, BigInt(1)], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PettedIsSubAccount")
      );
    });
    it("Try petting a token ID that is not in snuggery", async () => {
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.pet([alice, BigInt(6)], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "TokenNotFoundInSnuggeryError")
      );
    });
    it("Try petting a token ID too soon", async () => {
      const pet5Hash = await testContracts.snuggeryManagerProxy.contract.write.pet(
        [alice, BigInt(5)],
        {
          account: bob,
        }
      );
      await assertTxSuccess({ txHash: pet5Hash });
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.pet([alice, BigInt(5)], {
          account: alex,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PettedTooSoonError")
      );
    });
    it("Player tries to pet too soon", async () => {
      const pet5Hash = await testContracts.snuggeryManagerProxy.contract.write.pet(
        [alice, BigInt(5)],
        {
          account: bob,
        }
      );
      await assertTxSuccess({ txHash: pet5Hash });
      await assert.rejects(
        testContracts.snuggeryManagerProxy.contract.simulate.pet([alice, BigInt(4)], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PetTooSoonError")
      );
    });
    it("Subaccount pets", async () => {
      const pet5Hash = await testContracts.snuggeryManagerProxy.contract.write.pet(
        [bob, BigInt(8)],
        {
          account: jirard,
        }
      );
      const txReceipt = await assertTxSuccess({ txHash: pet5Hash });
      assertTransactionEvents({
        abi: testContracts.snuggeryManagerProxy.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "MunchablePetted",
            args: {
              _petter: alice,
              _petted: bob,
              _tokenId: BigInt(8),
              _petterSchnibbles: BigInt(5e18),
              _pettedSchnibbles: BigInt(6e18),
            },
          },
        ],
      });
    });
    it("Proper petting timers", async () => {
      const pet8Hash = await testContracts.snuggeryManagerProxy.contract.write.pet(
        [bob, BigInt(8)],
        {
          account: jirard,
        }
      );
      let txReceipt = await assertTxSuccess({ txHash: pet8Hash });
      let block = await testClient.getBlock({ blockNumber: txReceipt.blockNumber });
      await testClient.setNextBlockTimestamp({
        timestamp: block.timestamp + BigInt(5 * 60),
      });
      await testClient.mine({ blocks: 1 });
      const pet8Hash2 = await testContracts.snuggeryManagerProxy.contract.write.pet(
        [bob, BigInt(8)],
        {
          account: alex,
        }
      );
      txReceipt = await assertTxSuccess({ txHash: pet8Hash2 });
      block = await testClient.getBlock({ blockNumber: txReceipt.blockNumber });

      await testClient.setNextBlockTimestamp({
        timestamp: block.timestamp + BigInt(5 * 60),
      });
      await testClient.mine({ blocks: 1 });
      const pet9Hash2 = await testContracts.snuggeryManagerProxy.contract.write.pet(
        [bob, BigInt(9)],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash: pet9Hash2 });
    });
  });
});
