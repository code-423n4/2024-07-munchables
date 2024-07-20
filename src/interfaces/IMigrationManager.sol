// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../libraries/MunchablesCommonLib.sol";

interface IOldNFT {
    // This function needs to be added when upgrading the old NFT contract
    function burn(uint256 _tokenId) external;
}

/// @title Interface for Migration Manager
/// @notice Handles the migration of NFTs with specific attributes and immutable attributes
interface IMigrationManager {
    enum UserLockedChoice {
        NONE,
        LOCKED_FULL_MIGRATION,
        LOCKED_BURN
    }

    /// @dev Struct to hold data during migration
    /// @param tokenId The ID of the token being migrated
    /// @param lockAmount Amount of tokens to lock during migration
    /// @param lockDuration Duration for which tokens will be locked
    /// @param tokenType Type of the token
    /// @param attributes Attributes of the NFT
    /// @param immutableAttributes Immutable attributes of the NFT
    /// @param claimed Status of the NFT claim
    struct MigrationSnapshotData {
        uint256 tokenId;
        uint256 lockAmount;
        address token;
        MunchablesCommonLib.NFTAttributes attributes;
        MunchablesCommonLib.NFTImmutableAttributes immutableAttributes;
        MunchablesCommonLib.NFTGameAttribute[] gameAttributes;
        bool claimed;
    }

    struct MigrationTotals {
        uint256 totalPurchasedAmount;
        uint256 totalLockedAmount;
        address tokenLocked;
    }

    /// @notice Load the migration snapshot for a batch of users
    /// @dev This function sets up migration data for users
    /// @param users Array of user addresses
    /// @param data Array of migration data corresponding to each user
    function loadMigrationSnapshot(
        address[] calldata users,
        MigrationSnapshotData[] calldata data
    ) external;

    /// @notice Load the unrevealed snapshot for a batch of users
    /// @dev This function sets up unrevealed data for users
    /// @param users Array of user addresses
    /// @param unrevealed Array of number of unrevealed for each user
    function loadUnrevealedSnapshot(
        address[] calldata users,
        uint16[] calldata unrevealed
    ) external;

    /// @notice Seals migration data loading
    function sealData() external; // onlyRole(DEFAULT_ADMIN_ROLE)

    /// @notice Burns NFTs
    /// @dev This function handles multiple NFT burn process
    function burnNFTs(address _user, uint32 _skip) external;

    /// @notice Burns remaining purchased NFTs
    /// @dev This function handles burning all remaining purchased NFTs
    function burnRemainingPurchasedNFTs(address _user, uint32 _skip) external;

    /// @notice Lock funds for migration
    /// @dev This function handles locking funds and changing state to migrate
    function lockFundsForAllMigration() external payable;

    /// @notice Migrates all NFTs to the new version
    /// @dev This function handles multiple NFT migration processes. They need to lock funds first before migrating.
    function migrateAllNFTs(address _user, uint32 _skip) external;

    /// @notice Migrates purchased NFTs to the new version
    /// @dev This function handles multiple NFT migration processes
    function migratePurchasedNFTs(uint256[] memory tokenIds) external payable;

    /// @notice Burn unrevealed NFTs for points
    function burnUnrevealedForPoints() external;

    /// @notice Return funds which are stuck in the contract (admin only)
    /// @param _tokenContract The token contract address(0) for ETH
    /// @param _quantity Amount to return
    /// @param _returnAddress Address to return to
    function rescue(
        address _tokenContract,
        uint256 _quantity,
        address _returnAddress
    ) external;

    /// @notice Gets the migration data for a user and token ID
    /// @param _user The user address
    /// @param _tokenId The token ID
    function getUserMigrationData(
        address _user,
        uint256 _tokenId
    ) external view returns (MigrationSnapshotData memory);

    /// @notice Gets the overall migration data for a user
    /// @param _user The user address
    function getUserMigrationCompletedData(
        address _user
    ) external view returns (bool, MigrationTotals memory);

    /// @notice Gets the total number of NFTs owned by a user
    /// @param _user The user address
    function getUserNFTsLength(address _user) external view returns (uint256);

    /// @notice Emitted when the migration snapshot is loaded
    /// @param users The array of user addresses involved in the migration
    /// @param data The migration data corresponding to each user
    event MigrationSnapshotLoaded(
        address[] users,
        MigrationSnapshotData[] data
    );

    /// @notice Emitted when unreveal data is loaded
    /// @param users The accounts
    /// @param unrevealed Number of unrevealed NFTs
    event UnrevealedSnapshotLoaded(address[] users, uint16[] unrevealed);

    /// @notice Emitted when an NFT migration is successful
    /// @param user The user who owns the NFTs
    /// @param _oldTokenIds The token IDs of the old NFTs
    /// @param _newTokenIds The token IDs of the new NFTs
    event MigrationSucceeded(
        address user,
        uint256[] _oldTokenIds,
        uint256[] _newTokenIds
    );

    /// @notice Emitted when an NFT burn is successful
    /// @param user The user who owns the NFTs
    /// @param _oldTokenIds The token IDs of the old NFTs
    event BurnSucceeded(address user, uint256[] _oldTokenIds);

    /// @notice Emitted when an NFT burn is successful
    /// @param user The user who owns the NFTs
    /// @param _oldTokenIds The token IDs of the old NFTs
    event BurnPurchasedSucceeded(address user, uint256[] _oldTokenIds);

    /// @notice Emitted after a player swaps unrevealed NFTs for points
    /// @param user The account that swapped the unrevealed NFTS
    /// @param amountSwapped The amount of unrevealed NFTs which will be swapped for points
    event UnrevealedSwapSucceeded(address user, uint256 amountSwapped);

    /// @notice Emitted when the migration data is sealed
    event MigrationDataSealed();

    /// @notice Emitted when a user locks their funds for a full migration
    event LockedForMigration(address user, uint256 amount, address token);

    error NotBoughtNFTError();
    error NFTPurchasedContractError();
    error UnrevealedNFTError();
    error NoMigrationExistsError();
    error InvalidMigrationOwnerError(address _owner, address _sender);
    error InvalidMigrationAmountError();
    error InvalidMigrationTokenError();
    error AllowanceTooLowError();
    error MigrationDataSealedError();
    error MigrationDataNotSealedError();
    error NoUnrevealedError();
    error NoNFTsToBurnError();
    error InvalidDataLengthError();
    error DataAlreadyLoadedError();
    error DifferentLockActionError();
    error SelfNeedsToChooseError();
    error InvalidSkipAmountError();
    error InvalidMigrationTokenIdError();
    error RescueTransferError();
}
