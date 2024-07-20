// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/SnuggeryManager.sol";

contract MockSnuggeryManager is SnuggeryManager {
    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    error InvalidPeriodError(uint32 _now, uint32 _startTime, uint32 _endTime);

    function setSnuggeryForTest(
        address _account,
        MunchablesCommonLib.SnuggeryNFT[] calldata _snuggery
    ) external {
        MunchablesCommonLib.SnuggeryNFT[] storage snuggery = snuggeries[
            _account
        ];
        for (uint8 i; i < _snuggery.length; i++) {
            snuggery.push(_snuggery[i]);
        }
        _recalculateChonks(_account);
    }

    function setGlobalTotalChonk(uint256 _totalChonk) external {
        totalGlobalChonk = _totalChonk;
    }

    function spendPoints(address _account, uint256 _points) external {
        claimManager.spendPoints(_account, _points);
    }

    function forceClaimPoints(address _account) external {
        claimManager.forceClaimPoints(_account);
    }

    function callMunchableFedForTest(
        uint256 _tokenId,
        address _owner
    ) external {
        nftOverlord.munchableFed(_tokenId, _owner);
    }
}
