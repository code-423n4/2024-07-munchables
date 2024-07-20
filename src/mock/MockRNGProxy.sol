// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../rng/RNGProxySelfHosted.sol";
import "../interfaces/INFTOverlord.sol";
import "../libraries/MunchablesCommonLib.sol";

contract MockRNGProxy is RNGProxySelfHosted {
    INFTOverlord nftOverlord;

    constructor(address _configStorage) RNGProxySelfHosted(_configStorage) {
        _reconfigure();
    }

    function _reconfigure() internal {
        nftOverlord = INFTOverlord(
            configStorage.getAddress(StorageKey.NFTOverlord)
        );
    }

    function configUpdated() external override {
        _reconfigure();
    }

    function provideRandomForTest(uint256 _index, bytes calldata _rand) public {
        super._callback(_index, _rand);
    }

    function callLevelUpForTest(
        uint256 _requestId,
        bytes calldata _rng
    ) public {
        nftOverlord.levelUp(_requestId, _rng);
    }

    function callRevealForTest(
        uint256 _player,
        bytes memory _signature
    ) public {
        nftOverlord.reveal(_player, _signature);
    }

    function callRevealFromPrimordialForTest(
        uint256 _player,
        bytes memory _signature
    ) public {
        nftOverlord.revealFromPrimordial(_player, _signature);
    }
}
