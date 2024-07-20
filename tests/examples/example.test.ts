import { afterEach, before, beforeEach, describe, test } from "node:test";
import { parseEther } from "viem";
import { testClient } from "../utils/consts";
import { getTestRoleAddresses } from "../utils/contracts";

// For importing contracts, you can import via `out/{Contract}.sol/{Contract}.json`.
// This will have the ABI + Bytecode which should be enough for testing.
// Also, we use ENV=testnet in this example, but by using ENV=mainnet and a mainnet RPC,
// you can fork from Blast Mainnet at a specific block for more comprehensive
// tests.

describe("Example Test", () => {
  // The expected gas used by the basic transactions in this test suite
  //const expectedGasUsed = parseUnits("21", 3);

  let alice: `0x${string}`;
  let bob: `0x${string}`;
  let snapshot: `0x${string}`;

  before(async () => {
    const testRoleAddresses = await getTestRoleAddresses();
    [alice, bob] = testRoleAddresses.users;
  });

  beforeEach(async () => {
    snapshot = await testClient.snapshot();
    await testClient.setBalance({
      address: alice,
      value: parseEther("10"),
    });
    await testClient.setBalance({
      address: bob,
      value: parseEther("10"),
    });
  });

  afterEach(async () => {
    await testClient.revert({ id: snapshot });
  });

  test("Test 1", async () => {
    await testClient.sendTransaction({
      account: alice,
      to: bob,
      value: parseEther("1"),
    });
    // const balanceBob = await testClient.getBalance({ address: bob });
    // const balanceAlice = await testClient.getBalance({ address: alice });
    // assert.equal(balanceBob, parseEther("11"));
    // assert.equal(balanceAlice, parseEther("9") - expectedGasUsed);
  });

  test("Test 2", async () => {
    await testClient.sendTransaction({
      account: bob,
      to: alice,
      value: parseEther("1"),
    });
    // const balanceBob = await testClient.getBalance({ address: bob });
    // const balanceAlice = await testClient.getBalance({ address: alice });
    // assert.equal(balanceBob, parseEther("9") - expectedGasUsed);
    // assert.equal(balanceAlice, parseEther("11"));
  });
});
