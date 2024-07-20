import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError, assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("LandManager: updateTaxRate", () => {
  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

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

  describe("all paths", () => {
    beforeEach(async () => {
      await registerPlayer({
        account: bob,
        testContracts,
      });
    });
    it("invalid tax rates", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: bob, value: parseEther("1") }
      );
      const txHash = await testClient.writeContract(request);
      await assertTxSuccess({ txHash: txHash });
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.updateTaxRate([0], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidTaxRateError")
      );
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.updateTaxRate([1e18], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "InvalidTaxRateError")
      );
    });
    it("no land exists", async () => {
      await assert.rejects(
        testContracts.landManagerProxy.contract.simulate.updateTaxRate([45e16], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PlotMetadataNotUpdatedError")
      );
    });
    it("success path", async () => {
      const { request } = await testContracts.lockManager.contract.simulate.lock(
        [zeroAddress, parseEther("1")],
        { account: bob, value: parseEther("1") }
      );
      const txHash = await testClient.writeContract(request);
      await assertTxSuccess({ txHash });
      const { request: request2 } =
        await testContracts.landManagerProxy.contract.simulate.updateTaxRate([45e16], {
          account: bob,
        });
      const txHash2 = await testClient.writeContract(request2);
      await assertTxSuccess({ txHash: txHash2 });
    });
  });
});
