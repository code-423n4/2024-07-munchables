// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../libraries/MunchablesCommonLib.sol";
import "openzeppelin-contracts-upgradeable/contracts/utils/PausableUpgradeable.sol";

contract OldMunchNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    ERC721PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice next_token_id : Next token id
    uint256 private next_token_id;

    /// @notice minted : Stores the transaction ids which have already been processed
    mapping(address => mapping(bytes32 => bool)) public minted;

    /// @notice account_manager_contract : Account manager contract
    //    IAccountManager public account_manager_contract;

    /// @notice blast_points_contract : Blast Points contract
    //    IBlastPoints public blast_points_contract;

    address migrationManager;

    modifier onlyMigrationManager() {
        require(migrationManager == msg.sender, "Only MigratonManager");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initialize : Initialize function
    /// @param _default_admin : Default admin address
    /// @param _pauser : Pauser address
    /// @param _minter : Minter address
    function initialize(
        address _default_admin,
        address _pauser,
        address _minter,
        address,
        address
    ) public initializer {
        __ERC721_init("Munchables", "MUNCHABLES");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __ERC721Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _default_admin);
        _grantRole(PAUSER_ROLE, _pauser);
        _grantRole(MINTER_ROLE, _minter);

        //        blast_points_contract = IBlastPoints(_blast_points_address);
        //        blast_points_contract.configurePointsOperator(_points_operator);

        next_token_id = 1;
    }

    /// @notice pause : Pause the contract
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice unpause : Unpause the contract
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function burn(uint256 _tokenId) public onlyMigrationManager {
        _unpause();
        _burn(_tokenId);
        _pause();
    }

    /// @notice configureContract : Configure the contract
    /// @param _account_manager : Account manager address
    function configureContract(
        address _account_manager
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        //        account_manager_contract = IAccountManager(_account_manager);
        //        emit ContractConfigured(_account_manager);
    }

    function setMigrationManager(
        address _migrationManager
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        migrationManager = _migrationManager;
    }

    /// @notice revealNFT : Reveals an NFT for a given account by admin
    /// @param _account : The address of the account to reveal the NFT for
    /// @param _token_uri : The ID of the token
    /// @param _tx_hash : The hash of the transaction
    function revealNFT(
        address _account,
        string memory _token_uri,
        bytes32 _tx_hash,
        bytes memory _signature,
        MunchablesCommonLib.Realm _realm,
        MunchablesCommonLib.Rarity _rarity,
        uint16 _species
    ) public onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        /*require(
            !minted[_account][_tx_hash],
            "MunchableNFT : NFT already revealed"
        );
        minted[_account][_tx_hash] = true;

        account_manager_contract.revealedNFT(_account);

        uint256 tokenId = next_token_id++;
        _safeMint(_account, tokenId);
        _setTokenURI(tokenId, _token_uri);

        emit RevealNFT(
            _account,
            tokenId,
            _token_uri,
            _tx_hash,
            _realm,
            _rarity,
            _species
        );*/
    }

    /// @notice setURI : Sets the token URI and emits the ERC-4906 event MetadataUpdate
    /// @param _token_id : The ID of the token
    /// @param _token_uri : The new URI for the token
    function setURI(
        uint256 _token_id,
        string memory _token_uri
    ) public onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        /*bool exist = false;
        try this.ownerOf(_token_id) {
            exist = true;
        } catch {
            exist = false;
        }
        require(exist, "MunchableNFT : URI set of nonexistent token");

        _setTokenURI(_token_id, _token_uri);

        emit SetURI(_token_id, _token_uri);*/
    }

    /// @notice fetchTokens : Fetches the tokens and URIs of a given account
    /// @param _account : The address of the account
    /// @return _tokens : The tokens of the account
    /// @return _uris : The URIs of the account
    function fetchTokens(
        address _account
    ) public view returns (uint256[] memory _tokens, string[] memory _uris) {
        uint256[] memory tokens = new uint256[](balanceOf(_account));
        string[] memory uris = new string[](balanceOf(_account));

        uint256 balanceOfAccount = balanceOf(_account);
        for (uint256 i = 0; i < balanceOfAccount; ++i) {
            tokens[i] = tokenOfOwnerByIndex(_account, i);
            uris[i] = tokenURI(tokens[i]);
        }

        return (tokens, uris);
    }

    /// @notice safeMint : Safely mints a new NFT and assigns it to the specified address
    /// @param _to : The address to which the NFT will be assigned
    /// @param _uri : The URI of the NFT's metadata
    function safeMint(
        address _to,
        string memory _uri
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 tokenId = next_token_id++;
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _uri);

        emit Minted(_to, tokenId, _uri);
    }

    /// @notice _baseURI : Returns the base URI for all token URIs
    /// @return _base_uri : The base URI
    function _baseURI()
        internal
        pure
        override
        returns (string memory _base_uri)
    {
        return "ipfs://";
    }

    /// @notice _update : Overrides required by Solidity
    /// @param _to : Address to
    /// @param _tokenId : token id
    /// @param _auth : Address auth
    function _update(
        address _to,
        uint256 _tokenId,
        address _auth
    )
        internal
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            ERC721PausableUpgradeable
        )
        returns (address)
    {
        return super._update(_to, _tokenId, _auth);
    }

    /// @notice _increaseBalance : Overrides required by Solidity
    /// @param _account : Account address
    /// @param _value : Value
    function _increaseBalance(
        address _account,
        uint128 _value
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._increaseBalance(_account, _value);
    }

    /// @notice tokenURI : Returns the URI for a given token ID
    /// @param _token_id : The ID of the token
    /// @return _uri : The URI of the token
    function tokenURI(
        uint256 _token_id
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory _uri)
    {
        return super.tokenURI(_token_id);
    }

    /// @notice supportsInterface : Checks if the contract supports a given interface
    /// @param _interface_id : The interface identifier
    /// @return _supported : A boolean value indicating whether the contract supports the interface
    function supportsInterface(
        bytes4 _interface_id
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            ERC721URIStorageUpgradeable,
            AccessControlUpgradeable
        )
        returns (bool _supported)
    {
        return super.supportsInterface(_interface_id);
    }

    event ContractConfigured(address _account_manager);
    event Minted(address indexed _to, uint256 indexed _token_id, string _uri);
    event SetURI(uint256 indexed _token_id, string _uri);
    event RevealNFT(
        address indexed _account,
        uint256 indexed _token_id,
        string _token_uri,
        bytes32 _tx_hash,
        MunchablesCommonLib.Realm _realm,
        MunchablesCommonLib.Rarity _rarity,
        uint16 _species
    );
}
