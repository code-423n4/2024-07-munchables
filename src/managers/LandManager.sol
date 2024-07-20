// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../interfaces/ILandManager.sol";
import "../interfaces/ILockManager.sol";
import "../interfaces/IAccountManager.sol";
import "./BaseBlastManagerUpgradeable.sol";
import "../interfaces/INFTAttributesManager.sol";
import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

contract LandManager is BaseBlastManagerUpgradeable, ILandManager {
    uint256 MIN_TAX_RATE;
    uint256 MAX_TAX_RATE;
    uint256 DEFAULT_TAX_RATE;
    uint256 BASE_SCHNIBBLE_RATE;
    uint256 PRICE_PER_PLOT;
    int16[] REALM_BONUSES;
    uint8[] RARITY_BONUSES;

    // landlord to plot metadata
    mapping(address => PlotMetadata) plotMetadata;
    // landlord to plot id to plot
    mapping(address => mapping(uint256 => Plot)) plotOccupied;
    // token id to original owner
    mapping(uint256 => address) munchableOwner;
    // main account to staked munchables list
    mapping(address => uint256[]) munchablesStaked;
    // token id -> toiler state
    mapping(uint256 => ToilerState) toilerState;

    ILockManager lockManager;
    IAccountManager accountManager;
    IERC721 munchNFT;
    INFTAttributesManager nftAttributesManager;

    constructor() {
        _disableInitializers();
    }

    modifier forceFarmPlots(address _account) {
        _farmPlots(_account);
        _;
    }

    function initialize(address _configStorage) public override initializer {
        BaseBlastManagerUpgradeable.initialize(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        // load config from the config storage contract and configure myself
        lockManager = ILockManager(
            IConfigStorage(configStorage).getAddress(StorageKey.LockManager)
        );
        accountManager = IAccountManager(
            IConfigStorage(configStorage).getAddress(StorageKey.AccountManager)
        );
        munchNFT = IERC721(configStorage.getAddress(StorageKey.MunchNFT));
        nftAttributesManager = INFTAttributesManager(
            IConfigStorage(configStorage).getAddress(
                StorageKey.NFTAttributesManager
            )
        );

        MIN_TAX_RATE = IConfigStorage(configStorage).getUint(
            StorageKey.LockManager
        );
        MAX_TAX_RATE = IConfigStorage(configStorage).getUint(
            StorageKey.AccountManager
        );
        DEFAULT_TAX_RATE = IConfigStorage(configStorage).getUint(
            StorageKey.ClaimManager
        );
        BASE_SCHNIBBLE_RATE = IConfigStorage(configStorage).getUint(
            StorageKey.MigrationManager
        );
        PRICE_PER_PLOT = IConfigStorage(configStorage).getUint(
            StorageKey.NFTOverlord
        );
        REALM_BONUSES = configStorage.getSmallIntArray(StorageKey.RealmBonuses);
        RARITY_BONUSES = configStorage.getSmallUintArray(
            StorageKey.RarityBonuses
        );

        __BaseBlastManagerUpgradeable_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function updateTaxRate(uint256 newTaxRate) external override notPaused {
        (address landlord, ) = _getMainAccountRequireRegistered(msg.sender);
        if (newTaxRate < MIN_TAX_RATE || newTaxRate > MAX_TAX_RATE)
            revert InvalidTaxRateError();
        if (plotMetadata[landlord].lastUpdated == 0)
            revert PlotMetadataNotUpdatedError();
        uint256 oldTaxRate = plotMetadata[landlord].currentTaxRate;
        plotMetadata[landlord].currentTaxRate = newTaxRate;
        emit TaxRateChanged(landlord, oldTaxRate, newTaxRate);
    }

    // Only to be triggered by msg sender if they had locked before the land manager was deployed
    function triggerPlotMetadata() external override notPaused {
        (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);
        if (plotMetadata[mainAccount].lastUpdated != 0)
            revert PlotMetadataTriggeredError();
        plotMetadata[mainAccount] = PlotMetadata({
            lastUpdated: block.timestamp,
            currentTaxRate: DEFAULT_TAX_RATE
        });

        emit UpdatePlotsMeta(mainAccount);
    }

    function updatePlotMetadata(
        address landlord
    ) external override onlyConfiguredContract(StorageKey.AccountManager) {
        if (plotMetadata[landlord].lastUpdated == 0) {
            plotMetadata[landlord] = PlotMetadata({
                lastUpdated: block.timestamp,
                currentTaxRate: DEFAULT_TAX_RATE
            });
        } else {
            plotMetadata[landlord].lastUpdated = block.timestamp;
        }

        emit UpdatePlotsMeta(landlord);
    }

    function stakeMunchable(
        address landlord,
        uint256 tokenId,
        uint256 plotId
    ) external override forceFarmPlots(msg.sender) notPaused {
        (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);
        if (landlord == mainAccount) revert CantStakeToSelfError();
        if (plotOccupied[landlord][plotId].occupied)
            revert OccupiedPlotError(landlord, plotId);
        if (munchablesStaked[mainAccount].length > 10)
            revert TooManyStakedMunchiesError();
        if (munchNFT.ownerOf(tokenId) != mainAccount)
            revert InvalidOwnerError();

        uint256 totalPlotsAvail = _getNumPlots(landlord);
        if (plotId >= totalPlotsAvail) revert PlotTooHighError();

        if (
            !munchNFT.isApprovedForAll(mainAccount, address(this)) &&
            munchNFT.getApproved(tokenId) != address(this)
        ) revert NotApprovedError();
        munchNFT.transferFrom(mainAccount, address(this), tokenId);

        plotOccupied[landlord][plotId] = Plot({
            occupied: true,
            tokenId: tokenId
        });

        munchablesStaked[mainAccount].push(tokenId);
        munchableOwner[tokenId] = mainAccount;

        toilerState[tokenId] = ToilerState({
            lastToilDate: block.timestamp,
            plotId: plotId,
            landlord: landlord,
            latestTaxRate: plotMetadata[landlord].currentTaxRate,
            dirty: false
        });

        emit FarmPlotTaken(toilerState[tokenId], tokenId);
    }

    function unstakeMunchable(
        uint256 tokenId
    ) external override forceFarmPlots(msg.sender) notPaused {
        (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);
        ToilerState memory _toiler = toilerState[tokenId];
        if (_toiler.landlord == address(0)) revert NotStakedError();
        if (munchableOwner[tokenId] != mainAccount) revert InvalidOwnerError();

        plotOccupied[_toiler.landlord][_toiler.plotId] = Plot({
            occupied: false,
            tokenId: 0
        });
        toilerState[tokenId] = ToilerState({
            lastToilDate: 0,
            plotId: 0,
            landlord: address(0),
            latestTaxRate: 0,
            dirty: false
        });
        munchableOwner[tokenId] = address(0);
        _removeTokenIdFromStakedList(mainAccount, tokenId);

        munchNFT.transferFrom(address(this), mainAccount, tokenId);
        emit FarmPlotLeave(_toiler.landlord, tokenId, _toiler.plotId);
    }

    function transferToUnoccupiedPlot(
        uint256 tokenId,
        uint256 plotId
    ) external override forceFarmPlots(msg.sender) notPaused {
        (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);
        ToilerState memory _toiler = toilerState[tokenId];
        uint256 oldPlotId = _toiler.plotId;
        uint256 totalPlotsAvail = _getNumPlots(_toiler.landlord);
        if (_toiler.landlord == address(0)) revert NotStakedError();
        if (munchableOwner[tokenId] != mainAccount) revert InvalidOwnerError();
        if (plotOccupied[_toiler.landlord][plotId].occupied)
            revert OccupiedPlotError(_toiler.landlord, plotId);
        if (plotId >= totalPlotsAvail) revert PlotTooHighError();

        toilerState[tokenId].latestTaxRate = plotMetadata[_toiler.landlord]
            .currentTaxRate;
        plotOccupied[_toiler.landlord][oldPlotId] = Plot({
            occupied: false,
            tokenId: 0
        });
        plotOccupied[_toiler.landlord][plotId] = Plot({
            occupied: true,
            tokenId: tokenId
        });

        emit FarmPlotLeave(_toiler.landlord, tokenId, oldPlotId);
        emit FarmPlotTaken(toilerState[tokenId], tokenId);
    }

    function farmPlots() external override notPaused {
        _farmPlots(msg.sender);
    }

    function _farmPlots(address _sender) internal {
        (
            address mainAccount,
            MunchablesCommonLib.Player memory renterMetadata
        ) = _getMainAccountRequireRegistered(_sender);

        uint256[] memory staked = munchablesStaked[mainAccount];
        MunchablesCommonLib.NFTImmutableAttributes memory immutableAttributes;
        ToilerState memory _toiler;
        uint256 timestamp;
        address landlord;
        uint256 tokenId;
        int256 finalBonus;
        uint256 schnibblesTotal;
        uint256 schnibblesLandlord;
        for (uint8 i = 0; i < staked.length; i++) {
            timestamp = block.timestamp;
            tokenId = staked[i];
            _toiler = toilerState[tokenId];
            if (_toiler.dirty) continue;
            landlord = _toiler.landlord;
            // use last updated plot metadata time if the plot id doesn't fit
            // track a dirty bool to signify this was done once
            // the edge case where this doesnt work is if the user hasnt farmed in a while and the landlord
            // updates their plots multiple times. then the last updated time will be the last time they updated their plot details
            // instead of the first
            if (_getNumPlots(landlord) < _toiler.plotId) {
                timestamp = plotMetadata[landlord].lastUpdated;
                toilerState[tokenId].dirty = true;
            }
            (
                ,
                MunchablesCommonLib.Player memory landlordMetadata
            ) = _getMainAccountRequireRegistered(landlord);

            immutableAttributes = nftAttributesManager.getImmutableAttributes(
                tokenId
            );
            finalBonus =
                int16(
                    REALM_BONUSES[
                        (uint256(immutableAttributes.realm) * 5) +
                            uint256(landlordMetadata.snuggeryRealm)
                    ]
                ) +
                int16(
                    int8(RARITY_BONUSES[uint256(immutableAttributes.rarity)])
                );
            schnibblesTotal =
                (timestamp - _toiler.lastToilDate) *
                BASE_SCHNIBBLE_RATE;
            schnibblesTotal = uint256(
                (int256(schnibblesTotal) +
                    (int256(schnibblesTotal) * finalBonus)) / 100
            );
            schnibblesLandlord =
                (schnibblesTotal * _toiler.latestTaxRate) /
                1e18;

            toilerState[tokenId].lastToilDate = timestamp;
            toilerState[tokenId].latestTaxRate = plotMetadata[_toiler.landlord]
                .currentTaxRate;

            renterMetadata.unfedSchnibbles += (schnibblesTotal -
                schnibblesLandlord);

            landlordMetadata.unfedSchnibbles += schnibblesLandlord;
            landlordMetadata.lastPetMunchable = uint32(timestamp);
            accountManager.updatePlayer(landlord, landlordMetadata);
            emit FarmedSchnibbles(
                _toiler.landlord,
                tokenId,
                _toiler.plotId,
                schnibblesTotal - schnibblesLandlord,
                schnibblesLandlord
            );
        }
        accountManager.updatePlayer(mainAccount, renterMetadata);
    }

    function _removeTokenIdFromStakedList(
        address mainAccount,
        uint256 tokenId
    ) internal {
        uint256 stakedLength = munchablesStaked[mainAccount].length;
        bool found = false;
        for (uint256 i = 0; i < stakedLength; i++) {
            if (munchablesStaked[mainAccount][i] == tokenId) {
                munchablesStaked[mainAccount][i] = munchablesStaked[
                    mainAccount
                ][stakedLength - 1];
                found = true;
                munchablesStaked[mainAccount].pop();
                break;
            }
        }

        if (!found) revert InvalidTokenIdError();
    }

    function _getMainAccountRequireRegistered(
        address _account
    ) internal view returns (address, MunchablesCommonLib.Player memory) {
        (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        ) = accountManager.getPlayer(_account);

        if (_player.registrationDate == 0) revert PlayerNotRegisteredError();
        return (_mainAccount, _player);
    }

    function _getNumPlots(address _account) internal view returns (uint256) {
        return lockManager.getLockedWeightedValue(_account) / PRICE_PER_PLOT;
    }
}
