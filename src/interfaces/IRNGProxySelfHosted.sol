// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

interface IRNGProxySelfHosted {
    function provideRandom(uint256 _index, bytes calldata _rand) external;
}
