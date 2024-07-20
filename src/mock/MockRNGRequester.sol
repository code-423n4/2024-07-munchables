// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../interfaces/IRNGProxy.sol";

contract MockRNGRequester {
    IRNGProxy _rngProxy;

    event ReceivedRandom(uint256 _index, bytes _rand);

    constructor(address rngProxy) {
        _rngProxy = IRNGProxy(rngProxy);
    }

    function runTest() external {
        uint256 index = 55555;
        _rngProxy.requestRandom(
            address(this),
            this.receiveRandom.selector,
            index
        );
    }

    function receiveRandom(uint256 _index, bytes calldata _rand) external {
        emit ReceivedRandom(_index, _rand);
    }
}
