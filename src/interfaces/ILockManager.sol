// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

/// @title ILockManager interface
/// @notice Provides an interface for managing token locks, including price updates, lock configurations, and user interactions.
interface ILockManager {
    /// @notice Struct representing a lockdrop event
    /// @param start Unix timestamp for when the lockdrop starts
    /// @param end Unix timestamp for when the lockdrop ends
    /// @param minLockDuration Minimum lock duration allowed when locking a token
    struct Lockdrop {
        uint32 start;
        uint32 end;
        uint32 minLockDuration;
    }

    /// @notice Struct holding details about tokens that can be locked
    /// @param usdPrice USD price per token
    /// @param nftCost Cost of the NFT associated with locking this token
    /// @param decimals Number of decimals for the token
    /// @param active Boolean indicating if the token is currently active for locking
    struct ConfiguredToken {
        uint256 usdPrice;
        uint256 nftCost;
        uint8 decimals;
        bool active;
    }

    /// @notice Struct describing tokens locked by a player
    /// @param quantity Amount of tokens locked
    /// @param remainder Tokens left over after locking, not meeting the full NFT cost
    /// @param lastLockTime The last time tokens were locked
    /// @param unlockTime When the tokens will be unlocked
    struct LockedToken {
        uint256 quantity;
        uint256 remainder;
        uint32 lastLockTime;
        uint32 unlockTime;
    }

    /// @notice Struct to hold locked tokens and their metadata
    /// @param lockedToken LockedToken struct containing lock details
    /// @param tokenContract Address of the token contract
    struct LockedTokenWithMetadata {
        LockedToken lockedToken;
        address tokenContract;
    }

    /// @notice Struct to keep player-specific settings
    /// @param lockDuration Duration in seconds for which tokens are locked
    struct PlayerSettings {
        uint32 lockDuration;
    }

    /// @notice Struct to manage USD price update proposals
    /// @param proposedDate Timestamp when the price was proposed
    /// @param proposer Address of the oracle proposing the new price
    /// @param contracts Array of contracts whose prices are proposed to be updated
    /// @param proposedPrice New proposed price in USD
    struct USDUpdateProposal {
        uint32 proposedDate;
        address proposer;
        address[] contracts;
        uint256 proposedPrice;
        mapping(address => uint32) approvals;
        mapping(address => uint32) disapprovals;
        uint8 approvalsCount;
        uint8 disapprovalsCount;
    }

    /// @notice Configures the start and end times for a lockdrop event
    /// @param _lockdropData Struct containing the start and end times
    function configureLockdrop(Lockdrop calldata _lockdropData) external;

    /// @notice Adds or updates a token configuration for locking purposes
    /// @param _tokenContract The contract address of the token to configure
    /// @param _tokenData The configuration data for the token
    function configureToken(
        address _tokenContract,
        ConfiguredToken memory _tokenData
    ) external;

    /// @notice Sets the thresholds for approving or disapproving USD price updates
    /// @param _approve Number of approvals required to accept a price update
    /// @param _disapprove Number of disapprovals required to reject a price update
    function setUSDThresholds(uint8 _approve, uint8 _disapprove) external;

    /// @notice Proposes a new USD price for one or more tokens
    /// @param _price The new proposed price in USD
    /// @param _contracts Array of token contract addresses to update
    function proposeUSDPrice(
        uint256 _price,
        address[] calldata _contracts
    ) external;

    /// @notice Approves a proposed USD price update
    /// @param _price The price that needs to be approved
    function approveUSDPrice(uint256 _price) external;

    /// @notice Disapproves a proposed USD price update
    /// @param _price The price that needs to be disapproved
    function disapproveUSDPrice(uint256 _price) external;

    /// @notice Sets the lock duration for a player's tokens
    /// @param _duration The lock duration in seconds
    function setLockDuration(uint256 _duration) external;

    /// @notice Locks tokens on behalf of a player
    /// @param _tokenContract Contract address of the token to be locked
    /// @param _quantity Amount of tokens to lock
    /// @param _onBehalfOf Address of the player for whom tokens are being locked
    function lockOnBehalf(
        address _tokenContract,
        uint256 _quantity,
        address _onBehalfOf
    ) external payable;

    /// @notice Locks tokens
    /// @param _tokenContract Contract address of the token to be locked
    /// @param _quantity Amount of tokens to lock
    function lock(address _tokenContract, uint256 _quantity) external payable;

    /// @notice Unlocks the player's tokens
    /// @param _tokenContract Contract address of the token to be unlocked
    /// @param _quantity Amount of tokens to unlock
    function unlock(address _tokenContract, uint256 _quantity) external;

    /// @notice Retrieves locked tokens for a player
    /// @param _player Address of the player
    /// @return _lockedTokens Array of LockedTokenWithMetadata structs for all tokens configured
    function getLocked(
        address _player
    ) external view returns (LockedTokenWithMetadata[] memory _lockedTokens);

    /// @notice Calculates the USD value of all tokens locked by a player, weighted by their yield
    /// @param _player Address of the player
    /// @return _lockedWeightedValue Total weighted USD value of locked tokens
    function getLockedWeightedValue(
        address _player
    ) external view returns (uint256 _lockedWeightedValue);

    /// @notice Retrieves configuration for a token given its contract address
    /// @param _tokenContract The contract address of the token
    /// @return _token Struct containing the token's configuration
    function getConfiguredToken(
        address _tokenContract
    ) external view returns (ConfiguredToken memory _token);

    /// @notice Retrieves lock settings for a player
    /// @param _player Address of the player
    /// @return _settings PlayerSettings struct containing the player's lock settings
    function getPlayerSettings(
        address _player
    ) external view returns (PlayerSettings calldata _settings);

    /// @notice Emitted when a new token is configured
    /// @param _tokenContract The token contract being configured
    /// @param _tokenData ConfiguredToken struct with new config
    event TokenConfigured(address _tokenContract, ConfiguredToken _tokenData);

    /// @notice Emitted when a new lockdrop has been configured
    /// @param _lockdrop_data Lockdrop struct containing the new lockdrop configuration
    event LockDropConfigured(Lockdrop _lockdrop_data);

    /// @notice Emitted when a new USD price has been proposed by one of the oracles
    /// @param _proposer The oracle proposing the new price
    /// @param _price New proposed price, specified in whole dollars
    event ProposedUSDPrice(address _proposer, uint256 _price);

    /// @notice Emitted when a USD price proposal has been approved by the required number of oracles
    /// @param _approver The oracle who approved the new price
    event ApprovedUSDPrice(address _approver);

    /// @notice Emitted when an oracle disapproves of the proposed USD price
    /// @param _disapprover The oracle disapproving of the new price
    event DisapprovedUSDPrice(address _disapprover);

    /// @notice Emitted when a USD price proposal is removed after receiving sufficient disapprovals
    event RemovedUSDProposal();

    /// @notice Emitted when the thresholds for USD oracle approvals and disapprovals are updated
    /// @param _approve New threshold for approvals
    /// @param _disapprove New threshold for disapprovals
    event USDThresholdUpdated(uint8 _approve, uint8 _disapprove);

    /// @notice Emitted when a player updates their lock duration
    /// @param _player The player whose lock duration is updated
    /// @param _duration New lock duration, specified in seconds
    event LockDuration(address indexed _player, uint256 _duration);

    /// @notice Emitted when a player locks tokens
    /// @param _player The player locking the tokens
    /// @param _sender The sender of the lock transaction
    /// @param _tokenContract The contract address of the locked token
    /// @param _quantity The amount of tokens locked
    /// @param _remainder The remainder of tokens left after locking (not reaching an NFT cost)
    /// @param _numberNFTs The number of NFTs the player is entitled to due to the lock
    event Locked(
        address indexed _player,
        address _sender,
        address _tokenContract,
        uint256 _quantity,
        uint256 _remainder,
        uint256 _numberNFTs,
        uint256 _lockDuration
    );

    /// @notice Emitted when a player unlocks tokens
    /// @param _player The player unlocking the tokens
    /// @param _tokenContract The contract address of the unlocked token
    /// @param _quantity The amount of tokens unlocked
    event Unlocked(
        address indexed _player,
        address _tokenContract,
        uint256 _quantity
    );

    /// @notice Emitted when the discount factor for token locking is updated
    /// @param discountFactor The new discount factor
    event DiscountFactorUpdated(uint256 discountFactor);

    /// @notice Emitted when the USD price is updated for a token
    /// @param _tokenContract The token contract updated
    /// @param _newPrice The new USD price
    event USDPriceUpdated(address _tokenContract, uint256 _newPrice);

    /// @notice Error thrown when an action is attempted by an entity other than the Account Manager
    error OnlyAccountManagerError();

    /// @notice Error thrown when an operation is attempted on a token that is not configured
    error TokenNotConfiguredError();

    /// @notice Error thrown when an action is attempted after the lockdrop period has ended
    /// @param end The ending time of the lockdrop period
    /// @param block_timestamp The current block timestamp, indicating the time of the error
    error LockdropEndedError(uint32 end, uint32 block_timestamp);

    /// @notice Error thrown when the lockdrop configuration is invalid
    error LockdropInvalidError();

    /// @notice Error thrown when the NFT cost specified is invalid or not allowed
    error NFTCostInvalidError();

    /// @notice Error thrown when the USD price proposed is deemed invalid
    error USDPriceInvalidError();

    /// @notice Error thrown when there is already a proposal in progress and another cannot be started
    error ProposalInProgressError();

    /// @notice Error thrown when the contracts specified in a proposal are invalid
    error ProposalInvalidContractsError();

    /// @notice Error thrown when there is no active proposal to operate on
    error NoProposalError();

    /// @notice Error thrown when the proposer is not allowed to approve their own proposal
    error ProposerCannotApproveError();

    /// @notice Error thrown when a proposal has already been approved
    error ProposalAlreadyApprovedError();

    /// @notice Error thrown when a proposal has already been disapproved
    error ProposalAlreadyDisapprovedError();

    /// @notice Error thrown when the price specified does not match the price in the active proposal
    error ProposalPriceNotMatchedError();

    /// @notice Error thrown when the lock duration specified exceeds the maximum allowed limit
    error MaximumLockDurationError();

    /// @notice Error thrown when the ETH value provided in a transaction is incorrect for the intended operation
    error ETHValueIncorrectError();

    /// @notice Error thrown when the message value provided in a call is invalid
    error InvalidMessageValueError();

    /// @notice Error thrown when the allowance provided for an operation is insufficient
    error InsufficientAllowanceError();

    /// @notice Error thrown when the amount locked is insufficient for the intended operation
    error InsufficientLockAmountError();

    /// @notice Error thrown when tokens are still locked and cannot be unlocked due to the lock period not expiring
    error TokenStillLockedError();

    /// @notice Error thrown when an invalid call is made to the Lock Manager
    error LockManagerInvalidCallError();

    /// @notice Error thrown when the Lock Manager refuses to accept ETH for a transaction
    error LockManagerRefuseETHError();

    /// @notice Error thrown when an invalid token contract address is provided for an operation
    error InvalidTokenContractError();

    /// @notice Lock duration out of range
    error InvalidLockDurationError();

    /// @notice User tries to reduce the unlock time
    error LockDurationReducedError();

    /// @notice If a sub account tries to lock tokens
    error SubAccountCannotLockError();

    /// @notice Account not registered with AccountManager
    error AccountNotRegisteredError();

    /// @notice If the player tries to lock too many tokens resulting in too many NFTs being minted
    error TooManyNFTsError();

    /// @notice Failed to transfer ETH
    error FailedTransferError();
}
