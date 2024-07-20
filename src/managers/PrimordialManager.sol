// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "./BaseBlastManager.sol";
import "../interfaces/IPrimordialManager.sol";
import "../interfaces/IRNGProxy.sol";
import "../interfaces/ISnuggeryManager.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/INFTOverlord.sol";

contract PrimordialManager is BaseBlastManager, IPrimordialManager {
    IAccountManager accountManager;
    INFTOverlord nftOverlord;

    mapping(address => MunchablesCommonLib.PrimordialData) primordials;
    mapping(address => bool) approved;
    bool primordialsEnabled;
    mapping(int8 => uint256) primordialLevels;

    modifier onlyPrimordialsEnabled() {
        if (!primordialsEnabled) revert PrimordialsNotEnabledError();
        _;
    }

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );

        nftOverlord = INFTOverlord(
            configStorage.getAddress(StorageKey.NFTOverlord)
        );

        primordialsEnabled = configStorage.getBool(
            StorageKey.PrimordialsEnabled
        );

        uint256[] memory primordialLevelsTmp = configStorage.getUintArray(
            StorageKey.PrimordialLevelThresholds
        );
        if (primordialLevelsTmp.length == 3) {
            for (uint8 i; i < 3; i++) {
                // primordial levels range from -3 to 0, we have levelup thresholds for -2, -1 and 0
                primordialLevels[int8(i) - 2] = primordialLevelsTmp[i];
            }
        }

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    /// @inheritdoc IPrimordialManager
    function claimPrimordial() external notPaused onlyPrimordialsEnabled {
        (address _caller, ) = _getMainAccountRequireRegistered(msg.sender);
        if (!approved[_caller]) revert PrimordialNotApprovedError();

        if (primordials[_caller].createdDate > 0)
            revert PrimordialAlreadyClaimedError();

        primordials[_caller].createdDate = uint32(block.timestamp);
        primordials[_caller].level = -3;

        emit PrimordialClaimed(_caller);
    }

    /// @inheritdoc IPrimordialManager
    function feedPrimordial(
        uint256 _schnibbles
    ) external notPaused onlyPrimordialsEnabled {
        (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        ) = _getMainAccountRequireRegistered(msg.sender);
        if (!approved[_mainAccount]) revert PrimordialNotApprovedError();

        if (_player.unfedSchnibbles < _schnibbles)
            revert InsufficientSchnibblesError(_player.unfedSchnibbles);

        if (primordials[_mainAccount].createdDate == 0)
            revert PrimordialDoesntExistError();

        if (primordials[_mainAccount].hatched)
            revert PrimordialAlreadyHatchedError();

        primordials[_mainAccount].chonks += _schnibbles;

        // Level up algo for primordials
        int8 currentLevel = primordials[_mainAccount].level;
        if (currentLevel < 0) {
            int8 nextLevel = currentLevel;
            while (
                primordialLevels[nextLevel + 1] <=
                primordials[_mainAccount].chonks &&
                primordialLevels[nextLevel + 1] > 0 &&
                nextLevel < 1
            ) {
                nextLevel++;
            }

            if (primordials[_mainAccount].chonks > primordialLevels[0]) {
                // Prevent overfeeding
                _schnibbles -= (primordials[_mainAccount].chonks -
                    primordialLevels[0]);
                primordials[_mainAccount].chonks = primordialLevels[0];
            }

            if (nextLevel != currentLevel) {
                // primordial levelup
                primordials[_mainAccount].level = nextLevel;

                emit PrimordialLevelledUp(
                    _mainAccount,
                    currentLevel,
                    nextLevel
                );
            }
        }

        _player.unfedSchnibbles -= _schnibbles;
        accountManager.updatePlayer(_mainAccount, _player);

        emit PrimordialFed(_mainAccount, _schnibbles);
    }

    /// @inheritdoc IPrimordialManager
    function hatchPrimordialToMunchable() external notPaused {
        (address _caller, ) = _getMainAccountRequireRegistered(msg.sender);
        if (!approved[_caller]) revert PrimordialNotApprovedError();

        if (primordials[_caller].hatched)
            revert PrimordialAlreadyHatchedError();
        if (primordials[_caller].createdDate == 0)
            revert PrimordialDoesntExistError();
        if (primordials[_caller].level < 0) revert PrimordialNotReadyError();
        if (primordials[_caller].hatched)
            revert PrimordialAlreadyHatchedError();

        primordials[_caller].hatched = true;

        nftOverlord.mintFromPrimordial(_caller);

        emit PrimordialHatched(_caller);
    }

    function approvePrimordial(
        address _player,
        bool _approve
    ) external onlyRole(Role.NFTOracle) {
        approved[_player] = _approve;

        if (_approve) emit PrimordialApproved(_player);
        else emit PrimordialDisapproved(_player);
    }

    function getPrimordial(
        address _caller
    )
        external
        view
        returns (MunchablesCommonLib.PrimordialData memory _primordial)
    {
        (address _player, ) = _getMainAccountRequireRegistered(_caller);

        _primordial = primordials[_player];
    }

    function _getMainAccountRequireRegistered(
        address _account
    )
        internal
        view
        returns (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        )
    {
        (_mainAccount, _player) = accountManager.getPlayer(_account);

        if (_player.registrationDate == 0) revert PlayerNotRegisteredError();
    }
}
