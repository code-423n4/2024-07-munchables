// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import "../interfaces/IRewardsManager.sol";
import "../interfaces/IConfigStorage.sol";
import "../managers/RewardsManager.sol";
import "../config/BaseConfigStorage.sol";
import "../mock/MockRewardsManager.sol";

/*
Run like this

forge script scripts/ClaimGas.sol \
 --fork-url https://fragrant-neat-uranium.blast-sepolia.quiknode.pro/efd99cedc248f3d4bd6f055cf1398311eec0a404/ \
 --sig "run(address)" "0x84D67c2AA8FD87f41402C829a970b81d5433aEcD"
*/

contract ClaimGas is Script {
    function run(address configStorageDeploy) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        IConfigStorage configStorage = IConfigStorage(configStorageDeploy);
        console.log("Loaded configStorage from ", address(configStorage));

        address treasuryAccount = configStorage.getAddress(StorageKey.Treasury);
        uint256 treasuryPrevBalance = treasuryAccount.balance;
        console.log("Treasury :", treasuryAccount);

        address payable rewardsManagerAddress = payable(
            configStorage.getAddress(StorageKey.RewardsManager)
        );
        address lockManagerAddress = configStorage.getAddress(
            StorageKey.LockManager
        );
        MockRewardsManager rewardsManager = MockRewardsManager(
            rewardsManagerAddress
        );

        rewardsManager.claimAllGasForContract(lockManagerAddress);

        uint256 treasuryPostBalance = treasuryAccount.balance;

        console.log(
            "Treasury balance difference",
            treasuryPostBalance - treasuryPrevBalance
        );
    }
}
