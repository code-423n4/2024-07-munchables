import cliProgress from "cli-progress";
import {
  encodeAbiParameters,
  getContract,
  hexToNumber,
  keccak256,
  toHex,
  zeroAddress,
  type Address,
} from "viem";
import { migrationManagerAbi } from "../../abi/generated";
import { IndividualConfigType } from "../utils/config-consts";
import { DeployedContractsType } from "./deploy-contracts";
import { TokenType, loadSnapshotData, type Season1RevealedData } from "./load-snapshot-data";
import {
  SetTokenClaimedData,
  SetUserClaimedOnceData,
  SetUserLockedActionData,
  SetUserPurchasedActionData,
  readSeason1Data,
} from "./load-snapshot-ported-data";

enum GameAttributeIndex {
  Strength,
  Agility,
  Stamina,
  Defence,
  Voracity,
  Cuteness,
  Charisma,
  Trustworthiness,
  Leadership,
  Empathy,
  Intelligence,
  Cunning,
  Creativity,
  Adaptability,
  Wisdom,
  IsOriginal,
  IndexCount, // Ensures last index, not used in actual data comparison.
}

interface OnChainMigrationData {
  tokenId: bigint;
  lockAmount: bigint;
  token: Address;

  attributes: {
    chonks: bigint;
    level: number;
    evolution: number;
    lastPettedTime: bigint;
  };
  immutableAttributes: {
    species: number;
    realm: number;
    rarity: number;
    generation: number;
    hatchedDate: number;
  };
  gameAttributes: {
    dataType: number;
    value: string;
  }[];
  claimed: string;
}
function compareCSVToOnchainData(
  config: IndividualConfigType,
  csvObject: Season1RevealedData,
  onchainData: OnChainMigrationData,
  claimed: boolean
) {
  // Convert strings to bigints or numbers as necessary and compare
  if (csvObject.tokenId !== onchainData.tokenId.toString()) {
    throw new Error(
      `Token ID mismatch: CSV(${csvObject.tokenId}) != OnChain(${onchainData.tokenId})`
    );
  }

  if (String(onchainData.claimed) !== String(claimed)) {
    throw new Error(
      `Claimed mismatch (${csvObject.tokenId}): CSV(${claimed}) != OnChain(${onchainData.claimed})`
    );
  }

  if (
    csvObject.lock_amount !== onchainData.lockAmount.toString() &&
    !(csvObject.lock_amount === "" && onchainData.lockAmount.toString() === "0")
  ) {
    throw new Error(
      `Lock Amount mismatch: CSV(${csvObject.lock_amount}) != OnChain(${onchainData.lockAmount})`
    );
  }

  const tokenContract =
    Number(csvObject.lock_token) == TokenType.USDB
      ? config.externalAddresses.usdb
      : Number(csvObject.lock_token) == TokenType.WETH
        ? config.externalAddresses.weth
        : zeroAddress;
  if (tokenContract !== onchainData.token) {
    throw new Error(
      `Token mismatch: CSV(${csvObject.lock_token}) != OnChain(${onchainData.token})`
    );
  }

  // Comparing attribute fields
  if (csvObject.schnibbles !== onchainData.attributes.chonks.toString()) {
    throw new Error(
      `Chonks mismatch: CSV(${csvObject.schnibbles}) != OnChain(${onchainData.attributes.chonks})`
    );
  }

  if (csvObject.level !== onchainData.attributes.level.toString()) {
    throw new Error(
      `Level mismatch: CSV(${csvObject.level}) != OnChain(${onchainData.attributes.level})`
    );
  }

  if (csvObject.last_petted_time !== onchainData.attributes.lastPettedTime.toString()) {
    throw new Error(
      `Last Petted Time mismatch: CSV(${csvObject.last_petted_time}) != OnChain(${onchainData.attributes.lastPettedTime})`
    );
  }

  // Comparing immutable attributes
  if (csvObject.species !== onchainData.immutableAttributes.species.toString()) {
    throw new Error(
      `Species mismatch: CSV(${csvObject.species}) != OnChain(${onchainData.immutableAttributes.species})`
    );
  }

  if (csvObject.realm !== onchainData.immutableAttributes.realm.toString()) {
    throw new Error(
      `Realm mismatch: CSV(${csvObject.realm}) != OnChain(${onchainData.immutableAttributes.realm})`
    );
  }

  if (csvObject.rarity !== onchainData.immutableAttributes.rarity.toString()) {
    throw new Error(
      `Rarity mismatch: CSV(${csvObject.rarity}) != OnChain(${onchainData.immutableAttributes.rarity})`
    );
  }

  const gameAttributesMap = [
    Number(csvObject.strength),
    Number(csvObject.agility),
    Number(csvObject.stamina),
    Number(csvObject.defence),
    Number(csvObject.voracity),
    Number(csvObject.cuteness),
    Number(csvObject.charisma),
    Number(csvObject.trustworthiness),
    Number(csvObject.leadership),
    Number(csvObject.empathy),
    Number(csvObject.intelligence),
    Number(csvObject.cunning),
    Number(csvObject.creativity),
    Number(csvObject.adaptability),
    Number(csvObject.wisdom),
  ];

  for (let i = 0; i < gameAttributesMap.length; i++) {
    const csvValueHex = toHex(gameAttributesMap[i]);
    const onchainValueHex = onchainData.gameAttributes[i].value;
    if (csvValueHex !== onchainValueHex && csvValueHex + "0" !== onchainValueHex) {
      throw new Error(
        `${GameAttributeIndex[i]} mismatch: CSV(${csvValueHex}) != OnChain(${onchainValueHex})`
      );
    }
  }
}

export async function verifySnapshotDataFromContract({
  config,
  deployedContracts,
}: {
  config: IndividualConfigType;
  deployedContracts: DeployedContractsType;
}) {
  try {
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const migrationManager = deployedContracts.migrationManager;
    const setTokenClaimedFile = "deployments/actions/snapshot-data/setTokenClaimed.csv";

    const { revealedData, unrevealedData } = await loadSnapshotData();
    const setTokenClaimedData = await readSeason1Data<SetTokenClaimedData>(setTokenClaimedFile);

    progressBar.start(revealedData.length, 0);
    console.log("Checking revealed snapshot data");

    for (let i = 0; i < revealedData.length; i++) {
      // Filter out duplicates and map to necessary data structure
      const user = revealedData[i];
      const tokenClaimed = setTokenClaimedData.find(
        (data) =>
          data.address.toLowerCase() === user.owner.toLowerCase() && data.id === user.tokenId
      );
      let tokenClaimedResponse;
      if (!tokenClaimed) {
        tokenClaimedResponse = false;
      } else {
        tokenClaimedResponse = tokenClaimed.claimed;
      }

      const userOnchainData = await migrationManager!.contract.read.getUserMigrationData([
        user.owner,
        user.tokenId,
      ]);
      compareCSVToOnchainData(config, user, userOnchainData, tokenClaimedResponse);
      progressBar.update(i + 1);
    }
    progressBar.stop();
    console.log("Revealed data verified successfully");

    progressBar.start(unrevealedData.length, 0);
    console.log("Checking unrevealed snapshot data");

    for (let i = 0; i < unrevealedData.length; i++) {
      // Filter out duplicates and map to necessary data structure
      const user = unrevealedData[i];

      const userData = await migrationManager!.contract.read.getUserUnrevealedData([user.address]);
      if (userData != user.unrevealed) {
        console.error(
          `Data mismatch for user ${user.address}. Expected ${user.unrevealed}, got ${userData}`
        );
        process.exit(0);
      }
      progressBar.update(i + 1);
    }
    progressBar.stop();
    console.log("Unrevealed data verified successfully");
  } catch (error) {
    console.error("Error loading snapshot data: ", error);
    process.exit(0);
  }
}

export async function verifyStorageSlotDataFromContract({
  config,
  deployedContracts,
}: {
  config: IndividualConfigType;
  deployedContracts: DeployedContractsType;
}) {
  // _userClaimedOnce, userlockedaction, userpurchasedaction
  // Storage slots 17, 20, 21
  try {
    const migrationManager = deployedContracts.migrationManager!;
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const setUserLockedActionFile = "deployments/actions/snapshot-data/setUserLockedAction.csv";
    const setUserPurchasedActionFile =
      "deployments/actions/snapshot-data/setUserPurchasedAction.csv";
    const setUserClaimedOnceFile = "deployments/actions/snapshot-data/setUserClaimedOnce.csv";
    const publicClient = config.publicClient;

    const { revealedData } = await loadSnapshotData();
    const setUserLockedAction =
      await readSeason1Data<SetUserLockedActionData>(setUserLockedActionFile);
    const setUserPurchasedAction = await readSeason1Data<SetUserPurchasedActionData>(
      setUserPurchasedActionFile
    );
    const setUserClaimedOnceAction =
      await readSeason1Data<SetUserClaimedOnceData>(setUserClaimedOnceFile);

    const verifiedUsers = new Set();
    progressBar.start(revealedData.length, 0);
    console.log("Checking user snapshot data");
    for (let i = 0; i < revealedData.length; i++) {
      const user = revealedData[i];
      if (verifiedUsers.has(user.owner.toLowerCase())) {
        progressBar.update(i + 1);
        continue;
      }
      const userLockedAction = setUserLockedAction.find(
        (data) => data.address.toLowerCase() === user.owner.toLowerCase()
      );
      const userPurchasedAction = setUserPurchasedAction.find(
        (data) => data.address.toLowerCase() === user.owner.toLowerCase()
      );
      const userClaimedOnceAction = setUserClaimedOnceAction.find(
        (data) => data.address.toLowerCase() === user.owner.toLowerCase()
      );

      const argsEncodedClaimedOnce = encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [user.owner as Address, 17n]
      );
      const onchainClaimedOnceHash = await publicClient.getStorageAt({
        address: migrationManager.contract!.address as Address,
        slot: keccak256(argsEncodedClaimedOnce),
      });
      const onchainClaimedOnce = hexToNumber(onchainClaimedOnceHash as Address);

      const argsEncodedLockedAction = encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [user.owner as Address, 20n]
      );
      const onchainLockedActionHash = await publicClient.getStorageAt({
        address: migrationManager.contract!.address as Address,
        slot: keccak256(argsEncodedLockedAction),
      });
      const onchainLockedAction = hexToNumber(onchainLockedActionHash as Address);

      const argsEncodedPurchasedAction = encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [user.owner as Address, 21n]
      );
      const onchainPurchasedActionHash = await publicClient.getStorageAt({
        address: migrationManager.contract!.address as Address,
        slot: keccak256(argsEncodedPurchasedAction),
      });
      const onchainPurchasedAction = hexToNumber(onchainPurchasedActionHash as Address);

      const userClaimedOnce = userClaimedOnceAction?.claimed ? 1 : 0;
      if (onchainClaimedOnce !== userClaimedOnce) {
        throw new Error(
          `Claimed Once mismatch: CSV(${userClaimedOnce}) != OnChain(${onchainClaimedOnce})`
        );
      }

      const userLockedActionResult = userLockedAction?.action ? userLockedAction?.action : 0;
      if (Number(onchainLockedAction) !== Number(userLockedActionResult)) {
        throw new Error(
          `Locked Action mismatch: CSV(${userLockedActionResult}) != OnChain(${onchainLockedAction})`
        );
      }

      const userPurchasedActionResult = userPurchasedAction?.action
        ? userPurchasedAction?.action
        : 0;
      if (Number(onchainPurchasedAction) !== Number(userPurchasedActionResult)) {
        throw new Error(
          `Purchased Action mismatch: CSV(${userPurchasedActionResult}) != OnChain(${onchainPurchasedAction})`
        );
      }

      verifiedUsers.add(user.owner.toLowerCase());
      progressBar.update(i + 1);
    }
    progressBar.stop();
    console.log("User data verified successfully");
  } catch (error) {
    console.error("Error loading snapshot data: ", error);
    process.exit(0);
  }
}

export async function verifyStorageSlotDataBetweenContracts({
  config,
  deployedContracts,
}: {
  config: IndividualConfigType;
  deployedContracts: DeployedContractsType;
}) {
  // _userClaimedOnce, userlockedaction, userpurchasedaction
  // Storage slots 17, 20, 21
  try {
    const migrationManager = deployedContracts.migrationManager!;
    const oldMigrationManagerAddress = "0x6f7Ad6accC79266Ef683aC575722D9937E543352";
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const publicClient = config.publicClient;

    const { revealedData } = await loadSnapshotData();

    const verifiedUsers = new Set();
    progressBar.start(revealedData.length, 0);
    console.log("Comparing storage slots between old and new migration managers");
    for (let i = 0; i < revealedData.length; i++) {
      const user = revealedData[i];
      if (verifiedUsers.has(user.owner.toLowerCase())) {
        progressBar.update(i + 1);
        continue;
      }

      // Define slots
      const slots = [17n, 20n, 21n];

      // Check each slot
      for (const slot of slots) {
        const argsEncoded = encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }],
          [user.owner as Address, slot]
        );

        const hashKey = keccak256(argsEncoded);

        // Retrieve values from both contracts
        const onchainNewHash = await publicClient.getStorageAt({
          address: migrationManager.contract!.address as Address,
          slot: hashKey,
        });
        const onchainOldHash = await publicClient.getStorageAt({
          address: oldMigrationManagerAddress,
          slot: hashKey,
        });

        // Compare results
        if (onchainNewHash !== onchainOldHash) {
          throw new Error(
            `Mismatch in slot ${slot}: Old Contract(${onchainOldHash}) != New Contract(${onchainNewHash})`
          );
        }
      }

      verifiedUsers.add(user.owner.toLowerCase());
      progressBar.update(i + 1);
    }
    progressBar.stop();
    console.log("Storage slot data verified successfully between contracts");
  } catch (error) {
    console.error("Error during storage slot verification: ", error);
    process.exit(0);
  }
}

function isEqualExceptHatchedDate(obj1, obj2) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false; // Different number of keys means objects are different
  }

  for (const key of keys1) {
    if (key === "immutableAttributes") {
      // Special handling for the nested immutableAttributes object
      const subKeys1 = Object.keys(obj1[key]);
      const subKeys2 = Object.keys(obj2[key]);

      if (subKeys1.length !== subKeys2.length) {
        return false;
      }

      for (const subKey of subKeys1) {
        if (subKey === "hatchedDate") continue; // Skip hatchedDate comparison
        if (obj1[key][subKey] !== obj2[key][subKey]) {
          return false;
        }
      }
    } else if (key === "gameAttributes") {
      // Compare arrays of gameAttributes
      if (obj1[key].length !== obj2[key].length) {
        return false;
      }
      for (let i = 0; i < obj1[key].length; i++) {
        const dataType1 = obj1[key][i].dataType;
        const value1 = obj1[key][i].value;
        const dataType2 = obj2[key][i].dataType;
        const value2 = obj2[key][i].value;

        if (dataType1 !== dataType2 || value1 !== value2) {
          return false;
        }
      }
    } else {
      // Compare other keys normally
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
  }

  return true;
}

export async function verifyGettersBetweenContract({
  config,
  deployedContracts,
}: {
  config: IndividualConfigType;
  deployedContracts: DeployedContractsType;
}) {
  try {
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const migrationManager = deployedContracts.migrationManager;
    const oldMigrationManager = getContract({
      address: "0x6f7Ad6accC79266Ef683aC575722D9937E543352",
      abi: migrationManagerAbi,
      client: {
        wallet: config.walletClient,
        public: config.publicClient,
      },
    });
    const setTokenClaimedFile = "deployments/actions/snapshot-data/setTokenClaimed.csv";

    const { revealedData, unrevealedData } = await loadSnapshotData();
    const setTokenClaimedData = await readSeason1Data<SetTokenClaimedData>(setTokenClaimedFile);

    progressBar.start(revealedData.length, 0);
    console.log("Comparing revealed snapshot data between contracts");

    for (let i = 0; i < revealedData.length; i++) {
      const user = revealedData[i];
      const tokenClaimed = setTokenClaimedData.find(
        (data) =>
          data.address.toLowerCase() === user.owner.toLowerCase() && data.id === user.tokenId
      );
      const tokenClaimedResponse = tokenClaimed ? tokenClaimed.claimed : false;

      const newUserOnchainData = await migrationManager.contract.read.getUserMigrationData([
        user.owner,
        user.tokenId,
      ]);
      const oldUserOnchainData = await oldMigrationManager.read.getUserMigrationData([
        user.owner as Address,
        BigInt(user.tokenId),
      ]);

      if (isEqualExceptHatchedDate(newUserOnchainData, oldUserOnchainData)) {
        console.error(newUserOnchainData);
        console.error(oldUserOnchainData);
        console.error(`Mismatch found in revealed data for user ${user.owner}`);
        process.exit(0);
      }
      compareCSVToOnchainData(config, user, newUserOnchainData, tokenClaimedResponse);
      progressBar.update(i + 1);
    }
    progressBar.stop();
    console.log("Revealed data verified successfully between contracts");

    progressBar.start(unrevealedData.length, 0);
    console.log("Comparing unrevealed snapshot data between contracts");

    for (let i = 0; i < unrevealedData.length; i++) {
      const user = unrevealedData[i];

      const newUserUnrevealedData = await migrationManager.contract.read.getUserUnrevealedData([
        user.address,
      ]);
      const oldUserUnrevealedData = await oldMigrationManager.read.getUserUnrevealedData([
        user.address as Address,
      ]);

      if (newUserUnrevealedData !== oldUserUnrevealedData) {
        console.error(`Mismatch found in unrevealed data for user ${user.address}`);
        process.exit(0);
      }
      progressBar.update(i + 1);
    }
    progressBar.stop();
    console.log("Unrevealed data verified successfully between contracts");
  } catch (error) {
    console.error("Error during snapshot data verification: ", error);
    process.exit(0);
  }
}
