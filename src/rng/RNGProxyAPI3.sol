// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "../interfaces/IRNGProxy.sol";
import "./BaseRNGProxy.sol";

contract RNGProxyAPI3 is BaseRNGProxy, RrpRequesterV0 {
    mapping(bytes32 => uint256) private requestMapping;

    address _airnodeContract;
    bytes32 _endpointId;
    address _sponsor;
    address _sponsorWallet;

    constructor(
        address _airnodeRrp,
        address _configStorage,
        address airnodeContract,
        address sponsor,
        address sponsorWallet,
        bytes32 endpointId
    ) BaseRNGProxy(_configStorage) RrpRequesterV0(_airnodeRrp) {
        _airnodeContract = airnodeContract;
        _endpointId = endpointId;
        _sponsorWallet = sponsorWallet;
        _sponsor = sponsor;
    }

    function requestRandom(
        address _contract,
        bytes4 _selector,
        uint256 _index
    ) public override onlyConfiguredContract(StorageKey.NFTOverlord) {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            _airnodeContract,
            _endpointId,
            _sponsor,
            _sponsorWallet,
            address(this),
            this.provideRandom.selector,
            ""
        );
        requestMapping[requestId] = _index;

        super.requestRandom(_contract, _selector, _index);
    }

    /// @notice Called by the Airnode through the AirnodeRrp contract to
    ///         fulfill the request
    function provideRandom(
        bytes32 requestId,
        bytes calldata _rand
    ) external onlyAirnodeRrp {
        uint256 _index = requestMapping[requestId];

        super._callback(_index, _rand);
    }
}
