import { encodeAbiParameters, encodeFunctionData } from "viem";
import { StoredData } from "../stages/3-store";
import { ContractNames, Contracts, IndividualConfigType, Role } from "../utils/config-consts";
import { makeLogger } from "../utils/funcs";
import { getDeployedContract } from "./deploy-contracts";

const proxyArgsGeneral = (argsInput: readonly [`0x${string}`, `0x${string}`, `0x${string}`]) =>
  encodeAbiParameters(
    [
      { name: "implementation", type: "address" },
      { name: "admin", type: "address" },
      { name: "data", type: "bytes" },
    ],
    argsInput
  );

export async function deployOldNFT({
  config,
  contracts,
  logging = true,
  storedData = null,
}: {
  config: IndividualConfigType;
  contracts: Contracts;
  logging?: boolean;
  storedData?: StoredData;
}) {
  const _log = makeLogger(logging);

  const { oldMunchNFT, oldMunchNFTProxy } = contracts;

  /// Deploy Config Storage
  _log("Deploying Old Munch NFT");
  const [oldMunchNFTContract, oldMunchNFTHash, oldMunchNFTBlockNumber] = await getDeployedContract({
    config,
    abi: oldMunchNFT.abi,
    bytecode: oldMunchNFT.bytecode,
    deployedAddress: storedData?.contracts.oldMunchNFT?.address,
    deployedHash: storedData?.contracts.oldMunchNFT?.hash,
    deployedBlockNumber: storedData?.contracts.oldMunchNFT?.startBlock,
  });

  _log("Old Munch NFT Root Address:", oldMunchNFTContract?.address);
  const oldMunchNFTArgs: readonly [
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
  ] = [
    config.universalRoles[Role.Admin],
    config.universalRoles[Role.Admin],
    config.universalRoles[Role.Admin],
    config.universalRoles[Role.Admin],
    config.universalRoles[Role.Admin],
  ];
  const oldMunchNFTInitialize = encodeFunctionData({
    abi: oldMunchNFT.abi,
    functionName: "initialize",
    args: oldMunchNFTArgs,
  });
  _log("Deploy & Initialize old MunchNFT Proxy");
  const oldMunchNFTProxyArgs: [`0x${string}`, `0x${string}`, `0x${string}`] = [
    oldMunchNFTContract?.address,
    config.universalRoles[Role.Admin],
    oldMunchNFTInitialize,
  ];

  const [oldMunchNFTProxyContract, oldMunchNFTProxyHash, oldMunchNFTProxyBlockNumber] =
    await getDeployedContract({
      config,
      abi: oldMunchNFTProxy.abi,
      readAbi: oldMunchNFT.abi,
      bytecode: oldMunchNFTProxy.bytecode,
      deployedAddress: storedData?.contracts.oldMunchNFTProxy?.address,
      deployedHash: storedData?.contracts.oldMunchNFTProxy?.hash,
      deployedBlockNumber: storedData?.contracts.oldMunchNFTProxy?.startBlock,
      args: oldMunchNFTProxyArgs,
    });

  _log("Old Munch NFT Address:", oldMunchNFTProxyContract?.address);

  _log("Completed Old NFT Deployment");
  return {
    [ContractNames.OldMunchNFT]: {
      contract: oldMunchNFTContract,
      hash: oldMunchNFTHash,
      constructorByteCode: null,
      startBlock: oldMunchNFTBlockNumber,
    },
    [ContractNames.OldMunchNFTProxy]: {
      contract: oldMunchNFTProxyContract,
      hash: oldMunchNFTProxyHash,
      constructorByteCode: proxyArgsGeneral(oldMunchNFTProxyArgs),
      startBlock: oldMunchNFTProxyBlockNumber,
    },
  };
}
