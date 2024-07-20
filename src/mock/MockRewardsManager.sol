// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../interfaces/IRNGProxy.sol";
import "../managers/RewardsManager.sol";

contract MockRewardsManager is RewardsManager {
    constructor(address _configStorage) RewardsManager(_configStorage) {}

    function claimAllGasForContract(address _contract) external {
        uint256 _gas = blastContract.claimAllGas(_contract, address(this));

        IDistributor.TokenBag[] memory tokenBags = new IDistributor.TokenBag[](
            1
        );
        tokenBags[0] = IDistributor.TokenBag(_gas, address(0));

        gasFeeDistributor.receiveTokens{value: _gas}(tokenBags);
    }
}
