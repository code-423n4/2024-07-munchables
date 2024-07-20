// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/INFTAttributesManager.sol";
import "../interfaces/IAccountManager.sol";
import "../interfaces/IRNGProxy.sol";
import "../interfaces/ISnuggeryManager.sol";
import "./BaseBlastManager.sol";

contract NFTAttributesManagerV1 is INFTAttributesManager, BaseBlastManager {
    IAccountManager public accountManager;
    IRNGProxy public rngProxy;
    ISnuggeryManager public snuggeryManager;
    address public migrationManager;

    mapping(uint256 => MunchablesCommonLib.NFTAttributes) attributes;
    mapping(uint256 => MunchablesCommonLib.NFTImmutableAttributes) immutableAttributes;
    mapping(bytes32 => MunchablesCommonLib.NFTGameAttribute) gameAttributes;

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    function _reconfigure() internal {
        accountManager = IAccountManager(
            IConfigStorage(configStorage).getAddress(StorageKey.AccountManager)
        );

        rngProxy = IRNGProxy(
            IConfigStorage(configStorage).getAddress(
                StorageKey.RNGProxyContract
            )
        );

        migrationManager = IConfigStorage(configStorage).getAddress(
            StorageKey.MigrationManager
        );

        snuggeryManager = ISnuggeryManager(
            IConfigStorage(configStorage).getAddress(StorageKey.SnuggeryManager)
        );

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    function setAttributes(
        uint256 _tokenId,
        MunchablesCommonLib.NFTAttributes calldata _attributes
    )
        external
        onlyConfiguredContract2(
            StorageKey.SnuggeryManager,
            StorageKey.NFTOverlord
        )
    {
        // make sure we have been created with immutable attributes
        if (immutableAttributes[_tokenId].species == 0)
            revert NotCreatedError();

        attributes[_tokenId] = _attributes;

        emit AttributesUpdated(_tokenId);
    }

    function createWithImmutable(
        uint256 _tokenId,
        MunchablesCommonLib.NFTImmutableAttributes calldata _immutableAttributes
    ) external onlyConfiguredContract(StorageKey.NFTOverlord) {
        immutableAttributes[_tokenId] = _immutableAttributes;

        MunchablesCommonLib.NFTAttributes memory attrs;
        attrs.level = 1;
        attributes[_tokenId] = attrs;

        emit CreatedWithImmutable(_tokenId, _immutableAttributes);
    }

    function setGameAttributes(
        uint256 _tokenId,
        MunchablesCommonLib.NFTGameAttribute[] calldata _attributes
    ) external onlyConfiguredContract(StorageKey.NFTOverlord) {
        // make sure we have been created with immutable attributes
        if (immutableAttributes[_tokenId].species == 0)
            revert NotCreatedError();

        for (uint256 i; i < _attributes.length; i++) {
            bytes32 index = keccak256(abi.encodePacked(_tokenId, i));

            if (
                _attributes[i].dataType !=
                MunchablesCommonLib.GameAttributeType.NotSet
            ) {
                gameAttributes[index] = _attributes[i];
            }
        }

        emit GameAttributesUpdated(_tokenId);
    }

    function getAttributes(
        uint256 _tokenId
    )
        external
        view
        returns (MunchablesCommonLib.NFTAttributes memory _attributes)
    {
        _attributes = attributes[_tokenId];
    }

    function getImmutableAttributes(
        uint256 _tokenId
    )
        external
        view
        returns (
            MunchablesCommonLib.NFTImmutableAttributes
                memory _immutableAttributes
        )
    {
        _immutableAttributes = immutableAttributes[_tokenId];
    }

    function getGameAttributes(
        uint256 _tokenId,
        MunchablesCommonLib.GameAttributeIndex[] calldata _requestedIndexes
    )
        external
        view
        returns (MunchablesCommonLib.NFTGameAttribute[] memory _attrs)
    {
        MunchablesCommonLib.NFTGameAttribute[]
            memory attrs = new MunchablesCommonLib.NFTGameAttribute[](
                uint256(MunchablesCommonLib.GameAttributeIndex.IndexCount)
            );

        uint256 indexCount = _requestedIndexes.length;
        bytes32[] memory shaIndexes = new bytes32[](
            uint256(MunchablesCommonLib.GameAttributeIndex.IndexCount)
        );

        if (indexCount == 0) {
            // send all attributes
            for (
                uint256 i;
                i < uint256(MunchablesCommonLib.GameAttributeIndex.IndexCount);
                i++
            ) {
                shaIndexes[i] = keccak256(abi.encodePacked(_tokenId, i));
            }
        } else {
            for (uint256 i; i < _requestedIndexes.length; i++) {
                shaIndexes[uint256(_requestedIndexes[i])] = keccak256(
                    abi.encodePacked(_tokenId, _requestedIndexes[i])
                );
            }
        }

        for (uint256 j; j < shaIndexes.length; j++) {
            attrs[j] = gameAttributes[shaIndexes[j]];
        }

        _attrs = attrs;
    }

    function getGameAttributeDataType(
        uint8 _index
    ) public pure returns (MunchablesCommonLib.GameAttributeType _dataType) {
        // we use uint8 types here because wagmi doesnt like the enums
        MunchablesCommonLib.GameAttributeType[17]
            memory GameAttributeDataTypes = [
                MunchablesCommonLib.GameAttributeType.SmallInt, //Strength,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Agility,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Stamina,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Defence,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Voracity,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Cuteness,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Charisma,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Trustworthiness,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Leadership,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Empathy,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Intelligence,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Cunning,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Creativity,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Adaptability,
                MunchablesCommonLib.GameAttributeType.SmallInt, //Wisdom,
                MunchablesCommonLib.GameAttributeType.Bool, //IsOriginal,
                MunchablesCommonLib.GameAttributeType.NotSet // IndexCount
            ];

        _dataType = GameAttributeDataTypes[_index];
    }
}
