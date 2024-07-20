// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "../libraries/MunchablesCommonLib.sol";

interface IMunchadexManager {
    /// @notice Updates the Munchadex with this transfer data
    /// @param _from The address of the sender
    /// @param _to The address of the receiver
    /// @param _tokenId The ID of the NFT being transferred
    function updateMunchadex(
        address _from,
        address _to,
        uint256 _tokenId
    ) external;

    /// @notice Retrieves the Munchadex data for a specific player
    /// @param _player The address of the player
    function getMunchadexInfo(
        address _player
    )
        external
        view
        returns (
            uint256[] memory numMunchablesPerRealm,
            uint256[] memory numMunchablesPerRarity,
            uint256 numUnique
        );

    // @notice internal munchadex counters updated
    event MunchadexUpdated(
        address indexed _player,
        uint256 _tokenId,
        MunchablesCommonLib.Realm realm,
        MunchablesCommonLib.Rarity rarity,
        uint256 _numInRealm,
        uint256 _numInRarity,
        uint256 _numUnique
    );
}
