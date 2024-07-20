// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/AccountManager.sol";
import "../interfaces/ILandManager.sol";

contract MockAccountManager is AccountManager {
    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function giveSchnibbles(
        address _playerAddress,
        uint256 _schnibbles
    ) external {
        players[_playerAddress].unfedSchnibbles += _schnibbles;
    }

    function updatePlotMetadata(
        address landManager,
        address _landlord
    ) external {
        ILandManager(landManager).updatePlotMetadata(_landlord);
    }
}
