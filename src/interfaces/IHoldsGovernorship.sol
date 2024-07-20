// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

/// @notice Contracts which implement this interface will be the governor for other contracts and
///         give it up on request from the contract
interface IHoldsGovernorship {
    function reassignBlastGovernor(address _newAddress) external;

    function isGovernorOfContract(
        address _contract
    ) external view returns (bool);
}
