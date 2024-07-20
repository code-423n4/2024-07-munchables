// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IMunchNFT.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IMigrationManager.sol";
import "../managers/BaseBlastManager.sol";
import "../interfaces/IMunchadexManager.sol";

contract MunchNFT is
    IMunchNFT,
    BaseBlastManager,
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ReentrancyGuard
{
    /// @notice nextTokenId : Next token id
    uint256 public nextTokenId = 1;

    IAccountManager public accountManager;
    IMigrationManager public migrationManager;
    IMunchadexManager public munchadexManager;

    mapping(address => bool) _blacklistAccount;
    mapping(uint256 => bool) _blacklistToken;

    constructor(
        address _configStorage,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
    }

    function _reconfigure() internal {
        accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );
        migrationManager = IMigrationManager(
            configStorage.getAddress(StorageKey.MigrationManager)
        );
        munchadexManager = IMunchadexManager(
            configStorage.getAddress(StorageKey.MunchadexManager)
        );

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function mint(
        address _owner
    )
        external
        onlyConfiguredContract(StorageKey.NFTOverlord)
        notPaused
        returns (uint256 _tokenId)
    {
        uint256 tokenId = nextTokenId++;
        _mint(_owner, tokenId);
        _tokenId = tokenId;
    }

    function setTokenURI(
        uint256 _tokenId,
        string memory _tokenURI
    ) external onlyRole(Role.NFTOracle) {
        _setTokenURI(_tokenId, _tokenURI);
    }

    function blAccount(address _account) external onlyAdmin {
        _blacklistAccount[_account] = true;
    }

    function blToken(uint256 _tokenId) external onlyAdmin {
        _blacklistToken[_tokenId] = true;
    }

    function removeBlAccount(address _account) external onlyAdmin {
        _blacklistAccount[_account] = false;
    }

    function removeBlToken(uint256 _tokenId) external onlyAdmin {
        _blacklistToken[_tokenId] = false;
    }

    function _baseURI()
        internal
        pure
        override
        returns (string memory _baseUri)
    {
        return "ipfs://";
    }

    function _update(
        address _to,
        uint256 _tokenId,
        address _auth
    ) internal override(ERC721, ERC721Enumerable) notPaused returns (address) {
        address from = _ownerOf(_tokenId);
        munchadexManager.updateMunchadex(from, _to, _tokenId);
        // check the token or the sender are not blacklisted
        if (_blacklistAccount[from] || _blacklistToken[_tokenId])
            revert ForbiddenTransferError();

        return super._update(_to, _tokenId, _auth);
    }

    function _increaseBalance(
        address _account,
        uint128 _value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(_account, _value);
    }

    function tokenURI(
        uint256 _tokenId
    )
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory _uri)
    {
        return super.tokenURI(_tokenId);
    }

    function supportsInterface(
        bytes4 _interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool _supported)
    {
        return super.supportsInterface(_interfaceId);
    }
}
