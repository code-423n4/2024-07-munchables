# Game overview & Architecture

The game works as follows:

As a player, your primary goal is to earn as many MUNCH points (which will eventually be converted into the $MUNCH token) as possible. To earn MUNCH points, you must own 1 or more Munchables (NFT) and be very diligent about feeding it, petting other Munchables, and referring more people. Each Munchable that is created is one of 125 different types, each one being not only a different creature, but having multiple different attributes that have an effect on the balance of the game (and future spin-off games).

To obtain a Munchable, one must either migrate an existing Munchable from season 1 (more on Migration later), lock up funds for a set period of time (USDB, WETH, or ETH), buy one on the open market, or mint a primordial and level them up from level -3 to 0 to hatch a new Munchable.

With this Munchable (or Munchables), you can start playing with the game by entering it into your Snuggery. This Snuggery can be considered a little home for your Munchables and can be customized at the start of your game. You can input up to 6 Munchables at any given time but can obtain more slots in your Snuggery by converting MUNCH points to slots.

Once you have some Munchables in your Snuggery, you can start feeding them Schnibbles. Munchables are always hungry so they want as many Schnibbles as possible! You get an allocated number of Schnibbles based on these factors:

- How much money you have locked
- Whether you have a migration bonus (detailed later)

The impact of those Schnibbles is weighted differently however when you actually feed them to your Munchable and convert them to Chonks (think of it like XP for a Munchable). Everytime you reach a certain new threshold of Chonks for a Munchable, it reaches a new level horizon. Each level-up will trigger an increase in stats and eventually an evolution into a newer Munchable! While these don't have much of an effect on the game currently, future spin-off games will use these stats as a primary focus (and you can bet that you will be able to earn many more MUNCH points when it comes to)!

The Migration mechanic is split into three parts (these are not finalized):

1. You had a Munchable minted from season 1's lock conract. In order to get it back with full atttributes, you need to lock in at least half of the amount you locked in the previous season. For each additional amount locked, you will receive an extra migration bonus that gives you additional daily Schnibbles.
2. You had a Munchable bought from the open-market and want to convert it over to season 2. For this, just lock in 1 ETH equivalent per Munchable.
3. You no longer want to participate in the game and so you burn your old Munchable into a set amount of Munch points.

A general overview of our smart contract system is as follows:

- The core components are split into 5 categories:
  - Managers: A general term to describe all of the smart contracts that interface with external-facing actions.
  - Config Storage: A central store of all updateable information across the rest of the system. Every other contract in the system inherits a `BaseConfigStorage` contract that handles the initialization and connection to the `ConfigStorage` contract.
  - RNG Proxy: This proxy contract handles updating on-chain randomness factors (primarily used for randomly-generating NFT attributes).
  - Tokens: `MunchNFT` is our primary NFT ERC-721 contract and `Munch` is a contract built for future use as the internal ERC-20 token.
  - Distributors: We decoupled the `RewardsManager` (more specifics on it below) from its `Distributor` contracts so that we can easily create new contracts that handle the dispersion or collection of revenue in the future.
- This document will not go into details about specific methods, functions, errors, etc. as those can be viewed from running the command `pnpm serve:doc`

## Config Storage

### ConfigStorage

- An `Ownable` class that allows for high flexibility in setting storage values across the entire system
- Notably, we have a `notify` function that will call all of the contracts in the system if there is an update to an underlying `ConfigStorage` variable
- The idea behind this was to centralize all configurable values to one place within the system to reduce confusion and mantain consistency.

### BaseConfigStorage

- An abstract class that all other contracts within the system (aside from ConfigStorage) should be inheriting from.
- This is responsible for ensuring proper connections to the `ConfigStorage` class.

## Managers

### BaseBlastManager

- An abstract class that other contracts should inherit if there is an expectation that it will return revenue via Blast Points, Gold, Yield, or Gas returns.
- Like every other contract in the system, it is configurable via the ConfigStorage contract instance.

### SnuggeryManager

- The "Snuggery" contract and central hub for feeding schnibbles, petting, handling the queue for revealing new NFTs, and leveling up (via a reveal queue that is monitored by the RNGProxy contract).
- Relation to other contracts:
  - `ClaimManager`: Connects to force chonk point updates during exiting or entering the snuggery and feeding.
  - `LockManager`: Holds key attributes about a player's locked value information which is necessary in computing the amount of harvested schnibbles.
  - `MigrationManager`: Holds certain attributes that are necessary to determine bonuses when harvesting.
  - `NFTAttributesManager`: Allows us to change the chonk attribute of a given NFT.
  - `IRNGProxy`: Contract to hit to request randomness for a callback-reveal.

### PrimordialManager

- Manages the free Primordials
- Relation to other contracts:
  - `AccountManager`: To check if a player is registered, sub-accounts are allowed to claim a Primordial on behalf of the main account.
  - `MunchableMAnager`: Calls `mintFromPrimordial` to mint a new Munchable when the Primordial is upgraded to level 0.

### AccountManager

- Deals with everything related to the account: registering new players, creating/removing subaccounts, harvesting schnibbles, and handling sprays (external social schnibbles)

### ClaimManager

- This is responsible primarily for handling Munch point claiming, spending, (eventually) swapping points to the underlying token, and beginning new epochs.
- Points are claimed ONLY when the previous epoch (1 day) is over. This is to limit how many MUNCH points get redeemed daily.
- MUNCH Points are a direct function of the amount of chonks that are currently in their snuggery (plus bonuses).

### LockManager

- Responsible for handling locking of funds to mint new Munchable NFTs and/or migrate existing ones.

### MigrationManager

- Responsible for handling the migration logic from the season 1 Munch NFT to season 2
- Users from season 1 could have either hatched their Munchables (i.e. "revealed") or left them in a state of "unrevealed".
  - If a Munchable is in a state of unrevealed, we are only allowing them to burn their Munchable for points via the `burnUnrevealedForPoints` function.
  - If the Munchable is revealed AND was purchased on a marketplace (i.e. their associated `lockAmount` for that Munchable == 0), we are allowing the user to choose those to migrate over via `migratePurchasedNFTs` (for 1 eth per munchable). They also have the option to burn via the `burnRemainingPurchasedNFTs` function. Importantly, they can select which ones they want to migrate over and burn the remaining ones. Note: Once they start burning, they cannot go back!
  - If the Munchable is revealed AND was minted by that user (i.e. via a lock from the previous season), then we are only allowing that user to migrate ALL or burn ALL of their locked tokens. If they migrate, they only have to lock half of their previous size and if they burn, they just get munch points for them all. In order to streamline the user experience, we are allowing the migrate & burn calls to be called by anyone once they make their choice. This allows us to call those migration functions for them and simplify that entire user experience. Importantly, we are not giving them the choice of selecting which ones to migrate over; it's either all or nothing.

### NFTAttributeManagerV1

- MunchNFT is a very bare-bones NFT that doesn't do much aside from mint new tokens and assign them to users.
- We decoupled the attributes of an underlying NFT to its own manager contract so that we can customize it fluidly in the future without having to upgrade any contracts or make massive migrations.

### RewardsManager

- Responsible for claiming all yield and gas from the entire system and doing something with it
- This "something" is handled by external Distributor contracts. Currently, we only have support for sending directly to the treasury address, but we have plans to add additional functionality (buy-back on token, giving gas-back to MUNCH points holders, etc.)

### BonusManager

- Responsible for calculating bonuses for smart-contract wide value dispersions (mainly schnibbles, points, and chonks for now)

## Distributors

### FundTreasuryDistributor

- Moves funds from entry point and into the treasury address

## RNG Proxy

### RNGProxyAPI3

- RNG contract that interacts properly with the external API3 RNG Proxy contracts
- Primarily used to hit callbacks in the NFT Attributes Manager contract

### RNGProxySelfHosted

- A self-hosted version of the RNG Proxy contract in case something were to happen to the API 3 oracle and/or we wanted to replace it with a self-contained system

## Tokens

### Munch

- ERC-20 that will eventually be the primary currency of the game (convertable to & from MUNCH points)

### MunchNFT

- ERC-721 that represents the main Munchable NFTs of the game
