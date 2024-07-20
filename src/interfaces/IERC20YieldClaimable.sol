// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

/// @notice Contracts which implement this interface can be instructed by Rewards Manager to claim their yield for
///         ERC20 tokens and send the yield back to the rewards manager
interface IERC20YieldClaimable {
    function claimERC20Yield(address _tokenContract, uint256 _amount) external;
}
