# Constants

This document's primary purpose is to give additional documentation regarding the Storage Key slots and different roles throughout the system. These are configurable by the ConfigStorage admin (i.e. the Multisig).

## Storage Keys

Here are the items numbered with each item enclosed in backticks:
Here are the items numbered starting with 0, each enclosed in backticks:

0. `Many`: Artifact, can be removed.
1. `Paused`: Boolean to pause all contract functionality.
2. `LockManager`: Address for Lock Manager contract.
   -> Also LandManager MinTaxRate (getUint)
3. `AccountManager`: Address for Account Manager contract.
   -> Also LandManager MaxTaxRate (getUint)
4. `ClaimManager`: Address for Claim Manager contract.
   -> Also LandManager DefaultTaxRate (getUint)
5. `MigrationManager`: Address for Migration Manager contract.
   -> Also LandManager BaseSchnibbleRate (getUint)
6. `NFTOverlord`: Address for NFT Overlord contract.
   -> Also LandManager PricePerPlot (getUint)
7. `SnuggeryManager`: Address for Snuggery Manager contract.
8. `PrimordialManager`: Address for Primordial Manager contract.
9. `MunchadexManager`: Address for Munchadex Manager contract.
10. `MunchNFT`: Address for Munch NFT contract.
11. `MunchToken`: Address for Munch Token contract.
12. `RewardsManager`: Address for Rewards Manager contract.
13. `YieldDistributor`: Address for current Yield Distributor handler contract.
14. `GasFeeDistributor`: Address for current Gas Fee Distributor handler contract.
15. `YieldCollectorContracts`: Address array that contains all the contracts we are collecting yield from (for Rewards Manager).
16. `GasFeeCollectorContracts`: Address array that contains all the contracts we are collecting gas fees from (for Rewards Manager).
17. `BlastContract`: Address created by Blast to interact with the Blast rewards (yield, gas fees, etc.).
18. `BlastPointsContract`: Address created by Blast to assign operators for points+gold.
19. `BlastPointsOperator`: Address that is set to govern points+gold.
20. `USDBContract`: USDB contract address
21. `WETHContract`: WETH contract address
22. `RNGProxyContract`: RNG Proxy contract handler address
23. `NFTAttributesManager`: NFT Attributes Manager address
24. `Treasury`: Treasury address that takes in all revenue
25. `OldMunchNFT`: Season 1 Munchable NFT address
26. `MaxLockDuration`: Number that sets the maximum time we are allowing users to lock their tokens (in seconds).
27. `DefaultSnuggerySize`: The default snuggery size for a user after registering their player.
28. `MaxRevealQueue`: The maximum amount of Munchables that can be on the reveal queue at once per user.
29. `MaxSchnibbleSpray`: The maximum number of users we can spray in a given spray proposal.
30. `PetTotalSchnibbles`: The number of schnibbles a user gets per pet (does not include bonus) (1 Schnibble = 1e18).
31. `NewSlotCost`: The cost (in munch points) to increase your snuggery slot size.
32. `PrimordialsEnabled`: Boolean which indicates whether primordials are enabled.
    -> Also Address for LandManager (setAddress)
33. `BonusManager`: Address for Bonus Manager contract.
34. `ReferralBonus`: Percentage that a referee gets from referring a user when they claim (1 = 1%). For example, if a user claims 10 munch points and ReferralBonus is set to 1, the person who referred the user will get 0.1 munch points.
35. `RealmBonuses`: This is an array of bonuses where the index is denoted by the equation `(Munchable's Realm * 5) + Player's Snuggery Realm = Bonus percentage` (1 = 1%). Note: This could sometimes be negative if the player's snuggery realm != the munchable's realm.
36. `RarityBonuses`: This is an array of bonuses dealing with feeding where the index is the rarity of the Munchable and the value is the bonus percentage (1 = 1%)
37. `LevelThresholds`: An array of level thresholds where each index is the level and the value is the amount of chonks needed to level up. 1 Chonk = 1e18.
38. `PrimordialLevelThresholds`: An array of length 3 where each level index represents the level of the primordial (from level -3 to 0) and each value represents the necessary chonks that the primordial needs to reach to level up. 1 Chonk = 1e18.
39. `TotalMunchables`: # of total munchables there are in the universe (125).
40. `MunchablesPerRealm`: An array of numbers where each realm is the index and the number of munchables in that realm is the value.
41. `MunchablesPerRarity`: An array of numbers where each rarity is the index and the number of munchables in that rarity is the value.
42. `RaritySetBonuses`: An array of bonus percentages where each rarity id the index and the bonus is the value. These bonuses are given if a user owns all of a given rarity set (ie. if they own all the common munchables, they get a `RaritySetBonuses[1]` bonus percentage where 1 = 1%).
43. `PointsPerPeriod`: Number of Munch points distributed per period. Denoted in 1e18 so 1 Munch Point = 1e18.
44. `PointsPerToken`: Conversion ratio between Munch Points and Munch tokens. The ratio is: 1 Munch Point \* 1e12 PointsPerToken = 1 Munch Token.
45. `SwapEnabled`: Boolean that indicates whether swapping between points and Munch Tokens is enabled.
46. `PointsPerMigratedNFT`: The number of points a user gets if they burn a munchable from season 1. This is an array where each index represents the rarity and the value represents the number of Munch points they receive.
47. `PointsPerUnrevealedNFT`: The number of points a user gets if they burn an unrevealed munchable from season 1.
48. `MinETHPetBonus`: Artifact, can be removed.
49. `MaxETHPetBonus`: Artifact, can be removed.
50. `PetBonusMultiplier`: Artifact, can be removed.
51. `RealmLookups`: This is an array of length 125 (or whatever the total number of species there are) where each index represents the species ID and the value represents the rarity for that species.
52. `CommonSpecies`: An array of species IDs that fall under the "Common" rarity tag.
53. `RareSpecies`: An array of species IDs that fall under the "Rare" rarity tag.
54. `EpicSpecies`: An array of species IDs that fall under the "Epic" rarity tag.
55. `LegendarySpecies`: An array of species IDs that fall under the "Legendary" rarity tag.
56. `MythicSpecies`: An array of species IDs that fall under the "Mythic" rarity tag.
57. `CommonPercentage`: Percent chance of minting a Common Munchable. (`(1000000 - CommonPercentage) / 1000000 = % chance of rolling common`).
58. `RarePercentage`: Percent chance of minting a Rare Munchable. (`(CommonPercentage - RarePercentage) / 1000000 = % chance of rolling rare`).
59. `EpicPercentage`: Percent chance of minting a Epic Munchable. (`(RarePercentage - EpicPercentage) / 1000000 = % chance of rolling epic`).
60. `LegendaryPercentage`: Percent chance of minting a Legendary Munchable. (`(EpicPercentage - LegendaryPercentage) / 1000000 = % chance of rolling legendary`).
61. `MythicPercentage`: Percent chance of minting a Mythic Munchable. (`(LegendaryPercentage - MythicPercentage) / 1000000 = % chance of rolling mythic`).
62. `MigrationBonus`: Number that denotes the maximum bonus percentage you can get from filling out at least double the amount you locked from season 1 (1e16 = 1%).
63. `MigrationBonusEndTime`: Timestamp that denotes when the migration bonus ends.
64. `MigrationDiscountFactor`: The discount percentage (10% = 1e12) you need to lock to migrate all of your NFTs from season 1.

## Roles

0. `Admin`: This is the address denoting the admin of the entire system.
1. `Social_1`: This (and the next four roles) are the addresses that are allowed to propose shnibble sprays.
2. `Social_2`
3. `Social_3`
4. `Social_4`
5. `Social_5`
6. `SocialApproval_1`: This (and the next four roles) are the addresses that are allowed to execute shnibble sprays.
7. `SocialApproval_2`
8. `SocialApproval_3`
9. `SocialApproval_4`
10. `SocialApproval_5`
11. `PriceFeed_1`: This (and the next four roles) are the addresses allowed to propose and vote on USD price updates.
12. `PriceFeed_2`
13. `PriceFeed_3`
14. `PriceFeed_4`
15. `PriceFeed_5`
16. `Snapshot`: Artifact, can be removed.
17. `NewPeriod`: Address that is allowed to set the new period for when a claim is over.
18. `ClaimYield`: Address that is allowed to claim yield and/or gas fees from the contract suite.
19. `Minter`: Artifact, can be removed.
20. `NFTOracle`: For use when we are self-hosting the RNG Proxy. This is the address that is allowed to respond to RNG requests.
