// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/MigrationManager.sol";

contract MockMigrationManager is MigrationManager {
    constructor(address _configStorage) MigrationManager(_configStorage) {}

    function setUserMigrationCompletedDataForTest(
        address _user,
        MigrationTotals memory _userMigrationCompletedData,
        bool _didMigrate
    ) external {
        _userClaimedOnce[_user] = _didMigrate;
        _userLockedAmounts[_user] = _userMigrationCompletedData;
    }

    function callMintForMigrationForTest(
        address _player,
        MunchablesCommonLib.NFTAttributes memory _attributes,
        MunchablesCommonLib.NFTImmutableAttributes memory _immutableAttributes,
        MunchablesCommonLib.NFTGameAttribute[] memory _gameAttributes
    ) external {
        _nftOverlord.mintForMigration(
            _player,
            _attributes,
            _immutableAttributes,
            _gameAttributes
        );
    }
}
