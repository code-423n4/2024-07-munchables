// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IConfigStorage.sol";
import "../interfaces/IConfigNotifiable.sol";
import "../config/BaseConfigStorage.sol";
import "../interfaces/IBaseBlastManager.sol";
import "../interfaces/IHoldsGovernorship.sol";
import "../interfaces/IERC20YieldClaimable.sol";
import "../interfaces/IBlast.sol";

abstract contract BaseBlastManager is
    IBaseBlastManager,
    IERC20YieldClaimable,
    BaseConfigStorage
{
    IBlast public blastContract;
    IBlastPoints public blastPointsContract;

    address private _governorConfigured;
    address private _pointsOperatorConfigured;
    bool private _blastClaimableConfigured;

    IERC20 public USDB;
    IERC20 public WETH;

    error InvalidGovernorError();

    function __BaseBlastManager_reconfigure() internal {
        // load config from the config storage contract and configure myself
        address blastAddress = configStorage.getAddress(
            StorageKey.BlastContract
        );
        if (blastAddress != address(blastContract)) {
            blastContract = IBlast(blastAddress);
            if (blastContract.isAuthorized(address(this))) {
                blastContract.configureClaimableGas();
                // fails on cloned networks
                (bool success, ) = blastAddress.call(
                    abi.encodeWithSelector(
                        bytes4(keccak256("configureClaimableYield()"))
                    )
                );
                if (success) {
                    // not on a cloned network and no compiler error!
                }
            }
        }

        address pointsContractAddress = configStorage.getAddress(
            StorageKey.BlastPointsContract
        );
        if (pointsContractAddress != address(blastPointsContract)) {
            blastPointsContract = IBlastPoints(pointsContractAddress);

            address pointsOperator = configStorage.getAddress(
                StorageKey.BlastPointsOperator
            );
            if (_pointsOperatorConfigured == address(0)) {
                // Reassignment must be called from the point operator itself
                blastPointsContract.configurePointsOperator(pointsOperator);
                _pointsOperatorConfigured = pointsOperator;
            }
        }

        address usdbAddress = configStorage.getAddress(StorageKey.USDBContract);
        address wethAddress = configStorage.getAddress(StorageKey.WETHContract);

        if (usdbAddress != address(USDB)) {
            USDB = IERC20(usdbAddress);
            IERC20Rebasing _USDB = IERC20Rebasing(usdbAddress);
            _USDB.configure(YieldMode.CLAIMABLE);
        }

        if (wethAddress != address(WETH)) {
            WETH = IERC20(wethAddress);
            IERC20Rebasing _WETH = IERC20Rebasing(wethAddress);
            _WETH.configure(YieldMode.CLAIMABLE);
        }

        address rewardsManagerAddress = configStorage.getAddress(
            StorageKey.RewardsManager
        );
        if (rewardsManagerAddress != address(0)) {
            setBlastGovernor(rewardsManagerAddress);
        }

        super.__BaseConfigStorage_reconfigure();
    }

    function setBlastGovernor(address _governor) internal {
        if (_governor == address(0)) revert InvalidGovernorError();
        if (address(blastContract) == address(0)) return;
        if (_governorConfigured == address(0)) {
            // if this contract is the governor then it should claim its own yield/gas
            if (_governor != address(this)) {
                // Once this is called the governor will be the only account allowed to configure
                blastContract.configureGovernor(_governor);
            }
        } else {
            IHoldsGovernorship(_governorConfigured).reassignBlastGovernor(
                _governor
            );
        }
        _governorConfigured = _governor;
    }

    function claimERC20Yield(
        address _tokenContract,
        uint256 _amount
    ) external onlyConfiguredContract(StorageKey.RewardsManager) {
        IERC20Rebasing(_tokenContract).claim(
            configStorage.getAddress(StorageKey.RewardsManager),
            _amount
        );
    }

    function getConfiguredGovernor() external view returns (address _governor) {
        _governor = _governorConfigured;
    }
}
