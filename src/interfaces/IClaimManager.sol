// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "../libraries/MunchablesCommonLib.sol";

interface IClaimManager {
    struct Period {
        uint32 id;
        uint32 startTime;
        uint32 endTime;
        uint256 available;
        uint256 claimed;
        uint256 globalTotalChonk;
    }

    /// @notice Starts a new periods
    /// @dev This will start a new period if the previous one has ended
    function newPeriod() external; // onlyRole(NEW_PERIOD_ROLE)

    /// @notice Claims points for the current period
    /// @dev This will claim the sender's points for the current period
    function claimPoints() external; // onlyValidPeriod

    /// @notice Used by the account manager to force a claim before doing anything which would affect the total chonks
    ///         for the player
    function forceClaimPoints(address _player) external; // onlyValidPeriod only SnuggeryManager.sol

    /// @notice Spends points for the _player
    /// @dev This will spend the _player's points
    /// @param _player The player to spend the points for
    /// @param _spendPoints The number of points to spend
    function spendPoints(address _player, uint256 _spendPoints) external; // only SnuggeryManager.sol

    /// @notice Convert accumulated points to tokens
    /// @dev This will convert the sender's accumulated points to tokens
    /// @param _points The number of points to convert
    function convertPointsToTokens(uint256 _points) external; // onlySwapEnabled

    // @notice If the player chooses to not migrate over their NFTs, they can burn them for points
    /// @dev This will burn the player's NFTs for points. Can only be called by Migration Manager
    /// @param _player The player to burn the NFTs for
    /// @param _tokenIdsByRarity List of token IDs separated by rarity
    function burnNFTsForPoints(
        address _player,
        uint8[] memory _tokenIdsByRarity
    ) external returns (uint256 _receivedPoints); // OnlyMigrationManager

    /// @notice Called by MigrationManager to give the player points from their unrevealed NFTs
    /// @param _player The address of the player
    /// @param _unrevealed Number of unrevealed NFTs which are being swapped
    function burnUnrevealedForPoints(
        address _player,
        uint256 _unrevealed
    ) external returns (uint256 _receivedPoints); // OnlyMigrationManager

    /// @notice Gets the current period data
    /// @return _period The current period data
    function getCurrentPeriod() external view returns (Period memory _period);

    /// @notice Gets the current points for a player
    /// @param _player The player to get the points for
    function getPoints(address _player) external view returns (uint256 _points);

    event Claimed(
        address indexed _sender,
        address indexed _player,
        uint32 _periodId,
        uint256 _pointsClaimed,
        address indexed _referrer,
        uint256 _referralBonus
    );
    event PointsPerPeriodSet(uint256 _oldPoints, uint256 _newPoints);
    event AccountManagerSet(
        address _oldAccountManager,
        address _newAccountManager
    );
    event LockManagerSet(address _oldLockManager, address _newLockManager);
    event NewPeriodStarted(
        uint32 _periodId,
        uint32 _startTime,
        uint32 _endTime,
        uint256 _availablePoints,
        uint256 _prevPeriodPointsClaimed,
        uint256 _excessPoints,
        uint256 _totalGlobalChonk
    );
    event ClaimModuleSet(address _claimModule, bool _isValid);
    event YieldClaimed(
        address _claimModule,
        address _tokenContract,
        uint256 _yieldClaimed
    );
    event SwapEnabled(bool _enabled);
    event PointsPerTokenSet(
        uint256 _oldPointsPerToken,
        uint256 _newPointsPerToken
    );
    event MunchTokenSet(address _oldMunchToken, address _newMunchToken);
    event PointsConverted(
        address indexed _player,
        uint256 _points,
        uint256 _tokens
    );
    event ReferralBonusSet(uint256 _oldReferralBonus, uint256 _referralBonus);
    event PointsSpent(address indexed _player, uint256 _pointsSpent);
    event NFTsBurnedForPoints(
        address indexed _player,
        uint8[] _tokenIdsByRarity,
        uint256 _points
    );
    event UnrevealedSwappedForPoints(
        address indexed _player,
        uint256 _unrevealed,
        uint256 _points
    );
    event ClaimPeriodHit(
        address indexed _player,
        uint32 _lastClaimPeriod,
        uint32 _currentPeriod
    );

    error InvalidSnapshotDataError();
    error SnapshotIsFinalizedError();
    error SnapshotIsNotFinalizedError();
    error NotAccountManagerError();
    error InvalidPeriodError(uint32 _now, uint32 _startTime, uint32 _endTime);
    error CurrentPeriodNotEndedError();
    error AlreadyClaimedError();
    error NoClaimablePointsError();
    error NotEnoughPointsError();
    error SwapDisabledError();
    error PointsPerTokenNotSetError();
    error NoSnapshotDataError();
    error PointAmountToSmallError();
}
