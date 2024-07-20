// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

library MunchablesCommonLib {
    enum Rarity {
        Primordial,
        Common,
        Rare,
        Epic,
        Legendary,
        Mythic,
        Invalid
    }

    enum Realm {
        Everfrost,
        Drench,
        Moltania,
        Arridia,
        Verdentis,
        Invalid
    }

    struct NFTImmutableAttributes {
        Rarity rarity;
        uint16 species;
        Realm realm;
        uint8 generation;
        uint32 hatchedDate;
    }

    struct NFTAttributes {
        uint256 chonks;
        uint16 level;
        uint16 evolution;
        uint256 lastPettedTime;
    }

    struct NFTGameAttribute {
        GameAttributeType dataType;
        bytes value;
    }

    struct Munchadex {
        mapping(Realm => uint256) numInRealm;
        mapping(Rarity => uint256) numInRarity;
        mapping(bytes32 => uint256) unique;
        uint256 numUnique;
    }

    enum GameAttributeIndex {
        Strength,
        Agility,
        Stamina,
        Defence,
        Voracity,
        Cuteness,
        Charisma,
        Trustworthiness,
        Leadership,
        Empathy,
        Intelligence,
        Cunning,
        Creativity,
        Adaptability,
        Wisdom,
        IsOriginal,
        IndexCount // Do not use and keep at the end to detect number of indexes
    }

    enum GameAttributeType {
        NotSet,
        Bool,
        String,
        SmallInt,
        BigUInt,
        Bytes
    }

    struct PrimordialData {
        uint256 chonks;
        uint32 createdDate;
        int8 level;
        bool hatched;
    }

    struct SnuggeryNFT {
        uint256 tokenId;
        uint32 importedDate;
    }

    struct NFTFull {
        uint256 tokenId;
        NFTImmutableAttributes immutableAttributes;
        NFTAttributes attributes;
        NFTGameAttribute[] gameAttributes;
    }

    struct Player {
        uint32 registrationDate;
        uint32 lastPetMunchable;
        uint32 lastHarvestDate;
        Realm snuggeryRealm;
        uint16 maxSnuggerySize;
        uint256 unfedSchnibbles;
        address referrer;
    }

    // Pure Functions

    /// @notice Error when insufficient random data is provided for operations
    error NotEnoughRandomError();

    function calculateRaritySpeciesPercentage(
        bytes memory randomBytes
    ) internal pure returns (uint32, uint32) {
        if (randomBytes.length < 5) revert NotEnoughRandomError();

        uint32 rarityBytes;
        uint8 speciesByte;
        uint32 rarityPercentage;
        uint32 speciesPercent;

        rarityBytes =
            (uint32(uint8(randomBytes[0])) << 24) |
            (uint32(uint8(randomBytes[1])) << 16) |
            (uint32(uint8(randomBytes[2])) << 8) |
            uint32(uint8(randomBytes[3]));
        speciesByte = uint8(randomBytes[4]);

        uint256 rarityPercentageTmp = (uint256(rarityBytes) * 1e6) /
            uint256(4294967295);
        uint256 speciesPercentTmp = (uint256(speciesByte) * 1e6) / uint256(255);
        rarityPercentage = uint32(rarityPercentageTmp);
        speciesPercent = uint32(speciesPercentTmp);

        return (rarityPercentage, speciesPercent);
    }

    function getLevelThresholds(
        uint256[] memory levelThresholds,
        uint256 _chonk
    )
        internal
        pure
        returns (uint16 _currentLevel, uint256 _currentLevelThreshold)
    {
        if (_chonk >= levelThresholds[99]) {
            return (101, levelThresholds[99]);
        }
        if (_chonk < levelThresholds[0]) {
            return (1, 0);
        }

        uint256 low = 0;
        uint256 high = levelThresholds.length;
        uint256 mid = 0;
        uint16 answer = 0;

        while (low < high) {
            mid = (low + high) / 2;
            if (levelThresholds[mid] <= _chonk) {
                low = mid + 1;
            } else {
                answer = uint16(mid);
                high = mid;
            }
        }

        _currentLevel = answer + 1;
        _currentLevelThreshold = levelThresholds[uint256(answer - 1)];
    }
}
