// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/MigrationManager.sol";

contract MockMigrationManager2 is MigrationManager {
    constructor(address _configStorage) MigrationManager(_configStorage) {}

    function burnNFTsForPoints(
        address _player,
        uint8[] memory _rarities
    ) external {
        IClaimManager(configStorage.getAddress(StorageKey.ClaimManager))
            .burnNFTsForPoints(_player, _rarities);
    }

    function burnUnrevealedForPoints(
        address _player,
        uint256 numUnrevealed
    ) external {
        IClaimManager(configStorage.getAddress(StorageKey.ClaimManager))
            .burnUnrevealedForPoints(_player, numUnrevealed);
    }
}
