// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "../interfaces/INFTOverlord.sol";
import "../interfaces/IRNGProxy.sol";
import "../managers/BaseBlastManager.sol";
import "../interfaces/INFTAttributesManager.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IMunchNFT.sol";

contract MockNFTOverlord is BaseBlastManager, INFTOverlord {
    uint16 MAX_REVEAL_QUEUE;

    mapping(address => uint16) unrevealedNFTs;
    mapping(address => uint16) revealQueue;
    uint8[] realmLookup;
    mapping(uint8 => MintProbability) mintProbabilities;

    mapping(uint256 => LevelUpRequest) levelUpRequests;
    uint256[] levelThresholds;

    address munchNFT;
    IRNGProxy rngProxy;
    INFTAttributesManager nftAttributesManager;
    IAccountManager accountManager;

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        munchNFT = configStorage.getAddress(StorageKey.MunchNFT);
        rngProxy = IRNGProxy(
            configStorage.getAddress(StorageKey.RNGProxyContract)
        );
        nftAttributesManager = INFTAttributesManager(
            configStorage.getAddress(StorageKey.NFTAttributesManager)
        );
        accountManager = IAccountManager(
            configStorage.getAddress(StorageKey.AccountManager)
        );

        _populateDefaultProbabilities();
        _populateDefaultRealmLookup();

        levelThresholds = configStorage.getUintArray(
            StorageKey.LevelThresholds
        );

        MAX_REVEAL_QUEUE = uint16(
            configStorage.getSmallInt(StorageKey.MaxRevealQueue)
        ); // 1

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    /// @inheritdoc INFTOverlord
    function addReveal(address _player, uint16 _quantity) external {
        // LockManager has already verified this is a registered account
        unrevealedNFTs[_player] += _quantity;
    }

    /// @inheritdoc INFTOverlord
    function startReveal() external notPaused {
        _startReveal(msg.sender);
    }

    function startReveal(address _mainAccount) external {
        _startReveal(_mainAccount);
    }

    function _startReveal(address _mainAccount) internal {
        unrevealedNFTs[_mainAccount]--;
        revealQueue[_mainAccount]++;
        emit MunchableRevealRequested(_mainAccount);
    }

    event MockNFTReveal(address indexed player, bytes rng);

    /// @inheritdoc INFTOverlord
    function reveal(
        uint256 _player,
        bytes memory rng
    )
        external
        onlyConfiguredContract(StorageKey.RNGProxyContract)
        returns (uint256 _tokenId)
    {
        _tokenId = 7;
        emit MockNFTReveal(address(uint160(_player)), rng);
    }

    function reveal(
        address player,
        MunchablesCommonLib.Rarity rarity,
        uint16 speciesId
    ) external returns (uint256 _tokenId) {
        return _reveal(player, rarity, speciesId);
    }

    function _reveal(
        address player,
        MunchablesCommonLib.Rarity rarity,
        uint16 speciesId
    ) internal returns (uint256 _tokenId) {
        uint256 tokenId = IMunchNFT(munchNFT).nextTokenId();

        _createWithEntropy(tokenId, rarity, speciesId);

        // Message validated, mint the token
        IMunchNFT(munchNFT).mint(player);

        MunchablesCommonLib.NFTImmutableAttributes
            memory _immutableAttributes = nftAttributesManager
                .getImmutableAttributes(tokenId);

        --revealQueue[player];
        _tokenId = tokenId;

        emit Revealed(player, tokenId, _immutableAttributes);
    }

    function mintTest(address _account) external returns (uint256) {
        return IMunchNFT(munchNFT).mint(_account);
    }

    function mintFromPrimordial(address _account) external {
        (address _player, ) = accountManager.getPlayer(_account);

        // start reveal process
        if (revealQueue[_player] >= MAX_REVEAL_QUEUE)
            revert RevealQueueFullError();

        revealQueue[_player]++;
    }

    /// @inheritdoc INFTOverlord
    // Called by the rng proxy
    function revealFromPrimordial(
        uint256 _player,
        bytes memory
    ) external returns (uint256 _tokenId) {
        // decode _player
        address player = address(uint160(_player));
        // Message validated, mint the token
        uint256 tokenId = IMunchNFT(munchNFT).nextTokenId();

        _createWithEntropy(tokenId, MunchablesCommonLib.Rarity.Common, 1);

        IMunchNFT(munchNFT).mint(player);

        MunchablesCommonLib.NFTImmutableAttributes
            memory _immutableAttributes = nftAttributesManager
                .getImmutableAttributes(tokenId);

        --revealQueue[player];
        _tokenId = tokenId;

        emit PrimordialHatched(player, _immutableAttributes);
    }

    /// @inheritdoc INFTOverlord
    function mintForMigration(
        address _player,
        MunchablesCommonLib.NFTAttributes memory _attributes,
        MunchablesCommonLib.NFTImmutableAttributes memory _immutableAttributes,
        MunchablesCommonLib.NFTGameAttribute[] memory _gameAttributes
    ) external override returns (uint256 _tokenId) {
        uint256 tokenId = IMunchNFT(munchNFT).nextTokenId();

        nftAttributesManager.createWithImmutable(tokenId, _immutableAttributes);
        nftAttributesManager.setAttributes(tokenId, _attributes);
        nftAttributesManager.setGameAttributes(tokenId, _gameAttributes);
        IMunchNFT(munchNFT).mint(_player);

        _tokenId = tokenId;
        emit MintedForMigration(
            _player,
            tokenId,
            _immutableAttributes,
            _attributes,
            _gameAttributes
        );
    }

    /// @inheritdoc INFTOverlord
    function levelUp(uint256 _requestId, bytes memory _rng) external {
        LevelUpRequest memory levelUpRequest = levelUpRequests[_requestId];

        if (levelUpRequest.owner == address(0)) revert InvalidLevelUpRequest();
        uint16 toLevel = levelUpRequest.toLevel;

        // verify levelUp
        MunchablesCommonLib.NFTAttributes
            memory attributes = nftAttributesManager.getAttributes(
                levelUpRequest.tokenId
            );
        if (attributes.level != levelUpRequest.fromLevel)
            revert InvalidLevelUpRequest();
        if (levelUpRequest.toLevel <= levelUpRequest.fromLevel)
            revert InvalidLevelUpRequest();

        MunchablesCommonLib.NFTGameAttribute[]
            memory gameAttributes = nftAttributesManager.getGameAttributes(
                levelUpRequest.tokenId,
                new MunchablesCommonLib.GameAttributeIndex[](0)
            );

        if (_rng.length < gameAttributes.length)
            revert MunchablesCommonLib.NotEnoughRandomError();

        uint16 thisToLevel = levelUpRequest.toLevel;
        uint16 nextFromLevel;
        if (levelUpRequest.toLevel - levelUpRequest.fromLevel > 2) {
            thisToLevel = levelUpRequest.fromLevel + 2;
            nextFromLevel = levelUpRequest.toLevel;
        }

        int16 zeroed;
        for (uint16 lvl = levelUpRequest.fromLevel; lvl < thisToLevel; lvl++) {
            for (uint8 i; i < gameAttributes.length; i++) {
                if (
                    nftAttributesManager.getGameAttributeDataType(i) ==
                    MunchablesCommonLib.GameAttributeType.SmallInt
                ) {
                    if (
                        gameAttributes[i].dataType ==
                        MunchablesCommonLib.GameAttributeType.NotSet
                    ) {
                        gameAttributes[i].dataType = MunchablesCommonLib
                            .GameAttributeType
                            .SmallInt;

                        gameAttributes[i].value = abi.encode(zeroed);
                    }
                    int16 currentValue;
                    if (gameAttributes[i].value.length == 32) {
                        currentValue = abi.decode(
                            gameAttributes[i].value,
                            (int16)
                        );
                    }

                    if (uint8(_rng[i]) % 3 > 0) {
                        currentValue += int16(int8(uint8(_rng[i]) % 3));
                        gameAttributes[i].value = abi.encode(currentValue);
                    }
                }
            }
        }

        attributes.level = thisToLevel;
        nftAttributesManager.setAttributes(levelUpRequest.tokenId, attributes);

        nftAttributesManager.setGameAttributes(
            levelUpRequest.tokenId,
            gameAttributes
        );

        if (toLevel != thisToLevel) {
            // send another request
            _requestLevelUpRng(
                levelUpRequest.owner,
                levelUpRequest.tokenId,
                nextFromLevel,
                levelUpRequest.toLevel
            );
        }

        delete levelUpRequests[_requestId];

        emit LevelledUp(
            levelUpRequest.owner,
            levelUpRequest.tokenId,
            levelUpRequest.fromLevel,
            thisToLevel,
            gameAttributes
        );
    }

    function requestRandom(uint256 _player) external {
        rngProxy.requestRandom(
            address(this),
            bytes4(keccak256("reveal(uint256,bytes)")),
            _player
        );
    }

    function munchableFed(uint256 _tokenId, address _owner) external {
        MunchablesCommonLib.NFTAttributes
            memory currentAttributes = nftAttributesManager.getAttributes(
                _tokenId
            );
        // Calculate levelup, just send event for the off-chain process to handle
        (uint16 _currentLevel, ) = MunchablesCommonLib.getLevelThresholds(
            levelThresholds,
            currentAttributes.chonks
        );

        if (_currentLevel > currentAttributes.level) {
            // level up, request RNG
            _requestLevelUpRng(
                _owner,
                _tokenId,
                currentAttributes.level,
                _currentLevel
            );

            emit MunchableLevelUpRequest(
                _owner,
                _tokenId,
                currentAttributes.level,
                _currentLevel
            );
        }
    }

    /// @inheritdoc INFTOverlord
    function getUnrevealedNFTs(
        address _player
    ) external view returns (uint16 _unrevealed) {
        (address _mainAccount, ) = accountManager.getPlayer(_player);
        _unrevealed = unrevealedNFTs[_mainAccount];
    }

    /// @inheritdoc INFTOverlord
    function getLevelUpData(
        uint256 _chonks
    )
        external
        view
        returns (uint16 _currentLevel, uint256 _currentLevelThreshold)
    {
        (_currentLevel, _currentLevelThreshold) = MunchablesCommonLib
            .getLevelThresholds(levelThresholds, _chonks);
    }

    // used during reveal
    function _createWithEntropy(
        uint256 _tokenId,
        MunchablesCommonLib.Rarity rarity,
        uint16 speciesId
    ) internal {
        MunchablesCommonLib.NFTImmutableAttributes
            memory immutableAttributes = MunchablesCommonLib
                .NFTImmutableAttributes({
                    rarity: rarity,
                    species: speciesId,
                    realm: MunchablesCommonLib.Realm(realmLookup[speciesId]),
                    generation: 2,
                    hatchedDate: uint32(block.timestamp)
                });
        nftAttributesManager.createWithImmutable(_tokenId, immutableAttributes);

        // set level to 1 for new nfts
        MunchablesCommonLib.NFTAttributes memory attrs;
        attrs.level = 1;
        nftAttributesManager.setAttributes(_tokenId, attrs);
    }

    function _calculateRaritySpecies(
        bytes memory randomBytes,
        MunchablesCommonLib.Rarity maxRarity
    ) internal view returns (MunchablesCommonLib.Rarity, uint16) {
        (uint32 rarityPercentage, uint32 speciesPercent) = MunchablesCommonLib
            .calculateRaritySpeciesPercentage(randomBytes);
        MunchablesCommonLib.Rarity selectedRarity = MunchablesCommonLib
            .Rarity
            .Invalid;
        uint16 selectedSpeciesId;

        // Loop through the rarities starting at Common and ending at Mythic
        // check if cumulative percentage has been passed
        uint256 cumulativePercent;
        uint256 randomIndex;
        for (
            uint8 i = uint8(MunchablesCommonLib.Rarity.Common);
            i <= uint8(MunchablesCommonLib.Rarity.Mythic);
            i++
        ) {
            // Compare mintProbabilities[i].percentage to rarityPercentage
            cumulativePercent += mintProbabilities[i].percentage;
            if (cumulativePercent >= rarityPercentage) {
                // if they exceeded max then give max rarity instead
                if (i > uint8(maxRarity)) {
                    selectedRarity = maxRarity;
                } else {
                    selectedRarity = MunchablesCommonLib.Rarity(i);
                }
                // Randomly select a species from the mintProbabilities entry
                uint256 speciesCount = mintProbabilities[uint8(selectedRarity)]
                    .species
                    .length;
                if (speciesCount == 0)
                    revert NoSpeciesFoundError(selectedRarity);
                randomIndex = uint256(speciesPercent) % speciesCount;
                if (
                    randomIndex ==
                    mintProbabilities[uint8(selectedRarity)].species.length
                ) {
                    randomIndex =
                        mintProbabilities[uint8(selectedRarity)]
                            .species
                            .length -
                        1;
                }
                selectedSpeciesId = mintProbabilities[uint8(selectedRarity)]
                    .species[randomIndex];
                break;
            }
        }

        return (selectedRarity, selectedSpeciesId);
    }

    function _populateDefaultProbabilities() internal {
        MunchablesCommonLib.Rarity[5] memory rarities = [
            MunchablesCommonLib.Rarity.Common,
            MunchablesCommonLib.Rarity.Rare,
            MunchablesCommonLib.Rarity.Epic,
            MunchablesCommonLib.Rarity.Legendary,
            MunchablesCommonLib.Rarity.Mythic
        ];

        StorageKey[5] memory percentageKeys = [
            StorageKey.CommonPercentage,
            StorageKey.RarePercentage,
            StorageKey.EpicPercentage,
            StorageKey.LegendaryPercentage,
            StorageKey.MythicPercentage
        ];

        StorageKey[5] memory speciesKeys = [
            StorageKey.CommonSpecies,
            StorageKey.RareSpecies,
            StorageKey.EpicSpecies,
            StorageKey.LegendarySpecies,
            StorageKey.MythicSpecies
        ];

        for (uint8 i = 0; i < rarities.length; i++) {
            mintProbabilities[uint8(rarities[i])] = MintProbability({
                percentage: uint32(configStorage.getUint(percentageKeys[i])),
                species: configStorage.getSmallUintArray(speciesKeys[i])
            });
        }
    }

    function _populateDefaultRealmLookup() internal {
        uint8[] memory realms = configStorage.getSmallUintArray(
            StorageKey.RealmLookups
        );

        for (uint16 i = 0; i < realms.length; i++) {
            realmLookup.push(realms[i]);
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

    function _toUint256(bytes32 input) private pure returns (uint256 result) {
        assembly {
            result := input
        }
    }

    function _requestLevelUpRng(
        address _owner,
        uint256 _tokenId,
        uint16 _fromLevel,
        uint16 _toLevel
    ) internal {
        bytes32 dataHash = keccak256(
            abi.encode(_owner, _tokenId, _fromLevel, _toLevel)
        );
        uint256 levelUpIndex = _toUint256(dataHash);

        levelUpRequests[levelUpIndex] = LevelUpRequest({
            owner: _owner,
            tokenId: _tokenId,
            fromLevel: _fromLevel,
            toLevel: _toLevel
        });

        rngProxy.requestRandom(
            address(this),
            bytes4(keccak256("levelUp(uint256,bytes)")),
            levelUpIndex
        );
    }
}
