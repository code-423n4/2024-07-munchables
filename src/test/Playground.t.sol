// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../config/ConfigStorage.sol";
import "../interfaces/IMigrationManager.sol";
import "../interfaces/IAccountManager.sol";
import "../tokens/OldMunchNFT.sol";
import "../tokens/MunchNFT.sol";
import "../libraries/MunchablesCommonLib.sol";

// forge test --match-test testPlayground_localOnly --rpc-url https://blastl2-mainnet.blastapi.io/744cc9e9-89b6-4c70-ac27-acb5a0749004
contract Playground is Test {
    IMigrationManager mm;
    IAccountManager am;
    OldMunchNFT mn;
    MunchNFT mn_new;
    ConfigStorage cs;

    function setUp() public {
        mm = IMigrationManager(0x34270C640BDE49Ac63c562ff1cfD33CAbda28211);
        am = IAccountManager(0xfB5cd7507A3Cb0932029Df2E78165667954C8286);
        mn = OldMunchNFT(0xd8261B960e74228Dfcdd8c7C9200D8879527bF4a);
        cs = ConfigStorage(0xEf173BB4b36525974BF6711357D2c6C12b8001eC);
        mn_new = MunchNFT(0xd0aCC2C30e2e68907E2966e1f7560C73d9D39793);
    }

    function testPlayground_localOnly() public {
        address deployer = 0xe7CA8292c8F9951Dc1F4214A4a857087cc5e75b6;
        vm.startPrank(deployer);
        mm.sealData();
        vm.stopPrank();
        cs.getAddress(StorageKey.OldMunchNFT);
        // Impersonate the account that will pause the contract
        //address deployerAddress = 0xe7CA8292c8F9951Dc1F4214A4a857087cc5e75b6;
        address msig = 0x60eDE8542eC44e95846a5F3c1CE22DB4D0f21b39;

        cs.getUint(StorageKey.MigrationBonusEndTime);
        vm.startPrank(msig);
        cs.removeNotifiableAddress(0x60eDE8542eC44e95846a5F3c1CE22DB4D0f21b39);
        cs.addNotifiableAddress(address(mm));
        cs.setAddress(StorageKey.MigrationManager, address(mm), true);
        cs.setUint(StorageKey.MigrationBonusEndTime, 1721538000, true);
        mn.setMigrationManager(address(mm));
        vm.stopPrank();

        mm.migrateAllNFTs(0xc362940387AdEC3b432b124807396A7DF4bCbf95, 0);
        // also test out if harvesting works
        vm.startPrank(0xc362940387AdEC3b432b124807396A7DF4bCbf95);
        am.harvest();
        vm.stopPrank();

        // then test out to make sure a non-migrated one works
        address notyet = 0x0017345912fA309DDc01BD8D1dDF7C587Ab774Be;
        vm.deal(notyet, 10 ether);
        vm.startPrank(notyet);
        am.register(MunchablesCommonLib.Realm.Everfrost, address(0));
        mm.lockFundsForAllMigration{value: 1 ether}();
        mm.migrateAllNFTs(notyet, 0);
        uint256[] memory tokens = new uint256[](2);
        tokens[0] = 10208;
        tokens[1] = 10551;
        mm.migratePurchasedNFTs{value: 2 ether}(tokens);
        mm.burnRemainingPurchasedNFTs(notyet, 0);
        vm.stopPrank();
    }
}
