// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import "../interfaces/IRewardsManager.sol";
import "../interfaces/IConfigStorage.sol";
import "../managers/RewardsManager.sol";
import "../config/BaseConfigStorage.sol";
import "../mock/MockRewardsManager.sol";
import "../distributors/FundTreasuryDistributor.sol";

/*
Run like this

forge script scripts/SwapRewardsManager.sol \
 --fork-url https://fragrant-neat-uranium.blast-sepolia.quiknode.pro/efd99cedc248f3d4bd6f055cf1398311eec0a404/ \
 --sig "run(address)" "0x84D67c2AA8FD87f41402C829a970b81d5433aEcD"
*/

interface IOwnable {
    function owner() external view returns (address);
}

error BadTestError();

contract SwapRewardsManager is Script {
    IConfigStorage configStorage;

    function run(address configStorageDeploy) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        //        address configStorageDeploy = 0x84D67c2AA8FD87f41402C829a970b81d5433aEcD;
        address ownerAccount;
        configStorage = IConfigStorage(configStorageDeploy);
        console.log("Loaded configStorage from ", address(configStorage));
        ownerAccount = IOwnable(configStorageDeploy).owner();
        console.log("Owner is ", ownerAccount);

        address originalRewardsManagerAddress = configStorage.getAddress(
            StorageKey.RewardsManager
        );
        address originalLockManagerAddress = configStorage.getAddress(
            StorageKey.LockManager
        );
        console.log(
            "Original rewards manager address :",
            originalRewardsManagerAddress
        );
        console.log("Lock manager address :", originalLockManagerAddress);

        bool governorSetCorrectly = IHoldsGovernorship(
            originalRewardsManagerAddress
        ).isGovernorOfContract(originalLockManagerAddress);
        if (!governorSetCorrectly) {
            console.log("Governor is not correctly set from deploy");
        }

        // deploy new rewards manager
        MockRewardsManager rewardsManager = new MockRewardsManager(
            address(configStorage)
        );
        console.log("Deployed RewardsManager :", address(rewardsManager));

        // set configStorage
        configStorage.removeNotifiableAddress(originalRewardsManagerAddress);
        configStorage.addNotifiableAddress(address(rewardsManager));
        configStorage.setAddress(
            StorageKey.RewardsManager,
            address(rewardsManager),
            true
        );
        console.log("Set RewardsManager config :", address(rewardsManager));

        FundTreasuryDistributor fundDistributor = new FundTreasuryDistributor(
            address(configStorage)
        );
        console.log(
            "Deployed FundTreasuryDistributor :",
            address(fundDistributor)
        );

        // set configStorage
        configStorage.addNotifiableAddress(address(fundDistributor));
        configStorage.setAddress(
            StorageKey.YieldDistributor,
            address(fundDistributor),
            false
        );
        configStorage.setAddress(
            StorageKey.GasFeeDistributor,
            address(fundDistributor),
            true
        );
        console.log(
            "Set FundTreasuryDistributor config :",
            address(fundDistributor)
        );

        // check if new contract is governor
        bool newIsGovernor = IHoldsGovernorship(rewardsManager)
            .isGovernorOfContract(originalLockManagerAddress);
        bool oldIsGovernor = IHoldsGovernorship(originalRewardsManagerAddress)
            .isGovernorOfContract(originalLockManagerAddress);
        if (newIsGovernor) {
            console.log("SUCCESS - Governor is now", address(rewardsManager));
        } else {
            console.log("FAIL - New rewards manager not governor");
            if (oldIsGovernor) {
                console.log("Old rewards manager is still governor");
            } else {
                console.log("Do not know who the governor is");
            }
            revert BadTestError();
        }

        configStorage.setRole(
            Role.ClaimYield,
            address(rewardsManager),
            ownerAccount
        );
    }
}
