import { getConfig } from "../utils/config";
import { BLAST_TOKEN_TESTNET, ENV, IndividualConfigType } from "../utils/config-consts";
import { checkTxSuccess } from "../utils/funcs";

import { isAddress, parseEther } from "viem";
import { testBlastErc20TokenAbi } from "../../abi/generated";

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);
  const { walletClient, publicClient } = config;

  const toAddress = process.argv[2] as `0x${string}`;
  const amount = process.argv[3] as string;

  if (!isAddress(toAddress) || isNaN(Number(amount))) {
    console.log(`Usage: pnpm mint-test-blast-erc20-token 0xYourWalletAddress 1000`);
    return process.exit(1);
  }

  const txHash = await walletClient.writeContract({
    address: BLAST_TOKEN_TESTNET,
    abi: testBlastErc20TokenAbi,
    functionName: "mint",
    args: [toAddress, parseEther(amount)],
  });
  const txReceipt = await checkTxSuccess(publicClient, txHash, true);
  console.log("Minted testnet BLAST", txReceipt);
};

main();
