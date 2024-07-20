// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IDistributor.sol";
import "../config/BaseConfigStorage.sol";

contract FundTreasuryDistributor is BaseConfigStorage, IDistributor {
    address private _treasury;

    constructor(address configStorage) {
        __BaseConfigStorage_setConfigStorage(configStorage);
        _reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function _reconfigure() internal {
        if (configStorage.getAddress(StorageKey.Treasury) != address(0))
            _treasury = configStorage.getAddress(StorageKey.Treasury);
    }

    function receiveTokens(
        TokenBag[] memory tb
    ) external payable onlyConfiguredContract(StorageKey.RewardsManager) {
        if (_treasury == address(0)) revert InvalidTreasuryError();

        for (uint8 i; i < tb.length; i++) {
            address tokenContract = tb[i].tokenContract;
            uint256 amount = tb[i].amount;

            if (amount > 0) {
                if (tokenContract == address(0)) {
                    if (msg.value != amount) revert InvalidMsgValueError();
                    (bool success, ) = payable(_treasury).call{value: amount}(
                        ""
                    );
                    if (!success) revert FailedTransferError();
                } else {
                    IERC20(tokenContract).transferFrom(
                        msg.sender,
                        _treasury,
                        amount
                    );
                }

                emit DistributedTokens(tokenContract, _treasury, amount);
            }
        }
    }
}
