// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IMigrationManager.sol";
import "../interfaces/ILockManager.sol";
import "../interfaces/IMunchNFT.sol";
import "../interfaces/INFTAttributesManager.sol";
import "../interfaces/IClaimManager.sol";
import "../interfaces/IRNGProxy.sol";
import "../interfaces/IBonusManager.sol";
import "../interfaces/ISnuggeryManager.sol";
import "../interfaces/ILandManager.sol";
import "./BaseBlastManagerUpgradeable.sol";

contract AccountManager is BaseBlastManagerUpgradeable, IAccountManager {
    uint16 MAX_SCHNIBBLE_SPRAY;

    mapping(address => MunchablesCommonLib.Player) players;

    mapping(address => address) public mainAccounts;
    mapping(address => address[]) public subAccounts;

    mapping(address => SprayProposal) public sprayProposals;
    mapping(address => uint256) public unclaimedSchnibbles;
    mapping(address => bool) internal _tempSprayPlayerCheck;

    ILockManager lockManager;
    IMigrationManager migrationManager;
    INFTAttributesManager nftAttributesManager;
    IRNGProxy rngProxy;
    IBonusManager bonusManager;
    ISnuggeryManager snuggeryManager;

    uint256 maxRewardSpray;

    ILandManager landManager;

    modifier onlyUnregistered(address account) {
        if (players[account].registrationDate != 0)
            revert PlayerAlreadyRegisteredError();
        _;
    }

    modifier onlyRegistered(address account) {
        if (players[account].registrationDate == 0)
            revert PlayerNotRegisteredError();
        _;
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
        lockManager = ILockManager(
            configStorage.getAddress(StorageKey.LockManager)
        );
        //        munchNFT = IMunchNFT(configStorage.getAddress(StorageKey.MunchNFT));
        migrationManager = IMigrationManager(
            configStorage.getAddress(StorageKey.MigrationManager)
        );
        rngProxy = IRNGProxy(
            configStorage.getAddress(StorageKey.RNGProxyContract)
        );
        nftAttributesManager = INFTAttributesManager(
            configStorage.getAddress(StorageKey.NFTAttributesManager)
        );
        bonusManager = IBonusManager(
            configStorage.getAddress(StorageKey.BonusManager)
        );
        snuggeryManager = ISnuggeryManager(
            configStorage.getAddress(StorageKey.SnuggeryManager)
        );

        MAX_SCHNIBBLE_SPRAY = uint16(
            configStorage.getSmallInt(StorageKey.MaxSchnibbleSpray)
        ); // 100

        // Min ETH Pet bonus = artifact, unused
        maxRewardSpray = configStorage.getUint(StorageKey.MinETHPetBonus);

        landManager = ILandManager(
            // signifies landmanager
            configStorage.getAddress(StorageKey.PrimordialsEnabled)
        );

        __BaseBlastManagerUpgradeable_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    /// @inheritdoc IAccountManager
    function register(
        MunchablesCommonLib.Realm _snuggeryRealm,
        address _referrer
    ) external onlyUnregistered(msg.sender) {
        if (mainAccounts[msg.sender] != address(0))
            _removeSubAccount(mainAccounts[msg.sender], msg.sender);
        if (_snuggeryRealm >= MunchablesCommonLib.Realm.Invalid)
            revert InvalidRealmError();
        if (_referrer == msg.sender) revert SelfReferralError();

        MunchablesCommonLib.Player memory player;
        player.registrationDate = uint32(block.timestamp);
        player.maxSnuggerySize = uint16(
            configStorage.getSmallInt(StorageKey.DefaultSnuggerySize)
        );
        player.snuggeryRealm = _snuggeryRealm;
        player.referrer = _referrer;
        player.lastHarvestDate = uint32(block.timestamp);
        if (unclaimedSchnibbles[msg.sender] != 0) {
            player.unfedSchnibbles = unclaimedSchnibbles[msg.sender];
            delete unclaimedSchnibbles[msg.sender];
        }

        players[msg.sender] = player;

        emit PlayerRegistered(msg.sender, _snuggeryRealm, _referrer);
    }

    /// @inheritdoc IAccountManager
    function harvest() external notPaused returns (uint256 _harvested) {
        address _caller = _getMainAccountRequireRegistered(msg.sender);
        _harvested = _harvest(_caller);
    }

    /// @inheritdoc IAccountManager
    function forceHarvest(
        address _player
    )
        external
        onlyConfiguredContract2(
            StorageKey.LockManager,
            StorageKey.MunchadexManager
        )
    {
        (, MunchablesCommonLib.Player memory player) = this.getPlayer(_player);
        if (player.registrationDate != 0) {
            _harvest(_player);
            if (
                msg.sender == configStorage.getAddress(StorageKey.LockManager)
            ) {
                landManager.updatePlotMetadata(_player);
            }
        }
    }

    /// @inheritdoc IAccountManager
    function spraySchnibblesPropose(
        address[] calldata _players,
        uint256[] calldata _schnibbles
    )
        external
        onlyOneOfRoles(
            [
                Role.Social_1,
                Role.Social_2,
                Role.Social_3,
                Role.Social_4,
                Role.Social_5
            ]
        )
    {
        address proposer = msg.sender;
        uint256 numberEntries = _players.length;

        if (numberEntries == 0) revert EmptyParameterError();
        if (numberEntries != _schnibbles.length)
            revert UnMatchedParametersError();
        if (numberEntries > uint256(MAX_SCHNIBBLE_SPRAY))
            revert TooManyEntriesError();
        if (sprayProposals[proposer].proposedDate > 0)
            revert ExistingProposalError();

        delete sprayProposals[proposer];

        uint256 i;
        for (; i < numberEntries; i++) {
            _tempSprayPlayerCheck[_players[i]] = false;
        }

        sprayProposals[proposer].proposedDate = uint32(block.timestamp);
        for (i = 0; i < numberEntries; i++) {
            if (_tempSprayPlayerCheck[_players[i]])
                revert DuplicateSprayerError();
            sprayProposals[proposer].squirts.push(
                Squirt({player: _players[i], schnibbles: _schnibbles[i]})
            );
            _tempSprayPlayerCheck[_players[i]] = true;
        }
    }

    /// @inheritdoc IAccountManager
    function execSprayProposal(
        address _proposer
    )
        external
        onlyOneOfRoles(
            [
                Role.SocialApproval_1,
                Role.SocialApproval_2,
                Role.SocialApproval_3,
                Role.SocialApproval_4,
                Role.SocialApproval_5
            ]
        )
    {
        if (sprayProposals[_proposer].proposedDate == 0)
            revert EmptyProposalError();
        uint256 numberEntries = sprayProposals[_proposer].squirts.length;
        for (uint256 i; i < numberEntries; i++) {
            address player = sprayProposals[_proposer].squirts[i].player;
            uint256 schnibbles = sprayProposals[_proposer]
                .squirts[i]
                .schnibbles;

            if (players[player].registrationDate != 0) {
                players[player].unfedSchnibbles += schnibbles;
            } else {
                unclaimedSchnibbles[player] += schnibbles;
            }

            emit SchnibblesSprayed(player, schnibbles);
        }

        delete sprayProposals[_proposer];

        emit SprayProposalExecuted(_proposer);
    }

    /// @inheritdoc IAccountManager
    function removeSprayProposal(
        address _proposer
    )
        external
        onlyOneOfRoles(
            [
                Role.SocialApproval_1,
                Role.SocialApproval_2,
                Role.SocialApproval_3,
                Role.SocialApproval_4,
                Role.SocialApproval_5
            ]
        )
    {
        delete sprayProposals[_proposer];

        emit SprayProposalRemoved(_proposer);
    }

    function rewardSpray(
        address _player,
        uint256 _schnibbles
    )
        external
        // NFTOracle = Reward EOA
        onlyRole(Role.NFTOracle)
    {
        if (_schnibbles == 0) revert EmptyProposalError();
        if (_schnibbles > maxRewardSpray) revert TooHighSprayAmountError();
        if (players[_player].registrationDate != 0) {
            players[_player].unfedSchnibbles += _schnibbles;
        } else {
            unclaimedSchnibbles[_player] += _schnibbles;
        }

        emit SchnibblesSprayed(_player, _schnibbles);
    }

    function removeSpray(
        address _player,
        uint256 _schnibbles
    )
        external
        // NFTOracle = Reward EOA
        onlyRole(Role.NFTOracle)
    {
        if (players[_player].registrationDate != 0) {
            players[_player].unfedSchnibbles -= _schnibbles;
        } else {
            unclaimedSchnibbles[_player] -= _schnibbles;
        }

        emit SchnibblesSprayedRemoved(_player, _schnibbles);
    }

    /// @inheritdoc IAccountManager
    function addSubAccount(
        address _subAccount
    )
        external
        notPaused
        onlyRegistered(msg.sender)
        onlyUnregistered(_subAccount)
    {
        if (subAccounts[msg.sender].length >= 5)
            revert TooManySubAccountsError();
        if (mainAccounts[_subAccount] != address(0))
            revert SubAccountAlreadyRegisteredError();
        mainAccounts[_subAccount] = msg.sender;
        for (uint256 i; i < subAccounts[msg.sender].length; i++) {
            if (subAccounts[msg.sender][i] == _subAccount)
                revert SubAccountAlreadyRegisteredError();
        }
        subAccounts[msg.sender].push(_subAccount);

        emit SubAccountAdded(msg.sender, _subAccount);
    }

    /// @inheritdoc IAccountManager
    function removeSubAccount(
        address _subAccount
    ) external notPaused onlyRegistered(msg.sender) {
        _removeSubAccount(msg.sender, _subAccount);
    }

    function _removeSubAccount(
        address _mainAccount,
        address _subAccount
    ) internal {
        delete mainAccounts[_subAccount];
        uint256 subAccountLength = subAccounts[_mainAccount].length;
        bool found = false;
        for (uint256 i = 0; i < subAccountLength; i++) {
            if (subAccounts[_mainAccount][i] == _subAccount) {
                subAccounts[_mainAccount][i] = subAccounts[_mainAccount][
                    subAccountLength - 1
                ];
                found = true;
                subAccounts[_mainAccount].pop();
                break;
            }
        }

        if (!found) revert SubAccountNotRegisteredError();

        emit SubAccountRemoved(_mainAccount, _subAccount);
    }

    /// @inheritdoc IAccountManager
    function updatePlayer(
        address _account,
        MunchablesCommonLib.Player calldata _player
    )
        external
        onlyConfiguredContract3(
            StorageKey.SnuggeryManager,
            StorageKey.PrimordialManager,
            // Signifies LandManager
            StorageKey.PrimordialsEnabled
        )
    {
        players[_account] = _player;
    }

    /// @inheritdoc IAccountManager
    function getMainAccount(
        address _maybeSubAccount
    ) external view returns (address _mainAccount) {
        _mainAccount = _getMainAccount(_maybeSubAccount);
    }

    /// @inheritdoc IAccountManager
    //noinspection NoReturn
    function getSubAccounts(
        address _player,
        uint256 _start
    ) external view returns (address[20] memory _subAccounts, bool _more) {
        uint256 subAccountsLength = subAccounts[_player].length;
        _more = false;

        uint256 MAX_SUB = 20;
        for (uint256 i = _start; i < _start + MAX_SUB; i++) {
            if (i >= subAccountsLength) break;
            _subAccounts[i] = subAccounts[_player][i];
        }

        if (subAccountsLength > _start + MAX_SUB) {
            _more = true;
        }
    }

    /// @inheritdoc IAccountManager
    function getPlayer(
        address _account
    )
        external
        view
        returns (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        )
    {
        address _caller = _getMainAccount(_account);
        _player = players[_caller];
        _mainAccount = _caller;
    }

    /// @inheritdoc IAccountManager
    function getFullPlayerData(
        address _account
    )
        external
        view
        returns (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player,
            MunchablesCommonLib.SnuggeryNFT[] memory _snuggery
        )
    {
        _mainAccount = _getMainAccount(_account);
        _player = players[_mainAccount];

        _snuggery = snuggeryManager.getSnuggery(_mainAccount);
    }

    /// @inheritdoc IAccountManager
    function getDailySchnibbles(
        address _caller
    ) public view returns (uint256 _dailySchnibbles, uint256 _bonus) {
        uint256 weightedValue = lockManager.getLockedWeightedValue(_caller);
        // Arbitrary division here... If we remove it, we just need to make sure we modify level thresholds, & social/pet bonuses
        _dailySchnibbles = (weightedValue / 10);
        _bonus = bonusManager.getHarvestBonus(_caller);
    }

    function _harvest(address _caller) private returns (uint256 _harvested) {
        (uint256 dailySchnibbles, uint256 bonus) = getDailySchnibbles(_caller);
        dailySchnibbles += ((dailySchnibbles * bonus) / 1e18);

        uint256 secondsToClaim = block.timestamp -
            players[_caller].lastHarvestDate;
        uint256 harvestedSchnibbles = (dailySchnibbles * secondsToClaim) /
            1 days;

        players[_caller].unfedSchnibbles += harvestedSchnibbles;
        players[_caller].lastHarvestDate = uint32(block.timestamp);

        _harvested = harvestedSchnibbles;
        emit Harvested(_caller, harvestedSchnibbles);
    }

    function _getMainAccount(
        address _maybeSubAccount
    ) internal view returns (address _mainAccount) {
        _mainAccount = mainAccounts[_maybeSubAccount];
        if (_mainAccount == address(0)) {
            _mainAccount = _maybeSubAccount;
        }
    }

    function _getMainAccountRequireRegistered(
        address _maybeSubAccount
    ) internal view returns (address _mainAccount) {
        _mainAccount = _getMainAccount(_maybeSubAccount);
        if (players[_mainAccount].registrationDate == 0)
            revert MainAccountNotRegisteredError(_mainAccount);
    }
}
