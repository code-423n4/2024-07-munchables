// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "openzeppelin-contracts/contracts/proxy/utils/UUPSUpgradeable.sol";
import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "../interfaces/IConfigStorage.sol";
import {BaseConfigStorage} from "./BaseConfigStorage.sol";

abstract contract BaseConfigStorageUpgradeable is
    Initializable,
    BaseConfigStorage,
    UUPSUpgradeable
{
    function _authorizeUpgrade(address _input) internal override onlyAdmin {}

    function initialize(address _configStorage) public virtual initializer {
        __BaseConfigStorage_setConfigStorage(_configStorage);
    }

    function __BaseConfigStorageUpgradable_reconfigure() internal {
        __BaseConfigStorage_reconfigure();
    }
}
