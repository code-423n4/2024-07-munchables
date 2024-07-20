// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

/// @title Interface for the Bonus Manager
/// @notice This interface defines the functions that the Bonus Manager contract should implement. Each function is a getter responsible for returning a percentage multiplier
interface IBonusManager {
    function getFeedBonus(
        address _caller,
        uint256 _tokenId
    ) external view returns (int256 _amount);

    function getHarvestBonus(
        address _caller
    ) external view returns (uint256 _amount);

    function getPetBonus(
        address _petter
    ) external view returns (uint256 _amount);

    function getReferralBonus() external view returns (uint256 _amount);

    error InvalidRarityError(uint256 _rarity);
    error InvalidRealmBonus(uint256 _realmIndex);
}
