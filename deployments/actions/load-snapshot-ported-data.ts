import cliProgress from "cli-progress";
import csv from "csv-parser";
import fs from "fs";
import { Address, encodePacked, keccak256, toHex, zeroAddress } from "viem";
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
  currentUserLockedAction: number;
  currentUserPurchasedAction: number;
  currentUserClaimedOnce: number;
  currentTokenClaimed: number;
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

export interface SetUserLockedActionData {
  address: string;
  action: number;
}

export interface SetUserPurchasedActionData {
  address: string;
  action: number;
}

export interface SetUserClaimedOnceData {
  address: string;
  claimed: boolean;
}

export interface SetTokenClaimedData {
  address: string;
  id: string;
  claimed: boolean;
}

const retryAsync = async (fn: () => Promise<any>, retries = 3, delay = 5000) => {
  let error;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      error = err;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw error; // If all retries fail, throw the last error
};

export function readSeason1Data<T extends object>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tokens: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data: T) => tokens.push(data))
      .on("end", () => resolve(tokens))
      .on("error", (error) => reject(error));
  });
}

export async function loadSnapshotPortedData() {
  const revealedFile = "deployments/actions/snapshot-data/revealed.csv";
  const unrevealedFile = "deployments/actions/snapshot-data/unrevealed.csv";
  const setUserLockedActionFile = "deployments/actions/snapshot-data/setUserLockedAction.csv";
  const setUserPurchasedActionFile = "deployments/actions/snapshot-data/setUserPurchasedAction.csv";
  const setUserClaimedOnceFile = "deployments/actions/snapshot-data/setUserClaimedOnce.csv";
  const setTokenClaimedFile = "deployments/actions/snapshot-data/setTokenClaimed.csv";
  try {
    const revealedData = await readSeason1Data<Season1RevealedData>(revealedFile);
    const unrevealedData = await readSeason1Data<Season1UnrevealedData>(unrevealedFile);
    const setUserLockedActionData =
      await readSeason1Data<SetUserLockedActionData>(setUserLockedActionFile);
    const setUserPurchasedActionData = await readSeason1Data<SetUserPurchasedActionData>(
      setUserPurchasedActionFile
    );
    const setUserClaimedOnceData =
      await readSeason1Data<SetUserClaimedOnceData>(setUserClaimedOnceFile);
    const setTokenClaimedData = await readSeason1Data<SetTokenClaimedData>(setTokenClaimedFile);
    return {
      revealedData,
      unrevealedData,
      setUserLockedActionData,
      setUserPurchasedActionData,
      setUserClaimedOnceData,
      setTokenClaimedData,
    };
  } catch (error) {
    process.exit(0);
  }
}

export async function loadSnapshotPortedDataIntoContract({
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
          currentUserLockedAction: 0,
          currentUserPurchasedAction: 0,
          currentUserClaimedOnce: 0,
          currentTokenClaimed: 0,
        };
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }
      const {
        revealedData,
        unrevealedData,
        setUserLockedActionData,
        setUserPurchasedActionData,
        setUserClaimedOnceData,
        setTokenClaimedData,
      } = await loadSnapshotPortedData();

      // Unrevealed

      progressBar.start(unrevealedData.length, fileData.currentUnrevealed);
      console.log("Load unrevealed snapshot data");
      const unrevealedProcessedAddresses = new Set(); // This set will track processed addresses

      for (let i = fileData.currentUnrevealed; i < unrevealedData.length; i += 3) {
        // Filter out duplicates and map to necessary data structure
        const batch = unrevealedData
          .slice(i, i + 3)
          .filter(({ address }) => !unrevealedProcessedAddresses.has(address))
          .map(({ address, unrevealed }) => ({
            address: address as Address,
            unrevealed: BigInt(unrevealed),
          }));

        // Update the set of processed addresses
        batch.forEach(({ address }) => unrevealedProcessedAddresses.add(address));

        // Only proceed if the batch is not empty after filtering duplicates
        if (batch.length > 0) {
          const txHash = await retryAsync(() =>
            migrationManager!.contract.write.loadUnrevealedSnapshot([
              batch.map(({ address }) => address),
              batch.map(({ unrevealed }) => unrevealed),
            ])
          );

          progressBar.update(i + 1);
          await retryAsync(() => checkTxSuccess(config.publicClient, txHash));
        }

        fileData.currentUnrevealed = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }

      progressBar.stop();

      // Revealed

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
              env,
              "migration-snapshot-scratch.json",
              fileData
            );
            continue;
          }
        }
        const txHash = await retryAsync(() =>
          migrationManager!.contract.write.loadMigrationSnapshot([
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
          ])
        );
        await retryAsync(() => checkTxSuccess(config.publicClient, txHash));
        progressBar.update(i + 1);
        fileData.currentRevealed = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }
      fileData.currentRevealed = revealedData.length;
      await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      progressBar.stop();

      // Set user locked action

      progressBar.start(setUserLockedActionData.length, fileData.currentUserLockedAction);
      console.log("Load user locked action data");
      const userLockedActionProcessedAddresses = new Set(); // This set will track processed addresses

      for (let i = fileData.currentUserLockedAction; i < setUserLockedActionData.length; i += 3) {
        // Filter out duplicates and map to necessary data structure
        const batch = setUserLockedActionData
          .slice(i, i + 3)
          .filter(({ address }) => !userLockedActionProcessedAddresses.has(address))
          .map(({ address, action }) => ({
            address: address as Address,
            action: BigInt(action),
          }));

        // Update the set of processed addresses
        batch.forEach(({ address }) => userLockedActionProcessedAddresses.add(address));

        // Only proceed if the batch is not empty after filtering duplicates
        if (batch.length > 0) {
          const txHash = await retryAsync(() =>
            migrationManager!.contract.write.setUserLockedAction([
              batch.map(({ address }) => address),
              batch.map(({ action }) => action),
            ])
          );

          progressBar.update(i + 1);
          await retryAsync(() => checkTxSuccess(config.publicClient, txHash));
        }

        fileData.currentUserLockedAction = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }

      progressBar.stop();

      // Set user purchased action

      progressBar.start(setUserPurchasedActionData.length, fileData.currentUserPurchasedAction);
      console.log("Load user purchased action data");
      const userPurchasedActionProcessedAddresses = new Set(); // This set will track processed addresses

      for (
        let i = fileData.currentUserPurchasedAction;
        i < setUserPurchasedActionData.length;
        i += 3
      ) {
        // Filter out duplicates and map to necessary data structure
        const batch = setUserPurchasedActionData
          .slice(i, i + 3)
          .filter(({ address }) => !userPurchasedActionProcessedAddresses.has(address))
          .map(({ address, action }) => ({
            address: address as Address,
            action: BigInt(action),
          }));

        // Update the set of processed addresses
        batch.forEach(({ address }) => userPurchasedActionProcessedAddresses.add(address));

        // Only proceed if the batch is not empty after filtering duplicates
        if (batch.length > 0) {
          const txHash = await retryAsync(() =>
            migrationManager!.contract.write.setUserPurchasedAction([
              batch.map(({ address }) => address),
              batch.map(({ action }) => action),
            ])
          );

          progressBar.update(i + 1);
          await retryAsync(() => checkTxSuccess(config.publicClient, txHash));
        }

        fileData.currentUserPurchasedAction = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }

      progressBar.stop();

      // Set user claimed once

      progressBar.start(setUserClaimedOnceData.length, fileData.currentUserClaimedOnce);
      console.log("Load user claimed once action data");
      const userClaimedOnceProcessedAddresses = new Set(); // This set will track processed addresses

      for (let i = fileData.currentUserClaimedOnce; i < setUserClaimedOnceData.length; i += 3) {
        // Filter out duplicates and map to necessary data structure
        const batch = setUserClaimedOnceData
          .slice(i, i + 3)
          .filter(({ address }) => !userClaimedOnceProcessedAddresses.has(address))
          .map(({ address, claimed }) => ({
            address: address as Address,
            claimed: Boolean(claimed),
          }));

        // Update the set of processed addresses
        batch.forEach(({ address }) => userClaimedOnceProcessedAddresses.add(address));

        // Only proceed if the batch is not empty after filtering duplicates
        if (batch.length > 0) {
          const txHash = await retryAsync(() =>
            migrationManager!.contract.write.setUserClaimedOnce([
              batch.map(({ address }) => address),
              batch.map(({ claimed }) => claimed),
            ])
          );

          progressBar.update(i + 1);
          await retryAsync(() => checkTxSuccess(config.publicClient, txHash));
        }

        fileData.currentUserClaimedOnce = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }

      progressBar.stop();

      // Set token claimed

      progressBar.start(setTokenClaimedData.length, fileData.currentTokenClaimed);
      console.log("Load set token claim action data");
      const tokenClaimedProcessedTokenIds = new Set(); // This set will track processed addresses

      for (let i = fileData.currentTokenClaimed; i < setTokenClaimedData.length; i += 3) {
        // Filter out duplicates and map to necessary data structure
        const batch = setTokenClaimedData
          .slice(i, i + 3)
          .filter(({ id }) => !tokenClaimedProcessedTokenIds.has(id))
          .map(({ id, address, claimed }) => ({
            id,
            address: address as Address,
            claimed: Boolean(claimed),
          }));

        // Update the set of processed addresses
        batch.forEach(({ id }) => tokenClaimedProcessedTokenIds.add(id));

        // Only proceed if the batch is not empty after filtering duplicates
        if (batch.length > 0) {
          const txHash = await retryAsync(() =>
            migrationManager!.contract.write.setTokenClaimed([
              batch.map(({ id, address }) =>
                keccak256(encodePacked(["address", "uint256"], [address, BigInt(id)]))
              ),
              batch.map(({ claimed }) => claimed),
            ])
          );

          progressBar.update(i + 1);
          await retryAsync(() => checkTxSuccess(config.publicClient, txHash));
        }

        fileData.currentTokenClaimed = i;
        await saveStoredData<SnapshotMetaData>(env, "migration-snapshot-scratch.json", fileData);
      }

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
