// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/INFTAttributesManager.sol";
import "../interfaces/IBonusManager.sol";
import "../interfaces/IRNGProxy.sol";
import "../interfaces/ISnuggeryManager.sol";
import "../interfaces/IClaimManager.sol";
import "../interfaces/IMunchNFT.sol";
import "../interfaces/INFTOverlord.sol";
import "./BaseBlastManagerUpgradeable.sol";

contract SnuggeryManager is BaseBlastManagerUpgradeable, ISnuggeryManager {
    uint16 DEFAULT_SNUGGERY_SIZE;
    uint16 MAX_SNUGGERY_SIZE;
    uint256 PET_TOTAL_SCHNIBBLES;
    uint256 NEW_SLOT_COST;

    mapping(address => MunchablesCommonLib.SnuggeryNFT[]) snuggeries;

    uint256 totalGlobalChonk;
    mapping(address => uint256) playerChonks;

    address munchNFT;
    IClaimManager claimManager;
    INFTAttributesManager nftAttributesManager;
    IAccountManager accountManager;
    IBonusManager bonusManager;
    INFTOverlord nftOverlord;

    modifier chonkUpdated() {
        (address _player, ) = _getMainAccountRequireRegistered(msg.sender);
        claimManager.forceClaimPoints(_player);
        _;
        _recalculateChonks(_player);
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address _configStorage) public override initializer {
        BaseBlastManagerUpgradeable.initialize(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        // load config from the config storage contract and configure myself
        accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );
        claimManager = IClaimManager(
            configStorage.getAddress(StorageKey.ClaimManager)
        );
        munchNFT = configStorage.getAddress(StorageKey.MunchNFT);
        nftAttributesManager = INFTAttributesManager(
            configStorage.getAddress(StorageKey.NFTAttributesManager)
        );
        bonusManager = IBonusManager(
            configStorage.getAddress(StorageKey.BonusManager)
        );
        nftOverlord = INFTOverlord(
            configStorage.getAddress(StorageKey.NFTOverlord)
        );

        DEFAULT_SNUGGERY_SIZE = uint16(
            configStorage.getSmallInt(StorageKey.DefaultSnuggerySize)
        ); // 6
        MAX_SNUGGERY_SIZE = uint16(
            configStorage.getSmallInt(StorageKey.MaxSnuggerySize)
        ); // 12
        PET_TOTAL_SCHNIBBLES = configStorage.getUint(
            StorageKey.PetTotalSchnibbles
        ); // 10e18 / 72
        NEW_SLOT_COST = configStorage.getUint(StorageKey.NewSlotCost); // 1000e18 = 1000 munch points

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    /// @inheritdoc ISnuggeryManager
    function importMunchable(uint256 _tokenId) external notPaused chonkUpdated {
        if (_tokenId < 1) revert InvalidTokenIDError();
        (
            address _caller,
            MunchablesCommonLib.Player memory _player
        ) = _getMainAccountRequireRegistered(msg.sender);
        // transfer nft to contract
        IERC721 erc721Token = IERC721(munchNFT);
        // chech main account is actually owner
        if (erc721Token.ownerOf(_tokenId) != _caller)
            revert InvalidOwnerError();
        // Check for approval
        if (
            !erc721Token.isApprovedForAll(_caller, address(this)) &&
            erc721Token.getApproved(_tokenId) != address(this)
        ) revert NotApprovedError();
        erc721Token.transferFrom(_caller, address(this), _tokenId);

        // add to the snuggery
        if (snuggeries[_caller].length >= _player.maxSnuggerySize)
            revert SnuggeryFullError();

        snuggeries[_caller].push(
            MunchablesCommonLib.SnuggeryNFT(_tokenId, uint32(block.timestamp))
        );

        emit MunchableImported(_caller, _tokenId);
    }

    /// @inheritdoc ISnuggeryManager
    function exportMunchable(uint256 _tokenId) external notPaused chonkUpdated {
        (address _caller, ) = _getMainAccountRequireRegistered(msg.sender);

        IERC721 erc721Token = IERC721(munchNFT);
        // send nft back
        if (erc721Token.ownerOf(_tokenId) != address(this))
            revert MunchableNotInSnuggeryError();
        erc721Token.transferFrom(address(this), _caller, _tokenId);

        // check we have the correct token
        (bool _found, uint256 _index) = _findSnuggeryIndex(_caller, _tokenId);
        if (!_found) revert MunchableNotInSnuggeryError();

        // remove item in snuggery
        uint256 snuggeryLength = snuggeries[_caller].length;
        for (uint256 i = _index; i < snuggeryLength - 1; i++) {
            snuggeries[_caller][i] = snuggeries[_caller][i + 1];
        }
        snuggeries[_caller].pop();

        emit MunchableExported(_caller, _tokenId);
    }

    /// @inheritdoc ISnuggeryManager
    function feed(
        uint256 _tokenId,
        uint256 _schnibbles
    ) external notPaused chonkUpdated {
        (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        ) = _getMainAccountRequireRegistered(msg.sender);

        if (_player.unfedSchnibbles < _schnibbles)
            revert InsufficientSchnibblesError(_player.unfedSchnibbles);

        // find token in snuggery
        (bool found, ) = _findSnuggeryIndex(_mainAccount, _tokenId);
        if (!found) revert TokenNotFoundInSnuggeryError();

        int256 bonusPercent = bonusManager.getFeedBonus(_mainAccount, _tokenId);

        int256 bonusSchnibbles = (int256(_schnibbles) * bonusPercent) / 1e18;

        // Set new attributes
        MunchablesCommonLib.NFTAttributes
            memory currentAttributes = nftAttributesManager.getAttributes(
                _tokenId
            );
        currentAttributes.chonks += uint256(
            int256(_schnibbles) + bonusSchnibbles
        );
        nftAttributesManager.setAttributes(_tokenId, currentAttributes);

        // deduct from unfed
        _player.unfedSchnibbles -= _schnibbles;
        accountManager.updatePlayer(_mainAccount, _player);

        // notify nftOverlord
        nftOverlord.munchableFed(_tokenId, _mainAccount);

        emit MunchableFed(_mainAccount, _tokenId, _schnibbles, bonusSchnibbles);
    }

    /// @inheritdoc ISnuggeryManager
    function increaseSnuggerySize(uint8 _quantity) external notPaused {
        (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        ) = _getMainAccountRequireRegistered(msg.sender);

        if (NEW_SLOT_COST == 0) revert NotConfiguredError();

        uint16 previousSize = _player.maxSnuggerySize;
        if (previousSize >= MAX_SNUGGERY_SIZE) revert SnuggeryMaxSizeError();

        uint256 pointsCost = NEW_SLOT_COST * uint256(_quantity);

        claimManager.spendPoints(_mainAccount, pointsCost);

        _player.maxSnuggerySize += uint16(_quantity);
        accountManager.updatePlayer(_mainAccount, _player);

        emit SnuggerySizeIncreased(
            _mainAccount,
            previousSize,
            _player.maxSnuggerySize
        );
    }

    /// @inheritdoc ISnuggeryManager
    function pet(address _pettedOwner, uint256 _tokenId) external notPaused {
        (
            address _petterMainAccount,
            MunchablesCommonLib.Player memory _petterPlayer
        ) = _getMainAccountRequireRegistered(msg.sender);
        (
            address _pettedMainAccount,
            MunchablesCommonLib.Player memory _pettedPlayer
        ) = _getMainAccountRequireRegistered(_pettedOwner);
        if (_pettedMainAccount != _pettedOwner) revert PettedIsSubAccount();

        (bool _found, ) = _findSnuggeryIndex(_pettedOwner, _tokenId);
        if (!_found) revert TokenNotFoundInSnuggeryError();

        MunchablesCommonLib.NFTAttributes
            memory pettedAttributes = nftAttributesManager.getAttributes(
                _tokenId
            );

        if (_pettedMainAccount == _petterMainAccount)
            revert CannotPetOwnError();

        if (pettedAttributes.lastPettedTime + 5 minutes > block.timestamp)
            revert PettedTooSoonError();
        if (_petterPlayer.lastPetMunchable + 10 minutes > block.timestamp)
            revert PetTooSoonError();

        // give out total of 11 per pet, 5 to petter and 6 to petted, boosted by the petter having locked tokens
        uint256 bonusPercent = bonusManager.getPetBonus(_petterMainAccount);

        uint256 bonusSchnibbles = (PET_TOTAL_SCHNIBBLES * bonusPercent) / 1e18;
        uint256 totalSchnibbles = PET_TOTAL_SCHNIBBLES +
            uint256(bonusSchnibbles);
        uint256 petterSchnibbles = ((totalSchnibbles * 5) / 11) * 1e18;
        uint256 pettedSchnibbles = ((totalSchnibbles * 6) / 11) * 1e18;

        _pettedPlayer.unfedSchnibbles += pettedSchnibbles;
        accountManager.updatePlayer(_pettedMainAccount, _pettedPlayer);

        _petterPlayer.unfedSchnibbles += petterSchnibbles;
        _petterPlayer.lastPetMunchable = uint32(block.timestamp);
        accountManager.updatePlayer(_petterMainAccount, _petterPlayer);

        // updated petted nft attributes
        pettedAttributes.lastPettedTime = uint32(block.timestamp);
        nftAttributesManager.setAttributes(_tokenId, pettedAttributes);

        emit MunchablePetted(
            _petterMainAccount,
            _pettedMainAccount,
            _tokenId,
            petterSchnibbles,
            pettedSchnibbles
        );
    }

    function getSnuggery(
        address _account
    )
        external
        view
        returns (MunchablesCommonLib.SnuggeryNFT[] memory _snuggery)
    {
        (address _player, ) = accountManager.getPlayer(_account);

        uint256 _snuggerySize = snuggeries[_player].length;
        _snuggery = new MunchablesCommonLib.SnuggeryNFT[](_snuggerySize);
        for (uint256 i = 0; i < _snuggerySize; i++) {
            MunchablesCommonLib.SnuggeryNFT memory snuggeryNFT = snuggeries[
                _player
            ][i];
            _snuggery[i].tokenId = snuggeryNFT.tokenId;
            _snuggery[i].importedDate = snuggeryNFT.importedDate;
        }
    }

    /// @inheritdoc ISnuggeryManager
    function getTotalChonk(
        address _player
    ) external view returns (uint256 _totalChonk) {
        MunchablesCommonLib.SnuggeryNFT[] memory snuggery = snuggeries[_player];
        for (uint8 i; i < snuggery.length; i++) {
            _totalChonk += nftAttributesManager
                .getAttributes(snuggery[i].tokenId)
                .chonks;
        }
    }

    /// @inheritdoc ISnuggeryManager
    function getGlobalTotalChonk()
        external
        view
        returns (uint256 _totalGlobalChonk)
    {
        _totalGlobalChonk = totalGlobalChonk;
    }

    function _findSnuggeryIndex(
        address _player,
        uint256 _tokenId
    ) internal view returns (bool _found, uint256 _index) {
        uint256 snuggeryLength = snuggeries[_player].length;
        for (uint256 i; i < snuggeryLength; i++) {
            if (_tokenId == snuggeries[_player][i].tokenId) {
                _found = true;
                _index = i;
                break;
            }
        }
    }

    function _getMainAccountRequireRegistered(
        address _account
    )
        internal
        view
        returns (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        )
    {
        (_mainAccount, _player) = accountManager.getPlayer(_account);

        if (_player.registrationDate == 0) revert PlayerNotRegisteredError();
    }

    function _recalculateChonks(address _player) internal {
        uint256 previousChonks = playerChonks[_player];
        uint256 _playerChonks;
        for (uint256 i; i < snuggeries[_player].length; i++) {
            _playerChonks += nftAttributesManager
                .getAttributes(snuggeries[_player][i].tokenId)
                .chonks;
        }
        playerChonks[_player] = _playerChonks;

        if (previousChonks != _playerChonks) {
            totalGlobalChonk += _playerChonks;
            totalGlobalChonk -= previousChonks;
        }
    }
}
