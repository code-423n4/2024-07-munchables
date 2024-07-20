import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { getAddress, PublicClient } from "viem";
import { ownableAbi } from "../../abi/generated";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const getCurrentDeploymentFilename = async (env: string) => {
  const currentFilename = __dirname + "/../cache/current.json";
  const currentJsonStr = fs.readFileSync(currentFilename, { encoding: "utf-8" });
  const currentJson = JSON.parse(currentJsonStr);
  return __dirname + "/../cache/" + env + "/" + currentJson[env];
};

export const getDeployment = async (env: string) => {
  const deployFilename = await getCurrentDeploymentFilename(env);
  const deployJsonStr = fs.readFileSync(deployFilename, { encoding: "utf-8" });
  return JSON.parse(deployJsonStr);
};

export const parseAddress = (addressString: string): string | undefined => {
  const buf = Buffer.from(addressString.replace(/^0x/, ""), "hex");
  if (!buf.slice(0, 12).equals(Buffer.alloc(12, 0))) {
    return undefined;
  }
  const address = "0x" + buf.toString("hex", 12, 32); // grab the last 20 bytes
  return getAddress(address);
};

export const getProxyAuth = async (
  proxyAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<{ proxyAdmin: `0x${string}`; proxyOwner: `0x${string}` }> => {
  const adminStorageSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  const adminAddressBytes = await publicClient.getStorageAt({
    address: proxyAddress,
    slot: adminStorageSlot,
  });
  const proxyAdmin = parseAddress(adminAddressBytes as string) as `0x${string}`;
  const proxyOwner = await publicClient.readContract({
    abi: ownableAbi,
    address: proxyAdmin,
    functionName: "owner",
  });
  return { proxyAdmin, proxyOwner };
};

export const getProxyImplementation = async (
  proxyAddress: `0x${string}`,
  publicClient: PublicClient
): Promise<`0x${string}`> => {
  const implementationStorageSlot =
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const implementationAddressBytes = await publicClient.getStorageAt({
    address: proxyAddress,
    slot: implementationStorageSlot,
  });
  return parseAddress(implementationAddressBytes as string) as `0x${string}`;
};
