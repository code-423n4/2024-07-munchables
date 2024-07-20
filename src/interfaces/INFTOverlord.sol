// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "../libraries/MunchablesCommonLib.sol";

/// @title Interface for the NFT Overlord
/// @notice This interface manages NFT minting and level up functions which rely on the RNGProxy.  The implementation
///         contract will also handle notification from the LockManager contract when a player has earned
interface INFTOverlord {
    /// @notice Stored between level up requests for a specific token id
    struct LevelUpRequest {
        address owner;
        uint256 tokenId;
        uint16 fromLevel;
        uint16 toLevel;
    }

    /// @notice Struct to define mint probabilities based on percentage and species array
    struct MintProbability {
        uint32 percentage; // Probability percentage
        uint8[] species; // Array of species IDs that can be minted under this probability
    }

    /// @notice Deduct one from Player.unrevealedNFTs and add one to AccountManager.revealQueue
    /// @custom:frontend Use to reveal an NFT, listen for the events to see when it was minted
    function startReveal() external;

    /// @notice Add to Player.unrevealedNFTs, function only callable by lock manager
    /// @param _player Address of the player
    /// @param _quantity Quantity of reveals to add
    function addReveal(address _player, uint16 _quantity) external;

    /// @notice Reveals an NFT based on provided player ID and signature, decrementing the reveal queue
    /// @param _player The player ID for whom the NFT will be revealed
    /// @param _signature The signature to validate the reveal process
    /// @return _tokenId The ID of the minted NFT
    /// @dev This function should be called after RNG process
    function reveal(
        uint256 _player,
        bytes memory _signature
    ) external returns (uint256 _tokenId);

    /// @notice Called by PrimordialManager when a primordial has reached level 0 and can be hatched into a Munchable
    /// @param _player The player address
    function mintFromPrimordial(address _player) external; // only PrimordialManager

    /// @notice Reveals an NFT based on provided player ID and signature, this is from a primordial hatching
    /// @param _player The player ID  whom the NFT will be revealed
    /// @param _signature The signature to validate the reveal process
    /// @return _tokenId The ID of the minted NFT
    /// @dev This function should be called after RNG process
    function revealFromPrimordial(
        uint256 _player,
        bytes memory _signature
    ) external returns (uint256 _tokenId);

    /// @notice Mints an NFT for migration from V1 to V2, preserving attributes
    /// @param _player The address of the player receiving the NFT
    /// @param _attributes The dynamic attributes of the NFT
    /// @param _immutableAttributes The immutable attributes of the NFT
    /// @param _gameAttributes The game attributes of the NFT
    /// @return _tokenId The token ID of the newly minted NFT
    /// @dev Only callable by the migration manager
    function mintForMigration(
        address _player,
        MunchablesCommonLib.NFTAttributes memory _attributes,
        MunchablesCommonLib.NFTImmutableAttributes memory _immutableAttributes,
        MunchablesCommonLib.NFTGameAttribute[] memory _gameAttributes
    ) external returns (uint256 _tokenId);

    /// @notice Called post-level-up to randomly adjust game attributes based on transaction hash and signature
    /// @param _requestId The ID of the RNG request
    /// @param _rng Random bytes from the RNGProxy
    /// @dev Only can be called by the RNGProxy
    function levelUp(uint256 _requestId, bytes memory _rng) external;

    /// @notice Called by SnuggeryManager when a player feeds a Munchable, it will check if level up is needed and
    ///         request randomness to update game attributes
    /// @param _tokenId The token ID which was fed
    /// @param _owner The eventual owner of the NFT at the time of the level up
    function munchableFed(uint256 _tokenId, address _owner) external; // onlySnuggeryManager

    /// @notice Get a player's unrevealed NFTs
    /// @param _player The player to query, if a sub account is provided the main account unrevealedNFTs will be returned
    function getUnrevealedNFTs(
        address _player
    ) external view returns (uint16 _unrevealed);

    /// @notice Get the current level and the next level threshold for a NFT given its schnibbles count
    /// @param _chonks Quantity of schnibbles
    /// @return _currentLevel Current level of the NFT
    /// @return _nextLevelThreshold Schnibbles threshold for the next level
    function getLevelUpData(
        uint256 _chonks
    ) external view returns (uint16 _currentLevel, uint256 _nextLevelThreshold);

    /// @notice Emitted when a player requests to reveal a munchable
    /// @param _player The address of the player who initiated the reveal
    event MunchableRevealRequested(address indexed _player);

    /// @notice Emitted when a munchable levels up and requires an update to its attributes by an off-chain process
    /// @param _player The address of the player whose munchable is leveling up
    /// @param _tokenId The token ID of the munchable leveling up
    /// @param _levelFrom The current level of the munchable
    /// @param _levelTo The new level that the munchable should be updated to
    event MunchableLevelUpRequest(
        address indexed _player,
        uint256 _tokenId,
        uint16 _levelFrom,
        uint16 _levelTo
    );

    /// @notice Event emitted when an NFT is revealed
    event Revealed(
        address indexed _owner,
        uint256 _tokenId,
        MunchablesCommonLib.NFTImmutableAttributes _immutableAttributes
    );

    /// @notice Event emitted when an NFT is leveled up
    event LevelledUp(
        address _owner,
        uint256 _tokenId,
        uint16 _fromLevel,
        uint16 _toLevel,
        MunchablesCommonLib.NFTGameAttribute[] _gameAttributes
    );

    /// @notice Emitted when a primordial is hatched into a munchable
    event PrimordialHatched(
        address indexed _player,
        MunchablesCommonLib.NFTImmutableAttributes _immutableAttributes
    );

    /// @notice Event emitted when an NFT is minted for migration
    event MintedForMigration(
        address _player,
        uint256 indexed _tokenId,
        MunchablesCommonLib.NFTImmutableAttributes _immutableAttributes,
        MunchablesCommonLib.NFTAttributes _attributes,
        MunchablesCommonLib.NFTGameAttribute[] _gameAttributes
    );

    /// @notice Error thrown when there are no unrevealed munchables available for a player
    error NoUnrevealedMunchablesError();

    /// @notice Error thrown when a player's reveal queue is full and cannot handle more reveals
    error RevealQueueFullError();

    /// @notice Error thrown when a player's reveal queue is empty and there is nothing to reveal
    error RevealQueueEmptyError();

    /// @notice Error when a level up request either doesn't exist or the fromLevel is invalid
    error InvalidLevelUpRequest();

    /// @notice Error when no species is found for a given rarity during NFT creation
    /// @param _rarity The rarity level that failed to produce a species
    error NoSpeciesFoundError(MunchablesCommonLib.Rarity _rarity);

    /// @notice Error if reveal cannot find species in realmLookup
    /// @param _speciesId The species that failed
    error NoRealmFoundError(uint16 _speciesId);

    /// @notice Error thrown when a player attempts to claim a primordial while not being eligible
    error PrimordialNotEligibleError();

    /// @notice Error thrown when an action is attempted that requires the player to be registered, but they are not
    error PlayerNotRegisteredError();

    /// @notice Retrigger level rng
    event RetriggeredLevelRNG(uint256[] tokenIds);
}
