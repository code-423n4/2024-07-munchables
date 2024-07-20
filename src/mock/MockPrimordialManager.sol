// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../managers/PrimordialManager.sol";

contract MockPrimordialManager is PrimordialManager {
    constructor(address _configStorage) PrimordialManager(_configStorage) {}

    function callMintFromPrimordialForTest(address _account) external {
        nftOverlord.mintFromPrimordial(_account);
    }
}
