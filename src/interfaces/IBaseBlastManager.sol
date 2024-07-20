// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

interface IBaseBlastManager {
    function getConfiguredGovernor() external view returns (address _governor);
}
