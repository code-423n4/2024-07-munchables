import { keccak256 } from "viem";
import {
  accountManagerAbi,
  bonusManagerAbi,
  claimManagerAbi,
  configStorageAbi,
  fundTreasuryDistributorAbi,
  lockManagerAbi,
  migrationManagerAbi,
  munchadexManagerAbi,
  munchNftAbi,
  nftAttributesManagerV1Abi,
  nftOverlordAbi,
  oldMunchNftAbi,
  primordialManagerAbi,
  rewardsManagerAbi,
  rngProxySelfHostedAbi,
  snuggeryManagerAbi,
} from "../abi/generated";

const abis = {
  configStorage: configStorageAbi,
  accountManager: accountManagerAbi,
  claimManager: claimManagerAbi,
  lockManager: lockManagerAbi,
  migrationManager: migrationManagerAbi,
  snuggeryManager: snuggeryManagerAbi,
  munchadexManager: munchadexManagerAbi,
  nftOverlord: nftOverlordAbi,
  nftAttributesManagerV1: nftAttributesManagerV1Abi,
  rewardsManager: rewardsManagerAbi,
  munchNFT: munchNftAbi,
  fundTreasuryDistributor: fundTreasuryDistributorAbi,
  rngProxySelfHosted: rngProxySelfHostedAbi,
  bonusManager: bonusManagerAbi,
  primordialManager: primordialManagerAbi,
  oldMunchNFT: oldMunchNftAbi,
};

(async () => {
  for (const contractName in abis) {
    const abi = abis[contractName];
    const errors = abi.filter((a) => a.type === "error");
    console.log(`------------------------------------------------------
  ${contractName}
------------------------------------------------------`);
    errors.forEach((e) => {
      const inputs = e.inputs.map((i) => i.type);
      const sigStr = `${e.name}(${inputs.join(",")})`;
      const errorSig = keccak256(sigStr).slice(0, 10); // 4 bytes + 0x
      console.log(sigStr, errorSig);
    });
  }
})();
