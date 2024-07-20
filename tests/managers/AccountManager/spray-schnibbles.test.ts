import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("AccountManager: spray schnibbles functionality", () => {
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

  describe("improper proposal calls", () => {
    it("spraySchnibblesPropose() - not social role", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.spraySchnibblesPropose(
          [
            [alice, bob],
            [100n, 100n],
          ],
          { account: bob }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });
    it("spraySchnibblesPropose() - empty players", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.spraySchnibblesPropose(
          [[], [100n, 100n]],
          { account: admin }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "EmptyParameterError")
      );
    });
    it("spraySchnibblesPropose() - inconsistent parameters", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.spraySchnibblesPropose(
          [
            [bob, alice, bob],
            [100n, 100n],
          ],
          { account: admin }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "UnMatchedParametersError")
      );
    });
    it("spraySchnibblesPropose() - duplicate sprayers", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.spraySchnibblesPropose(
          [
            [bob, bob],
            [100n, 100n],
          ],
          { account: admin }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "DuplicateSprayerError")
      );
    });
    it("spraySchnibblesPropose() - too many inputs", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.spraySchnibblesPropose(
          [new Array(101).fill(zeroAddress), new Array(101).fill(100n)],
          { account: admin }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "TooManyEntriesError")
      );
    });
    it("spraySchnibblesPropose() - double proposals", async () => {
      const txHash = await testContracts.accountManagerProxy.contract.write.spraySchnibblesPropose(
        [
          [alice, bob],
          [100n, 100n],
        ],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.spraySchnibblesPropose(
          [
            [alice, bob],
            [100n, 100n],
          ],
          { account: admin }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "ExistingProposalError")
      );
    });
    it("execSprayProposal() - not social role", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.execSprayProposal([admin], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });
    it("execSprayProposal() - empty proposal", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.execSprayProposal([admin], {
          account: admin,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "EmptyProposalError")
      );
    });
    it("removeSprayProposal() - not social role", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.removeSprayProposal([admin], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });
    it("removeSprayProposal() - empty proposal", async () => {
      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.removeSprayProposal([admin], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
      );
    });
  });
  describe("proper proposal calls", () => {
    beforeEach(async () => {
      await registerPlayer({ account: alice, testContracts });
      await registerPlayer({ account: bob, testContracts });
      await testClient.setNextBlockTimestamp({
        timestamp: STARTING_TIMESTAMP,
      });
      const txHash = await testContracts.accountManagerProxy.contract.write.spraySchnibblesPropose(
        [
          [alice, bob, jirard],
          [101n, 102n, 103n],
        ],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const correctProposal = await testContracts.accountManagerProxy.contract.read.sprayProposals([
        admin,
      ]);

      assert.deepEqual(correctProposal, Number(STARTING_TIMESTAMP));
    });

    it("spraySchnibblesPropose() and execSprayProposal() and claim after register", async () => {
      const txHash = await testContracts.accountManagerProxy.contract.write.execSprayProposal(
        [admin],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const unclaimedJirard =
        await testContracts.accountManagerProxy.contract.read.unclaimedSchnibbles([jirard]);
      assert.strictEqual(unclaimedJirard, 103n);

      const registeredPlayerAlice = await testContracts.accountManagerProxy.contract.read.getPlayer(
        [alice]
      );
      assert.strictEqual(registeredPlayerAlice[1].unfedSchnibbles, 101n);

      const registeredPlayerBob = await testContracts.accountManagerProxy.contract.read.getPlayer([
        bob,
      ]);
      assert.strictEqual(registeredPlayerBob[1].unfedSchnibbles, 102n);

      const emptyProposal = await testContracts.accountManagerProxy.contract.read.sprayProposals([
        admin,
      ]);
      assert.deepEqual(emptyProposal, Number(0));

      await registerPlayer({ account: jirard, testContracts });
      const registeredPlayerJirard =
        await testContracts.accountManagerProxy.contract.read.getPlayer([jirard]);
      assert.strictEqual(registeredPlayerJirard[1].unfedSchnibbles, 103n);
    });
    it("spraySchnibblesPropose() and removeSprayProposal()", async () => {
      const txHash = await testContracts.accountManagerProxy.contract.write.removeSprayProposal(
        [admin],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const emptyProposal = await testContracts.accountManagerProxy.contract.read.sprayProposals([
        admin,
      ]);
      assert.deepEqual(emptyProposal, Number(0));

      await assert.rejects(
        testContracts.accountManagerProxy.contract.simulate.execSprayProposal([admin], {
          account: admin,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "EmptyProposalError")
      );
    });
  });
});
