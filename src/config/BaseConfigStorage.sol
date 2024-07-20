// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../interfaces/IConfigStorage.sol";

abstract contract BaseConfigStorage {
    IConfigStorage public configStorage;
    bool _paused;

    modifier onlyConfigStorage() {
        if (msg.sender != address(configStorage)) revert OnlyStorageError();
        _;
    }

    modifier onlyConfiguredContract(StorageKey _key) {
        address configuredContract = configStorage.getAddress(_key);
        if (configuredContract == address(0)) revert UnconfiguredError(_key);
        if (configuredContract != msg.sender) revert UnauthorisedError();
        _;
    }

    modifier onlyConfiguredContract2(StorageKey _key, StorageKey _key2) {
        address configuredContract = configStorage.getAddress(_key);
        address configuredContract2 = configStorage.getAddress(_key2);
        if (
            configuredContract != msg.sender &&
            configuredContract2 != msg.sender
        ) {
            if (configuredContract == address(0))
                revert UnconfiguredError(_key);
            if (configuredContract2 == address(0))
                revert UnconfiguredError(_key2);

            revert UnauthorisedError();
        }
        _;
    }

    modifier onlyConfiguredContract3(
        StorageKey _key,
        StorageKey _key2,
        StorageKey _key3
    ) {
        address configuredContract = configStorage.getAddress(_key);
        address configuredContract2 = configStorage.getAddress(_key2);
        address configuredContract3 = configStorage.getAddress(_key3);
        if (
            configuredContract != msg.sender &&
            configuredContract2 != msg.sender &&
            configuredContract3 != msg.sender
        ) {
            if (configuredContract == address(0))
                revert UnconfiguredError(_key);
            if (configuredContract2 == address(0))
                revert UnconfiguredError(_key2);
            if (configuredContract3 == address(0))
                revert UnconfiguredError(_key3);

            revert UnauthorisedError();
        }
        _;
    }

    modifier onlyOneOfRoles(Role[5] memory roles) {
        for (uint256 i = 0; i < roles.length; i++) {
            if (msg.sender == configStorage.getRole(roles[i])) {
                _;
                return;
            }
        }
        revert InvalidRoleError();
    }

    modifier onlyRole(Role role) {
        if (msg.sender != configStorage.getRole(role))
            revert InvalidRoleError();
        _;
    }

    modifier onlyUniversalRole(Role role) {
        if (msg.sender != configStorage.getUniversalRole(role))
            revert InvalidRoleError();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != configStorage.getUniversalRole(Role.Admin))
            revert InvalidRoleError();
        _;
    }

    modifier notPaused() {
        if (_paused) revert ContractsPausedError();
        _;
    }

    error UnconfiguredError(StorageKey _key);
    error UnauthorisedError();
    error OnlyStorageError();
    error InvalidRoleError();
    error ContractsPausedError();

    function configUpdated() external virtual;

    function __BaseConfigStorage_setConfigStorage(
        address _configStorage
    ) internal {
        configStorage = IConfigStorage(_configStorage);
    }

    function __BaseConfigStorage_reconfigure() internal {
        _paused = configStorage.getBool(StorageKey.Paused);
    }
}
