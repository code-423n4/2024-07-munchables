// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "../interfaces/IConfigNotifiable.sol";
import "../config/BaseConfigStorage.sol";

error VerificationFailError();
event ConfigUpdated();

contract MockConfigNotifiable is BaseConfigStorage {
    uint256 public dirty;

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
    }

    function configUpdated() external override {
        dirty = configStorage.getUint(StorageKey(14));
        emit ConfigUpdated();
    }

    function verifyDirtyUint(uint256 _expectedVal) public view {
        if (dirty != _expectedVal) revert VerificationFailError();
    }

    function verifyUint(StorageKey _key, uint256 _expectedVal) public view {
        uint256 storedVal = configStorage.getUint(_key);
        if (storedVal != _expectedVal) revert VerificationFailError();
    }
}
