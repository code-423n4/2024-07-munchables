// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "../interfaces/IMigrationManager.sol";
import "../interfaces/IMunchNFT.sol";
import "../interfaces/INFTAttributesManager.sol";
import "../interfaces/ILockManager.sol";
import "./BaseBlastManager.sol";
import "../interfaces/ISnuggeryManager.sol";
import "../interfaces/IClaimManager.sol";
import "../interfaces/INFTOverlord.sol";

contract MigrationManager is
    IMigrationManager,
    ReentrancyGuard,
    BaseBlastManager
{
    uint8 constant SKIP_AMOUNT = 5;
    uint256 public discountFactor;
    uint256 public purchasedUnlockPrice = 2 ether;
    bool public seal;

    IOldNFT _oldNFTContract;
    INFTAttributesManager _attributesManager;
    ILockManager _lockManager;
    ISnuggeryManager _snuggeryManager;
    IClaimManager _claimManager;
    INFTOverlord _nftOverlord;
    mapping(bytes32 => MigrationSnapshotData) _migrationSnapshots;
    mapping(address => bool) _userClaimedOnce;
    mapping(address => uint256[]) _userTokenIds;
    mapping(address => uint16) _unrevealed;
    mapping(address => UserLockedChoice) _userLockedAction;
    mapping(address => UserLockedChoice) _userPurchasedAction;
    mapping(address => MigrationTotals) _userLockedAmounts;
    address LOCAL_ADMIN;

    modifier onlyLocalAdmin() {
        if (msg.sender != LOCAL_ADMIN) revert InvalidRoleError();
        _;
    }

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
        LOCAL_ADMIN = msg.sender;
    }

    function _reconfigure() internal {
        // load config from the config storage contract and configure myself, USDB/WETH config is handled by base
        _lockManager = ILockManager(
            configStorage.getAddress(StorageKey.LockManager)
        );

        _oldNFTContract = IOldNFT(
            configStorage.getAddress(StorageKey.OldMunchNFT)
        );

        _attributesManager = INFTAttributesManager(
            configStorage.getAddress(StorageKey.NFTAttributesManager)
        );

        _claimManager = IClaimManager(
            configStorage.getAddress(StorageKey.ClaimManager)
        );

        _nftOverlord = INFTOverlord(
            configStorage.getAddress(StorageKey.NFTOverlord)
        );

        discountFactor = configStorage.getUint(
            StorageKey.MigrationDiscountFactor
        );

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function loadMigrationSnapshot(
        address[] calldata users,
        MigrationSnapshotData[] calldata data
    ) external override onlyLocalAdmin {
        if (seal) revert MigrationDataSealedError();
        if (users.length != data.length) revert InvalidDataLengthError();
        address _user;
        uint256 _tokenId;
        bytes32 key;
        for (uint256 i = 0; i < users.length; i++) {
            if (
                data[i].token != address(USDB) &&
                data[i].token != address(WETH) &&
                data[i].token != address(0)
            ) revert InvalidMigrationTokenError();
            if (data[i].tokenId == 0) revert InvalidMigrationTokenIdError();
            _user = users[i];
            _tokenId = data[i].tokenId;
            key = keccak256(abi.encodePacked(_user, _tokenId));
            if (_migrationSnapshots[key].tokenId != 0)
                revert DataAlreadyLoadedError();
            _migrationSnapshots[key] = data[i];

            if (data[i].lockAmount != 0) {
                _userLockedAmounts[_user].totalLockedAmount += data[i]
                    .lockAmount;
                _userLockedAmounts[_user].tokenLocked = data[i].token;
            } else {
                if (data[i].token != address(0))
                    revert InvalidMigrationTokenError();
                _userLockedAmounts[_user]
                    .totalPurchasedAmount += purchasedUnlockPrice;
            }
            _userTokenIds[_user].push(_tokenId);
        }
        emit MigrationSnapshotLoaded(users, data);
    }

    event TokenClaimed(bytes32[] _snapshot, bool[] claimed);

    function setTokenClaimed(
        bytes32[] calldata _snapshot,
        bool[] calldata claimed
    ) external onlyLocalAdmin {
        if (seal) revert MigrationDataSealedError();
        if (_snapshot.length != claimed.length) revert InvalidDataLengthError();
        for (uint256 i = 0; i < _snapshot.length; i++) {
            bytes32 key = _snapshot[i];
            if (_migrationSnapshots[key].tokenId == 0)
                revert NoMigrationExistsError();
            _migrationSnapshots[key].claimed = claimed[i];
        }
        emit TokenClaimed(_snapshot, claimed);
    }

    event UserClaimedOnce(address[] users, bool[] setter);

    function setUserClaimedOnce(
        address[] calldata users,
        bool[] calldata setter
    ) external onlyLocalAdmin {
        if (seal) revert MigrationDataSealedError();
        if (users.length != setter.length) revert InvalidDataLengthError();
        for (uint256 i = 0; i < users.length; i++) {
            _userClaimedOnce[users[i]] = setter[i];
        }
        emit UserClaimedOnce(users, setter);
    }

    event UserClaimedLockedAction(address[] users, UserLockedChoice[] setter);

    function setUserLockedAction(
        address[] calldata users,
        UserLockedChoice[] calldata setter
    ) external onlyLocalAdmin {
        if (seal) revert MigrationDataSealedError();
        if (users.length != setter.length) revert InvalidDataLengthError();
        for (uint256 i = 0; i < users.length; i++) {
            _userLockedAction[users[i]] = setter[i];
        }
        emit UserClaimedLockedAction(users, setter);
    }

    event UserPurchasedLockedAction(address[] users, UserLockedChoice[] setter);

    function setUserPurchasedAction(
        address[] calldata users,
        UserLockedChoice[] calldata setter
    ) external onlyLocalAdmin {
        if (seal) revert MigrationDataSealedError();
        if (users.length != setter.length) revert InvalidDataLengthError();
        for (uint256 i = 0; i < users.length; i++) {
            _userPurchasedAction[users[i]] = setter[i];
        }
        emit UserPurchasedLockedAction(users, setter);
    }

    function sealData() external override onlyLocalAdmin {
        if (seal) revert MigrationDataSealedError();
        seal = true;
        emit MigrationDataSealed();
    }

    function loadUnrevealedSnapshot(
        address[] calldata users,
        uint16[] calldata unrevealed
    ) external onlyLocalAdmin {
        if (seal) revert MigrationDataSealedError();
        if (users.length != unrevealed.length) revert InvalidDataLengthError();
        for (uint256 i = 0; i < users.length; i++) {
            _unrevealed[users[i]] = unrevealed[i];
        }

        emit UnrevealedSnapshotLoaded(users, unrevealed);
    }

    function burnUnrevealedForPoints() external {
        if (!seal) revert MigrationDataNotSealedError();
        if (_unrevealed[msg.sender] == 0) revert NoUnrevealedError();

        uint256 amountToSwap = uint256(_unrevealed[msg.sender]);

        _claimManager.burnUnrevealedForPoints(msg.sender, amountToSwap);

        delete _unrevealed[msg.sender];

        emit UnrevealedSwapSucceeded(msg.sender, amountToSwap);
    }

    function burnNFTs(address _user, uint32 _skip) external override {
        if (!seal) revert MigrationDataNotSealedError();
        if (
            _user != msg.sender &&
            _userLockedAction[_user] == UserLockedChoice.NONE
        ) revert SelfNeedsToChooseError();
        if (_userLockedAction[_user] == UserLockedChoice.LOCKED_FULL_MIGRATION)
            revert DifferentLockActionError();

        uint256[] memory tokenIds = _userTokenIds[_user];
        if (tokenIds.length == 0) revert NoNFTsToBurnError();
        uint8[] memory tokenIdsByRarity = new uint8[](7);
        uint256 tokenId;
        MigrationSnapshotData storage snapshot;
        uint256 maxLength = _skip + SKIP_AMOUNT > tokenIds.length
            ? tokenIds.length
            : _skip + SKIP_AMOUNT;
        uint256[] memory burnedTokenIds = new uint256[](maxLength - _skip);
        for (uint256 i = _skip; i < maxLength; i++) {
            tokenId = tokenIds[i];
            snapshot = _migrationSnapshots[
                keccak256(abi.encodePacked(_user, tokenId))
            ];
            if (snapshot.lockAmount == 0 || snapshot.claimed) continue;
            if (snapshot.tokenId == 0) revert NoMigrationExistsError();
            snapshot.claimed = true;
            tokenIdsByRarity[uint8(snapshot.immutableAttributes.rarity)]++;
            _oldNFTContract.burn(tokenId);
            burnedTokenIds[i - _skip] = tokenId;
        }

        _claimManager.burnNFTsForPoints(_user, tokenIdsByRarity);
        _userLockedAction[_user] = UserLockedChoice.LOCKED_BURN;
        emit BurnSucceeded(_user, burnedTokenIds);
    }

    function burnRemainingPurchasedNFTs(
        address _user,
        uint32 _skip
    ) external override {
        if (!seal) revert MigrationDataNotSealedError();
        if (
            _user != msg.sender &&
            _userPurchasedAction[_user] == UserLockedChoice.NONE
        ) revert SelfNeedsToChooseError();
        _userPurchasedAction[_user] = UserLockedChoice.LOCKED_BURN;
        uint256[] memory tokenIds = _userTokenIds[_user];
        if (tokenIds.length == 0) revert NoNFTsToBurnError();
        uint8[] memory tokenIdsByRarity = new uint8[](7);
        uint256 maxLength = _skip + SKIP_AMOUNT > tokenIds.length
            ? tokenIds.length
            : _skip + SKIP_AMOUNT;
        uint256[] memory burnedTokens = new uint256[](maxLength - _skip);

        uint256 tokenId;
        bytes32 key;
        MigrationSnapshotData memory snapshot;
        for (uint256 i = _skip; i < maxLength; i++) {
            tokenId = tokenIds[i];
            key = keccak256(abi.encodePacked(_user, tokenId));
            snapshot = _migrationSnapshots[key];
            if (snapshot.lockAmount != 0 || snapshot.claimed) continue;
            if (snapshot.tokenId == 0) revert NoMigrationExistsError();
            _migrationSnapshots[key].claimed = true;
            tokenIdsByRarity[uint8(snapshot.immutableAttributes.rarity)]++;
            _oldNFTContract.burn(tokenId);
            burnedTokens[i - _skip] = tokenId;
        }

        _claimManager.burnNFTsForPoints(_user, tokenIdsByRarity);
        emit BurnPurchasedSucceeded(_user, burnedTokens);
    }

    function lockFundsForAllMigration() external payable override nonReentrant {
        if (!seal) revert MigrationDataNotSealedError();
        if (_userLockedAction[msg.sender] != UserLockedChoice.NONE)
            revert DifferentLockActionError();
        _userClaimedOnce[msg.sender] = true;
        (uint256 totalLockAmount, ) = getUserMigrateQuantityAll(msg.sender);
        if (totalLockAmount == 0) revert NoMigrationExistsError();
        if (_userTokenIds[msg.sender].length == 0) revert NoNFTsToBurnError();
        address tokenContract = _userLockedAmounts[msg.sender].tokenLocked;
        if (tokenContract == address(0)) {
            if (msg.value != totalLockAmount)
                revert InvalidMigrationAmountError();
        } else {
            if (msg.value != 0) revert InvalidMigrationAmountError();
            IERC20(tokenContract).transferFrom(
                msg.sender,
                address(this),
                totalLockAmount
            );
        }

        _userLockedAction[msg.sender] = UserLockedChoice.LOCKED_FULL_MIGRATION;
        emit LockedForMigration(msg.sender, totalLockAmount, tokenContract);
    }

    function migrateAllNFTs(address _user, uint32 _skip) external override {
        if (_userLockedAction[_user] != UserLockedChoice.LOCKED_FULL_MIGRATION)
            revert DifferentLockActionError();
        uint256 maxSize = _userTokenIds[_user].length;
        if (_skip >= maxSize) revert InvalidSkipAmountError();
        uint256 maxLengthArray = _skip + SKIP_AMOUNT > maxSize
            ? maxSize
            : _skip + SKIP_AMOUNT;
        uint256[] memory tokenIds = new uint256[](maxLengthArray - _skip);
        MigrationSnapshotData memory snapshot;
        for (uint256 i = _skip; i < maxLengthArray; i++) {
            snapshot = _migrationSnapshots[
                keccak256(abi.encodePacked(_user, _userTokenIds[_user][i]))
            ];
            if (snapshot.lockAmount != 0) {
                tokenIds[i - _skip] = _userTokenIds[_user][i];
            }
        }
        _migrateNFTs(_user, _userLockedAmounts[_user].tokenLocked, tokenIds);
    }

    function migratePurchasedNFTs(
        uint256[] memory tokenIds
    ) external payable override nonReentrant {
        if (_userPurchasedAction[msg.sender] != UserLockedChoice.NONE)
            revert DifferentLockActionError();
        MigrationSnapshotData memory snapshot;
        uint256 quantity;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == 0) continue;
            snapshot = _migrationSnapshots[
                keccak256(abi.encodePacked(msg.sender, tokenIds[i]))
            ];
            if (snapshot.lockAmount != 0) revert NotBoughtNFTError();
            if (snapshot.token != address(0))
                revert NFTPurchasedContractError();
            if (snapshot.claimed) continue;
            quantity += purchasedUnlockPrice;
        }
        _migrateNFTs(msg.sender, address(0), tokenIds);
        if (msg.value != (quantity * discountFactor) / 10e12)
            revert InvalidMigrationAmountError();
    }

    function rescue(
        address _tokenContract,
        uint256 _quantity,
        address _returnAddress
    ) external onlyAdmin {
        if (_tokenContract == address(0)) {
            bool res = payable(_returnAddress).send(_quantity);
            if (!res) revert RescueTransferError();
        } else {
            IERC20(_tokenContract).transferFrom(
                address(this),
                _returnAddress,
                _quantity
            );
        }
    }

    function _migrateNFTs(
        address _user,
        address _tokenLocked,
        uint256[] memory tokenIds
    ) internal {
        if (!seal) revert MigrationDataNotSealedError();

        uint256 totalLockAmount;
        uint256 tokenId;
        bytes32 key;
        MigrationSnapshotData storage snapshot;
        uint256[] memory newTokenIds = new uint256[](tokenIds.length);
        uint256[] memory migratedTokenIds = new uint256[](tokenIds.length);
        uint8 i;
        for (; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            if (tokenId == 0) continue;
            key = keccak256(abi.encodePacked(_user, tokenId));
            // We re-use the snapshot variable here to save on gas
            snapshot = _migrationSnapshots[key];
            if (snapshot.tokenId == 0) revert NoMigrationExistsError();
            if (snapshot.claimed) continue;

            snapshot.claimed = true;

            uint256 lockAmount = snapshot.lockAmount;
            if (lockAmount == 0) {
                totalLockAmount += purchasedUnlockPrice;
            } else {
                totalLockAmount += lockAmount;
            }

            snapshot.immutableAttributes.hatchedDate = uint32(block.timestamp);
            newTokenIds[i] = _nftOverlord.mintForMigration(
                _user,
                snapshot.attributes,
                snapshot.immutableAttributes,
                snapshot.gameAttributes
            );
            migratedTokenIds[i] = snapshot.tokenId;

            _oldNFTContract.burn(tokenId);
        }

        uint256 quantity = (totalLockAmount * discountFactor) / 10e12;
        if (quantity > 0) {
            if (_tokenLocked == address(0)) {
                _lockManager.lockOnBehalf{value: quantity}(
                    _tokenLocked,
                    quantity,
                    _user
                );
            } else if (_tokenLocked == address(WETH)) {
                WETH.approve(address(_lockManager), quantity);
                _lockManager.lockOnBehalf(_tokenLocked, quantity, _user);
            } else if (_tokenLocked == address(USDB)) {
                USDB.approve(address(_lockManager), quantity);
                _lockManager.lockOnBehalf(_tokenLocked, quantity, _user);
            }
        }
        emit MigrationSucceeded(_user, migratedTokenIds, newTokenIds);
    }

    function getUserMigrateQuantityAll(
        address _user
    )
        public
        view
        returns (uint256 totalLockAmount, uint256 totalPurchaseAmount)
    {
        totalLockAmount =
            (_userLockedAmounts[_user].totalLockedAmount * discountFactor) /
            10e12;
        totalPurchaseAmount =
            (_userLockedAmounts[_user].totalPurchasedAmount * discountFactor) /
            10e12;
    }

    function getUserMigrationData(
        address _user,
        uint256 _tokenId
    ) external view returns (MigrationSnapshotData memory) {
        bytes32 key = keccak256(abi.encodePacked(_user, _tokenId));
        return _migrationSnapshots[key];
    }

    function getUserMigrationCompletedData(
        address _user
    ) external view override returns (bool, MigrationTotals memory) {
        return (_userClaimedOnce[_user], _userLockedAmounts[_user]);
    }

    function getUserUnrevealedData(
        address _user
    ) external view returns (uint16) {
        return _unrevealed[_user];
    }

    function getUserNFTsLength(address _user) external view returns (uint256) {
        return _userTokenIds[_user].length;
    }
}
