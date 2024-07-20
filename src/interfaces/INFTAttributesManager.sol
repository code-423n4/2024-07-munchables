// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "../libraries/MunchablesCommonLib.sol";

/// @title Interface for NFT Attributes Manager V1
/// @notice This interface manages the attributes and metadata of NFTs within the Munch ecosystem.
interface INFTAttributesManager {
    /// @notice Called from MunchableManager to initialise a new record
    function createWithImmutable(
        uint256 _tokenId,
        MunchablesCommonLib.NFTImmutableAttributes memory _immutableAttributes
    ) external;

    /// @notice Sets dynamic attributes for a specific NFT, typically called after feeding or interaction events
    /// @param _tokenId The ID of the NFT
    /// @param _attributes Struct of new attributes
    function setAttributes(
        uint256 _tokenId,
        MunchablesCommonLib.NFTAttributes calldata _attributes
    ) external;

    /// @notice Sets game attributes for a specific NFT, typically called after level up
    /// @param _tokenId The ID of the NFT
    /// @param _attributes Array of new game attributes
    function setGameAttributes(
        uint256 _tokenId,
        MunchablesCommonLib.NFTGameAttribute[] calldata _attributes
    ) external;

    /// @notice Retrieves all data associated with an NFT in a single call
    /// @param _tokenId The ID of the NFT
    /// @return _nftData A struct containing all attributes (dynamic, immutable, and game-specific)
    //    function getFullNFTData(
    //        uint256 _tokenId
    //    ) external view returns (NFTFull memory _nftData);

    /// @notice Retrieves dynamic attributes for a specific token
    /// @param _tokenId The ID of the NFT
    /// @return _attributes Struct of the NFT's dynamic attributes
    function getAttributes(
        uint256 _tokenId
    )
        external
        view
        returns (MunchablesCommonLib.NFTAttributes memory _attributes);

    /// @notice Retrieves immutable attributes for a specific token
    /// @param _tokenId The ID of the NFT
    /// @return _immutableAttributes Struct of the NFT's immutable attributes
    function getImmutableAttributes(
        uint256 _tokenId
    )
        external
        view
        returns (
            MunchablesCommonLib.NFTImmutableAttributes
                memory _immutableAttributes
        );

    /// @notice Retrieves game-specific attributes for a specific token
    /// @param _tokenId The ID of the NFT
    /// @param _requestedIndexes Array of GameAttributeIndex to define subset of attributes to include in the result
    /// @return _gameAttributes Struct of the NFT's game attributes
    function getGameAttributes(
        uint256 _tokenId,
        MunchablesCommonLib.GameAttributeIndex[] calldata _requestedIndexes
    )
        external
        view
        returns (MunchablesCommonLib.NFTGameAttribute[] memory _gameAttributes);

    function getGameAttributeDataType(
        uint8 _index
    ) external pure returns (MunchablesCommonLib.GameAttributeType _dataType);

    event CreatedWithImmutable(
        uint256 _tokenId,
        MunchablesCommonLib.NFTImmutableAttributes _immutableAttributes
    );

    /// @notice Event emitted when NFT attributes are updated
    event AttributesUpdated(uint256 indexed _tokenId);

    /// @notice Event emitted when NFT game attributes are updated
    event GameAttributesUpdated(uint256 indexed _tokenId);

    /// @notice Error when the owner of the NFT does not match the expected address
    error IncorrectOwnerError();

    /// @notice Error when the 'from' level specified is invalid
    error InvalidLevelFromError();

    /// @notice Error when the oracle recovering the signature is invalid
    /// @param _recoveredSigner The address of the invalid signer
    error InvalidOracleError(address _recoveredSigner);

    /// @notice Error when a call is made by a non-authorized migration manager
    error NotAuthorizedMigrationManagerError();

    /// @notice When user tries to set attributes when the record hasnt been created
    error NotCreatedError();
}
