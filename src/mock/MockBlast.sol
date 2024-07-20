// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "../interfaces/IBlast.sol";

contract MockBlast is IBlast {
    // used to avoid state mutability warnings
    uint256 numberClaims;
    uint256 numberConfigures;

    // configure
    function configureContract(address, YieldMode, GasMode, address) external {}

    function configure(YieldMode, GasMode, address) external {}

    // base configuration options
    function configureClaimableYield() external {
        numberConfigures++;
    }

    function configureClaimableYieldOnBehalf(address) external {
        numberConfigures++;
    }

    function configureAutomaticYield() external {
        numberConfigures++;
    }

    function configureAutomaticYieldOnBehalf(address) external {
        numberConfigures++;
    }

    function configureVoidYield() external {
        numberConfigures++;
    }

    function configureVoidYieldOnBehalf(address) external {
        numberConfigures++;
    }

    function configureClaimableGas() external {
        numberConfigures++;
    }

    function configureClaimableGasOnBehalf(address) external {
        numberConfigures++;
    }

    function configureVoidGas() external {
        numberConfigures++;
    }

    function configureVoidGasOnBehalf(address) external {
        numberConfigures++;
    }

    function configureGovernor(address) external {
        numberConfigures++;
    }

    function configureGovernorOnBehalf(address, address) external {
        numberConfigures++;
    }

    // claim yield
    function claimYield(address, address, uint256) external returns (uint256) {
        numberClaims++;
        return 0;
    }

    function claimAllYield(address, address) external returns (uint256) {
        numberClaims++;
        return 0;
    }

    // claim gas
    function claimAllGas(address, address) external returns (uint256) {
        numberClaims++;
        return 0;
    }

    function claimGasAtMinClaimRate(
        address,
        address,
        uint256
    ) external returns (uint256) {
        numberClaims++;
        return 0;
    }

    function claimMaxGas(address, address) external returns (uint256) {
        numberClaims++;
        return 0;
    }

    function claimGas(
        address,
        address,
        uint256,
        uint256
    ) external returns (uint256) {
        numberClaims++;
        return 0;
    }

    // read functions
    function readClaimableYield(address) external pure returns (uint256) {
        return 0;
    }

    function readYieldConfiguration(address) external pure returns (uint8) {
        return 0;
    }

    function readGasParams(
        address
    )
        external
        pure
        returns (
            uint256 etherSeconds,
            uint256 etherBalance,
            uint256 lastUpdated,
            GasMode
        )
    {
        return (0, 0, 0, GasMode.CLAIMABLE);
    }

    function isAuthorized(address) external pure returns (bool) {
        return true;
    }

    function isGovernor(address) external pure returns (bool) {
        return true;
    }
}
