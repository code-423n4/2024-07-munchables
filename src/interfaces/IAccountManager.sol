// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;
import "../libraries/MunchablesCommonLib.sol";

/// @title Interface for the Account Manager
/// @notice This interface manages player accounts including their snuggery, schibbles, chonks, and sub-accounts
interface IAccountManager {
    /// @notice Struct representing a "Squirt", which is a distribution of schnibbles to a player
    struct Squirt {
        address player; // The address of the player receiving schnibbles
        uint256 schnibbles; // The amount of schnibbles being distributed to that player
    }

    /// @notice Struct representing a proposal to spray schnibbles across multiple accounts
    struct SprayProposal {
        uint32 proposedDate; // The date the proposal was made
        Squirt[] squirts; // Array of "Squirt" structs detailing the distribution
    }

    /// @notice Register a new account, create a new Player record, and set snuggery and referrer
    /// @dev This should be the first function called when onboarding a new user
    /// @param _snuggeryRealm The realm of the new snuggery, which cannot be changed later
    /// @param _referrer The account referring this user, use the null address if there is no referrer
    /// @custom:frontend Register a new account
    function register(
        MunchablesCommonLib.Realm _snuggeryRealm,
        address _referrer
    ) external;

    /// @notice Calculate schnibbles to distribute and credit to unfedSchnibbles, set lastHarvestDate
    /// @custom:frontend Harvest schnibbles
    function harvest() external returns (uint256 _harvested);

    /// @notice Used when a user adds to their lock to force claim at the previous locked value
    /// @param _player Address of the player whose harvest to force
    function forceHarvest(address _player) external;

    /// @notice Propose a spray of schnibbles to multiple accounts
    /// @param _players Array of player addresses
    /// @param _schnibbles Array of schnibbles amounts corresponding to each player
    function spraySchnibblesPropose(
        address[] calldata _players,
        uint256[] calldata _schnibbles
    ) external;

    /// @notice Approve a proposed spray of schnibbles
    /// @param _proposer Address of the proposer of the spray
    function execSprayProposal(address _proposer) external;

    /// @notice Remove a proposed spray of schnibbles
    /// @param _proposer Address of the proposer of the spray to remove
    function removeSprayProposal(address _proposer) external;

    /// @notice Add a sub-account for a player
    /// @param _subAccount The sub-account to add
    /// @custom:frontend Use to add a new sub-account
    function addSubAccount(address _subAccount) external;

    /// @notice Remove a previously added sub-account
    /// @param _subAccount The sub-account to remove
    /// @custom:frontend Use to remove an existing sub-account
    function removeSubAccount(address _subAccount) external;

    /// @notice Restricted to the Munchable Manager only
    function updatePlayer(
        address _account,
        MunchablesCommonLib.Player memory _player
    ) external;

    /// @notice Look up the main account associated with a potentially sub-account
    /// @param _maybeSubAccount Account to check
    /// @return _mainAccount Main account associated, or the input if not a sub-account
    function getMainAccount(
        address _maybeSubAccount
    ) external view returns (address _mainAccount);

    /// @notice Get a list of sub-accounts associated with a main account
    /// @param _player Main account to check
    /// @param _start Index to start pagination
    /// @return _subAccounts List of sub-accounts
    /// @return _more Whether there are more sub-accounts beyond the returned list
    /// @custom:frontend Use this to populate a UI for managing sub accounts
    function getSubAccounts(
        address _player,
        uint256 _start
    ) external view returns (address[20] memory _subAccounts, bool _more);

    /// @notice Retrieve player data for a given account
    /// @param _account Account to retrieve data for
    /// @return _mainAccount Main account associated, or the input if not a sub-account
    /// @return _player Player data structure
    /// @custom:frontend Call this straight after log in to get the data about this player.  The account
    ///                  logging in may be a sub account and in this case the _mainAccount parameter
    ///                  will be different from the logged in user.  In this case the UI should show only
    ///                  functions available to a sub-account
    function getPlayer(
        address _account
    )
        external
        view
        returns (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player
        );

    /// @notice Retrieve detailed player and snuggery data
    /// @param _account Address of the player
    /// @return _mainAccount Main account associated
    /// @return _player Player data
    /// @return _snuggery List of snuggery NFTs
    /// @custom:frontend Use this to fetch player and snuggery data
    function getFullPlayerData(
        address _account
    )
        external
        view
        returns (
            address _mainAccount,
            MunchablesCommonLib.Player memory _player,
            MunchablesCommonLib.SnuggeryNFT[] memory _snuggery
        );

    /// @notice Get daily schnibbles that an account is accrueing
    /// @param _player The address of the player
    function getDailySchnibbles(
        address _player
    ) external view returns (uint256 _dailySchnibbles, uint256 _bonus);

    /// @notice Emitted when a player registers for a new account
    /// @param _player The address of the player who registered
    /// @param _snuggeryRealm The realm associated with the new snuggery chosen by the player
    /// @param _referrer The address of the referrer, if any; otherwise, the zero address
    /// @custom:frontend You should only receive this event once and only if you are onboarding a new user
    ///                  safe to ignore if you are in the onboarding process
    event PlayerRegistered(
        address indexed _player,
        MunchablesCommonLib.Realm _snuggeryRealm,
        address _referrer
    );

    /// @notice Emitted when a player's schnibbles are harvested
    /// @param _player The address of the player who harvested schnibbles
    /// @param _harvestedSchnibbles The total amount of schnibbles that were harvested
    /// @custom:frontend Listen for events where _player is your mainAccount and update unfedSchnibbles total
    event Harvested(address indexed _player, uint256 _harvestedSchnibbles);

    /// @notice Emitted when a sub-account is added to a player's account
    /// @param _player The address of the main account to which a sub-account was added
    /// @param _subAccount The address of the sub-account that was added
    /// @custom:frontend If you are managing sub accounts (ie the logged in user is not a subAccount), then use this
    ///                  event to reload your cache of sub accounts
    event SubAccountAdded(address indexed _player, address _subAccount);

    /// @notice Emitted when a sub-account is removed from a player's account
    /// @param _player The address of the main account from which a sub-account was removed
    /// @param _subAccount The address of the sub-account that was removed
    /// @custom:frontend If you are managing sub accounts (ie the logged in user is not a subAccount), then use this
    ///                  event to reload your cache of sub accounts
    event SubAccountRemoved(address indexed _player, address _subAccount);

    /// @notice Emitted when a proposal to spray schnibbles is made
    /// @param _proposer The address of the player who proposed the spray
    /// @param _squirts An array of "Squirt" details defining the proposed schnibble distribution
    /// @custom:admin
    event ProposedScnibblesSpray(address indexed _proposer, Squirt[] _squirts);

    /// @notice Emitted when a schnibble spray is executed for each player
    /// @param _player The player receiving schnibbles
    /// @param _schnibbles The amount of schnibbles received
    event SchnibblesSprayed(address indexed _player, uint256 _schnibbles);

    /// @notice Emitted when schnibbles are removed. This is used to reverse a schnibble spray in the case of some being improperly sent.
    /// @param _player The schnibbles remove
    /// @param _schnibbles The amount of schnibbles removed
    event SchnibblesSprayedRemoved(
        address indexed _player,
        uint256 _schnibbles
    );

    /// @notice Emitted when a spray proposal is executed
    /// @param _proposer The account which proposed the spray
    event SprayProposalExecuted(address indexed _proposer);

    /// @notice Emitted when a spray proposal is removed
    /// @param _proposer Account that proposed the proposal
    event SprayProposalRemoved(address indexed _proposer);

    // Errors

    /// @notice Error thrown when a player is already registered and attempts to register again
    error PlayerAlreadyRegisteredError();

    /// @notice Error thrown when an action is attempted that requires the player to be registered, but they are not
    error PlayerNotRegisteredError();

    /// @notice Error thrown when the main account of a player is not registered
    error MainAccountNotRegisteredError(address _mainAccount);

    /// @notice Error thrown when there are no pending reveals for a player
    error NoPendingRevealError();

    /// @notice Error thrown when a sub-account is already registered and an attempt is made to register it again
    error SubAccountAlreadyRegisteredError();

    /// @notice Error thrown when a sub-account attempts to register as a main account
    error SubAccountCannotRegisterError();

    /// @notice Error thrown when a spray proposal already exists and another one is attempted
    error ExistingProposalError();

    /// @notice Error thrown when the parameters provided to a function do not match in quantity or type
    error UnMatchedParametersError();

    /// @notice Error thrown when too many entries are attempted to be processed at once
    error TooManyEntriesError();

    /// @notice Error thrown when an expected parameter is empty
    error EmptyParameterError();

    /// @notice Error thrown when a realm is invalid
    error InvalidRealmError();

    /// @notice Error thrown when a sub-account is not registered and is tried to be removed
    error SubAccountNotRegisteredError();

    /// @notice Error thrown when a proposal is attempted to be executed, but none exists
    error EmptyProposalError();

    /// @notice Error thrown when a player attempts to refer themselves
    error SelfReferralError();

    /// @notice Error thrown when the same sprayer gets added twice in a proposal
    error DuplicateSprayerError();

    /// @notice When a user tries to create too many sub accounts (currently 5 max)
    error TooManySubAccountsError();

    error TooHighSprayAmountError();
}
