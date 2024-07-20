import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertContractFunctionRevertedError } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";

describe("ConfigStorage: Auth", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const addresses = await getTestRoleAddresses();
    [alice] = addresses.users;
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

  describe("unauthorised setting variables", () => {
    it("setUint", async () => {
      const uintVal = BigInt(123e18);
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setUint([key, uintVal, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setUintArray", async () => {
      const uintArrayVal: bigint[] = [BigInt(123e18)];
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setUintArray([key, uintArrayVal, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setSmallUintArray", async () => {
      const smallIntArrayVal = [123, 456];
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setSmallUintArray(
          [key, smallIntArrayVal, true],
          { account: alice }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setSmallInt", async () => {
      const smallInt = -23;
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setSmallInt([key, smallInt, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setSmallIntArray", async () => {
      const smallIntArrayVal = [-1, 0];
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setSmallIntArray(
          [key, smallIntArrayVal, true],
          { account: alice }
        ),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setBool", async () => {
      const boolVal = true;
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setBool([key, boolVal, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setAddress", async () => {
      const addressVal = "0x0000000000000000000000000000000000000001";
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setAddress([key, addressVal, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setAddresses", async () => {
      const addressVal: `0x${string}`[] = [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ];
      const keys = [14, 15];
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setAddresses([keys, addressVal, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setAddressArray", async () => {
      const addressVal: `0x${string}`[] = [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ];
      const keys = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setAddressArray([keys, addressVal, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });

    it("setBytes32", async () => {
      const bytesVal: `0x${string}` =
        "0x7465737400000000000000000000000000000000000000000000000000000000";
      const key = 14;
      await assert.rejects(
        testContracts.configStorage.contract.simulate.setBytes32([key, bytesVal, true], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "OwnableUnauthorizedAccount")
      );
    });
  });
});
