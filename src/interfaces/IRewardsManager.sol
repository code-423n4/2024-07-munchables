// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "./IDistributor.sol";

interface IRewardsManager {
    //    function claimYield() external; // onlyRole(Role.ClaimYield)

    //    function claimGasFee() external; // onlyRole(Role.ClaimYield)

    function claimYieldForContracts(address[] calldata _contracts) external;

    function claimGasFeeForContracts(address[] calldata _contracts) external;

    event GasFeeClaimed(address _claimer, address _contract, uint256 _yield);
    event YieldClaimed(IDistributor.TokenBag[] tokenBags);
    event YieldClaimedForContract(
        address _claimer,
        address _contract,
        uint256 _yieldETH,
        uint256 _yieldUSDB,
        uint256 _yieldWETH
    );

    error YieldNotConfiguredError();
    error BlastNotConfiguredError();
    error GasFeeNotConfiguredError();
}
