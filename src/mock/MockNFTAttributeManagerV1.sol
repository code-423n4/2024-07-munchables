// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../managers/NFTAttributeManagerV1.sol";

contract MockNFTAttributesManagerV1 is NFTAttributesManagerV1 {
    constructor(
        address _configStorage
    ) NFTAttributesManagerV1(_configStorage) {}

    function setImmutableAttributesForTest(
        uint256 _tokenId,
        MunchablesCommonLib.NFTImmutableAttributes calldata _immutableAttributes
    ) external {
        immutableAttributes[_tokenId] = _immutableAttributes;
    }

    function setAttributesForTest(
        uint256 _tokenId,
        MunchablesCommonLib.NFTAttributes calldata _attributes
    ) external {
        attributes[_tokenId] = _attributes;
    }
}
