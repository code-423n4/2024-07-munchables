// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

interface IMunchNFT {
    /// @notice Get the next token ID
    /// @return The next token ID
    function nextTokenId() external view returns (uint256);

    /// @notice Mint a new, empty token.  Restrict access to only the NFTOverlord
    /// @param _owner The owner of the newly minted NFT
    function mint(address _owner) external returns (uint256 _tokenId);

    /// @notice Update the token URL, restricted to off-chain role
    /// @param _tokenId The token ID to update
    /// @param _tokenURI The new URI, will be an IPFS hash
    function setTokenURI(uint256 _tokenId, string memory _tokenURI) external;

    /// @notice Blacklist an account from transferring tokens
    /// @param _account The account to blacklist
    function blAccount(address _account) external;

    /// @notice Blacklist an token from being transferred
    /// @param _tokenId The token ID to blacklist
    function blToken(uint256 _tokenId) external;

    /// @notice Remove blacklist for an account
    /// @param _account The account to remove from the blacklist
    function removeBlAccount(address _account) external;

    /// @notice Remove blacklist on a token
    /// @param _tokenId The token ID to remove from the blacklist
    function removeBlToken(uint256 _tokenId) external;

    /// @notice Error when a blacklisted account/token tries to transfer
    error ForbiddenTransferError();
}
