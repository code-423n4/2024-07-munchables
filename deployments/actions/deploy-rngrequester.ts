import { getContract, parseAbiItem } from "viem";
import { configStorageAbi, mockRngRequesterAbi } from "../../abi/generated";
import IAirnodeRrpV0 from "../../out/IAirnodeRrpV0.sol/IAirnodeRrpV0.json";
import MockRNGRequester from "../../out/MockRNGRequester.sol/MockRNGRequester.json";
import { AIRNODE_RPV0_TESTNET, IndividualConfigType } from "../utils/config-consts";
import { checkTxSuccess, makeLogger, sleep } from "../utils/funcs";

export async function deployRNGRequester({
  config,
  configStorageAddress,
  logging = true,
}: {
  config: IndividualConfigType;
  configStorageAddress: `0x${string}`;
  logging?: boolean;
}) {
  const _log = makeLogger(logging);
  const { walletClient, publicClient } = config;

  const configStorageContract = getContract({
    address: configStorageAddress,
    abi: configStorageAbi,
    client: {
      wallet: walletClient,
      public: publicClient,
    },
  });
  const nftOverlordAddress = await configStorageContract.read.getAddress([6]);
  const rngProxyAddress = await configStorageContract.read.getAddress([22]);

  console.log(`Config Storage : ${configStorageAddress}`);
  console.log(`RNG Proxy : ${rngProxyAddress}`);
  /// Deploy MockRNGRequester
  _log("Deploying MockRNGRequester");
  const mockRNGRequesterHash = await walletClient.deployContract({
    abi: mockRngRequesterAbi,
    bytecode: MockRNGRequester.bytecode.object,
    args: [rngProxyAddress],
  });
  const mockRNGRequesterTxr = await checkTxSuccess(publicClient, mockRNGRequesterHash, logging);
  const mockRNGRequesterContract = getContract({
    address: mockRNGRequesterTxr.contractAddress!,
    abi: mockRngRequesterAbi,
    client: {
      wallet: walletClient,
      public: publicClient,
    },
  });
  _log(`RNG Requester test deployed to ${mockRNGRequesterTxr.contractAddress}`);

  // set overlord to the rng requester
  const csWriteHash = await configStorageContract.write.setAddress([
    6,
    mockRNGRequesterContract.address,
    true,
  ]);
  await checkTxSuccess(publicClient, csWriteHash, logging);

  // set sponsor status (deploy account must have generated a sponsorWallet account)
  const rrpContract = getContract({
    address: AIRNODE_RPV0_TESTNET,
    abi: IAirnodeRrpV0.abi,
    client: {
      wallet: walletClient,
      public: publicClient,
    },
  });
  _log(`Setting sponsorship status for ${rngProxyAddress} on rrp contract ${AIRNODE_RPV0_TESTNET}`);
  const rrpSetHash = await rrpContract.write.setSponsorshipStatus([rngProxyAddress, true]);
  await checkTxSuccess(publicClient, rrpSetHash, logging);
  // deployerAddress

  _log("runTest()");
  const runStart = new Date().getTime();
  const runTestHash = await mockRNGRequesterContract.write.runTest();
  const res = await checkTxSuccess(publicClient, runTestHash, logging);
  const testRunBlock = res.blockNumber;

  // reset config for nft overlord
  _log(`Setting NFT Overlord back to ${nftOverlordAddress}`);
  const csWrite2Hash = await configStorageContract.write.setAddress([6, nftOverlordAddress, true]);
  await checkTxSuccess(publicClient, csWrite2Hash, logging);

  // wait for event on the mock rng requester contract
  _log("Waiting for ReceivedRandom event");
  let bailout = false;
  setTimeout(() => {
    bailout = true;
  }, 60000);
  while (!bailout) {
    const logs = await publicClient.getLogs({
      address: mockRNGRequesterTxr.contractAddress,
      event: parseAbiItem("event ReceivedRandom(uint256, bytes)"),
      fromBlock: testRunBlock,
      toBlock: "latest",
    });
    if (logs.length) {
      console.log(logs[0].eventName, "event received in tx", logs[0].transactionHash);
      break;
    }
    await sleep(500);
  }

  const runTime = new Date().getTime() - runStart;
  console.log(`Took ${Math.floor(runTime / 1000)}s`);
  if (bailout) {
    console.error("Timed out waiting for event");
    process.exit(1);
  }
  process.exit(0);
}
