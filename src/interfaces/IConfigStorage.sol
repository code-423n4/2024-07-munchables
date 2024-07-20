// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

enum StorageKey {
    Many,
    Paused,
    LockManager,
    AccountManager,
    ClaimManager,
    MigrationManager,
    NFTOverlord,
    SnuggeryManager,
    PrimordialManager,
    MunchadexManager,
    MunchNFT,
    MunchToken,
    RewardsManager,
    YieldDistributor,
    GasFeeDistributor,
    BlastContract,
    BlastPointsContract,
    BlastPointsOperator,
    USDBContract,
    WETHContract,
    RNGProxyContract,
    NFTAttributesManager,
    Treasury,
    OldMunchNFT,
    MaxLockDuration,
    DefaultSnuggerySize,
    MaxSnuggerySize,
    MaxRevealQueue,
    MaxSchnibbleSpray,
    PetTotalSchnibbles,
    NewSlotCost,
    PrimordialsEnabled,
    BonusManager,
    ReferralBonus,
    RealmBonuses,
    RarityBonuses,
    LevelThresholds,
    PrimordialLevelThresholds,
    TotalMunchables,
    MunchablesPerRealm,
    MunchablesPerRarity,
    RaritySetBonuses,
    PointsPerPeriod,
    PointsPerToken,
    SwapEnabled,
    PointsPerMigratedNFT,
    PointsPerUnrevealedNFT,
    MinETHPetBonus,
    MaxETHPetBonus,
    PetBonusMultiplier,
    RealmLookups,
    // Species & Probabilities
    CommonSpecies,
    RareSpecies,
    EpicSpecies,
    LegendarySpecies,
    MythicSpecies,
    CommonPercentage,
    RarePercentage,
    EpicPercentage,
    LegendaryPercentage,
    MythicPercentage,
    MigrationBonus,
    MigrationBonusEndTime,
    MigrationDiscountFactor
}

enum Role {
    Admin,
    Social_1,
    Social_2,
    Social_3,
    Social_4,
    Social_5,
    SocialApproval_1,
    SocialApproval_2,
    SocialApproval_3,
    SocialApproval_4,
    SocialApproval_5,
    PriceFeed_1,
    PriceFeed_2,
    PriceFeed_3,
    PriceFeed_4,
    PriceFeed_5,
    Snapshot,
    NewPeriod,
    ClaimYield,
    Minter,
    NFTOracle
}

enum StorageType {
    Uint,
    SmallUintArray,
    UintArray,
    SmallInt,
    SmallIntArray,
    Bool,
    Address,
    AddressArray,
    Bytes32
}

interface IConfigStorage {
    // Manual notify
    function manualNotify(uint8 _index, uint8 _length) external;

    // Manual notify for a specific contract
    function manualNotifyAddress(address _contract) external;

    // Setters
    function setRole(Role _role, address _contract, address _addr) external;

    function setUniversalRole(Role _role, address _addr) external;

    function setUint(StorageKey _key, uint256 _value, bool _notify) external;

    function setUintArray(
        StorageKey _key,
        uint256[] memory _value,
        bool _notify
    ) external;

    function setSmallUintArray(
        StorageKey _key,
        uint8[] calldata _smallUintArray,
        bool _notify
    ) external;

    function setSmallInt(StorageKey _key, int16 _value, bool _notify) external;

    function setSmallIntArray(
        StorageKey _key,
        int16[] memory _value,
        bool _notify
    ) external;

    function setBool(StorageKey _key, bool _value, bool _notify) external;

    function setAddress(StorageKey _key, address _value, bool _notify) external;

    function setAddresses(
        StorageKey[] memory _keys,
        address[] memory _values,
        bool _notify
    ) external;

    function setAddressArray(
        StorageKey _key,
        address[] memory _value,
        bool _notify
    ) external;

    function setBytes32(StorageKey _key, bytes32 _value, bool _notify) external;

    // Getters
    function getRole(Role _role) external view returns (address);

    function getContractRole(
        Role _role,
        address _contract
    ) external view returns (address);

    function getUniversalRole(Role _role) external view returns (address);

    function getUint(StorageKey _key) external view returns (uint256);

    function getUintArray(
        StorageKey _key
    ) external view returns (uint256[] memory);

    function getSmallUintArray(
        StorageKey _key
    ) external view returns (uint8[] memory _smallUintArray);

    function getSmallInt(StorageKey _key) external view returns (int16);

    function getSmallIntArray(
        StorageKey _key
    ) external view returns (int16[] memory);

    function getBool(StorageKey _key) external view returns (bool);

    function getAddress(StorageKey _key) external view returns (address);

    function getAddressArray(
        StorageKey _key
    ) external view returns (address[] memory);

    function getBytes32(StorageKey _key) external view returns (bytes32);

    // Notification Address Management
    function addNotifiableAddress(address _addr) external;

    function addNotifiableAddresses(address[] memory _addresses) external;

    function removeNotifiableAddress(address _addr) external;

    function getNotifiableAddresses()
        external
        view
        returns (address[] memory _addresses);

    error ArrayTooLongError();
}
