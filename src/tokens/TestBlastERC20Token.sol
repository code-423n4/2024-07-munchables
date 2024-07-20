// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// A bare-bones ERC20 token for use on testnet as a fake BLAST token
contract TestBlastERC20Token is ERC20 {
    constructor() ERC20("TestBlastERC20Token", "BLAST") {
        // Mint 100 tokens to msg.sender
        _mint(msg.sender, 100 * 10 ** decimals());
    }

    function mint(address user, uint256 amount) external {
        _mint(user, amount);
    }
}
