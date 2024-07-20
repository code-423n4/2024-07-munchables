// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "./MunchablesTest.sol";

contract MrTester is MunchablesTest {
    function test_SpeedRun() public {
        uint256 lockAmount = 100e18;

        console.log("Beginning run()");
        deployContracts();

        // register me
        amp.register(MunchablesCommonLib.Realm(3), address(0));
        logSnuggery("Initial snuggery");

        // lock tokens
        lm.lock{value: lockAmount}(address(0), lockAmount);
        vm.expectRevert();
        lm.setLockDuration(10 hours);
        lm.setLockDuration(90 days);

        // warp by lock time and check we can unlock
        logPlayer("Player after lock");
        logLockedTokens("After First Lock");
        uint256 unlockTime = block.timestamp + 90 days;
        console.log("Warping to", unlockTime);
        vm.warp(unlockTime);
        console.log("Warped to:", block.timestamp);
        lm.unlock(address(0), lockAmount);
        logLockedTokens("After Unlock");
        // lock again with remainder
        logPlayer("Player before relock");
        lm.lock{value: lockAmount + 5e17}(address(0), lockAmount + 5e17);
        logLockedTokens("After Lock with Remainder");
        lm.lock{value: 5e17}(address(0), 5e17);
        logLockedTokens("After Lock additional 0.5 ETH");
        logPlayer("Player after relock");

        // claim a primordial
        pm.approvePrimordial(address(this), true);
        pm.claimPrimordial();
        logSnuggery("Snuggery after primordial claim");

        // reveal nft
        nfto.startReveal();

        // send randomness
        bytes memory _randomBytes = new bytes(32);
        _randomBytes[0] = 0xff;
        _randomBytes[1] = 0xff;
        _randomBytes[2] = 0xff;
        _randomBytes[3] = 0xff;
        _randomBytes[4] = 0xff;
        IRNGProxySelfHosted(address(rng)).provideRandom(
            uint256(uint160(address(this))),
            _randomBytes
        );

        // reveal nft 2
        nfto.startReveal();

        // send randomness 2
        _randomBytes[0] = 0x00;
        IRNGProxySelfHosted(address(rng)).provideRandom(
            (uint256(1) << 160) | uint256(uint160(address(this))),
            _randomBytes
        );

        // import munchables to snuggery
        IERC721(address(nft)).setApprovalForAll(address(smp), true);
        smp.importMunchable(uint256(1));
        smp.importMunchable(uint256(2));

        // harvest (should give 0 because no delay)
        uint256 harvestedSchnibbles = amp.harvest();
        console.log("Harvested Schnibbles:", harvestedSchnibbles);

        // snibble spray myself
        address[] memory _addresses = new address[](1);
        _addresses[0] = address(this);
        uint256[] memory _schnibbles = new uint256[](1);
        _schnibbles[0] = 100000e18;
        amp.spraySchnibblesPropose(_addresses, _schnibbles);
        amp.execSprayProposal(address(this));

        pm.feedPrimordial(1000e18);
        smp.feed(1, 249e18);
        console.log("Munchable fed");
        // munchable should have levelled up so send random
        _randomBytes[0] = 0x02;
        _randomBytes[2] = 0x63;
        _randomBytes[3] = 0x63;
        _randomBytes[4] = 0x33;
        _randomBytes[5] = 0x13;
        _randomBytes[6] = 0x63;
        _randomBytes[7] = 0x63;
        _randomBytes[8] = 0x63;
        _randomBytes[9] = 0x63;
        _randomBytes[10] = 0x63;
        _randomBytes[11] = 0x63;
        _randomBytes[12] = 0x63;
        bytes32 dataHash = keccak256(
            abi.encode(address(this), uint256(1), uint16(1), uint16(2))
        );
        uint256 levelUpIndex;
        assembly {
            levelUpIndex := dataHash
        }

        IRNGProxySelfHosted(address(rng)).provideRandom(
            levelUpIndex,
            _randomBytes
        );

        // primordial should be level 0 so we can hatch it
        pm.hatchPrimordialToMunchable();
        _randomBytes[0] = 0xff;
        IRNGProxySelfHosted(address(rng)).provideRandom(
            (uint256(2) << 160) | uint256(uint160(address(this))),
            _randomBytes
        );
        // import it, should be id 3
        smp.importMunchable(uint256(3));

        // claim now after a new period
        cmp.newPeriod();
        logPeriod("First real period");
        cmp.claimPoints();
        logPeriod("First real period after claim (should have claimed 100%)");

        // swap my points for munch token
        cmp.convertPointsToTokens(1e24);

        // export
        logSnuggery("Before export");
        smp.exportMunchable(uint256(2));

        logSnuggery("Final snuggery");

        // test blast yield and gas fees
        //        rm.claimYield();
        //        rm.claimGasFee();

        // test getters
        address _mainAccount;
        MunchablesCommonLib.Player memory _player;
        MunchablesCommonLib.SnuggeryNFT[] memory _snuggery;

        (_mainAccount, _player, _snuggery) = amp.getFullPlayerData(
            address(this)
        );

        logPlayer("Final player");

        // get daily schnibbles
        (uint256 _dailySchnibbles, uint256 _bonus) = amp.getDailySchnibbles(
            address(this)
        );

        console.log("Daily Schnibbles: ", _dailySchnibbles);
        console.log("Daily Schnibbles bonus: ", _bonus);

        // just to log in backtrace
        nftm.getGameAttributes(
            1,
            new MunchablesCommonLib.GameAttributeIndex[](0)
        );
    }
}
