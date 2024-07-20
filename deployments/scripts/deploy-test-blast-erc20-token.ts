import { getConfig } from "../utils/config";
import { ENV, IndividualConfigType } from "../utils/config-consts";
import { checkTxSuccess } from "../utils/funcs";

import { Address } from "viem";
import { testBlastErc20TokenAbi } from "../../abi/generated";
import TestBlastERC20Token from "../../out/TestBlastERC20Token.sol/TestBlastERC20Token.json";

const main = async () => {
  const env = process.env.ENV as ENV;

  const config: IndividualConfigType = getConfig(env);
  const { walletClient, publicClient } = config;

  const deployedHash = await walletClient.deployContract({
    abi: testBlastErc20TokenAbi,
    bytecode: TestBlastERC20Token.bytecode.object as Address,
    args: [],
  });
  const txReceipt = await checkTxSuccess(publicClient, deployedHash, true);
  console.log("Deployed test blast ERC20 token", txReceipt);
};

main();
