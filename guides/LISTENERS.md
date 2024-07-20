# Off-Chain Listeners

Much of the MunchableNFT data is held on chain but we still need some off-chain processes to perform the following tasks:

- Providing entropy to reveal and level up features when triggered by on-chain events
- Upload updated JSON metadata to IPFS and setting a new tokenURI
- Handling migration for users

## Updating IPFS metadata

When certain actions happen, we want to sync the on-chain data with the off-chain JSON metadata for compatibility with
marketplaces. The listener should wait for the following events:

`IAccountManager.MunchableExported(address indexed _player, uint256 _tokenId)`
`INFTAttributesManager.AttributesUpdated(address indexed _player, uint256 _tokenId)`
`INFTAttributesManager.GameAttributesUpdated(address indexed _player, uint256 _tokenId)`

The procedure to sync is as follows

- Using token ID from the event data, fetch the NFT attributes from chain using the `INFTAttributesManagerV1.getFullNFTData(uint256 _tokenId)`
- JSON templates for each species are in the munchables-listeners repo. They are all evolution 1 now because that is all we have for now
- Fetch the NFT metadata template for the unique species/evolution and merge in the attributes from the chain
- Post this JSON file to IPFS
- Call the `MunchNFT.setURI` to just the new IPFS hash

## Handling Migrations

Because there are users that could potentially have a lot of NFTs that they want to migrate and the migration functionality is fairly gas intensive due to having to batch it over multiple calls, we are offloading these calls to the off-chain listener. The procedure has two paths as follows:

1. User decides to migrate all locked NFTs

- When a user decides to migrate their locked NFTs, the `LockedForMigration` event gets emitted from the `lockFundsForAllMigration()` function call. The event will emit the user address in the first argument.
- Call the read-only function `getUserNFTsLength(address _user)` to get the number of NFTs they are migrating over.
- Batch calls to `migrateAllNFTs(address _user, uint32 _skip)` from 0 to the user's NFT length. These are done in batches of 5.

2. User decides to burn all locked NFTs

- User will call `burnNFTs` at least once which will cause a `BurnSucceeded` event to be emitted. Once this is called once, this permanently changes the user's state to a `LOCKED_BURN` state.
- Call the read-only function `getUserNFTsLength(address _user)` to get the number of NFTs they are burning over.
- Batch calls to `burnNFTs(address _user, uint32 _skip)` from 0 to the user's NFT length. These are done in batches of 5.

3. User decides to burn all purchased NFTs

- User will call `burnRemainingPurchasedNFTs` at least once which will cause a `BurnPurchasedSucceeded` event to be emitted. Once this is called once, this will permanently change the user's state to a `LOCKED_BURN` state.
- Do the same steps as 2 except call `burnRemainingPurchasedNFTs(address _user, uint32 skip)` in batches.
