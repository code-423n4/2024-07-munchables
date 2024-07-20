import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { DEFAULT_VARIABLES, StorageKey } from "../../../deployments/utils/config-consts";
import { Rarity, Realm } from "../../../deployments/utils/consts";
import { assertTxSuccess } from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import { getTestContracts, getTestRoleAddresses } from "../../utils/contracts";
import {
  MockLockManagerContractType,
  MockMigrationManagerContractType,
  MockMunchadexManagerContractType,
  MockNFTAttributesManagerContractType,
  MockSnuggeryManagerContractType,
  deployMockLockManager,
  deployMockMigrationManager,
  deployMockMunchadexManager,
  deployMockNFTAttributesManager,
  deployMockSnuggeryManager,
} from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

const validRarities = Object.values(Rarity).filter(
  (r) => !isNaN(Number(r)) && Number(r) !== Rarity.Invalid
) as Rarity[];
const validRealms = Object.values(Realm).filter(
  (r) => !isNaN(Number(r)) && Number(r) !== Realm.Invalid
) as Realm[];
const defaultMigrationBonus = DEFAULT_VARIABLES[StorageKey.MigrationBonus].value as bigint;
const munchablesPerRarity = DEFAULT_VARIABLES[StorageKey.MunchablesPerRarity].value as number[];
const raritySetBonuses = DEFAULT_VARIABLES[StorageKey.RaritySetBonuses].value as number[];
const maxSnuggerySize = 6;
const usdPrice = 3000n * BigInt(1e18);

describe("BonusManager: getHarvestBonus", () => {
  let alice: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockLockManager: MockLockManagerContractType;
  let mockMigrationManager: MockMigrationManagerContractType;
  let mockMunchadexManager: MockMunchadexManagerContractType;
  let mockNFTAttributesManager: MockNFTAttributesManagerContractType;
  let mockSnuggeryManager: MockSnuggeryManagerContractType;

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();
    const testRoleAddresses = await getTestRoleAddresses();

    [alice] = testRoleAddresses.users;

    mockLockManager = await deployMockLockManager({ testContracts, notify: false });
    mockMigrationManager = await deployMockMigrationManager({ testContracts, notify: false });
    mockMunchadexManager = await deployMockMunchadexManager({ testContracts, notify: false });
    mockNFTAttributesManager = await deployMockNFTAttributesManager({
      testContracts,
      notify: false,
    });
    mockSnuggeryManager = await deployMockSnuggeryManager({ testContracts, notify: false });

    const setMaxSnuggerySizeTxHash = await testContracts.configStorage.contract.write.setSmallInt([
      StorageKey.DefaultSnuggerySize,
      maxSnuggerySize,
      false,
    ]);
    await assertTxSuccess({ txHash: setMaxSnuggerySizeTxHash });

    const notifyTxHash = await testContracts.configStorage.contract.write.manualNotify([0, 100]);
    await assertTxSuccess({ txHash: notifyTxHash });

    const configureTokenTxHash = await mockLockManager.write.configureToken([
      zeroAddress,
      {
        usdPrice,
        nftCost: BigInt(1e18),
        active: true,
        decimals: 18,
      },
    ]);
    await assertTxSuccess({ txHash: configureTokenTxHash });
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

  describe("when bonus comes only from lock bonus", () => {
    // Reduced set of test cases for lock bonus because getPetBonus tests are more thorough
    const lockBonusTestCases = [
      {
        lockDurationDays: 30,
        expectedBonus: 0n,
      },
      {
        lockDurationDays: 45,
        expectedBonus: BigInt(7.5e16),
      },
      {
        lockDurationDays: 60,
        expectedBonus: BigInt(15e16),
      },
      {
        lockDurationDays: 75,
        expectedBonus: BigInt(22.5e16),
      },
      {
        lockDurationDays: 90,
        expectedBonus: BigInt(30e16),
      },
    ];

    for (const lockBonusTestCase of lockBonusTestCases) {
      describe(`when lock duration is ${lockBonusTestCase.lockDurationDays} days`, () => {
        beforeEach(async () => {
          const txHash = await mockLockManager.write.setLockDuration(
            [BigInt(60 * 60 * 24 * lockBonusTestCase.lockDurationDays)],
            {
              account: alice,
            }
          );
          await assertTxSuccess({ txHash });
        });

        it(`should have harvest bonus ${lockBonusTestCase.expectedBonus}`, async () => {
          const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
            alice,
          ]);
          assert.equal(harvestBonus, lockBonusTestCase.expectedBonus);
        });
      });
    }
  });

  describe("when bonus comes only from migration bonus", () => {
    const totalLockedAmount = parseEther("2");
    const halfTotalLockedAmount = parseEther("1");

    beforeEach(async () => {
      const block = await testClient.getBlock();
      const setMigrationBonusEndTimeTxHash =
        await testContracts.configStorage.contract.write.setUint([
          StorageKey.MigrationBonusEndTime,
          block.timestamp + 60000n,
          true,
        ]);
      await assertTxSuccess({ txHash: setMigrationBonusEndTimeTxHash });
    });

    describe("when locked weighted value = 2x migrated total locked amount", () => {
      beforeEach(async () => {
        const block = await testClient.getBlock();
        const setLockedTokenTxHash = await mockLockManager.write.setLockedTokenForTest([
          alice,
          zeroAddress,
          {
            quantity: 2n * totalLockedAmount,
            remainder: 0n,
            unlockTime: Number(block.timestamp + 10000n),
            lastLockTime: Number(block.timestamp),
          },
        ]);
        await assertTxSuccess({ txHash: setLockedTokenTxHash });
      });

      describe("when migration is claimed", () => {
        beforeEach(async () => {
          const setMigrationCompletedDataTxHash =
            await mockMigrationManager.write.setUserMigrationCompletedDataForTest([
              alice,
              {
                tokenLocked: zeroAddress,
                totalLockedAmount: totalLockedAmount,
                totalPurchasedAmount: 0n,
              },
              true,
            ]);
          await assertTxSuccess({ txHash: setMigrationCompletedDataTxHash });
        });

        it("should return full migration bonus", async () => {
          const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
            alice,
          ]);
          assert.equal(harvestBonus, defaultMigrationBonus);
        });

        describe("when migration bonus time is past", () => {
          beforeEach(async () => {
            const block = await testClient.getBlock();
            const setMigrationBonusEndTimeTxHash =
              await testContracts.configStorage.contract.write.setUint([
                StorageKey.MigrationBonusEndTime,
                block.timestamp - 60000n,
                true,
              ]);
            await assertTxSuccess({ txHash: setMigrationBonusEndTimeTxHash });
          });

          it("should return 0", async () => {
            const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
              alice,
            ]);
            assert.equal(harvestBonus, 0n);
          });
        });
      });

      describe("when migration is not claimed", () => {
        beforeEach(async () => {
          const setMigrationCompletedDataTxHash =
            await mockMigrationManager.write.setUserMigrationCompletedDataForTest([
              alice,
              {
                tokenLocked: zeroAddress,
                totalLockedAmount: totalLockedAmount,
                totalPurchasedAmount: 0n,
              },
              false,
            ]);
          await assertTxSuccess({ txHash: setMigrationCompletedDataTxHash });
        });

        it("should return 0", async () => {
          const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
            alice,
          ]);
          assert.equal(harvestBonus, 0n);
        });
      });
    });

    describe("when locked weighted value < 2x migrated total locked amount", () => {
      beforeEach(async () => {
        const setMigrationCompletedDataTxHash =
          await mockMigrationManager.write.setUserMigrationCompletedDataForTest([
            alice,
            {
              tokenLocked: zeroAddress,
              totalLockedAmount: totalLockedAmount,
              totalPurchasedAmount: 0n,
            },
            true,
          ]);
        await assertTxSuccess({ txHash: setMigrationCompletedDataTxHash });
      });

      describe("when locked weighted value > half migrated total locked amount", () => {
        beforeEach(async () => {
          const block = await testClient.getBlock();
          const setLockedTokenTxHash = await mockLockManager.write.setLockedTokenForTest([
            alice,
            zeroAddress,
            {
              quantity: totalLockedAmount,
              remainder: 0n,
              unlockTime: Number(block.timestamp + 10000n),
              lastLockTime: Number(block.timestamp),
            },
          ]);
          await assertTxSuccess({ txHash: setLockedTokenTxHash });
        });

        it("should return full migration bonus", async () => {
          const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
            alice,
          ]);
          assert.equal(harvestBonus, defaultMigrationBonus / 3n);
        });
      });

      describe("when locked weighted value = half migrated total locked amount", () => {
        beforeEach(async () => {
          const block = await testClient.getBlock();
          const setLockedTokenTxHash = await mockLockManager.write.setLockedTokenForTest([
            alice,
            zeroAddress,
            {
              quantity: halfTotalLockedAmount,
              remainder: 0n,
              unlockTime: Number(block.timestamp + 10000n),
              lastLockTime: Number(block.timestamp),
            },
          ]);
          await assertTxSuccess({ txHash: setLockedTokenTxHash });
        });

        it("should return 0", async () => {
          const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
            alice,
          ]);
          assert.equal(harvestBonus, 0n);
        });
      });
    });
  });

  describe("when bonus comes only from level bonus", () => {
    beforeEach(async () => {
      await registerPlayer({ account: alice, testContracts });
    });

    describe("when 1 NFT with level 1", () => {
      beforeEach(async () => {
        const setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([
          alice,
          [
            {
              tokenId: 1n,
              importedDate: 0,
            },
          ],
        ]);
        await assertTxSuccess({ txHash: setSnuggeryTxHash });

        const setNFTAttrsTxHash = await mockNFTAttributesManager.write.setAttributesForTest([
          1n,
          {
            chonks: 0n,
            level: 1,
            evolution: 0,
            lastPettedTime: 0n,
          },
        ]);
        await assertTxSuccess({ txHash: setNFTAttrsTxHash });
      });

      it("should return 1e16 / 200", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(1e16 / 200));
      });
    });

    describe("when 5 NFTs with average level 3", () => {
      beforeEach(async () => {
        const snuggery: { tokenId: bigint; importedDate: number }[] = [];
        for (let i = 1; i < maxSnuggerySize; i++) {
          const setNFTAttrsTxHash = await mockNFTAttributesManager.write.setAttributesForTest([
            BigInt(i),
            {
              chonks: 0n,
              level: i,
              evolution: 0,
              lastPettedTime: 0n,
            },
          ]);
          await assertTxSuccess({ txHash: setNFTAttrsTxHash });

          snuggery.push({ tokenId: BigInt(i), importedDate: 0 });
        }

        const setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([
          alice,
          snuggery,
        ]);
        await assertTxSuccess({ txHash: setSnuggeryTxHash });
      });

      it("should return 3e16 / 200", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(3e16 / 200));
      });
    });

    describe("when 6 (max) NFTs with average level 3.5", () => {
      beforeEach(async () => {
        const snuggery: { tokenId: bigint; importedDate: number }[] = [];
        for (let i = 1; i <= maxSnuggerySize; i++) {
          const setNFTAttrsTxHash = await mockNFTAttributesManager.write.setAttributesForTest([
            BigInt(i),
            {
              chonks: 0n,
              level: i,
              evolution: 0,
              lastPettedTime: 0n,
            },
          ]);
          await assertTxSuccess({ txHash: setNFTAttrsTxHash });

          snuggery.push({ tokenId: BigInt(i), importedDate: 0 });
        }

        const setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([
          alice,
          snuggery,
        ]);
        await assertTxSuccess({ txHash: setSnuggeryTxHash });
      });

      it("should return 3.5e16 / 200 + 3e16", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(3.5e16 / 200 + 3e16));
      });
    });
  });

  describe("when bonus comes only from munchadex bonus", () => {
    describe("when all 125 owned", () => {
      beforeEach(async () => {
        const setMunchadexForTestTxHash = await mockMunchadexManager.write.setMunchadexForTest([
          alice,
          125n,
        ]);
        await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
      });

      it("should return 100e16", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(100e16));
      });
    });

    describe("when all in 1 realm owned", () => {
      beforeEach(async () => {
        const setMunchadexForTestTxHash =
          await mockMunchadexManager.write.setMunchadexNumInRealmForTest([
            alice,
            Realm.Everfrost,
            BigInt(
              (DEFAULT_VARIABLES[StorageKey.MunchablesPerRealm].value as number[])[
                Realm.Everfrost as number
              ]
            ),
          ]);
        await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
      });

      it("should return 3e16", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(3e16));
      });
    });

    describe("when all in 4 of 5 realms owned", () => {
      beforeEach(async () => {
        for (const realm of validRealms.slice(0, 4)) {
          const setMunchadexForTestTxHash =
            await mockMunchadexManager.write.setMunchadexNumInRealmForTest([
              alice,
              realm,
              BigInt(
                (DEFAULT_VARIABLES[StorageKey.MunchablesPerRealm].value as number[])[
                  realm as number
                ]
              ),
            ]);
          await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
        }
      });

      it("should return 12e16", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(12e16));
      });
    });

    describe("when 6 unique per realm owned", () => {
      beforeEach(async () => {
        for (const realm of validRealms) {
          const setMunchadexForTestTxHash =
            await mockMunchadexManager.write.setMunchadexNumInRealmForTest([alice, realm, 6n]);
          await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
        }
      });

      it("should return 2e16", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(2e16));
      });
    });

    describe("when 1 unique per realm owned", () => {
      beforeEach(async () => {
        for (const realm of validRealms) {
          const setMunchadexForTestTxHash =
            await mockMunchadexManager.write.setMunchadexNumInRealmForTest([alice, realm, 1n]);
          await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
        }
      });

      it("should return 1e16", async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt(1e16));
      });
    });

    for (const rarity of validRarities) {
      const raritySetBonus = raritySetBonuses[rarity];
      const rarityMunchables = munchablesPerRarity[rarity];
      describe(`when all ${rarityMunchables} of rarity ${rarity} owned`, () => {
        beforeEach(async () => {
          const setMunchadexForTestTxHash =
            await mockMunchadexManager.write.setMunchadexNumInRarityForTest([
              alice,
              rarity,
              BigInt(rarityMunchables),
            ]);
          await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
        });

        it(`should return rarity set bonus ${raritySetBonus}`, async () => {
          const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
            alice,
          ]);
          assert.equal(harvestBonus, BigInt(raritySetBonus * 1e16));
        });
      });
    }

    describe("when combining realm and rarity bonuses", () => {
      beforeEach(async () => {
        let setMunchadexForTestTxHash =
          await mockMunchadexManager.write.setMunchadexNumInRealmForTest([
            alice,
            Realm.Everfrost,
            BigInt(
              (DEFAULT_VARIABLES[StorageKey.MunchablesPerRealm].value as number[])[
                Realm.Everfrost as number
              ]
            ),
          ]);
        await assertTxSuccess({ txHash: setMunchadexForTestTxHash });

        setMunchadexForTestTxHash = await mockMunchadexManager.write.setMunchadexNumInRarityForTest(
          [alice, Rarity.Legendary, BigInt(munchablesPerRarity[Rarity.Legendary])]
        );
        await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
      });

      it(`should return combined 3 + ${raritySetBonuses[Rarity.Legendary]} bonus`, async () => {
        const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([
          alice,
        ]);
        assert.equal(harvestBonus, BigInt((3 + raritySetBonuses[Rarity.Legendary]) * 1e16));
      });
    });
  });

  describe("when eligible for max bonus from all bonus types", () => {
    beforeEach(async () => {
      await registerPlayer({ account: alice, testContracts });

      const setLockDurationTxHash = await mockLockManager.write.setLockDuration(
        [BigInt(60 * 60 * 24 * 90)],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash: setLockDurationTxHash });

      const totalOriginalLockedAmount = parseEther("2");
      const block = await testClient.getBlock();
      const setLockedTokenTxHash = await mockLockManager.write.setLockedTokenForTest([
        alice,
        zeroAddress,
        {
          quantity: 2n * totalOriginalLockedAmount,
          remainder: 0n,
          unlockTime: Number(block.timestamp + 10000n),
          lastLockTime: Number(block.timestamp),
        },
      ]);
      await assertTxSuccess({ txHash: setLockedTokenTxHash });

      const setMigrationCompletedDataTxHash =
        await mockMigrationManager.write.setUserMigrationCompletedDataForTest([
          alice,
          {
            tokenLocked: zeroAddress,
            totalLockedAmount: totalOriginalLockedAmount,
            totalPurchasedAmount: 0n,
          },
          true,
        ]);
      await assertTxSuccess({ txHash: setMigrationCompletedDataTxHash });

      const snuggery: { tokenId: bigint; importedDate: number }[] = [];
      for (let i = 1; i <= maxSnuggerySize; i++) {
        const setNFTAttrsTxHash = await mockNFTAttributesManager.write.setAttributesForTest([
          BigInt(i),
          {
            chonks: 0n,
            level: 100,
            evolution: 0,
            lastPettedTime: 0n,
          },
        ]);
        await assertTxSuccess({ txHash: setNFTAttrsTxHash });

        snuggery.push({ tokenId: BigInt(i), importedDate: 0 });
      }

      const setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([
        alice,
        snuggery,
      ]);
      await assertTxSuccess({ txHash: setSnuggeryTxHash });

      const setMunchadexForTestTxHash = await mockMunchadexManager.write.setMunchadexForTest([
        alice,
        125n,
      ]);
      await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
    });

    it("should return combined max bonus", async () => {
      const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([alice]);
      // max lock bonus = 30e16 for 90 day lock
      // max migration bonus = default migration bonus from config for >= 2x lock
      // max level bonus = (average level 100 / 200) * 1e16 and additional 3e16 for full snuggery
      // max munchadex bonus = 100e16 for all 125 unique owned
      assert.equal(
        harvestBonus,
        BigInt(30e16) + defaultMigrationBonus + BigInt(100e16 / 200 + 3e16) + BigInt(100e16)
      );
    });
  });

  describe("when eligible for partial bonus from all bonus types", () => {
    beforeEach(async () => {
      await registerPlayer({ account: alice, testContracts });

      const setLockDurationTxHash = await mockLockManager.write.setLockDuration(
        [BigInt(60 * 60 * 24 * 60)],
        {
          account: alice,
        }
      );
      await assertTxSuccess({ txHash: setLockDurationTxHash });

      const totalOriginalLockedAmount = parseEther("2");
      const block = await testClient.getBlock();
      const setLockedTokenTxHash = await mockLockManager.write.setLockedTokenForTest([
        alice,
        zeroAddress,
        {
          quantity: totalOriginalLockedAmount,
          remainder: 0n,
          unlockTime: Number(block.timestamp + 10000n),
          lastLockTime: Number(block.timestamp),
        },
      ]);
      await assertTxSuccess({ txHash: setLockedTokenTxHash });

      const setMigrationCompletedDataTxHash =
        await mockMigrationManager.write.setUserMigrationCompletedDataForTest([
          alice,
          {
            tokenLocked: zeroAddress,
            totalLockedAmount: totalOriginalLockedAmount,
            totalPurchasedAmount: 0n,
          },
          true,
        ]);
      await assertTxSuccess({ txHash: setMigrationCompletedDataTxHash });

      const snuggery: { tokenId: bigint; importedDate: number }[] = [];
      for (let i = 1; i <= maxSnuggerySize - 1; i++) {
        const setNFTAttrsTxHash = await mockNFTAttributesManager.write.setAttributesForTest([
          BigInt(i),
          {
            chonks: 0n,
            level: i,
            evolution: 0,
            lastPettedTime: 0n,
          },
        ]);
        await assertTxSuccess({ txHash: setNFTAttrsTxHash });

        snuggery.push({ tokenId: BigInt(i), importedDate: 0 });
      }

      const setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([
        alice,
        snuggery,
      ]);
      await assertTxSuccess({ txHash: setSnuggeryTxHash });

      let setMunchadexForTestTxHash =
        await mockMunchadexManager.write.setMunchadexNumInRealmForTest([
          alice,
          Realm.Everfrost,
          BigInt(
            (DEFAULT_VARIABLES[StorageKey.MunchablesPerRealm].value as number[])[
              Realm.Everfrost as number
            ]
          ),
        ]);
      await assertTxSuccess({ txHash: setMunchadexForTestTxHash });

      for (const realm of validRealms.slice(1)) {
        setMunchadexForTestTxHash = await mockMunchadexManager.write.setMunchadexNumInRealmForTest([
          alice,
          realm,
          1n,
        ]);
        await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
      }

      setMunchadexForTestTxHash = await mockMunchadexManager.write.setMunchadexNumInRarityForTest([
        alice,
        Rarity.Legendary,
        BigInt(munchablesPerRarity[Rarity.Legendary]),
      ]);
      await assertTxSuccess({ txHash: setMunchadexForTestTxHash });

      setMunchadexForTestTxHash = await mockMunchadexManager.write.setMunchadexNumInRarityForTest([
        alice,
        Rarity.Mythic,
        BigInt(munchablesPerRarity[Rarity.Mythic]),
      ]);
      await assertTxSuccess({ txHash: setMunchadexForTestTxHash });
    });

    it("should return combined partial bonus", async () => {
      const harvestBonus = await testContracts.bonusManager.contract.read.getHarvestBonus([alice]);
      // lock bonus = 15e16 for 60 day lock
      // migration bonus = default migration bonus / 2 for matching lock
      // level bonus = (average level 3 / 200) * 1e16
      // munchadex bonus = 3e16 for 30 owned in a realm + 1e16 for 1 owned per realm + rarity bonuses
      //   for owning all legendary and mythic
      assert.equal(
        harvestBonus,
        BigInt(15e16) +
          defaultMigrationBonus / 3n +
          BigInt(3e16 / 200) +
          BigInt(
            (3 + 1 + raritySetBonuses[Rarity.Legendary] + raritySetBonuses[Rarity.Mythic]) * 1e16
          )
      );
    });
  });
});
