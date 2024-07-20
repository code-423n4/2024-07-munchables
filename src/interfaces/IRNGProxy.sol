// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

interface IRNGProxy {
    /// @notice Request a random number to be provided back to the contract specified
    /// @param _contract The contract that will receive the data
    /// @param _selector The function on the contract to call
    /// @param _index A unique identifier which the contract can use to identify the target for the data
    function requestRandom(
        address _contract,
        bytes4 _selector,
        uint256 _index
    ) external;

    event RandomRequested(
        address indexed _target,
        bytes4 _selector,
        uint256 indexed _index
    );
    event RandomRequestComplete(
        uint256 indexed _index,
        bool _success,
        bytes _data
    );

    error NoRequestError();
    error CallbackFailedError();
}
