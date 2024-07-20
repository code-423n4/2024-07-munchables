import readline from "node:readline";
import { Address, createPublicClient } from "viem";

export const checkTxSuccess = async (
  publicClient: ReturnType<typeof createPublicClient>,
  hash: Address,
  logging = true
) => {
  const txr = await publicClient.waitForTransactionReceipt({ hash });
  if (!txr || txr.status === "reverted") {
    console.error("Transaction was unsuccessful", txr);
    throw new Error(`Transaction was unsuccessful: ${hash}`);
  }

  if (logging) {
    console.log("Done! Transaction hash: ", hash);
  }

  return txr;
};

export function makeLogger(logging: boolean) {
  return function (...args: any[]) {
    if (logging) {
      console.log(...args);
    }
  };
}

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (input) => {
      resolve(input);
      rl.close();
    });
  });
}
