// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "../managers/AccountManager.sol";
import "../managers/ClaimManager.sol";
import "../managers/SnuggeryManager.sol";
import "../managers/LandManager.sol";
import "../config/ConfigStorage.sol";
import "../interfaces/IConfigStorage.sol";
import "../interfaces/IClaimManager.sol";
import "../interfaces/ILandManager.sol";
import "../interfaces/IRNGProxySelfHosted.sol";
import "../managers/BonusManager.sol";
import "../managers/LockManager.sol";
import "../managers/MunchadexManager.sol";
import "../managers/NFTAttributeManagerV1.sol";
import "../managers/MigrationManager.sol";
import "../proxy/ProxyFactory.sol";
import "../rng/RNGProxySelfHosted.sol";
import "../tokens/MunchNFT.sol";
import "../tokens/MunchToken.sol";
import "../managers/PrimordialManager.sol";
import "../managers/RewardsManager.sol";
import "../overlords/NFTOverlord.sol";
import "../distributors/FundTreasuryDistributor.sol";
import {MockBlast} from "../mock/MockBlast.sol";
import {TestERC20Token} from "../tokens/TestERC20Token.sol";
import "../tokens/OldMunchNFT.sol";

interface IOldMunchNFT {
    function safeMint(address _to, string memory _uri) external;

    function setMigrationManager(address) external;
}

abstract contract MunchablesTest is Test {
    IAccountManager am;
    IAccountManager amp; // proxy
    IClaimManager cm;
    IClaimManager cmp; // proxy
    ISnuggeryManager sm;
    ISnuggeryManager smp; // proxy
    IPrimordialManager pm;
    IBonusManager bm;
    ILockManager lm;
    IConfigStorage cs;
    IMunchadexManager mdexm;
    INFTAttributesManager nftm;
    IMigrationManager migm;
    ILandManager lam;
    ILandManager lamp; // proxy
    IRNGProxy rng;
    IMunchNFT nft;
    IERC721 oldnft;
    IERC721 oldnftp;
    IMunchToken token;
    INFTOverlord nfto;
    IRewardsManager rm;
    IDistributor dist;
    IBlast blast;
    IERC20 usdb;
    IERC20 weth;

    receive() external payable {
        console.log("received ETH:", msg.value);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function setUp() public {}

    function setupRevealConfig() internal {
        // reveal config
        uint8[] memory commonSpecies = new uint8[](42);
        uint8[42] memory commonSpeciesVar = [
            1,
            2,
            3,
            5,
            6,
            8,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            23,
            26,
            27,
            28,
            29,
            30,
            32,
            35,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
            51,
            52,
            55,
            56,
            58,
            59,
            61,
            64,
            66
        ];
        for (uint256 i; i < commonSpeciesVar.length; i++)
            commonSpecies[i] = commonSpeciesVar[i];

        uint8[] memory rareSpecies = new uint8[](23);
        uint8[23] memory rareSpeciesVar = [
            4,
            10,
            11,
            21,
            24,
            34,
            36,
            37,
            38,
            40,
            54,
            57,
            62,
            71,
            72,
            79,
            83,
            93,
            103,
            105,
            108,
            109,
            125
        ];
        for (uint256 i; i < rareSpeciesVar.length; i++)
            rareSpecies[i] = rareSpeciesVar[i];

        uint8[] memory epicSpecies = new uint8[](13);
        uint8[13] memory epicSpeciesVar = [
            7,
            9,
            25,
            31,
            33,
            60,
            63,
            73,
            82,
            95,
            110,
            118,
            120
        ];
        for (uint256 i; i < epicSpeciesVar.length; i++)
            epicSpecies[i] = epicSpeciesVar[i];

        uint8[] memory legendarySpecies = new uint8[](6);
        uint8[6] memory legendarySpeciesVar = [22, 39, 53, 65, 76, 124];
        for (uint256 i; i < legendarySpeciesVar.length; i++)
            legendarySpecies[i] = legendarySpeciesVar[i];

        uint8[] memory mythicSpecies = new uint8[](1);
        mythicSpecies[0] = 78;

        cs.setSmallUintArray(StorageKey.CommonSpecies, commonSpecies, false);
        cs.setSmallUintArray(StorageKey.RareSpecies, rareSpecies, false);
        cs.setSmallUintArray(StorageKey.EpicSpecies, epicSpecies, false);
        cs.setSmallUintArray(
            StorageKey.LegendarySpecies,
            legendarySpecies,
            false
        );
        cs.setSmallUintArray(StorageKey.MythicSpecies, mythicSpecies, false);

        cs.setUint(StorageKey.CommonPercentage, 648000, false);
        cs.setUint(StorageKey.RarePercentage, 237000, false);
        cs.setUint(StorageKey.EpicPercentage, 92000, false);
        cs.setUint(StorageKey.LegendaryPercentage, 20000, false);
        cs.setUint(StorageKey.MythicPercentage, 3000, false);

        uint8[126] memory realmLookupVar = [
            0,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4
        ];
        uint8[] memory realmLookup = new uint8[](126);
        for (uint256 i; i < realmLookupVar.length; i++)
            realmLookup[i] = realmLookupVar[i];
        cs.setSmallUintArray(StorageKey.RealmLookups, realmLookup, false);

        uint256[3] memory primordialLevelsVar = [
            uint256(100e18),
            uint256(150e18),
            uint256(500e18)
        ];
        uint256[] memory primordialLevels = new uint256[](3);
        for (uint256 i; i < primordialLevelsVar.length; i++)
            primordialLevels[i] = primordialLevelsVar[i];
        cs.setUintArray(
            StorageKey.PrimordialLevelThresholds,
            primordialLevels,
            false
        );

        int16[25] memory realmBonusesVar = [
            int16(10),
            -10,
            -5,
            0,
            5,
            -10,
            10,
            -5,
            5,
            0,
            -5,
            0,
            10,
            5,
            -10,
            0,
            -5,
            10,
            10,
            -10,
            5,
            10,
            0,
            -10,
            10
        ];
        int16[] memory realmBonuses = new int16[](25);
        for (uint256 i; i < realmBonusesVar.length; i++)
            realmBonuses[i] = realmBonusesVar[i];
        cs.setSmallIntArray(StorageKey.RealmBonuses, realmBonuses, true);
        cs.getSmallIntArray(StorageKey.RealmBonuses);

        uint8[6] memory rarityBonusesVar = [uint8(0), 0, 10, 20, 30, 50];
        uint8[] memory rarityBonuses = new uint8[](6);
        for (uint256 i; i < rarityBonusesVar.length; i++)
            rarityBonuses[i] = rarityBonusesVar[i];
        cs.setSmallUintArray(StorageKey.RarityBonuses, rarityBonuses, true);
        cs.setSmallUintArray(StorageKey.RaritySetBonuses, rarityBonuses, true);

        // level thresholds
        uint256[100] memory levelThresholdsVar = [
            uint256(250),
            500,
            750,
            1000,
            1250,
            1500,
            1750,
            2000,
            2250,
            4750,
            7500,
            10500,
            13750,
            17250,
            21000,
            25000,
            29250,
            33750,
            38500,
            48250,
            58500,
            69250,
            80500,
            92250,
            122500,
            154000,
            186750,
            220750,
            256000,
            299750,
            345000,
            391750,
            440000,
            489750,
            549500,
            611000,
            674250,
            739250,
            806000,
            884250,
            964500,
            1046750,
            1131000,
            1217250,
            1316500,
            1418000,
            1521750,
            1627750,
            1736000,
            1858750,
            1984000,
            2111750,
            2242000,
            2374750,
            2523500,
            2675000,
            2829250,
            2986250,
            3146000,
            3323250,
            3503500,
            3686750,
            3873000,
            4062250,
            4270500,
            4482000,
            4696750,
            4914750,
            5136000,
            5377750,
            5623000,
            5871750,
            6124000,
            6379750,
            6657500,
            6939000,
            7224250,
            7513250,
            7806000,
            8122250,
            8442500,
            8766750,
            9095000,
            9427250,
            9784500,
            10146000,
            10511750,
            10881750,
            11256000,
            11656750,
            12062000,
            12471750,
            12886000,
            13304750,
            13751500,
            14203000,
            14659250,
            15120250,
            15586000,
            16081250
        ];
        uint256[] memory levelThresholds = new uint256[](100);
        for (uint256 i; i < levelThresholdsVar.length; i++)
            levelThresholds[i] = levelThresholdsVar[i] * 1e18;
        cs.setUintArray(StorageKey.LevelThresholds, levelThresholds, true);
    }

    function deployContracts() internal {
        //        uint256 lockAmount = 100e18;
        uint32 lockDuration = 86400;

        cs = new ConfigStorage();
        console.log("Created config storage");
        bytes memory proxyInit = abi.encodeWithSignature(
            "initialize(address)",
            address(cs)
        );

        am = new AccountManager();
        console.log("Created account manager", address(am));
        ProxyFactory _amp = new ProxyFactory(
            address(am),
            address(this),
            proxyInit
        );
        amp = IAccountManager(address(_amp));
        cs.addNotifiableAddress(address(amp));

        cm = new ClaimManager();
        console.log("Created claim manager", address(cm));
        ProxyFactory _cmp = new ProxyFactory(
            address(cm),
            address(this),
            proxyInit
        );
        cmp = IClaimManager(address(_cmp));
        cs.addNotifiableAddress(address(cmp));

        sm = new SnuggeryManager();
        console.log("Created snuggery manager", address(sm));
        ProxyFactory _smp = new ProxyFactory(
            address(sm),
            address(this),
            proxyInit
        );
        smp = ISnuggeryManager(address(_smp));
        cs.addNotifiableAddress(address(smp));
        console.log("Created snuggery manager", address(sm));

        pm = new PrimordialManager(address(cs));
        cs.addNotifiableAddress(address(pm));
        console.log("Created primordial manager", address(pm));

        bm = new BonusManager(address(cs));
        cs.addNotifiableAddress(address(bm));
        console.log("Created bonus manager", address(bm));

        lm = new LockManager(address(cs));
        cs.addNotifiableAddress(address(lm));
        console.log("Created lock manager", address(lm));

        mdexm = new MunchadexManager(address(cs));
        cs.addNotifiableAddress(address(mdexm));
        console.log("Created munchadex manager", address(mdexm));

        nfto = new NFTOverlord(address(cs));
        cs.addNotifiableAddress(address(nfto));
        console.log("Created nft overlord", address(nfto));

        nftm = new NFTAttributesManagerV1(address(cs));
        cs.addNotifiableAddress(address(nftm));
        console.log("Created nft attributes manager", address(nftm));

        migm = new MigrationManager(address(cs));
        cs.addNotifiableAddress(address(migm));
        console.log("Created migration manager", address(migm));

        rm = new RewardsManager(address(cs));
        cs.addNotifiableAddress(address(rm));
        console.log("Created rewards manager", address(rm));

        rng = new RNGProxySelfHosted(address(cs));
        cs.addNotifiableAddress(address(rng));
        console.log("Created RNG", address(rng));

        dist = new FundTreasuryDistributor(address(cs));
        cs.addNotifiableAddress(address(dist));
        console.log("Created Fund Distributor", address(dist));

        nft = new MunchNFT(address(cs), "Munchables", "MUNCHNFT");
        cs.addNotifiableAddress(address(nft));
        console.log("Created MunchNFT", address(nft));

        lam = new LandManager();
        ProxyFactory _lmp = new ProxyFactory(
            address(lam),
            address(this),
            proxyInit
        );
        lamp = ILandManager(address(_lmp));
        cs.addNotifiableAddress(address(lamp));
        console.log("Created land manager", address(lamp));

        bytes memory oldMunchInit = abi.encodeWithSignature(
            "initialize(address,address,address,address,address)",
            address(this),
            address(this),
            address(this),
            address(this),
            address(this)
        );
        oldnft = new OldMunchNFT();
        console.log("Created old NFT", address(oldnft));
        ProxyFactory _oldnftp = new ProxyFactory(
            address(oldnft),
            address(this),
            oldMunchInit
        );
        oldnftp = IERC721(address(_oldnftp));

        token = new MunchToken(address(cs), "Munchables", "MUNCH");
        cs.addNotifiableAddress(address(token));
        console.log("Created MunchToken", address(token));

        blast = new MockBlast();
        console.log("Created MockBlast", address(blast));

        usdb = new TestERC20Token();
        weth = new TestERC20Token();

        address[] memory addresses = new address[](4);
        addresses[0] = 0x0000000000000000000000000000000000000001;
        addresses[1] = 0x0000000000000000000000000000000000000002;
        addresses[2] = 0x0000000000000000000000000000000000000003;
        addresses[3] = 0x0000000000000000000000000000000000000004;
        StorageKey[] memory keys = new StorageKey[](4);
        keys[0] = StorageKey(10);
        keys[1] = StorageKey(11);
        keys[1] = StorageKey(12);
        keys[1] = StorageKey(13);
        cs.setAddresses(keys, addresses, true);
        address[] memory addresses2 = new address[](3);
        addresses2[0] = 0x0000000000000000000000000000000000000005;
        addresses2[1] = 0x0000000000000000000000000000000000000006;
        addresses2[2] = 0x0000000000000000000000000000000000000007;
        StorageKey[] memory keys2 = new StorageKey[](3);
        keys2[0] = StorageKey(4);
        keys2[1] = StorageKey(5);
        keys2[2] = StorageKey(6);
        cs.setAddresses(keys2, addresses2, true);
        cs.setAddress(StorageKey.BlastContract, address(blast), false);
        cs.setAddress(StorageKey.USDBContract, address(usdb), false);
        cs.setAddress(StorageKey.WETHContract, address(weth), false);
        cs.setAddress(StorageKey.MunchToken, address(token), false);
        cs.setAddress(StorageKey.AccountManager, address(amp), false);
        cs.setAddress(StorageKey.ClaimManager, address(cmp), false);
        cs.setAddress(StorageKey.PrimordialManager, address(pm), false);
        cs.setAddress(StorageKey.SnuggeryManager, address(smp), false);
        cs.setAddress(StorageKey.BonusManager, address(bm), false);
        cs.setAddress(StorageKey.LockManager, address(lm), false);
        cs.setAddress(StorageKey.RewardsManager, address(rm), false);
        cs.setAddress(StorageKey.MunchadexManager, address(mdexm), false);
        cs.setAddress(StorageKey.NFTOverlord, address(nfto), false);
        cs.setAddress(StorageKey.NFTAttributesManager, address(nftm), false);
        cs.setAddress(StorageKey.OldMunchNFT, address(oldnftp), false);
        cs.setAddress(StorageKey.MunchNFT, address(nft), false);
        cs.setAddress(StorageKey.MigrationManager, address(migm), false);
        cs.setAddress(StorageKey.RNGProxyContract, address(rng), false);
        cs.setAddress(StorageKey.YieldDistributor, address(dist), false);
        cs.setAddress(StorageKey.GasFeeDistributor, address(dist), false);
        cs.setAddress(StorageKey.Treasury, address(this), false);
        cs.setAddress(StorageKey.PrimordialsEnabled, address(lamp), false);
        cs.setBool(StorageKey.PrimordialsEnabled, true, false);
        cs.setBool(StorageKey.SwapEnabled, true, false);
        cs.setUint(StorageKey.PointsPerToken, 10e18, false);
        cs.setUint(StorageKey.MaxLockDuration, 60 * 60 * 24 * 90, false);
        cs.setUint(StorageKey.PointsPerPeriod, 1e24, false);
        cs.setUint(StorageKey.MigrationDiscountFactor, 5e12, false);
        cs.setUint(StorageKey.PointsPerUnrevealedNFT, 1e24, false);
        uint256[] memory migratedPoints = new uint256[](6);
        migratedPoints[0] = 0;
        migratedPoints[1] = 0;
        migratedPoints[2] = 10e18;
        migratedPoints[3] = 20e18;
        migratedPoints[4] = 30e18;
        migratedPoints[5] = 40e18;
        cs.setUintArray(StorageKey.PointsPerMigratedNFT, migratedPoints, false);
        cs.setSmallInt(StorageKey.DefaultSnuggerySize, 6, false);
        cs.setSmallInt(StorageKey.MaxRevealQueue, 1, false);
        cs.setSmallInt(StorageKey.MaxSchnibbleSpray, 1000, true);

        // special config for old nft
        IOldMunchNFT(address(oldnftp)).setMigrationManager(address(migm));

        // Roles
        cs.setRole(Role.NewPeriod, address(cmp), address(this));
        cs.setRole(Role.Social_1, address(amp), address(this));
        cs.setRole(Role.SocialApproval_1, address(amp), address(this));
        cs.setRole(Role.ClaimYield, address(rm), address(this));
        cs.setRole(Role.NFTOracle, address(rng), address(this));
        cs.setRole(Role.NFTOracle, address(pm), address(this));
        cs.setUniversalRole(Role.Admin, address(this));

        setupRevealConfig();

        // start lockdrop
        lm.configureLockdrop(
            ILockManager.Lockdrop({
                start: uint32(block.timestamp),
                end: uint32(block.timestamp) + uint32(lockDuration * 3),
                minLockDuration: lockDuration
            })
        );

        // configure lock manager with all tokens
        ILockManager.ConfiguredToken memory ethToken;
        ethToken.active = true;
        ethToken.nftCost = 1e18;
        ethToken.usdPrice = 35000000;
        ILockManager.ConfiguredToken memory usdbToken;
        usdbToken.active = true;
        usdbToken.nftCost = 3500e18;
        usdbToken.usdPrice = 0;
        ILockManager.ConfiguredToken memory wethToken;
        wethToken.active = true;
        wethToken.nftCost = 1e18;
        wethToken.usdPrice = 35000000;

        lm.configureToken(address(0), ethToken);
        lm.configureToken(address(usdb), usdbToken);
        lm.configureToken(address(weth), wethToken);
    }

    function logSnuggery(string memory _msg) internal view {
        MunchablesCommonLib.SnuggeryNFT[] memory _snuggery;

        _snuggery = smp.getSnuggery(address(this));
        uint256 _snuggerySize = _snuggery.length;

        console.log("-------------------------------");
        console.log(_msg);
        console.log("Snuggery size: ", _snuggerySize);
        for (uint256 i; i < _snuggerySize; i++) {
            console.log("-------------------------------");
            console.log("MUNCHABLE ", i);
            console.log("Token ID: ", _snuggery[i].tokenId);
            MunchablesCommonLib.NFTImmutableAttributes memory iAttrs = nftm
                .getImmutableAttributes(_snuggery[i].tokenId);
            console.log("Rarity: ", uint8(iAttrs.rarity));
            console.log("Realm: ", uint8(iAttrs.realm));
            console.log("Species: ", iAttrs.species);
            MunchablesCommonLib.NFTAttributes memory attrs = nftm.getAttributes(
                _snuggery[i].tokenId
            );
            console.log("Chonks:", attrs.chonks);
            console.log("Level:", attrs.level);
        }
        MunchablesCommonLib.PrimordialData memory primordial = pm.getPrimordial(
            address(this)
        );
        if (!primordial.hatched && primordial.createdDate > 0) {
            console.log("-------------------------------");
            console.log("Primordial");
            console.log("Chonks:", primordial.chonks);
            console.log("Level (as uint8):", uint8(primordial.level));
        }
        console.log("-------------------------------");
    }

    function logLockedTokens(string memory _msg) internal view {
        ILockManager.LockedTokenWithMetadata[] memory lockedTokens = lm
            .getLocked(address(this));
        console.log("-------------------------------");
        console.log(_msg);
        for (uint i; i < lockedTokens.length; i++) {
            if (lockedTokens[i].tokenContract == address(0)) {
                console.log(
                    "ETH Locked:",
                    lockedTokens[i].lockedToken.quantity
                );
                console.log(
                    "Remainder:",
                    lockedTokens[i].lockedToken.remainder
                );
            }
        }
        console.log("-------------------------------");
    }

    function logPlayer(string memory _msg) internal view {
        MunchablesCommonLib.Player memory _player;
        (, _player) = amp.getPlayer(address(this));
        console.log("-------------------------------");
        console.log(_msg);
        console.log("Registration Date:", _player.registrationDate);
        console.log("Unfed Schnibbles:", _player.unfedSchnibbles);
        uint16 unrevealedNFTs = nfto.getUnrevealedNFTs(address(this));
        console.log("Unrevealed NFTs:", unrevealedNFTs);
        uint256 points = cmp.getPoints(address(this));
        console.log("Points:", points);
        uint256 tokens = IERC20(address(token)).balanceOf(address(this));
        console.log("MUNCH tokens:", tokens);
        console.log("-------------------------------");
    }

    function logPeriod(string memory _msg) internal view {
        console.log("-------------------------------");
        console.log(_msg);
        IClaimManager.Period memory currentPeriod = cmp.getCurrentPeriod();
        console.log("Current period:", currentPeriod.id);
        console.log("Available Points:", currentPeriod.available);
        console.log("Claimed:", currentPeriod.claimed);
        console.log(
            "Start/End:",
            currentPeriod.startTime,
            currentPeriod.endTime
        );
        console.log("Global Total Chonk:", currentPeriod.globalTotalChonk);
        console.log("-------------------------------");
    }
}
