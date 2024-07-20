// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {console} from "forge-std/console.sol";
import {Test} from "forge-std/Test.sol";
//import {Script} from "forge-std/Script.sol";
import "../interfaces/IRewardsManager.sol";
import "../interfaces/IConfigStorage.sol";
import "../managers/RewardsManager.sol";
import "../config/BaseConfigStorage.sol";
import "../mock/MockRewardsManager.sol";

/*
Run like this

forge script scripts/ClaimYield.sol \
 --fork-url https://fragrant-neat-uranium.blast-sepolia.quiknode.pro/efd99cedc248f3d4bd6f055cf1398311eec0a404/ \
 --sig "run(address)" "<configStorage address>"
*/
contract YieldMock {
    address private constant blastContract =
        0x4300000000000000000000000000000000000002;

    mapping(address => uint8) public getConfiguration;

    function configure(
        address contractAddress,
        uint8 flags
    ) external returns (uint256) {
        require(msg.sender == blastContract);

        getConfiguration[contractAddress] = flags;
        return 0;
    }

    function claim(address, address, uint256) external pure returns (uint256) {
        return 0;
    }

    function getClaimableAmount(address) external pure returns (uint256) {
        return 1000000;
    }
}

contract ClaimYield is Test {
    function setUp() public {
        vm.createSelectFork(
            "https://fragrant-neat-uranium.blast-sepolia.quiknode.pro/efd99cedc248f3d4bd6f055cf1398311eec0a404/"
        );
        // Deploy mock of the precompile
        YieldMock yieldMock = new YieldMock();
        // Set mock bytecode to the expected precompile address
        vm.etch(
            0x0000000000000000000000000000000000000100,
            address(yieldMock).code
        );
    }

    function test_claimYield_localOnly() external {
        address configStorageDeploy = 0xa5598A8C52F1a605E236E905957507953C14C3e0;
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        IConfigStorage configStorage = IConfigStorage(configStorageDeploy);
        console.log("Loaded configStorage from ", address(configStorage));

        address payable rewardsManagerAddress = payable(
            configStorage.getAddress(StorageKey.RewardsManager)
        );
        address lockManagerAddress = configStorage.getAddress(
            StorageKey.LockManager
        );
        MockRewardsManager rewardsManager = MockRewardsManager(
            rewardsManagerAddress
        );

        address[] memory contracts = new address[](1);
        contracts[0] = lockManagerAddress;
        uint256 usdbBalance = IERC20(0x4200000000000000000000000000000000000022)
            .balanceOf(address(rewardsManager));
        console.log("USD Balance before", usdbBalance);
        rewardsManager.claimYieldForContracts(contracts);
        uint256 usdbBalanceAfter = IERC20(
            0x4200000000000000000000000000000000000022
        ).balanceOf(address(rewardsManager));
        console.log("USD Balance after", usdbBalanceAfter);

        //        rewardsManager.claimYield();
    }
}
