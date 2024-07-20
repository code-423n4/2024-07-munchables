// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

interface IDistributor {
    struct TokenBag {
        uint256 amount;
        address tokenContract;
    }

    /// @notice Receive tokens from a contract and handle it
    /// @param tb TokenBag struct containing the token amount and contract address
    function receiveTokens(TokenBag[] calldata tb) external payable; // onlyConfiguredContract(StorageKey.RewardsManager)

    event DistributedTokens(
        address _tokenContract,
        address _treasury,
        uint256 amount
    );

    error InvalidTreasuryError();
    error InvalidMsgValueError();
    error FailedTransferError();
}
