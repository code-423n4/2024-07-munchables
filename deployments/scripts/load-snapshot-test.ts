import cliProgress from "cli-progress";
import { Address, toHex, zeroAddress } from "viem";
import { DeployedContractsType } from "../actions/deploy-contracts";
import { SnapshotMetaData, TokenType } from "../actions/load-snapshot-data";
import { getConfig } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { checkTxSuccess } from "../utils/funcs";
import { StoredData, load, saveStoredData, toDeployedContracts } from "../utils/store";

interface SnapshotTestData extends SnapshotMetaData {
  snapshotData: ReturnType<typeof createRandomBoilerplate>[];
}

const usedTokenIds = new Set();

function randomInRange(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function uniqueRandomTokenId() {
  let candidate;
  do {
    candidate = randomInRange(1, 10000);
  } while (usedTokenIds.has(candidate));
  usedTokenIds.add(candidate);
  return candidate;
}
// Helper function to create a random variation of the boilerplate object
function createRandomBoilerplate(owner: Address) {
  const token = 1;
  const isPurchased = Math.random() > 0.5;
  return {
    claimed: {
      claimed: false,
      owner: owner,
      lock_token: token,
      level: randomInRange(1, 10),
      last_petted_time: 0,
      rarity: randomInRange(1, 5),
      species: randomInRange(1, 125),
      realm: randomInRange(0, 4),
      tokenId: uniqueRandomTokenId(),
      lock_amount: isPurchased ? 0n : randomInRange(1e17, 5e17),
      schnibbles: randomInRange(1e17, 100e18),
      strength: randomInRange(5, 15),
      agility: randomInRange(10, 20),
      stamina: randomInRange(10, 20),
      defence: randomInRange(10, 30),
      voracity: randomInRange(30, 50),
      cuteness: randomInRange(10, 30),
      charisma: randomInRange(5, 15),
      trustworthiness: randomInRange(5, 15),
      leadership: randomInRange(5, 15),
      empathy: randomInRange(5, 15),
      intelligence: randomInRange(10, 20),
      cunning: randomInRange(5, 15),
      creativity: randomInRange(5, 15),
      adaptability: randomInRange(5, 15),
      wisdom: randomInRange(5, 15),
    },
    unrevealed: randomInRange(0, 20),
  };
}

export async function loadMockSnapshotDataIntoContract({
  deployedContracts,
  config,
}: {
  deployedContracts: DeployedContractsType;
  config: IndividualConfigType;
}) {
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  const migrationManager = deployedContracts.migrationManager;
  try {
    const owners: Address[] = [
      "0x15EE71940cDb8A7D7B41baaFcF2B32fEDb8F3a4d",
      "0x8219585614C2502b7181964A6923104e36BAe20c",
      "0xBE3868e20Ac520A90B06708BA03A3a44eD4af8DE",
      "0x84C3Efe8b915Ece5219E2bA87177a9bD18dbd14D",
      "0xF63dB987D06990D9AA3c9e15735cc9b71453DCB1",
      "0x34Da93ece7091E8a21Fd08DFAFfCD16cDd1D715a",
    ];
    let fileData: SnapshotTestData;

    const loadMockSnapshot = await load<SnapshotTestData>(
      ENV.TESTNET,
      "migration-test-snapshot-data.json"
    );
    if (loadMockSnapshot) {
      fileData = loadMockSnapshot;
    } else {
      fileData = {
        snapshotData: [],
        currentRevealed: 0,
        currentUnrevealed: 0,
      };
      owners.forEach((owner) => {
        const numEntries = randomInRange(100, 200);
        for (let i = 0; i < numEntries; i++) {
          fileData.snapshotData.push(createRandomBoilerplate(owner));
        }
      });
      await saveStoredData<SnapshotTestData>(
        ENV.TESTNET,
        "migration-test-snapshot-data.json",
        fileData
      );
    }
    const ownerData: ReturnType<typeof createRandomBoilerplate>[] = fileData.snapshotData;
    console.log("Load unrevealed snapshot data");
    progressBar.start(ownerData.length, fileData.currentUnrevealed);
    const processedOwners = new Set(); // This set will track processed owner addresses

    for (let i = fileData.currentUnrevealed; i < ownerData.length; i += 3) {
      // Filter out duplicates and map to necessary data structure
      const batch = ownerData
        .slice(i, i + 3)
        .filter(({ claimed }) => !processedOwners.has(claimed.owner))
        .map(({ claimed, unrevealed }) => ({
          owner: claimed.owner,
          unrevealed: BigInt(unrevealed),
        }));

      // Update the set of processed owners
      batch.forEach(({ owner }) => processedOwners.add(owner));

      // Only proceed if the batch is not empty after filtering duplicates
      if (batch.length > 0) {
        const txHash = await migrationManager!.contract.write.loadUnrevealedSnapshot([
          batch.map(({ owner }) => owner),
          batch.map(({ unrevealed }) => unrevealed),
        ]);

        progressBar.update(i + 1);
        await checkTxSuccess(config.publicClient, txHash);
      }

      fileData.currentUnrevealed = i;
      await saveStoredData<SnapshotTestData>(
        ENV.TESTNET,
        "migration-test-snapshot-data.json",
        fileData
      );
    }

    fileData.currentUnrevealed = ownerData.length;
    await saveStoredData<SnapshotTestData>(
      ENV.TESTNET,
      "migration-test-snapshot-data.json",
      fileData
    );

    console.log("Load revealed snapshot data");
    progressBar.start(ownerData.length, fileData.currentRevealed);
    for (let i = fileData.currentRevealed; i < ownerData.length; i += 3) {
      const batch = ownerData.slice(i, i + 3);
      if (i === fileData.currentRevealed && i !== 0) {
        const alreadyWritten = await migrationManager!.contract.read.getUserMigrationData([
          batch[0].claimed.owner as Address,
          BigInt(batch[0].claimed.tokenId),
        ]);
        if (alreadyWritten.tokenId != BigInt(0)) {
          console.log("Latest was written");
          fileData.currentRevealed = i + 3;
          await saveStoredData<SnapshotTestData>(
            ENV.TESTNET,
            "migration-test-snapshot-data.json",
            fileData
          );
          continue;
        }
      }
      console.log(batch.map(({ claimed: d }) => d.tokenId.toString()));
      const txHash = await migrationManager!.contract.write.loadMigrationSnapshot([
        batch.map(({ claimed: d }) => d.owner as Address),
        batch.map(({ claimed: d }) => ({
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
      await saveStoredData<SnapshotTestData>(
        ENV.TESTNET,
        "migration-test-snapshot-data.json",
        fileData
      );
    }
    progressBar.stop();
  } catch (error) {
    progressBar.stop();
    console.error(error);
    process.exit(0);
  }
}

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);

  const deployFilename = process.argv[2] as `0x${string}`;
  if (!deployFilename || deployFilename.substring(0, 11) !== "deployment-") {
    console.log(`Usage : load-snapshot-test.ts <deploy_cache_filename>`);
    process.exit(1);
  }
  const storedData: StoredData | null = await load<StoredData>(env, deployFilename);
  const deployedContracts: DeployedContractsType = await toDeployedContracts(config, storedData!);

  await loadMockSnapshotDataIntoContract({
    deployedContracts,
    config,
  });
};

main();
