import dotenv from "dotenv";
import { zeroAddress } from "viem";
import { configStorageAbi } from "../../abi/generated";
import { getConfig } from "../utils/config";
import { IndividualConfigType, Role } from "../utils/config-consts";
import { getDeployment, getProxyAuth } from "../utils/deployment";

dotenv.config();

const env = process.env.ENV as string;

const roleLookup = [
  "Admin",
  "Social_1",
  "Social_2",
  "Social_3",
  "Social_4",
  "Social_5",
  "SocialApproval_1",
  "SocialApproval_2",
  "SocialApproval_3",
  "SocialApproval_4",
  "SocialApproval_5",
  "PriceFeed_1",
  "PriceFeed_2",
  "PriceFeed_3",
  "PriceFeed_4",
  "PriceFeed_5",
  "Snapshot",
  "NewPeriod",
  "ClaimYield",
  "Minter",
  "NFTOracle",
];

const getGlobalRole = async (
  role: Role,
  configStorageAddress: `0x${string}`,
  currentConfig: IndividualConfigType
): Promise<`0x${string}`> => {
  return await currentConfig.publicClient.readContract({
    abi: configStorageAbi,
    address: configStorageAddress,
    functionName: "getUniversalRole",
    args: [role],
  });
};

const getContractRole = async (
  contract: `0x${string}`,
  role: Role,
  configStorageAddress: `0x${string}`,
  currentConfig: IndividualConfigType
) => {
  return await currentConfig.publicClient.readContract({
    abi: configStorageAbi,
    address: configStorageAddress,
    functionName: "getContractRole",
    args: [role, contract],
  });
};

(async () => {
  const deployment = await getDeployment(env);
  const configStorageAddress = deployment.contracts.configStorage.address;
  const currentConfig: IndividualConfigType = getConfig(env);

  console.log(`Using env : ${env}`);
  console.log(`Reading Roles from ${configStorageAddress}`);

  console.log(`-----------------------------------------
  Contract Admin
-----------------------------------------`);
  // get global Admin Role
  const globalAdmin = await getGlobalRole(Role.Admin, configStorageAddress, currentConfig);
  // check all global roles to make sure they are 0
  for (let i = Role.Admin + 1; i <= Role.NFTOracle; i++) {
    const checkRole = await getGlobalRole(i as Role, configStorageAddress, currentConfig);
    if (checkRole !== zeroAddress) {
      throw new Error(`Additional global role found! ${roleLookup[i]}, ${checkRole}`);
    }
  }
  console.log("Global admin:", globalAdmin);

  // get all roles for all contracts
  console.log(`-----------------------------------------
  Contract Roles
-----------------------------------------`);
  for (const contractName in deployment.contracts) {
    for (let i = Role.Admin; i <= Role.NFTOracle; i++) {
      if (deployment.contracts[contractName]) {
        const roleAddress = await getContractRole(
          deployment.contracts[contractName].address,
          i as Role,
          configStorageAddress,
          currentConfig
        );
        if (roleAddress !== zeroAddress) {
          console.log(`${contractName}: ${roleLookup[i]} => ${roleAddress}`);
        }
      }
    }
  }

  console.log(`-----------------------------------------
  Proxy Owners
-----------------------------------------`);
  // Read proxy owners
  for (const contractName in deployment.contracts) {
    if (contractName.slice(-5) === "Proxy" && deployment.contracts[contractName]) {
      const proxyAuth = await getProxyAuth(
        deployment.contracts[contractName].address,
        currentConfig.publicClient
      );
      console.log(`${contractName} Owner: ${proxyAuth.proxyOwner}`);
    }
  }

  console.log(`-----------------------------------------
  Config Owner
-----------------------------------------`);
  const configOwner = await currentConfig.publicClient.readContract({
    abi: configStorageAbi,
    address: configStorageAddress,
    functionName: "owner",
  });
  console.log(`ConfigStorage owner: ${configOwner}`);
})();
