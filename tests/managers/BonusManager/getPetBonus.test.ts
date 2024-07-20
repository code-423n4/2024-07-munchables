import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import { registerPlayer } from "../../utils/players";

describe("BonusManager: getPetBonus", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    await registerPlayer({ account: alice, testContracts });
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

  for (let days = 29; days <= 90; days++) {
    let expectedBonus = 0n;
    if (days >= 30) {
      const bonus4Pct = (BigInt(1e16) * 4n * (BigInt(days) - 30n)) / 15n;
      const bonus14Pct = (BigInt(1e16) * 14n * (BigInt(days) - 30n)) / 60n;
      expectedBonus = bonus4Pct + bonus14Pct;
    }

    describe(`when lock duration is ${days} days`, () => {
      beforeEach(async () => {
        const txHash = await testContracts.lockManager.contract.write.setLockDuration(
          [BigInt(60 * 60 * 24 * days)],
          {
            account: alice,
          }
        );
        await assertTxSuccess({ txHash });
      });

      it(`should have pet bonus ${expectedBonus}`, async () => {
        const petBonus = await testContracts.bonusManager.contract.read.getPetBonus([alice]);
        assert.equal(petBonus, expectedBonus);
        // Since we're programmatically calculating expected bonus,
        // assert certain boundaries and round milestones specifically
        assert(petBonus >= 0n); // Lower bound
        assert(petBonus <= BigInt(30e18)); // Upper bound
        if (days === 45) {
          assert.equal(petBonus, BigInt(7.5e16));
        } else if (days === 60) {
          assert.equal(petBonus, BigInt(15e16));
        } else if (days === 75) {
          assert.equal(petBonus, BigInt(22.5e16));
        } else if (days === 90) {
          assert.equal(petBonus, BigInt(30e16));
        }
      });
    });
  }
});
