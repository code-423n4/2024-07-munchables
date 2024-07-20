import cliProgress from "cli-progress";
import csv from "csv-parser";
import fs from "fs";
import { Address, toHex, zeroAddress } from "viem";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { checkTxSuccess } from "../utils/funcs";
import { load, saveStoredData } from "../utils/store";
import { DeployedContractsType } from "./deploy-contracts";

export enum TokenType {
  UNKNOWN = 0,
  ETH,
  USDB,
  WETH,
}

export interface SnapshotMetaData {
  currentRevealed: number;
  currentUnrevealed: number;
}

export interface Season1RevealedData {
  tokenId: string;
  tokenURI: string;
  owner: string;
  schnibbles: string;
  rarity: string;
  level: string;
  species: string;
  realm: string;
  last_petted_time: string;
  strength: string;
  agility: string;
  stamina: string;
  defence: string;
  voracity: string;
  cuteness: string;
  charisma: string;
  trustworthiness: string;
  leadership: string;
  empathy: string;
  intelligence: string;
  cunning: string;
  creativity: string;
  adaptability: string;
  wisdom: string;
  lock_amount: string;
  lock_token: string;
  revealer: string;
}

interface Season1UnrevealedData {
  address: string;
  unrevealed: number;
}

function readSeason1Data<T extends object>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tokens: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data: T) => tokens.push(data))
      .on("end", () => resolve(tokens))
      .on("error", (error) => reject(error));
  });
}

export async function loadSnapshotData() {
  const revealedFile = "deployments/actions/snapshot-data/revealed.csv";
  const unrevealedFile = "deployments/actions/snapshot-data/unrevealed.csv";
  try {
    const revealedData = await readSeason1Data<Season1RevealedData>(revealedFile);
    const unrevealedData = await readSeason1Data<Season1UnrevealedData>(unrevealedFile);
    return {
      revealedData,
      unrevealedData,
    };
  } catch (error) {
    process.exit(0);
  }
}

export async function loadSnapshotDataIntoContract({
  config,
  deployedContracts,
  env,
}: {
  config: IndividualConfigType;
  deployedContracts: DeployedContractsType;
  env: ENV;
}) {
  try {
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const migrationManager = deployedContracts.migrationManager;
    try {
      let fileData: SnapshotMetaData;

      const loadScratch = await load<SnapshotMetaData>(env, "migration-snapshot-scratch.json");
      if (loadScratch) {
        fileData = loadScratch;
      } else {
        fileData = {
          currentRevealed: 0,
          currentUnrevealed: 0,
        };
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }
      const { revealedData, unrevealedData } = await loadSnapshotData();
      progressBar.start(unrevealedData.length, fileData.currentUnrevealed);
      console.log("Load unrevealed snapshot data");
      const processedAddresses = new Set(); // This set will track processed addresses

      for (let i = fileData.currentUnrevealed; i < unrevealedData.length; i += 3) {
        // Filter out duplicates and map to necessary data structure
        const batch = unrevealedData
          .slice(i, i + 3)
          .filter(({ address }) => !processedAddresses.has(address))
          .map(({ address, unrevealed }) => ({
            address: address as Address,
            unrevealed: BigInt(unrevealed),
          }));

        // Update the set of processed addresses
        batch.forEach(({ address }) => processedAddresses.add(address));

        // Only proceed if the batch is not empty after filtering duplicates
        if (batch.length > 0) {
          const txHash = await migrationManager!.contract.write.loadUnrevealedSnapshot([
            batch.map(({ address }) => address),
            batch.map(({ unrevealed }) => unrevealed),
          ]);

          progressBar.update(i + 1);
          await checkTxSuccess(config.publicClient, txHash);
        }

        fileData.currentUnrevealed = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }

      progressBar.stop();

      console.log("Load revealed snapshot data");
      progressBar.start(revealedData.length, fileData.currentRevealed);
      for (let i = fileData.currentRevealed; i < revealedData.length; i += 3) {
        const batch = revealedData.slice(i, i + 3);
        if (i === fileData.currentRevealed && i !== 0) {
          const alreadyWritten = await migrationManager!.contract.read.getUserMigrationData([
            batch[0].owner as Address,
            BigInt(batch[0].tokenId),
          ]);
          if (alreadyWritten.tokenId != BigInt(0)) {
            console.log("Latest was written");
            fileData.currentRevealed = i + 3;
            await saveStoredData<SnapshotMetaData>(
              ENV.TESTNET,
              "migration-test-snapshot-data.json",
              fileData
            );
            continue;
          }
        }
        const txHash = await migrationManager!.contract.write.loadMigrationSnapshot([
          batch.map(({ owner }) => owner as Address),
          batch.map((d) => ({
            claimed: false,
            tokenId: BigInt(d.tokenId),
            lockAmount: BigInt(d.lock_amount),
            token:
              Number(d.lock_token) == TokenType.USDB
                ? config.externalAddresses.usdb
                : Number(d.lock_token) == TokenType.WETH
                  ? config.externalAddresses.weth
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
        ]);
        await checkTxSuccess(config.publicClient, txHash);
        progressBar.update(i + 1);
        fileData.currentRevealed = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }
      fileData.currentRevealed = revealedData.length;
      await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      progressBar.stop();
    } catch (error) {
      progressBar.stop();
      console.error(error);
      process.exit(0);
    }
  } catch (error) {
    process.exit(0);
  }
}
