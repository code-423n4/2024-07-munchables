// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {console} from "forge-std/console.sol";
import "./MunchablesTest.sol";
import "../managers/MigrationManager.sol";

interface IPausable {
    function pause() external;
}

contract MrMigrate is MunchablesTest {
    function test_MigrateNFTs() public {
        deployContracts();

        address[] memory addresses = new address[](1);
        addresses[0] = address(this);
        IMigrationManager.MigrationSnapshotData[]
            memory migrateData = new IMigrationManager.MigrationSnapshotData[](
                1
            );
        MunchablesCommonLib.NFTAttributes memory attrs;
        MunchablesCommonLib.NFTImmutableAttributes memory iAttrs;
        attrs.level = 4;
        iAttrs.species = 7;
        iAttrs.rarity = MunchablesCommonLib.Rarity(5);
        migrateData[0] = IMigrationManager.MigrationSnapshotData({
            tokenId: 1,
            lockAmount: 10e18,
            token: address(0),
            attributes: attrs,
            immutableAttributes: iAttrs,
            gameAttributes: new MunchablesCommonLib.NFTGameAttribute[](0),
            claimed: false
        });
        amp.register(MunchablesCommonLib.Realm(3), address(0));

        // mint an NFT for me
        IOldMunchNFT(address(oldnftp)).safeMint(address(this), "Q");

        migm.loadMigrationSnapshot(addresses, migrateData);
        uint16[] memory unrevealed = new uint16[](1);
        unrevealed[0] = 20;
        migm.loadUnrevealedSnapshot(addresses, unrevealed);
        migm.sealData();

        // pause nft contract to simulate real mainnet
        IPausable(address(oldnftp)).pause();

        migm.lockFundsForAllMigration{value: 5e18}();
        migm.migrateAllNFTs(address(this), 0);
        migm.burnUnrevealedForPoints();

        logPlayer("After burn");
        logLockedTokens("Locked tokens");
    }
}
