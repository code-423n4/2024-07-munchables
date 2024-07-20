// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../libraries/MunchablesCommonLib.sol";

interface IPrimordialManager {
    /// @notice Claim a primordial, this can only be done once and with an empty snuggery.  Primordials cannot be
    ///         exported so will always be in the first slot of the snuggery
    function claimPrimordial() external;

    /// @notice Feed a primordial to increase its chonksno bonus is payable for primordials
    /// @param _schnibbles Amount of schnibbles to feed
    function feedPrimordial(uint256 _schnibbles) external;

    /// @notice Get a player's primordial data
    /// @param _player Player's address
    function getPrimordial(
        address _player
    )
        external
        view
        returns (MunchablesCommonLib.PrimordialData memory _primordial);

    /// @notice Once a primordial reaches level 0, they can then be swapped for an NFT
    /// @dev This uses the same code as a reveal, but manually adds to the queue and requests the RNG
    function hatchPrimordialToMunchable() external;

    /// @notice Approved by EOA to be allowed to claim a primordial (after anti-bot checks)
    /// @param _player The player (can be sub-account) address to approve
    /// @param _approve Whether to approve or disapprove
    function approvePrimordial(address _player, bool _approve) external;

    // @notice Emitted when a primordial is claimed by a player
    event PrimordialClaimed(address indexed _player);

    /// @notice Emitted when a primordial is fed
    /// @param _player Owner of the primordial
    /// @param _schnibbles Number of schnibbles fed
    event PrimordialFed(address indexed _player, uint256 _schnibbles);

    /// @notice Same as munchable level up but using ints and not uint because primordial level is always < 1
    event PrimordialLevelledUp(
        address indexed _player,
        int16 _levelFrom,
        int16 _levelTo
    );

    /// @notice Emitted when a primordial is hatched into a munchable
    event PrimordialHatched(address indexed _player);

    /// @notice Emitted when a player is approved to claim a primordial
    event PrimordialApproved(address indexed _player);

    /// @notice Emitted when a player is disapproved to claim a primordial
    event PrimordialDisapproved(address indexed _player);

    /// @notice Error thrown when primordial claiming is not enabled
    error PrimordialsNotEnabledError();

    /// @notice Error thrown when a primordial has already been claimed
    error PrimordialAlreadyClaimedError();

    /// @notice Error thrown when a player attempts swap a primordial but they haven't reached level 0
    error PrimordialNotReadyError();

    error PlayerNotRegisteredError();

    /// @notice Error thrown when a player attempts to claim a primordial while not being eligible
    error PrimordialNotEligibleError();

    error PrimordialDoesntExistError();

    error PrimordialAlreadyHatchedError();

    error InsufficientSchnibblesError(uint256 schnibbles);

    error PrimordialNotApprovedError();
}
