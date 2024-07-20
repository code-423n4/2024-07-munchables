// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../interfaces/IClaimManager.sol";
import "../interfaces/IMunchToken.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IConfigStorage.sol";
import "../interfaces/IBonusManager.sol";
import "./BaseBlastManagerUpgradeable.sol";
import "../interfaces/ISnuggeryManager.sol";

contract ClaimManager is IClaimManager, BaseBlastManagerUpgradeable {
    uint256[] POINTS_PER_MIGRATED_NFT;
    uint256 POINTS_PER_UNREVEALED_NFT;

    Period public currentPeriod;
    uint256 public pointsPerPeriod;
    IAccountManager accountManager;
    ISnuggeryManager snuggeryManager;
    IBonusManager bonusManager;
    IMunchToken munchToken;

    bool _swapEnabled;
    uint256 _pointsPerToken;

    mapping(address => uint32) _lastClaimPeriod;
    mapping(uint32 => uint256) _pointsExcess;
    mapping(address => uint256) _points;

    modifier onlyValidPeriod() {
        if (
            (currentPeriod.id != 0 &&
                uint32(block.timestamp) > currentPeriod.endTime) ||
            uint32(block.timestamp) < currentPeriod.startTime
        )
            revert InvalidPeriodError(
                uint32(block.timestamp),
                currentPeriod.startTime,
                currentPeriod.endTime
            );
        _;
    }

    modifier onlySwappable() {
        if (!_swapEnabled) revert SwapDisabledError();
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address _configStorage) public override initializer {
        BaseBlastManagerUpgradeable.initialize(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );
        bonusManager = IBonusManager(
            configStorage.getAddress(StorageKey.BonusManager)
        );
        snuggeryManager = ISnuggeryManager(
            configStorage.getAddress(StorageKey.SnuggeryManager)
        );
        munchToken = IMunchToken(
            configStorage.getAddress(StorageKey.MunchToken)
        );

        pointsPerPeriod = configStorage.getUint(StorageKey.PointsPerPeriod);
        _pointsPerToken = configStorage.getUint(StorageKey.PointsPerToken);
        _swapEnabled = configStorage.getBool(StorageKey.SwapEnabled);

        POINTS_PER_MIGRATED_NFT = configStorage.getUintArray(
            StorageKey.PointsPerMigratedNFT
        );
        POINTS_PER_UNREVEALED_NFT = configStorage.getUint(
            StorageKey.PointsPerUnrevealedNFT
        );

        super.__BaseBlastManagerUpgradeable_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function newPeriod() external override notPaused onlyRole(Role.NewPeriod) {
        if (
            currentPeriod.endTime != 0 &&
            uint32(block.timestamp) < currentPeriod.endTime
        ) revert CurrentPeriodNotEndedError();

        uint256 prevPeriodClaimed = currentPeriod.claimed;

        currentPeriod.id++;
        uint32 _currentPeriodId = currentPeriod.id;
        uint256 _excess;
        if (currentPeriod.claimed <= currentPeriod.available) {
            _excess = currentPeriod.available - currentPeriod.claimed;
        }
        _pointsExcess[_currentPeriodId] = _excess;
        currentPeriod.startTime = uint32(block.timestamp);
        currentPeriod.endTime = uint32(block.timestamp + 1 days);
        currentPeriod.available = pointsPerPeriod;
        currentPeriod.claimed = 0;
        currentPeriod.globalTotalChonk = snuggeryManager.getGlobalTotalChonk();

        emit NewPeriodStarted(
            _currentPeriodId,
            currentPeriod.startTime,
            currentPeriod.endTime,
            currentPeriod.available,
            prevPeriodClaimed,
            _excess,
            currentPeriod.globalTotalChonk
        );
    }

    function burnNFTsForPoints(
        address _player,
        uint8[] memory _tokenIdsByRarity
    )
        external
        override
        onlyConfiguredContract(StorageKey.MigrationManager)
        returns (uint256 _receivedPoints)
    {
        uint256 totalPoints;
        for (uint8 i; i < _tokenIdsByRarity.length; i++) {
            totalPoints += (_tokenIdsByRarity[i] * POINTS_PER_MIGRATED_NFT[i]);
        }
        _points[_player] += totalPoints;
        _receivedPoints = totalPoints;
        emit NFTsBurnedForPoints(_player, _tokenIdsByRarity, totalPoints);
    }

    function burnUnrevealedForPoints(
        address _player,
        uint256 _unrevealed
    )
        external
        override
        onlyConfiguredContract(StorageKey.MigrationManager)
        returns (uint256 _receivedPoints)
    {
        uint256 totalPoints = POINTS_PER_UNREVEALED_NFT * _unrevealed;
        _points[_player] += totalPoints;
        _receivedPoints = totalPoints;
        emit UnrevealedSwappedForPoints(_player, _unrevealed, totalPoints);
    }

    function claimPoints() external override onlyValidPeriod {
        address mainAccount = accountManager.getMainAccount(msg.sender);

        _claimPoints(mainAccount);
    }

    /// @inheritdoc IClaimManager
    function forceClaimPoints(
        address _player
    )
        external
        onlyValidPeriod
        onlyConfiguredContract(StorageKey.SnuggeryManager)
    {
        _claimPoints(_player);
    }

    function spendPoints(
        address _player,
        uint256 _spendPoints
    ) external override onlyConfiguredContract(StorageKey.SnuggeryManager) {
        if (_points[_player] < _spendPoints) revert NotEnoughPointsError();
        _points[_player] -= _spendPoints;

        emit PointsSpent(_player, _spendPoints);
    }

    function convertPointsToTokens(
        uint256 _pointsToConvert
    ) external notPaused onlySwappable {
        uint256 _pointsAvailable = _points[msg.sender];
        if (_pointsToConvert == 0 || _pointsAvailable == 0)
            revert NoClaimablePointsError();
        if (_pointsAvailable < _pointsToConvert) revert NotEnoughPointsError();
        if (_pointsPerToken == 0) revert PointsPerTokenNotSetError();

        uint256 _tokensToMint = (_pointsToConvert * _pointsPerToken) / 1e12;
        if (_tokensToMint == 0) revert PointAmountToSmallError();

        _points[msg.sender] -= _pointsToConvert;

        munchToken.mint(msg.sender, _tokensToMint);

        emit PointsConverted(msg.sender, _pointsToConvert, _tokensToMint);
    }

    function getCurrentPeriod() external view override returns (Period memory) {
        return currentPeriod;
    }

    function getPoints(
        address _player
    ) external view override returns (uint256) {
        return _points[accountManager.getMainAccount(_player)];
    }

    function _claimPoints(address _player) private {
        (, MunchablesCommonLib.Player memory player) = accountManager.getPlayer(
            _player
        );

        uint32 currentPeriodId = currentPeriod.id;
        if (_lastClaimPeriod[_player] < currentPeriodId) {
            // ignore if previously claimed because check is done for player facing function

            uint256 availablePoints = currentPeriod.available +
                _pointsExcess[currentPeriodId];
            uint256 claimAmount;
            if (currentPeriod.globalTotalChonk > 0) {
                claimAmount =
                    (snuggeryManager.getTotalChonk(_player) * availablePoints) /
                    currentPeriod.globalTotalChonk;
            }

            if (claimAmount > 0) {
                // TODO: Think about ways to keep this within total emission instead of
                // adding to the total count
                uint256 _referralBonus;
                if (player.referrer != address(0)) {
                    _referralBonus =
                        (claimAmount * bonusManager.getReferralBonus()) /
                        1e18;
                    _points[player.referrer] += _referralBonus;
                }
                _lastClaimPeriod[_player] = currentPeriodId;
                _points[_player] += claimAmount;
                currentPeriod.claimed += claimAmount;

                emit Claimed(
                    msg.sender,
                    _player,
                    currentPeriodId,
                    claimAmount,
                    player.referrer,
                    _referralBonus
                );
            }
        }
        _lastClaimPeriod[_player] = currentPeriodId;
        emit ClaimPeriodHit(
            _player,
            _lastClaimPeriod[_player],
            currentPeriod.id
        );
    }
}
