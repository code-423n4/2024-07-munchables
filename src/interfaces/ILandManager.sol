// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

/// @title ILandManager interface
/// @notice Provides an interface for handling plots of land and toiling
interface ILandManager {
    struct ToilerState {
        uint256 lastToilDate;
        uint256 plotId;
        address landlord;
        uint256 latestTaxRate;
        bool dirty;
    }

    struct PlotMetadata {
        uint256 lastUpdated;
        uint256 currentTaxRate;
    }

    struct Plot {
        bool occupied;
        uint256 tokenId;
    }

    function triggerPlotMetadata() external;

    function updatePlotMetadata(address landlord) external;

    function updateTaxRate(uint256 new_tax_rate) external;

    // stake munchable by giving in landlord’s address + token id + plot you want to stake in
    // will revert if num_taken >= total
    function stakeMunchable(
        address landlord,
        uint256 tokenId,
        uint256 plotId
    ) external;

    // unstake munchable
    function unstakeMunchable(uint256 tokenId) external;

    // if you’re in a plot that got moved because the landlord unlocked partial amount, move your
    // munchable to an unoccupied plot
    function transferToUnoccupiedPlot(uint256 tokenId, uint256 plotId) external;

    function farmPlots() external;

    event FarmPlotTaken(ToilerState toilerState, uint256 tokenId);
    event FarmPlotLeave(address landlord, uint256 tokenId, uint256 plot);
    event FarmedSchnibbles(
        address landlord,
        uint256 tokenId,
        uint256 plot,
        uint256 rentersSchnibbles,
        uint256 landlordsSchnibbles
    );
    event UpdatePlotsMeta(address landlord);
    event TaxRateChanged(
        address landlord,
        uint256 oldTaxRate,
        uint256 newTaxRate
    );

    error OccupiedPlotError(address, uint256);
    error PlotTooHighError();
    error TooManyStakedMunchiesError();
    error NotStakedError();
    error InvalidOwnerError();
    error PlayerNotRegisteredError();
    error NotApprovedError();
    error InvalidTokenIdError();
    error InvalidTaxRateError();
    error PlotMetadataNotUpdatedError();
    error PlotMetadataTriggeredError();
    error CantStakeToSelfError();
}
