// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IBlast.sol";

// A bare-bones ERC20 token for use in tests
contract TestERC20Token is ERC20 {
    uint256 numberClaims;
    bool configured;

    constructor() ERC20("TestERC20Token", "TEST") {
        // Mint 100 tokens to msg.sender
        _mint(msg.sender, 100 * 10 ** decimals());
    }

    // rebasing
    function configure(YieldMode) external returns (uint256) {
        configured = true;
        return 0;
    }

    function claim(address, uint256) external returns (uint256) {
        numberClaims++;
        return 0;
    }

    function getClaimableAmount(address) external pure returns (uint256) {
        return 0;
    }

    function mint(address user, uint256 amount) external {
        _mint(user, amount);
    }
}
