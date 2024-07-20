// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ILockManager.sol";
import "../interfaces/IConfigStorage.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IMigrationManager.sol";
import "./BaseBlastManager.sol";
import "../interfaces/ISnuggeryManager.sol";
import "../interfaces/INFTOverlord.sol";

contract LockManager is BaseBlastManager, ILockManager, ReentrancyGuard {
    /// @notice Threshold for executing a proposal
    uint8 APPROVE_THRESHOLD = 3;
    /// @notice Threshold for removing a proposal
    uint8 DISAPPROVE_THRESHOLD = 3;
    /// @notice Tokens configured on the contract
    mapping(address => ConfiguredToken) public configuredTokens;
    /// @notice Index of token contracts for easy enumerating
    address[] public configuredTokenContracts;
    /// @notice Player's currently locked tokens, can be multiple. Indexed by player then token contract
    mapping(address => mapping(address => LockedToken)) public lockedTokens;
    /// @notice Lock settings for each player
    mapping(address => PlayerSettings) playerSettings;
    /// @notice Current lockdrop start and end
    Lockdrop public lockdrop;
    /// @notice Current USD update proposal
    USDUpdateProposal usdUpdateProposal;
    /// @notice Used to make sure each approval is unique to a particular proposal
    uint32 private _usdProposalId;

    /// @notice Reference to the AccountManager contract
    IAccountManager public accountManager;

    /// @notice Reference to the SnuggeryManager.sol contract
    ISnuggeryManager public snuggeryManager;

    /// @notice Reference to the MigrationManager contract
    IMigrationManager public migrationManager;

    /// @notice Reference to the NFTOverlord contract to notify of unrevealed NFTs
    INFTOverlord public nftOverlord;

    /// @notice Token supplied must be configured but can be inactive
    modifier onlyConfiguredToken(address _tokenContract) {
        if (configuredTokens[_tokenContract].nftCost == 0)
            revert TokenNotConfiguredError();
        _;
    }

    /// @notice Token supplied must be configured and active
    modifier onlyActiveToken(address _tokenContract) {
        if (!configuredTokens[_tokenContract].active)
            revert TokenNotConfiguredError();
        _;
    }

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );

        migrationManager = IMigrationManager(
            configStorage.getAddress(StorageKey.MigrationManager)
        );

        snuggeryManager = ISnuggeryManager(
            configStorage.getAddress(StorageKey.SnuggeryManager)
        );

        nftOverlord = INFTOverlord(
            configStorage.getAddress(StorageKey.NFTOverlord)
        );

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    fallback() external payable {
        revert LockManagerInvalidCallError();
    }

    receive() external payable {
        revert LockManagerRefuseETHError();
    }

    /// @inheritdoc ILockManager
    function configureLockdrop(
        Lockdrop calldata _lockdropData
    ) external onlyAdmin {
        if (_lockdropData.end < block.timestamp)
            revert LockdropEndedError(
                _lockdropData.end,
                uint32(block.timestamp)
            ); // , "LockManager: End date is in the past");
        if (_lockdropData.start >= _lockdropData.end)
            revert LockdropInvalidError();

        lockdrop = _lockdropData;

        emit LockDropConfigured(_lockdropData);
    }

    /// @inheritdoc ILockManager
    function configureToken(
        address _tokenContract,
        ConfiguredToken memory _tokenData
    ) external onlyAdmin {
        if (_tokenData.nftCost == 0) revert NFTCostInvalidError();
        if (configuredTokens[_tokenContract].nftCost == 0) {
            // new token
            configuredTokenContracts.push(_tokenContract);
        }
        configuredTokens[_tokenContract] = _tokenData;

        emit TokenConfigured(_tokenContract, _tokenData);
    }

    function setUSDThresholds(
        uint8 _approve,
        uint8 _disapprove
    ) external onlyAdmin {
        if (usdUpdateProposal.proposer != address(0))
            revert ProposalInProgressError();
        APPROVE_THRESHOLD = _approve;
        DISAPPROVE_THRESHOLD = _disapprove;

        emit USDThresholdUpdated(_approve, _disapprove);
    }

    /// @inheritdoc ILockManager
    function proposeUSDPrice(
        uint256 _price,
        address[] calldata _contracts
    )
        external
        onlyOneOfRoles(
            [
                Role.PriceFeed_1,
                Role.PriceFeed_2,
                Role.PriceFeed_3,
                Role.PriceFeed_4,
                Role.PriceFeed_5
            ]
        )
    {
        if (usdUpdateProposal.proposer != address(0))
            revert ProposalInProgressError();
        if (_contracts.length == 0) revert ProposalInvalidContractsError();

        delete usdUpdateProposal;

        // Approvals will use this because when the struct is deleted the approvals remain
        ++_usdProposalId;

        usdUpdateProposal.proposedDate = uint32(block.timestamp);
        usdUpdateProposal.proposer = msg.sender;
        usdUpdateProposal.proposedPrice = _price;
        usdUpdateProposal.contracts = _contracts;
        usdUpdateProposal.approvals[msg.sender] = _usdProposalId;
        usdUpdateProposal.approvalsCount++;

        emit ProposedUSDPrice(msg.sender, _price);
    }

    /// @inheritdoc ILockManager
    function approveUSDPrice(
        uint256 _price
    )
        external
        onlyOneOfRoles(
            [
                Role.PriceFeed_1,
                Role.PriceFeed_2,
                Role.PriceFeed_3,
                Role.PriceFeed_4,
                Role.PriceFeed_5
            ]
        )
    {
        if (usdUpdateProposal.proposer == address(0)) revert NoProposalError();
        if (usdUpdateProposal.proposer == msg.sender)
            revert ProposerCannotApproveError();
        if (usdUpdateProposal.approvals[msg.sender] == _usdProposalId)
            revert ProposalAlreadyApprovedError();
        if (usdUpdateProposal.disapprovals[msg.sender] == _usdProposalId)
            revert ProposalAlreadyDisapprovedError();
        if (usdUpdateProposal.proposedPrice != _price)
            revert ProposalPriceNotMatchedError();

        usdUpdateProposal.approvals[msg.sender] = _usdProposalId;
        usdUpdateProposal.approvalsCount++;

        if (usdUpdateProposal.approvalsCount >= APPROVE_THRESHOLD) {
            _execUSDPriceUpdate();
        }

        emit ApprovedUSDPrice(msg.sender);
    }

    /// @inheritdoc ILockManager
    function disapproveUSDPrice(
        uint256 _price
    )
        external
        onlyOneOfRoles(
            [
                Role.PriceFeed_1,
                Role.PriceFeed_2,
                Role.PriceFeed_3,
                Role.PriceFeed_4,
                Role.PriceFeed_5
            ]
        )
    {
        if (usdUpdateProposal.proposer == address(0)) revert NoProposalError();
        if (usdUpdateProposal.approvals[msg.sender] == _usdProposalId)
            revert ProposalAlreadyApprovedError();
        if (usdUpdateProposal.disapprovals[msg.sender] == _usdProposalId)
            revert ProposalAlreadyDisapprovedError();
        if (usdUpdateProposal.proposedPrice != _price)
            revert ProposalPriceNotMatchedError();

        usdUpdateProposal.disapprovalsCount++;
        usdUpdateProposal.disapprovals[msg.sender] = _usdProposalId;

        emit DisapprovedUSDPrice(msg.sender);

        if (usdUpdateProposal.disapprovalsCount >= DISAPPROVE_THRESHOLD) {
            delete usdUpdateProposal;

            emit RemovedUSDProposal();
        }
    }

    /// @inheritdoc ILockManager
    function setLockDuration(uint256 _duration) external notPaused {
        if (_duration > configStorage.getUint(StorageKey.MaxLockDuration))
            revert MaximumLockDurationError();

        accountManager.forceHarvest(msg.sender);
        playerSettings[msg.sender].lockDuration = uint32(_duration);
        // update any existing lock
        uint256 configuredTokensLength = configuredTokenContracts.length;
        for (uint256 i; i < configuredTokensLength; i++) {
            address tokenContract = configuredTokenContracts[i];
            if (lockedTokens[msg.sender][tokenContract].quantity > 0) {
                // check they are not setting lock time before current unlocktime
                uint32 lastLockTime = lockedTokens[msg.sender][tokenContract]
                    .lastLockTime;
                if (
                    lastLockTime + uint32(_duration) <
                    lockedTokens[msg.sender][tokenContract].unlockTime
                ) {
                    revert LockDurationReducedError();
                }

                lockedTokens[msg.sender][tokenContract].unlockTime =
                    lastLockTime +
                    uint32(_duration);
            }
        }

        emit LockDuration(msg.sender, _duration);
    }

    /// @inheritdoc ILockManager
    function lockOnBehalf(
        address _tokenContract,
        uint256 _quantity,
        address _onBehalfOf
    )
        external
        payable
        notPaused
        onlyActiveToken(_tokenContract)
        onlyConfiguredToken(_tokenContract)
        onlyConfiguredContract(StorageKey.MigrationManager)
        nonReentrant
    {
        address tokenOwner = msg.sender;
        address lockRecipient = _onBehalfOf;
        _lock(_tokenContract, _quantity, tokenOwner, lockRecipient);
    }

    /// @inheritdoc ILockManager
    function lock(
        address _tokenContract,
        uint256 _quantity
    )
        external
        payable
        notPaused
        onlyActiveToken(_tokenContract)
        onlyConfiguredToken(_tokenContract)
        nonReentrant
    {
        _lock(_tokenContract, _quantity, msg.sender, msg.sender);
    }

    function _lock(
        address _tokenContract,
        uint256 _quantity,
        address _tokenOwner,
        address _lockRecipient
    ) private {
        (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        ) = accountManager.getPlayer(_lockRecipient);
        if (_mainAccount != _lockRecipient) revert SubAccountCannotLockError();
        if (_player.registrationDate == 0) revert AccountNotRegisteredError();
        // check approvals and value of tx matches
        if (_tokenContract == address(0)) {
            if (msg.value != _quantity) revert ETHValueIncorrectError();
        } else {
            if (msg.value != 0) revert InvalidMessageValueError();
            IERC20 token = IERC20(_tokenContract);
            uint256 allowance = token.allowance(_tokenOwner, address(this));
            if (allowance < _quantity) revert InsufficientAllowanceError();
        }

        LockedToken storage lockedToken = lockedTokens[_lockRecipient][
            _tokenContract
        ];
        ConfiguredToken storage configuredToken = configuredTokens[
            _tokenContract
        ];

        // they will receive schnibbles at the new rate since last harvest if not for force harvest
        accountManager.forceHarvest(_lockRecipient);

        // add remainder from any previous lock
        uint256 quantity = _quantity + lockedToken.remainder;
        uint256 remainder;
        uint256 numberNFTs;
        uint32 _lockDuration = playerSettings[_lockRecipient].lockDuration;

        if (_lockDuration == 0) {
            _lockDuration = lockdrop.minLockDuration;
        }
        if (
            lockdrop.start <= uint32(block.timestamp) &&
            lockdrop.end >= uint32(block.timestamp)
        ) {
            if (
                _lockDuration < lockdrop.minLockDuration ||
                _lockDuration >
                uint32(configStorage.getUint(StorageKey.MaxLockDuration))
            ) revert InvalidLockDurationError();
            if (msg.sender != address(migrationManager)) {
                // calculate number of nfts
                remainder = quantity % configuredToken.nftCost;
                numberNFTs = (quantity - remainder) / configuredToken.nftCost;

                if (numberNFTs > type(uint16).max) revert TooManyNFTsError();

                // Tell nftOverlord that the player has new unopened Munchables
                nftOverlord.addReveal(_lockRecipient, uint16(numberNFTs));

                lockedToken.remainder = remainder;
            }
        }

        // Transfer erc tokens
        if (_tokenContract != address(0)) {
            IERC20 token = IERC20(_tokenContract);
            SafeERC20.safeTransferFrom(
                token,
                _tokenOwner,
                address(this),
                _quantity
            );
        }

        lockedToken.quantity += _quantity;
        lockedToken.lastLockTime = uint32(block.timestamp);
        lockedToken.unlockTime =
            uint32(block.timestamp) +
            uint32(_lockDuration);

        // set their lock duration in playerSettings
        playerSettings[_lockRecipient].lockDuration = _lockDuration;

        emit Locked(
            _lockRecipient,
            _tokenOwner,
            _tokenContract,
            _quantity,
            remainder,
            numberNFTs,
            _lockDuration
        );
    }

    /// @inheritdoc ILockManager
    function unlock(
        address _tokenContract,
        uint256 _quantity
    ) external notPaused nonReentrant {
        LockedToken storage lockedToken = lockedTokens[msg.sender][
            _tokenContract
        ];
        if (lockedToken.quantity < _quantity)
            revert InsufficientLockAmountError();
        if (lockedToken.unlockTime > uint32(block.timestamp))
            revert TokenStillLockedError();

        // force harvest to make sure that they get the schnibbles that they are entitled to
        accountManager.forceHarvest(msg.sender);

        lockedToken.quantity -= _quantity;
        lockedToken.remainder = 0;

        // send token
        if (_tokenContract == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: _quantity}("");
            if (!success) revert FailedTransferError();
        } else {
            IERC20 token = IERC20(_tokenContract);
            token.transfer(msg.sender, _quantity);
        }

        emit Unlocked(msg.sender, _tokenContract, _quantity);
    }

    /// @inheritdoc ILockManager
    function getLocked(
        address _player
    ) external view returns (LockedTokenWithMetadata[] memory _lockedTokens) {
        uint256 configuredTokensLength = configuredTokenContracts.length;
        LockedTokenWithMetadata[]
            memory tmpLockedTokens = new LockedTokenWithMetadata[](
                configuredTokensLength
            );
        for (uint256 i; i < configuredTokensLength; i++) {
            LockedToken memory tmpLockedToken;
            tmpLockedToken.unlockTime = lockedTokens[_player][
                configuredTokenContracts[i]
            ].unlockTime;
            tmpLockedToken.quantity = lockedTokens[_player][
                configuredTokenContracts[i]
            ].quantity;
            tmpLockedToken.lastLockTime = lockedTokens[_player][
                configuredTokenContracts[i]
            ].lastLockTime;
            tmpLockedToken.remainder = lockedTokens[_player][
                configuredTokenContracts[i]
            ].remainder;
            tmpLockedTokens[i] = LockedTokenWithMetadata(
                tmpLockedToken,
                configuredTokenContracts[i]
            );
        }
        _lockedTokens = tmpLockedTokens;
    }

    /// @inheritdoc ILockManager
    function getLockedWeightedValue(
        address _player
    ) external view returns (uint256 _lockedWeightedValue) {
        uint256 lockedWeighted = 0;
        uint256 configuredTokensLength = configuredTokenContracts.length;
        for (uint256 i; i < configuredTokensLength; i++) {
            if (
                lockedTokens[_player][configuredTokenContracts[i]].quantity >
                0 &&
                configuredTokens[configuredTokenContracts[i]].active
            ) {
                // We are assuming all tokens have a maximum of 18 decimals and that USD Price is denoted in 1e18
                uint256 deltaDecimal = 10 **
                    (18 -
                        configuredTokens[configuredTokenContracts[i]].decimals);
                lockedWeighted +=
                    (deltaDecimal *
                        lockedTokens[_player][configuredTokenContracts[i]]
                            .quantity *
                        configuredTokens[configuredTokenContracts[i]]
                            .usdPrice) /
                    1e18;
            }
        }

        _lockedWeightedValue = lockedWeighted;
    }

    /// @inheritdoc ILockManager
    function getConfiguredToken(
        address _tokenContract
    ) external view returns (ConfiguredToken memory _token) {
        _token = configuredTokens[_tokenContract];
    }

    function getPlayerSettings(
        address _player
    ) external view returns (PlayerSettings memory _settings) {
        _settings = playerSettings[_player];
    }

    /*******************************************************
     ** INTERNAL FUNCTIONS
     ********************************************************/

    function _execUSDPriceUpdate() internal {
        if (
            usdUpdateProposal.approvalsCount >= APPROVE_THRESHOLD &&
            usdUpdateProposal.disapprovalsCount < DISAPPROVE_THRESHOLD
        ) {
            uint256 updateTokensLength = usdUpdateProposal.contracts.length;
            for (uint256 i; i < updateTokensLength; i++) {
                address tokenContract = usdUpdateProposal.contracts[i];
                if (configuredTokens[tokenContract].nftCost != 0) {
                    configuredTokens[tokenContract].usdPrice = usdUpdateProposal
                        .proposedPrice;

                    emit USDPriceUpdated(
                        tokenContract,
                        usdUpdateProposal.proposedPrice
                    );
                }
            }

            delete usdUpdateProposal;
        }
    }
}
