// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IDistributor.sol";
import "../interfaces/IClaimManager.sol";
import "../interfaces/IConfigStorage.sol";
import "../interfaces/IBlast.sol";
import "../interfaces/IConfigNotifiable.sol";
import "./BaseBlastManager.sol";
import "../interfaces/IHoldsGovernorship.sol";
import "../interfaces/IRewardsManager.sol";
import "../interfaces/IERC20YieldClaimable.sol";

contract RewardsManager is
    IRewardsManager,
    IHoldsGovernorship,
    BaseBlastManager
{
    IDistributor yieldDistributor;
    IDistributor gasFeeDistributor;

    event YieldClaimed(
        address _claimer,
        address _contract,
        uint256 _yieldETH,
        uint256 _yieldUSDB,
        uint256 _yieldWETH
    );

    constructor(address _configStorage) {
        __BaseConfigStorage_setConfigStorage(_configStorage);
        _reconfigure();
    }

    receive() external payable {}

    fallback() external payable {
        require(msg.data.length == 0);
    }

    function _reconfigure() internal {
        yieldDistributor = IDistributor(
            configStorage.getAddress(StorageKey.YieldDistributor)
        );
        gasFeeDistributor = IDistributor(
            configStorage.getAddress(StorageKey.GasFeeDistributor)
        );

        super.__BaseBlastManager_reconfigure();
    }

    function configUpdated() external override onlyConfigStorage {
        _reconfigure();
    }

    /*function claimYield() external onlyRole(Role.ClaimYield) {
        uint256 ongoingETH;
        uint256 ongoingWETH;
        uint256 ongoingUSDB;
        address current;
        for (uint256 i = 0; i < yieldCollectorContracts.length; i++) {
            current = yieldCollectorContracts[i];
            (
                uint256 _yieldETH,
                uint256 _yieldUSDB,
                uint256 _yieldWETH
            ) = _claimYieldForContract(current);
            if (_yieldETH > 0) {
                ongoingETH += _yieldETH;
            }
            if (_yieldUSDB > 0) {
                ongoingUSDB += _yieldUSDB;
            }
            if (_yieldWETH > 0) {
                ongoingWETH += _yieldWETH;
            }
        }

        IDistributor.TokenBag[] memory tokenBags = _forwardYield(
            ongoingETH,
            ongoingUSDB,
            ongoingWETH
        );

        emit YieldClaimed(tokenBags);
    }

    function claimGasFee() external onlyRole(Role.ClaimYield) {
        if (address(gasFeeDistributor) == address(0))
            revert GasFeeNotConfiguredError();
        if (address(blastContract) == address(0))
            revert BlastNotConfiguredError();

        address current;
        uint256 ongoingGas;
        for (uint256 i = 0; i < gasCollectorContracts.length; i++) {
            current = gasCollectorContracts[i];
            uint256 _gas = blastContract.claimMaxGas(current, address(this));
            ongoingGas += _gas;
            emit GasFeeClaimed(msg.sender, current, _gas);
        }

        IDistributor.TokenBag[] memory tokenBags = new IDistributor.TokenBag[](
            1
        );
        tokenBags[0] = IDistributor.TokenBag(ongoingGas, address(0));

        gasFeeDistributor.receiveTokens{value: ongoingGas}(tokenBags);
    }*/

    function claimYieldForContracts(address[] calldata _contracts) external {
        uint256 ongoingETH;
        uint256 ongoingWETH;
        uint256 ongoingUSDB;
        address current;
        for (uint256 i = 0; i < _contracts.length; i++) {
            current = _contracts[i];
            (
                uint256 _yieldETH,
                uint256 _yieldUSDB,
                uint256 _yieldWETH
            ) = _claimYieldForContract(current);
            if (_yieldETH > 0) {
                ongoingETH += _yieldETH;
            }
            if (_yieldUSDB > 0) {
                ongoingUSDB += _yieldUSDB;
            }
            if (_yieldWETH > 0) {
                ongoingWETH += _yieldWETH;
            }
        }

        IDistributor.TokenBag[] memory tokenBags = _forwardYield(
            ongoingETH,
            ongoingUSDB,
            ongoingWETH
        );

        emit YieldClaimed(tokenBags);
    }

    function claimGasFeeForContracts(address[] calldata _contracts) external {
        uint256 _gas = 0;
        for (uint256 i = 0; i < _contracts.length; i++) {
            _gas += blastContract.claimMaxGas(_contracts[i], address(this));
        }

        IDistributor.TokenBag[] memory tokenBags = new IDistributor.TokenBag[](
            1
        );
        tokenBags[0] = IDistributor.TokenBag(_gas, address(0));

        gasFeeDistributor.receiveTokens{value: _gas}(tokenBags);
    }

    function reassignBlastGovernor(address _newAddress) external {
        // if we are the governor then we can change the governor for contracts when they ask this contract
        address existingGovernor = IBaseBlastManager(msg.sender)
            .getConfiguredGovernor();
        if (existingGovernor == address(this)) {
            // we have permission to update because we are the guvnor
            blastContract.configureGovernorOnBehalf(_newAddress, msg.sender);
        }
    }

    function isGovernorOfContract(
        address _contract
    ) external view returns (bool) {
        return blastContract.isGovernor(_contract);
    }

    function _claimYieldForContract(
        address _contract
    ) internal returns (uint256, uint256, uint256) {
        if (address(yieldDistributor) == address(0))
            revert YieldNotConfiguredError();
        if (address(blastContract) == address(0))
            revert BlastNotConfiguredError();

        uint256 _yieldETH = blastContract.claimAllYield(
            _contract,
            address(this)
        );

        uint256 _yieldUSDB = IERC20Rebasing(address(USDB)).getClaimableAmount(
            _contract
        );
        if (_yieldUSDB != 0) {
            IERC20YieldClaimable(_contract).claimERC20Yield(
                address(USDB),
                _yieldUSDB
            );
        }

        uint256 _yieldWETH = IERC20Rebasing(address(WETH)).getClaimableAmount(
            _contract
        );
        if (_yieldWETH != 0) {
            IERC20YieldClaimable(_contract).claimERC20Yield(
                address(WETH),
                _yieldWETH
            );
        }

        emit YieldClaimedForContract(
            msg.sender,
            _contract,
            _yieldETH,
            _yieldUSDB,
            _yieldWETH
        );

        return (_yieldETH, _yieldUSDB, _yieldWETH);
    }

    function _forwardYield(
        uint256 ongoingETH,
        uint256 ongoingUSDB,
        uint256 ongoingWETH
    ) internal returns (IDistributor.TokenBag[] memory) {
        IDistributor.TokenBag memory tokenBagUSDB;
        IDistributor.TokenBag memory tokenBagWETH;
        IDistributor.TokenBag memory tokenBagETH;
        uint8 numberBags;

        if (ongoingUSDB > 0) {
            USDB.approve(address(yieldDistributor), ongoingUSDB);
            tokenBagUSDB = IDistributor.TokenBag(ongoingUSDB, address(USDB));
            numberBags++;
        }
        if (ongoingWETH > 0) {
            WETH.approve(address(yieldDistributor), ongoingWETH);
            tokenBagWETH = IDistributor.TokenBag(ongoingWETH, address(WETH));
            numberBags++;
        }
        if (ongoingETH > 0) {
            tokenBagETH = IDistributor.TokenBag(ongoingETH, address(0));
            numberBags++;
        }

        IDistributor.TokenBag[] memory tokenBags = new IDistributor.TokenBag[](
            numberBags
        );
        if (ongoingUSDB > 0) {
            tokenBags[--numberBags] = tokenBagUSDB;
        }
        if (ongoingWETH > 0) {
            tokenBags[--numberBags] = tokenBagWETH;
        }
        if (ongoingETH > 0) {
            tokenBags[--numberBags] = tokenBagETH;
        }

        if (ongoingETH > 0) {
            yieldDistributor.receiveTokens{value: ongoingETH}(tokenBags);
        } else {
            yieldDistributor.receiveTokens(tokenBags);
        }

        return tokenBags;
    }
}
