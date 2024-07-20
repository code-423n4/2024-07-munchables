// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IMunchToken.sol";
import "../managers/BaseBlastManager.sol";

// TODO : Update to allow manual minting by administration
// TODO : Add pause functionality
// TODO : Not ready for audit yet

contract MunchToken is ERC20, IMunchToken, BaseBlastManager {
    constructor(
        address _configStorage,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
    }

    function _reconfigure() internal {
        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function mint(
        address to,
        uint256 amount
    ) external onlyConfiguredContract(StorageKey.ClaimManager) {
        _mint(to, amount);
    }
}
