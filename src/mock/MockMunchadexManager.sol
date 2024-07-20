// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/MunchadexManager.sol";

contract MockMunchadexManager is MunchadexManager {
    constructor(address _configStorage) MunchadexManager(_configStorage) {}

    function setMunchadexForTest(
        address _account,
        uint256 _numUnique
    ) external {
        MunchablesCommonLib.Munchadex storage _munchadex = munchadex[_account];
        _munchadex.numUnique = _numUnique;
    }

    function setMunchadexNumInRealmForTest(
        address _account,
        MunchablesCommonLib.Realm _realm,
        uint256 _numInRealm
    ) external {
        MunchablesCommonLib.Munchadex storage _munchadex = munchadex[_account];
        _munchadex.numInRealm[_realm] = _numInRealm;
    }

    function setMunchadexNumInRarityForTest(
        address _account,
        MunchablesCommonLib.Rarity _rarity,
        uint256 _numInRarity
    ) external {
        MunchablesCommonLib.Munchadex storage _munchadex = munchadex[_account];
        _munchadex.numInRarity[_rarity] = _numInRarity;
    }

    function setMunchadexUniqueForTest(
        address _account,
        bytes32 _key,
        uint256 _unique
    ) external {
        MunchablesCommonLib.Munchadex storage _munchadex = munchadex[_account];
        _munchadex.unique[_key] = _unique;
    }
}
