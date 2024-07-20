// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "../libraries/MunchablesCommonLib.sol";

/// @title Interface for the Account Manager
/// @notice This interface manages player accounts including their snuggery, schibbles, chonks, and sub-accounts
interface ISnuggeryManager {
    /// @notice Imports a munchable to the player's snuggery
    /// @dev Check that the NFT is approved to transfer by this contract
    /// @param _tokenId The token ID to import
    /// @custom:frontend Import a munchable
    function importMunchable(uint256 _tokenId) external;

    /// @notice Exports a munchable from the player's snuggery, the munchable will be returned directly
    /// @param _tokenId The token ID to export
    /// @custom:frontend Export a munchable
    function exportMunchable(uint256 _tokenId) external;

    /// @notice Feed a munchable to increase its chonks, chonks will be schnibbles multiplied by any feed bonus
    /// @param _tokenId Token ID of the munchable to feed
    /// @param _schnibbles Amount of schnibbles to feed
    /// @custom:frontend Feed a munchable, use event data to show how much chonk was added
    function feed(uint256 _tokenId, uint256 _schnibbles) external;

    /// @notice Increase the number of slots in a player's snuggery
    /// @param _quantity Quantity to increase the snuggery size by
    function increaseSnuggerySize(uint8 _quantity) external;

    /// @notice Pet another player's munchable to give both petter and petted some schnibbles
    /// @param _pettedOwner The owner of the token being petted (the token must be in that player's snuggery)
    /// @param _tokenId Token ID of the munchable to pet
    /// @custom:frontend Pet another user's munchable.  Check last pet and petted times to see if this function
    ///                  should be available
    function pet(address _pettedOwner, uint256 _tokenId) external;

    /// @notice Retrieve the total schnibbles count for a player's snuggery
    /// @param _player Address of the player
    /// @return _totalChonk Total schnibbles count
    function getTotalChonk(
        address _player
    ) external view returns (uint256 _totalChonk);

    /// @notice Retrieve the global total schnibbles count across all snuggeries
    function getGlobalTotalChonk()
        external
        view
        returns (uint256 _totalGlobalChonk);

    /// @notice Gets a snuggery (array of SnuggeryNFT)
    /// @param _player Address of the player to get snuggery for
    /// @return _snuggery Array of SnuggeryNFT items
    function getSnuggery(
        address _player
    )
        external
        view
        returns (MunchablesCommonLib.SnuggeryNFT[] memory _snuggery);

    /// @notice Emitted when a munchable is imported into a player's snuggery
    /// @param _player The address of the player who imported the munchable
    /// @param _tokenId The token ID of the munchable that was imported
    /// @custom:frontend Listen for events for the mainAccount, when it is received update your snuggery data
    event MunchableImported(address indexed _player, uint256 _tokenId);

    /// @notice Emitted when a munchable is exported from a player's snuggery
    /// @param _player The address of the player who exported the munchable
    /// @param _tokenId The token ID of the munchable that was exported
    /// @custom:frontend Listen for events for the mainAccount, when it is received update your snuggery data
    event MunchableExported(address indexed _player, uint256 _tokenId);

    /// @notice Emitted when a munchable is fed schnibbles
    /// @param _player The address of the player who fed the munchable
    /// @param _tokenId The token ID of the munchable that was fed
    /// @param _baseChonks The base amount of chonks that were gained by feeding, will be equal to the schnibbles fed
    /// @param _bonusChonks The additional bonus chonks that were awarded during the feeding
    /// @custom:frontend Listen for events for your mainAccount and when this is received update the particular token
    ///                  in the snuggery by reloading the NFT data
    event MunchableFed(
        address indexed _player,
        uint256 _tokenId,
        uint256 _baseChonks,
        int256 _bonusChonks
    );

    /// @notice Emitted when a munchable is petted, distributing schnibbles to both the petter and the petted
    /// @param _petter The address of the player who petted the munchable
    /// @param _petted The address of the player who owns the petted munchable
    /// @param _tokenId The token ID of the munchable that was petted
    /// @param _petterSchnibbles The amount of schnibbles awarded to the petter
    /// @param _pettedSchnibbles The amount of schnibbles awarded to the owner of the petted munchable
    /// @custom:frontend Listen for events where your mainAccount petted and where it was pet
    ///                  - If your mainAccount was petted, update the unfedMunchables total
    ///                  - If your account was petted then, update the unfedMunchables total, also optionally load the
    ///                    lastPetTime for the munchable if you use that
    event MunchablePetted(
        address indexed _petter,
        address indexed _petted,
        uint256 _tokenId,
        uint256 _petterSchnibbles,
        uint256 _pettedSchnibbles
    );

    /// @notice Event emitted when a snuggery size is increased
    event SnuggerySizeIncreased(
        address _player,
        uint16 _previousSize,
        uint16 _newSize
    );

    /// @notice Error thrown when a token ID is not found in the snuggery
    error TokenNotFoundInSnuggeryError();

    /// @notice Error thrown when a player's snuggery is already full and cannot accept more munchables
    error SnuggeryFullError();

    /// @notice Someone tries to import a munchable they do not own
    error IncorrectOwnerError();

    /// @notice Error if user tries to import someone else's NFT
    error InvalidOwnerError();

    /// @notice Error thrown when an action is attempted that requires the player to be registered, but they are not
    error PlayerNotRegisteredError();

    /// @notice Error thrown when a munchable is not found in a player's snuggery
    error MunchableNotInSnuggeryError();

    /// @notice Error thrown when a player attempts to pet their own munchable
    error CannotPetOwnError();

    /// @notice Error thrown when a munchable is petted too soon after the last petting
    error PettedTooSoonError();

    /// @notice Error thrown when a player attempts to pet too soon after their last petting action
    error PetTooSoonError();

    /// @notice Error thrown when a player tries to feed a munchable but does not have enough schnibbles
    /// @param _currentUnfedSchnibbles The current amount of unfed schnibbles available to the player
    error InsufficientSchnibblesError(uint256 _currentUnfedSchnibbles);

    /// @notice Error thrown when a player attempts swap a primordial but they dont have one
    error NoPrimordialInSnuggeryError();

    /// @notice Invalid token id passed (normally if 0)
    error InvalidTokenIDError();

    /// @notice Contract is not approved to transfer NFT on behalf of user
    error NotApprovedError();

    /// @notice Something not configured
    error NotConfiguredError();

    /// @notice This is thrown by the claim manager but we need it here to decode selector
    error NotEnoughPointsError();

    /// @notice When petting the user petting must supply the main account being petted
    error PettedIsSubAccount();

    /// @notice Player tries to increase their snuggery size beyond global max size
    error SnuggeryMaxSizeError();
}
