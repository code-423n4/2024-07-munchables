# Visit site for the first time and register

First check that the account logging in is not the sub-account of an already registered player. Make sure that the
returned `Player.registrationDate` is not 0.

`(address mainAccount, Player player) = IAccountManager.getPlayer(address loggedInAccount)`

If `mainAccount` is different from the account logged in then it is a sub-account which is managing this mainAccount.
Show the restricted sub-account UI.

If `mainAccount` is the same as the account logged in and `Player.registrationDate` is not 0 then the account is already
registered.

If the user is not registered then prompt the user to choose a `Realm` and register them. If the player was referred
by another player then set the referrer, otherwise send the zero address.

`IAccountManager.register(Realm snuggeryRealm, address referrer)`

Listen for the `IAccountManager.PlayerRegistered` for confirmation and then reload the player data.

# Lock some tokens and get an unrevealed Munchable

Players can lock native ETH, WETH, USDB, and BLAST tokens and have locked values for more than one token.

Check to see if player has any locked tokens already

`getLocked(address player)`

Will return an array containing all of the locked tokens the player already has.

To lock more tokens call the `lock` function again, you must have approved any ERC20 tokens to be transferred by the
lock contract before proceeding.

Once lock has been called you should update the locked tokens, player data (for number of `Player.unrevealedNFTs`) and
then update your counter to get the number of schnibbles being earned per day.

`ILockManager.Locked` will be emitted when a player has locked tokens, this can happen outside of your current session
so you should still react to this event instead of the transaction receipt.

# Reveal a Munchable gained from locking tokens

First check the `Player` data to make sure that they have at least one unrevealed NFT.

If they do, call the `ISnuggeryManager.startReveal` function, this will start the reveal process and request a random
number. Now you should show the reveal animation.

Wait for the `ISnuggeryManager.Revealed` event for the logged in player to see which token was revealed. See the
process below for how to load the NFT data.

# Import the Munchable to the snuggery

Load the current snuggery data with `ISnuggeryManager.getSnuggery`, paginating if necessary with the start parameter.

If the player has spare slots (check `Player.maxSnuggerySize`) then show them the interface to choose a Munchable to
import.

Call `ISnuggeryManager.importMunchable` after approving the NFT for transfer by the MunchableManager contract.

Listen for `ISnuggeryManager.MunchableImported` events to refresh snuggery data.

# Loading NFT data from tokenId

Many functions will require or return a token ID for a particular Munchable.

You can use `INFTAttributesManagerV1.getAttributes`, `INFTAttributesManagerV1.getImmutableAttributes` and
`INFTAttributesManagerV1.getGameAttributes` as well as a local store of speciesId+evolution to metadata to
fetch all of the data for an NFT.

# Harvest schnibbles and feed to their Munchable

If a player has locked tokens then they will be receiving daily schnibbles. You can check the daily schnibbles and
bonus by calling `IAccountMAnager.getDailySchnibbles`. This will return the amount of schnibbles as well as a bonus
percentage amount (30e18 = 30%).

To feed a certain amount of schnibbles to a Munchable, call `ISnuggeryManager.feed` with the tokenId of the Munchable
and the amount of schnibbles to feed.

Listen for the `ISnuggeryManager.MunchableFed` event to see how many chonks a Munchable earned.

# Remove the Munchable from the snuggery

Call `ISnuggeryManager.exportFromSnuggery` to remove the Munchable from the snuggery and send the NFT back to the
player directly.

Listen for `ISnuggeryManager.MunchableExported` to update your snuggery data.

# Claim munch points

Once a player has one or more Munchables in their snuggery and have chonks, they will be able to claim Munch Points.

Munch points are awarded in periods of one day. Each day a certain amount of points are available for claiming and the
player can claim their share calculated like this.

Load the current period data. This will include the start and end times as well as how much is available.

`Period currentPeriod = IClaimManager.getCurrentPeriod()`
`pointsPaid = ISnuggeryManager.getTotalChonk(player) / currentPeriod.globalTotalChonk`

You can use this formula to calculate points to be claimed if the player has not claimed in the current period.

# Pet another player's munchable

To pet another player's Munchable call `ISnuggeryManager.pet`

Listen for `ISnuggeryManager.MunchablePetted` event to see if the logged in player petted another Munchable or one of
the player's Munchables was petted.
