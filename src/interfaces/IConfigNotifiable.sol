// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "./IConfigStorage.sol";

interface IConfigNotifiable {
    function configUpdated() external;
}
