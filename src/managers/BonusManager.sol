// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IBonusManager.sol";
import "../interfaces/ILockManager.sol";
import "../interfaces/IMigrationManager.sol";
import "../interfaces/INFTAttributesManager.sol";
import "./BaseBlastManager.sol";
import "../interfaces/ISnuggeryManager.sol";
import "../interfaces/IMunchadexManager.sol";

// All bonuses denominated in 1e18 (1e18 is a 100% bonus so 30e16 is a 30% bonus)
contract BonusManager is IBonusManager, BaseBlastManager {
    ILockManager _lockManager;
    IMigrationManager _migrationManager;
    INFTAttributesManager _nftAttributesManager;
    IAccountManager _accountManager;
    IMunchadexManager _munchadexManager;

    uint256 public referralBonus;
    int16[] public realmBonuses;
    uint8[] public rarityBonuses;
    uint8[] public munchablesPerRealm;
    uint8[] public munchablesPerRarity;
    uint8[] public raritySetBonuses;
    uint8 public totalMunchables;
    uint256 minETHPetBonus;
    uint256 maxETHPetBonus;
    uint256 petBonusDivisor;
    uint256 migrationBonus;
    uint256 migrationBonusEndTime;

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        _migrationManager = IMigrationManager(
            configStorage.getAddress(StorageKey.MigrationManager)
        );
        _lockManager = ILockManager(
            configStorage.getAddress(StorageKey.LockManager)
        );
        _nftAttributesManager = INFTAttributesManager(
            configStorage.getAddress(StorageKey.NFTAttributesManager)
        );
        _accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );
        _munchadexManager = IMunchadexManager(
            configStorage.getAddress(StorageKey.MunchadexManager)
        );
        referralBonus = configStorage.getUint(StorageKey.ReferralBonus);

        realmBonuses = configStorage.getSmallIntArray(StorageKey.RealmBonuses);
        rarityBonuses = configStorage.getSmallUintArray(
            StorageKey.RarityBonuses
        );
        totalMunchables = uint8(
            configStorage.getUint(StorageKey.TotalMunchables)
        );
        munchablesPerRealm = configStorage.getSmallUintArray(
            StorageKey.MunchablesPerRealm
        );
        munchablesPerRarity = configStorage.getSmallUintArray(
            StorageKey.MunchablesPerRarity
        );
        raritySetBonuses = configStorage.getSmallUintArray(
            StorageKey.RaritySetBonuses
        );

        minETHPetBonus = configStorage.getUint(StorageKey.MinETHPetBonus);
        maxETHPetBonus = configStorage.getUint(StorageKey.MaxETHPetBonus);
        petBonusDivisor = configStorage.getUint(StorageKey.PetBonusMultiplier);

        migrationBonus = configStorage.getUint(StorageKey.MigrationBonus);
        migrationBonusEndTime = configStorage.getUint(
            StorageKey.MigrationBonusEndTime
        );

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function getFeedBonus(
        address _caller,
        uint256 _tokenId
    ) external view override returns (int256) {
        // Calculate bonuses for snuggery realm and rarity
        MunchablesCommonLib.NFTImmutableAttributes
            memory immutableAttributes = _nftAttributesManager
                .getImmutableAttributes(_tokenId);
        (, MunchablesCommonLib.Player memory player) = _accountManager
            .getPlayer(_caller);

        if (uint256(immutableAttributes.rarity) >= rarityBonuses.length)
            revert InvalidRarityError(uint256(immutableAttributes.rarity));

        uint8 rarityBonus = uint8(
            rarityBonuses[uint256(immutableAttributes.rarity)]
        );

        uint256 realmIndex = (uint256(immutableAttributes.realm) * 5) +
            uint256(player.snuggeryRealm);
        if (realmIndex >= realmBonuses.length)
            revert InvalidRealmBonus(realmIndex);

        int8 realmBonus = int8(realmBonuses[realmIndex]);

        int16 sumBonuses = int16(realmBonus) + int16(int8(rarityBonus));
        int256 finalBonus = int256(1e16) * int256(sumBonuses);

        finalBonus = finalBonus < -20e16 ? int256(-20e16) : finalBonus;
        finalBonus = finalBonus > 100e16 ? int256(100e16) : finalBonus;

        return finalBonus;
    }

    function getHarvestBonus(
        address _caller
    ) external view override returns (uint256) {
        uint256 weightedValue = _lockManager.getLockedWeightedValue(_caller);
        ILockManager.PlayerSettings memory _settings = _lockManager
            .getPlayerSettings(_caller);
        uint256 _migrationBonus;
        if (block.timestamp < migrationBonusEndTime) {
            _migrationBonus = _calculateMigrationBonus(_caller, weightedValue);
        }
        return
            _calculateLockBonus(_settings.lockDuration) +
            _migrationBonus +
            _calculateLevelBonus(_caller) +
            _calculateMunchadexBonus(_caller);
    }

    function getPetBonus(
        address _petter
    ) external view override returns (uint256) {
        ILockManager.PlayerSettings memory _settings = _lockManager
            .getPlayerSettings(_petter);
        return _calculateLockBonus(_settings.lockDuration);
    }

    function _calculateLockBonus(
        uint32 lockDuration
    ) internal pure returns (uint256 _lockBonusPercent) {
        uint256 _daysStaked = lockDuration / 1 days;
        if (_daysStaked >= 30) {
            uint256 bonus4Pct = (1e16 * 4 * (_daysStaked - 30)) / 15;
            uint256 bonus14Pct = (1e16 * 14 * (_daysStaked - 30)) / 60;
            _lockBonusPercent = bonus4Pct + bonus14Pct;
        }
    }

    // TODO: Do we want to expose these for front-end?
    function _calculateMigrationBonus(
        address _caller,
        uint256 weightedValue
    ) internal view returns (uint256 _migrationBonus) {
        (
            bool didMigrate,
            IMigrationManager.MigrationTotals memory totals
        ) = _migrationManager.getUserMigrationCompletedData(_caller);
        ILockManager.ConfiguredToken memory configuredToken = _lockManager
            .getConfiguredToken(totals.tokenLocked);
        if (didMigrate) {
            // Change to double original amount
            uint256 usdPrice = configuredToken.usdPrice;
            uint256 migrateHighestAmount = (2 *
                totals.totalLockedAmount *
                usdPrice) / 1e18;
            uint256 halfAmount = ((totals.totalLockedAmount * usdPrice) /
                1e18) / 2;
            if (weightedValue >= migrateHighestAmount) {
                // Full bonus
                _migrationBonus = migrationBonus;
            } else if (weightedValue >= halfAmount) {
                // Calculate bonus from delta
                _migrationBonus =
                    (migrationBonus * (weightedValue - halfAmount)) /
                    (migrateHighestAmount - halfAmount);
            }
        }
    }

    function _calculateLevelBonus(
        address _caller
    ) internal view returns (uint256 _levelBonus) {
        (
            ,
            MunchablesCommonLib.Player memory player,
            MunchablesCommonLib.SnuggeryNFT[] memory _snuggery
        ) = _accountManager.getFullPlayerData(_caller);
        uint256 _snuggerySize = _snuggery.length;

        if (_snuggerySize > 0) {
            uint i;
            for (; i < _snuggerySize; i++) {
                _levelBonus += _nftAttributesManager
                    .getAttributes(_snuggery[i].tokenId)
                    .level;
            }
            _levelBonus *= 1e16;
            _levelBonus /= (_snuggerySize * 200);
            _levelBonus += _snuggerySize == player.maxSnuggerySize ? 3e16 : 0;
        }
    }

    function _calculateMunchadexBonus(
        address _caller
    ) internal view returns (uint256 _munchadexBonus) {
        (
            uint256[] memory numMunchablesPerRealm,
            uint256[] memory numMunchablesPerRarity,
            uint256 numUnique
        ) = _munchadexManager.getMunchadexInfo(_caller);

        if (numUnique == 125) {
            _munchadexBonus += 100;
        } else {
            uint8 i;
            bool perRealmUnique = true;
            bool perRealmGreaterThan6 = true;
            for (
                ;
                i < numMunchablesPerRealm.length &&
                    i < munchablesPerRealm.length;
                i++
            ) {
                if (numMunchablesPerRealm[i] < 6) {
                    perRealmGreaterThan6 = false;
                    if (numMunchablesPerRealm[i] == 0) {
                        perRealmUnique = false;
                    }
                } else if (numMunchablesPerRealm[i] == munchablesPerRealm[i]) {
                    _munchadexBonus += 3;
                }
            }
            if (perRealmUnique && perRealmGreaterThan6) {
                _munchadexBonus += 2;
            } else if (perRealmUnique) {
                _munchadexBonus += 1;
            }
            i = 0;
            for (
                ;
                i < numMunchablesPerRarity.length &&
                    i < munchablesPerRarity.length;
                i++
            ) {
                if (numMunchablesPerRarity[i] == munchablesPerRarity[i])
                    _munchadexBonus += raritySetBonuses[i];
            }
        }
        _munchadexBonus *= 1e16;
    }

    function getReferralBonus() external view override returns (uint256) {
        return referralBonus * 1e16;
    }
}
