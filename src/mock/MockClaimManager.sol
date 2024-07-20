// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/ClaimManager.sol";

contract MockClaimManager is ClaimManager {
    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function givePoints(address _player, uint256 _pointsQty) external {
        _points[_player] += _pointsQty;
    }
}
