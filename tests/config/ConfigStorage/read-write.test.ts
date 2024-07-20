import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import { assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";

describe("ConfigStorage: Read/Write", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const addresses = await getTestRoleAddresses();
    [alice] = addresses.users;
    admin = addresses[Role.Admin];
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

  describe("reading/writing standard variables", () => {
    it("set/getUint", async () => {
      const uintVal = BigInt(123e18);
      const uintVal2 = BigInt(124e18);
      const key = 14;
      let txHash = await testContracts.configStorage.contract.write.setUint([key, uintVal, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setUint([key, uintVal2, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getUint([key], {
        account: alice,
      });
      assert.equal(res, uintVal2);
    });

    it("set/getUintArray", async () => {
      const uintArrayVal = [BigInt(120e18), BigInt(121e18), BigInt(122e18), BigInt(123e18)];
      const uintArrayVal2 = [BigInt(120e18), BigInt(121e18)]; // second array is shorter to test truncating logic
      const key = 14;
      let txHash = await testContracts.configStorage.contract.write.setUintArray(
        [key, uintArrayVal, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setUintArray(
        [key, uintArrayVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getUintArray([key], {
        account: alice,
      });
      assert.equal(res[0], uintArrayVal2[0]);
      assert.equal(res[1], uintArrayVal2[1]);
      assert.equal(res.length, uintArrayVal2.length);
    });

    it("set/getSmallUintArray", async () => {
      const smallUintArrayVal = [1, 2, 3, 4];
      const smallUintArrayVal2 = [8, 9, 10];
      const key = 14;
      let txHash = await testContracts.configStorage.contract.write.setSmallUintArray(
        [key, smallUintArrayVal, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      let res = await testContracts.configStorage.contract.read.getSmallUintArray([key], {
        account: alice,
      });
      assert.equal(res.length, smallUintArrayVal.length);
      assert.equal(res[0], smallUintArrayVal[0]);
      assert.equal(res[1], smallUintArrayVal[1]);
      assert.equal(res[2], smallUintArrayVal[2]);
      assert.equal(res[3], smallUintArrayVal[3]);
      txHash = await testContracts.configStorage.contract.write.setSmallUintArray(
        [key, smallUintArrayVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      res = await testContracts.configStorage.contract.read.getSmallUintArray([key], {
        account: alice,
      });
      assert.equal(res.length, smallUintArrayVal2.length);
      assert.equal(res[0], smallUintArrayVal2[0]);
      assert.equal(res[1], smallUintArrayVal2[1]);
      assert.equal(res[2], smallUintArrayVal2[2]);
    });

    it("set/getSmallInt", async () => {
      const smallIntVal = 42;
      const smallIntVal2 = 69;
      const key = 14;
      let txHash = await testContracts.configStorage.contract.write.setSmallInt(
        [key, smallIntVal, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setSmallInt(
        [key, smallIntVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getSmallInt([key], {
        account: alice,
      });
      assert.equal(res, smallIntVal2);
    });

    it("set/getSmallIntArray", async () => {
      const smallIntArrayVal = [42, 44];
      const smallIntArrayVal2 = [22, 66, 33];
      const key = 14;
      let txHash = await testContracts.configStorage.contract.write.setSmallIntArray(
        [key, smallIntArrayVal, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setSmallIntArray(
        [key, smallIntArrayVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getSmallIntArray([key], {
        account: alice,
      });
      assert.equal(res.length, smallIntArrayVal2.length);
      assert.equal(res[0], smallIntArrayVal2[0]);
      assert.equal(res[1], smallIntArrayVal2[1]);
      assert.equal(res[1], smallIntArrayVal2[1]);
    });

    it("set/getBool", async () => {
      const boolVal = true;
      const boolVal2 = true;
      const key = 14;
      let txHash = await testContracts.configStorage.contract.write.setBool([key, boolVal, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setBool([key, boolVal2, true], {
        account: admin,
      });
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getBool([key], {
        account: admin,
      });
      assert.equal(res, boolVal2);
    });

    it("set/getAddress", async () => {
      const addressVal = "0x0000000000000000000000000000000000000001";
      const addressVal2 = "0x0000000000000000000000000000000000000002";
      const key = 14;
      let txHash = await testContracts.configStorage.contract.write.setAddress(
        [key, addressVal, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setAddress(
        [key, addressVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getAddress([key], {
        account: admin,
      });
      assert.equal(res, addressVal2);
    });

    it("setAddresses/getAddress", async () => {
      const addressVal: `0x${string}`[] = [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
        "0x0000000000000000000000000000000000000004",
      ];
      const addressVal2: `0x${string}`[] = [
        "0x0000000000000000000000000000000000000005",
        "0x0000000000000000000000000000000000000006",
        "0x0000000000000000000000000000000000000007",
      ];
      const keys = [10, 11, 7, 13];
      const keys2 = [4, 5, 6];
      let txHash = await testContracts.configStorage.contract.write.setAddresses(
        [keys, addressVal, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setAddresses(
        [keys2, addressVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getAddress([keys2[0]], {
        account: alice,
      });
      assert.equal(res, addressVal2[0]);
    });

    it("set/getAddressArray", async () => {
      const addressVal: `0x${string}`[] = [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003",
        "0x0000000000000000000000000000000000000004",
      ];
      const addressVal2: `0x${string}`[] = [
        "0x0000000000000000000000000000000000000005",
        "0x0000000000000000000000000000000000000006",
        "0x0000000000000000000000000000000000000007",
        "0x0000000000000000000000000000000000000008",
      ];
      const key = 14;
      let txHash: `0x${string}` = await testContracts.configStorage.contract.write.setAddressArray(
        [key, addressVal, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setAddressArray(
        [key, addressVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getAddressArray([key], {
        account: alice,
      });
      assert.equal(res.length, addressVal2.length);
      assert.equal(res[0], addressVal2[0]);
      assert.equal(res[1], addressVal2[1]);
      assert.equal(res[2], addressVal2[2]);
      assert.equal(res[3], addressVal2[3]);
    });

    it("set/getBytes32", async () => {
      const addressVal: `0x${string}` =
        "0x7465737400000000000000000000000000000000000000000000000000000000";
      const addressVal2: `0x${string}` =
        "0x8005737400000000000000000000000000000000000000000000000000000000";
      const key = 11;
      let txHash: `0x${string}` = await testContracts.configStorage.contract.write.setBytes32(
        [key, addressVal, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setBytes32(
        [key, addressVal2, true],
        { account: admin }
      );
      await assertTxSuccess({ txHash });

      const res = await testContracts.configStorage.contract.read.getBytes32([key], {
        account: alice,
      });
      assert.equal(res, addressVal2);
    });
  });
});
