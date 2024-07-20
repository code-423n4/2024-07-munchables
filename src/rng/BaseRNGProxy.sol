// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../interfaces/IRNGProxy.sol";
import "../config/BaseConfigStorage.sol";

abstract contract BaseRNGProxy is IRNGProxy, BaseConfigStorage {
    struct RequestData {
        address targetContract;
        bytes4 selector;
    }

    mapping(uint256 => RequestData) public requests;

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
    }

    function configUpdated() external virtual override {}

    function requestRandom(
        address _contract,
        bytes4 _selector,
        uint256 _index
    ) public virtual onlyConfiguredContract(StorageKey.NFTOverlord) {
        requests[_index] = RequestData({
            targetContract: _contract,
            selector: _selector
        });

        emit RandomRequested(_contract, _selector, _index);
    }

    function _callback(uint256 _index, bytes calldata _rand) internal {
        RequestData storage data = requests[_index];

        if (data.targetContract == address(0)) revert NoRequestError();

        bytes memory callData = abi.encodeWithSelector(
            data.selector,
            _index,
            _rand
        );

        (bool success, bytes memory returnData) = data.targetContract.call(
            callData
        );

        if (!success) revert CallbackFailedError();

        delete requests[_index];

        emit RandomRequestComplete(_index, success, returnData);
    }
}
