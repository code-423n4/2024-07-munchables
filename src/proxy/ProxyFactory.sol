// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract ProxyFactory is TransparentUpgradeableProxy {
    constructor(
        address logic,
        address admin,
        bytes memory _data
    ) TransparentUpgradeableProxy(logic, admin, _data) {}
}
