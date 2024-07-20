import fs from "fs";
import path from "path";
import { getAddress } from "viem";
import { DeployedContractsType, deployContracts } from "../actions/deploy-contracts";
import { CACHE_DIR, CONTRACTS, ENV, IndividualConfigType } from "./config-consts";

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

export interface StoredData {
  timestamp: string;
  roles: IndividualConfigType["contractRoles"];
  selfHostProxy: boolean;
  contracts: {
    [contract: string]: {
      address: string;
      hash: string;
      constructorByteCode: string | null;
      startBlock: number;
    } | null;
  };
}

export function toStoredData(
  config: IndividualConfigType,
  deployedContracts: DeployedContractsType
): StoredData {
  const timestamp = new Date().toISOString();
  const data: StoredData = {
    timestamp: timestamp,
    roles: config.contractRoles,
    selfHostProxy: config.selfHostProxy,
    env: config.env,
    contracts: {},
  };
  for (const [key, value] of Object.entries(deployedContracts)) {
    const exclude = ["timestamp", "roles", "env", "contracts"];
    if (value && !exclude.includes(key)) {
      data.contracts[key] = {
        address: getAddress(value.contract?.address),
        hash: value.hash,
        constructorByteCode: value.constructorByteCode,
        startBlock: Number(value.startBlock),
        contractName: value.contractName,
      };
    } else {
      data.contracts[key] = null;
    }
  }

  return data;
}

export async function toDeployedContracts(
  config: IndividualConfigType,
  storedData: StoredData
): Promise<DeployedContractsType> {
  return await deployContracts({
    config,
    contracts: CONTRACTS,
    storedData,
    logging: false,
  });
}

export async function load<T>(env: ENV, filename: string): Promise<T | null> {
  try {
    const dir = path.join(CACHE_DIR, env);
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filepath, "utf8");
    const data: T = JSON.parse(fileContent);

    return data;
  } catch (error) {
    return null;
  }
}

export function remove(env: ENV, filename: string): null {
  try {
    const dir = path.join(CACHE_DIR, env);
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    fs.rmSync(filepath);
  } catch (error) {
    console.error("Error removing file", error);
  }
  return null;
}

export async function saveStoredData<T>(env: string, filename: string, storedData: T) {
  const dir = path.join(CACHE_DIR, env);
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, JSON.stringify(storedData, null, 2), "utf8");
}

export async function saveDeployedContracts(
  config: IndividualConfigType,
  filename: string,
  deployedContracts: DeployedContractsType
) {
  const dir = path.join(CACHE_DIR, config.env);
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    filepath,
    JSON.stringify(toStoredData(config, deployedContracts), null, 2),
    "utf8"
  );
}

export function getScratchFilename() {
  return `deployment-scratch.json`;
}
