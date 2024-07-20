// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IConfigStorage.sol";
import "../interfaces/IConfigNotifiable.sol";
import "../config/BaseConfigStorageUpgradeable.sol";
import "../interfaces/IBaseBlastManager.sol";
import "../interfaces/IHoldsGovernorship.sol";
import "../interfaces/IBlast.sol";
import "./BaseBlastManager.sol";

abstract contract BaseBlastManagerUpgradeable is
    BaseBlastManager,
    BaseConfigStorageUpgradeable
{
    function initialize(
        address _configStorage
    ) public virtual override initializer {
        BaseConfigStorageUpgradeable.initialize(_configStorage);
    }

    function __BaseBlastManagerUpgradeable_reconfigure() internal {
        __BaseBlastManager_reconfigure();
    }
}
