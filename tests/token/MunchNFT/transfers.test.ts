import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Realm } from "../../../deployments/utils/consts";
import { assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockAccountManagerType,
  MockNFTOverlordContractType,
  deployMockAccountManager,
  deployMockNFTOverlord,
} from "../../utils/mock-contracts";
import { registerMockPlayer } from "../../utils/players";

describe("MunchNFT: transfers", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let charlie: `0x${string}`;
  let danny: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockNFTOverlord: MockNFTOverlordContractType;
  let mockAccountManager: MockAccountManagerType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    mockNFTOverlord = await deployMockNFTOverlord({ testContracts });
    mockAccountManager = await deployMockAccountManager({ testContracts });

    [alice, bob, charlie, danny] = testRoleAddresses.users;

    // only alice and danny are registered
    await registerMockPlayer({ account: alice, realm: Realm.Everfrost, mockAccountManager });
    await registerMockPlayer({ account: danny, realm: Realm.Everfrost, mockAccountManager });
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();

    let txHash = await mockNFTOverlord.write.addReveal([alice, 100], { account: alice });
    await assertTxSuccess({ txHash });
    txHash = await mockNFTOverlord.write.addReveal([danny, 100], { account: danny });
    await assertTxSuccess({ txHash });

    for (let i = 0; i < 5; i++) {
      txHash = await mockNFTOverlord.write.startReveal([alice], { account: alice });
      await assertTxSuccess({ txHash });
      txHash = await mockNFTOverlord.write.reveal([alice, 4, 12], { account: alice });
      await assertTxSuccess({ txHash });
      txHash = await mockNFTOverlord.write.startReveal([danny], { account: danny });
      await assertTxSuccess({ txHash });
      txHash = await mockNFTOverlord.write.reveal([danny, 4, 12], { account: danny });
      await assertTxSuccess({ txHash });
    }

    await testContracts.munchNFT.contract.write.transferFrom([danny, bob, 2n], {
      account: danny,
    });
    await assertTxSuccess({ txHash });
    await testContracts.munchNFT.contract.write.transferFrom([alice, charlie, 3n], {
      account: alice,
    });
    await assertTxSuccess({ txHash });
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  it("registered -> not registered", async () => {
    const txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 1n], {
      account: alice,
    });
    await assertTxSuccess({ txHash });
  });

  it("not registered -> not registered", async () => {
    const txHash = await testContracts.munchNFT.contract.write.transferFrom([bob, charlie, 2n], {
      account: bob,
    });
    await assertTxSuccess({ txHash });
  });

  it("registered -> registered", async () => {
    const txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, danny, 1n], {
      account: alice,
    });
    await assertTxSuccess({ txHash });
  });

  it("not registered -> registered", async () => {
    const txHash = await testContracts.munchNFT.contract.write.transferFrom([bob, danny, 2n], {
      account: bob,
    });
    await assertTxSuccess({ txHash });
  });

  it("registered -> not registered -> not registered -> registered", async () => {
    let txHash = await testContracts.munchNFT.contract.write.transferFrom([alice, bob, 1n], {
      account: alice,
    });
    await assertTxSuccess({ txHash });
    txHash = await testContracts.munchNFT.contract.write.transferFrom([bob, charlie, 1n], {
      account: bob,
    });
    await assertTxSuccess({ txHash });
    txHash = await testContracts.munchNFT.contract.write.transferFrom([charlie, danny, 1n], {
      account: charlie,
    });
    await assertTxSuccess({ txHash });
  });
});
