// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/LockManager.sol";

contract MockLockManager is LockManager {
    constructor(address _configStorage) LockManager(_configStorage) {}

    function setLockedTokenForTest(
        address _player,
        address _tokenContract,
        LockedToken calldata _lockData
    ) external {
        lockedTokens[_player][_tokenContract] = _lockData;
    }

    function callAddRevealForTest(address _player, uint8 _quantity) external {
        nftOverlord.addReveal(_player, _quantity);
    }
}
