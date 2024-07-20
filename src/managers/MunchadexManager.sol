// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "./BaseBlastManager.sol";
import "../interfaces/IMunchNFT.sol";
import "../interfaces/IMunchadexManager.sol";
import "../interfaces/INFTAttributesManager.sol";
import "../interfaces/IAccountManager.sol";

contract MunchadexManager is BaseBlastManager, IMunchadexManager {
    mapping(address => MunchablesCommonLib.Munchadex) munchadex;

    INFTAttributesManager nftAttributesManager;
    address snuggeryManagerAddress;
    IAccountManager accountManager;

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        nftAttributesManager = INFTAttributesManager(
            configStorage.getAddress(StorageKey.NFTAttributesManager)
        );
        snuggeryManagerAddress = configStorage.getAddress(
            StorageKey.SnuggeryManager
        );
        accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function updateMunchadex(
        address _from,
        address _to,
        uint256 _tokenId
    ) external override onlyConfiguredContract(StorageKey.MunchNFT) {
        if (_from == snuggeryManagerAddress || _to == snuggeryManagerAddress)
            return;

        MunchablesCommonLib.NFTImmutableAttributes
            memory immutableAttributes = nftAttributesManager
                .getImmutableAttributes(_tokenId);
        if (_from != address(0)) {
            MunchablesCommonLib.Munchadex storage fromMunchadex = munchadex[
                _from
            ];
            if (
                --fromMunchadex.unique[
                    keccak256(abi.encodePacked(immutableAttributes.species))
                ] == 0
            ) {
                fromMunchadex.numInRealm[immutableAttributes.realm]--;
                fromMunchadex.numInRarity[immutableAttributes.rarity]--;
                fromMunchadex.numUnique--;
                accountManager.forceHarvest(_from);
            }

            emit MunchadexUpdated(
                _from,
                _tokenId,
                immutableAttributes.realm,
                immutableAttributes.rarity,
                fromMunchadex.numInRealm[immutableAttributes.realm],
                fromMunchadex.numInRarity[immutableAttributes.rarity],
                fromMunchadex.numUnique
            );
        }
        if (_to != address(0)) {
            MunchablesCommonLib.Munchadex storage toMunchadex = munchadex[_to];
            if (
                toMunchadex.unique[
                    keccak256(abi.encodePacked(immutableAttributes.species))
                ]++ == 0
            ) {
                toMunchadex.numInRealm[immutableAttributes.realm]++;
                toMunchadex.numInRarity[immutableAttributes.rarity]++;
                toMunchadex.numUnique++;
                accountManager.forceHarvest(_to);
            }

            emit MunchadexUpdated(
                _to,
                _tokenId,
                immutableAttributes.realm,
                immutableAttributes.rarity,
                toMunchadex.numInRealm[immutableAttributes.realm],
                toMunchadex.numInRarity[immutableAttributes.rarity],
                toMunchadex.numUnique
            );
        }
    }

    function getMunchadexInfo(
        address _player
    )
        external
        view
        override
        returns (
            uint256[] memory numMunchablesPerRealm,
            uint256[] memory numMunchablesPerRarity,
            uint256 numUnique
        )
    {
        MunchablesCommonLib.Munchadex storage playerMunchadex = munchadex[
            _player
        ];
        numMunchablesPerRealm = new uint256[](
            uint256(MunchablesCommonLib.Realm.Invalid)
        );
        numMunchablesPerRarity = new uint256[](
            uint256(MunchablesCommonLib.Rarity.Invalid)
        );

        for (uint256 i; i < uint256(MunchablesCommonLib.Realm.Invalid); i++) {
            numMunchablesPerRealm[i] = playerMunchadex.numInRealm[
                MunchablesCommonLib.Realm(i)
            ];
        }

        for (uint256 i; i < uint256(MunchablesCommonLib.Rarity.Invalid); i++) {
            numMunchablesPerRarity[i] = playerMunchadex.numInRarity[
                MunchablesCommonLib.Rarity(i)
            ];
        }

        numUnique = playerMunchadex.numUnique;
    }
}
