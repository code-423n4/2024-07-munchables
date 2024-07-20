import dotenv from "dotenv";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Address, createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { blast, blastSepolia } from "viem/chains";
import { accountManagerAbi } from "../abi/generated";
import { checkTxSuccess } from "../deployments/utils/funcs";
dotenv.config();

if (!process.env.PRIVATE_KEY_SOCIAL) {
  console.error(`Please add PRIVATE_KEY_SOCIAL to .env with your private key`);
  process.exit(1);
}
const pKey = privateKeyToAccount(process.env.PRIVATE_KEY_SOCIAL as Address);

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = process.env.ENV as string;
if (env.indexOf("clone") !== -1) {
  console.error("Cannot run against a clone");
  process.exit(1);
}

let chain, transport;
if (env === "mainnet") {
  chain = blast;
  transport = http(process.env.BLAST_MAINNET);
} else {
  chain = blastSepolia;
  transport = http(process.env.BLAST_TESTNET);
}
const walletClient = createWalletClient({
  chain,
  transport,
  account: pKey,
});
const publicClient = createPublicClient({
  chain,
  transport,
});

const accountManagerAddress = async () => {
  const currentFilename = __dirname + "/../deployments/cache/current.json";
  const currentJsonStr = fs.readFileSync(currentFilename, { encoding: "utf-8" });
  const currentJson = JSON.parse(currentJsonStr);
  const deployFilename = __dirname + "/../deployments/cache/" + env + "/" + currentJson[env];
  const deployJsonStr = fs.readFileSync(deployFilename, { encoding: "utf-8" });
  const deployJson = JSON.parse(deployJsonStr);
  return deployJson.contracts.accountManagerProxy.address;
};

const showUsage = () => {
  console.log(`Usage : populate-schnibble-spray.ts <csv_file>`);
  process.exit(1);
};

const validateAccount = (account: string) => {
  if (account.substring(0, 2) != "0x" || account.length !== 42) {
    return false;
  }
  return true;
};

const main = async (csvFile: string) => {
  const contents = fs.readFileSync(csvFile, { encoding: "utf-8" });

  const lines = contents.split("\n");
  const accounts: `0x${string}`[] = [],
    schnibbleAmounts: bigint[] = [];
  let lineNumber = 1;
  lines.forEach((line) => {
    if (line) {
      const [account, schnibbles] = line.split(",");

      if (!validateAccount(account)) {
        console.error(`Invalid account at line ${lineNumber} (${account})`);
        process.exit(1);
      }
      const schnibSmallNumber = parseInt(schnibbles);
      if (isNaN(schnibSmallNumber) || schnibSmallNumber < 1) {
        console.error(`Invalid schnibbles value at line ${lineNumber} (${schnibbles})`);
        process.exit(1);
      }
      const schnibBigNumber = BigInt(schnibSmallNumber) * BigInt(1e18);

      accounts.push(account);
      schnibbleAmounts.push(schnibBigNumber);
    }

    lineNumber++;
  });

  if (accounts.length !== schnibbleAmounts.length) {
    console.error(`Accounts and schnibbles do not match`);
    process.exit(1);
  }

  if (accounts.length === 0) {
    console.error(`No entries found in CSV`);
    process.exit(0);
  }

  console.log(`Found ${accounts.length} entries`);

  // populate the contract
  const accountManagerAddr = await accountManagerAddress();
  try {
    const { request } = await publicClient.simulateContract({
      account: pKey,
      abi: accountManagerAbi,
      address: accountManagerAddr,
      functionName: "spraySchnibblesPropose",
      args: [accounts, schnibbleAmounts],
    });
    const hash = await walletClient.writeContract(request);
    const txReceipt = await checkTxSuccess(publicClient, hash, true);
    console.log(`Schnibble spray proposed in ${txReceipt.transactionHash}`);
  } catch (e) {
    if (e.message.indexOf("ExistingProposalError") > -1) {
      console.error(`There is an existing proposal for ${pKey.address}`);
      process.exit(1);
    }
    console.log("ERROR", e.message);
  }
};

///////////////////////////////////////////

if (process.argv.length < 3) {
  showUsage();
}
const csvFile = process.argv[2];
if (!csvFile || !fs.existsSync(csvFile)) {
  showUsage();
}
main(csvFile);
