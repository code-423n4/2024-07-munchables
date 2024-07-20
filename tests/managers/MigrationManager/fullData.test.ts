import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { Address, getAddress, parseEther, toHex, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { TokenType, loadSnapshotData } from "../../../deployments/actions/load-snapshot-data";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import { assertTxSuccess } from "../../utils/asserters";
import { BASE_TOKEN_DATA, testClient } from "../../utils/consts";
import {
  TestERC20ContractType,
  deployTestERC20Contract,
  getTestContracts,
  getTestRoleAddresses,
} from "../../utils/contracts";
import { configureDefaultLock } from "../../utils/lock-configure";
import { deployMockMunchNFT } from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("MigrationManager: migrateAllNFTs - Full Data test", () => {
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockUSDB: TestERC20ContractType;
  let mockWETH: TestERC20ContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    await deployMockMunchNFT({ testContracts });

    admin = testRoleAddresses[Role.Admin];
    mockUSDB = await deployTestERC20Contract({ account: admin });
    mockWETH = await deployTestERC20Contract({ account: admin });

    let configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
      StorageKey.USDBContract,
      mockUSDB.address,
      true,
    ]);
    await assertTxSuccess({ txHash: configSetAddressTxHash });

    configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
      StorageKey.WETHContract,
      mockWETH.address,
      true,
    ]);
    await assertTxSuccess({ txHash: configSetAddressTxHash });
    await configureDefaultLock({ admin, testContracts });
    let txHash = await testContracts.lockManager.contract.write.configureToken(
      [mockUSDB.address, BASE_TOKEN_DATA],
      {
        account: admin,
      }
    );

    await assertTxSuccess({
      txHash,
    });
    txHash = await testContracts.lockManager.contract.write.configureToken(
      [mockWETH.address, BASE_TOKEN_DATA],
      {
        account: admin,
      }
    );

    await assertTxSuccess({
      txHash,
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

  describe("All Snapshot Data possibilities", async () => {
    let uniqueRevealedOwners: Set<Address>;
    let uniqueUnrevealedOwners: Set<Address>;

    beforeEach(async () => {
      uniqueRevealedOwners = new Set<Address>();
      uniqueUnrevealedOwners = new Set<Address>();
      const { revealedData, unrevealedData } = await loadSnapshotData();
      const ownerNftCountMap = new Map<Address, number>();

      revealedData.forEach((d) => {
        const ownerAddress = getAddress(d.owner);
        if (ownerNftCountMap.has(ownerAddress)) {
          ownerNftCountMap.set(ownerAddress, ownerNftCountMap.get(ownerAddress)! + 1);
        } else {
          ownerNftCountMap.set(ownerAddress, 1);
        }
      });

      const topOwners = Array.from(ownerNftCountMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 19)
        .map((owner) => owner[0]);

      for (const owner of topOwners) {
        const ownerData = revealedData.filter((d) => getAddress(d.owner) === owner);
        uniqueRevealedOwners.add(owner);
        for (let i = 0; i < ownerData.length; i += 5) {
          const batch = ownerData.slice(i, i + 5);
          await testContracts.migrationManager.contract.write.loadMigrationSnapshot(
            [
              batch.map((d) => d.owner as Address),
              batch.map((d) => ({
                claimed: false,
                tokenId: BigInt(d.tokenId),
                lockAmount: BigInt(d.lock_amount),
                token:
                  Number(d.lock_token) == TokenType.USDB
                    ? mockUSDB.address
                    : Number(d.lock_token) == TokenType.WETH
                      ? mockWETH.address
                      : zeroAddress,
                attributes: {
                  chonks: BigInt(d.schnibbles),
                  level: Number(d.level),
                  evolution: 0,
                  lastPettedTime: BigInt(d.last_petted_time),
                },
                immutableAttributes: {
                  rarity: Number(d.rarity),
                  species: Number(d.species),
                  realm: Number(d.realm),
                  generation: 1,
                  hatchedDate: 0,
                },
                gameAttributes: [
                  {
                    dataType: 3,
                    value: toHex(Number(d.strength)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.agility)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.stamina)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.defence)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.voracity)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.cuteness)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.charisma)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.trustworthiness)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.leadership)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.empathy)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.intelligence)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.cunning)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.creativity)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.adaptability)),
                  },
                  {
                    dataType: 3,
                    value: toHex(Number(d.wisdom)),
                  },
                  {
                    dataType: 1,
                    value: toHex(true),
                  },
                ],
              })),
            ],
            { account: admin }
          );
        }
      }

      while (unrevealedData.length > 0) {
        const data = unrevealedData.splice(0, 19);
        const filteredData = data.filter((d) => d.unrevealed !== 0);

        filteredData.forEach((d) => uniqueUnrevealedOwners.add(getAddress(d.address)));
        await testContracts.migrationManager.contract.write.loadUnrevealedSnapshot(
          [filteredData.map((d) => d.address as Address), filteredData.map((d) => d.unrevealed)],
          { account: admin }
        );
      }

      const firstHash = await testContracts.migrationManager.contract.write.sealData({
        account: admin,
      });
      await assertTxSuccess({ txHash: firstHash });
    });
    it("Burn/Migrate them all", async () => {
      try {
        console.log("BURN UNREVEALED");
        for (const owner of uniqueUnrevealedOwners) {
          const unrevealed =
            await testContracts.migrationManager.contract.read.getUserUnrevealedData([owner]);
          if (unrevealed == 0) {
            continue;
          }
          await testClient.setBalance({ address: owner, value: parseEther("100") });
          await testContracts.migrationManager.contract.simulate.burnUnrevealedForPoints({
            account: owner,
          });
        }

        const snapshot = await testClient.snapshot();
        console.log("BURN REVEALED");
        for (const owner of uniqueRevealedOwners) {
          await testClient.setBalance({ address: owner, value: parseEther("100") });
          const length = await testContracts.migrationManager.contract.read.getUserNFTsLength([
            owner,
          ]);
          await testClient.impersonateAccount({ address: owner });
          const txHash = await testContracts.migrationManager.contract.write.burnNFTs([owner, 0], {
            account: owner,
          });
          await assertTxSuccess({ txHash });
          for (let i = 5; i < length; i += 5) {
            console.log(i);
            await testContracts.migrationManager.contract.simulate.burnNFTs([owner, i], {
              account: admin,
            });
          }
          await testClient.stopImpersonatingAccount({ address: owner });
        }
        await testClient.revert({ id: snapshot });

        console.log("MIGRATE");
        for (const owner of uniqueRevealedOwners) {
          if (owner != "0x4C13B8Ab6ce2d1d9F6070468BdC4C807f684375f") {
            continue;
          }
          console.log(owner);
          await testClient.setBalance({ address: owner, value: parseEther("1000") });
          await testClient.impersonateAccount({ address: owner });

          const migrateData =
            await testContracts.migrationManager.contract.read.getUserMigrateQuantityAll([owner]);
          const completeData =
            await testContracts.migrationManager.contract.read.getUserMigrationCompletedData([
              owner,
            ]);
          await registerPlayer({ account: owner, testContracts });
          let txHash;
          if (completeData[1].tokenLocked != zeroAddress) {
            if (completeData[1].tokenLocked == mockUSDB.address) {
              txHash = await mockUSDB.write.approve(
                [testContracts.migrationManager.contract.address, migrateData[0]],
                {
                  account: owner,
                }
              );
              await assertTxSuccess({ txHash });
              txHash = await mockUSDB.write.mint([owner, migrateData[0]], { account: owner });
              await assertTxSuccess({ txHash });
            } else if (completeData[1].tokenLocked == mockWETH.address) {
              txHash = await mockWETH.write.approve(
                [testContracts.migrationManager.contract.address, migrateData[0]],
                {
                  account: owner,
                }
              );
              await assertTxSuccess({ txHash });
              txHash = await mockWETH.write.mint([owner, migrateData[0]], { account: owner });
              await assertTxSuccess({ txHash });
            }
            txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
              account: owner,
            });
            await assertTxSuccess({ txHash });
          } else {
            txHash = await testContracts.migrationManager.contract.write.lockFundsForAllMigration({
              account: owner,
              value: migrateData[0],
            });
            await assertTxSuccess({ txHash });
          }
          const nftsLocked = await testContracts.migrationManager.contract.read.getUserNFTsLength([
            owner,
          ]);
          for (let i = 0; i < Number(nftsLocked); i += 5) {
            console.log(i);
            await testContracts.migrationManager.contract.simulate.migrateAllNFTs([owner, i], {
              account: owner,
            });
          }
          await testClient.stopImpersonatingAccount({ address: owner });
        }
      } catch (e) {
        console.error(e);
        process.exit(0);
      }
    });
  });
});
