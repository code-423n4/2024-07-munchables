# Events

## IAccountManager

### PlayerRegistered

You should only receive this event once and only if you are onboarding a new user safe to ignore if you are in the onboarding process

_\_player_: The address of the player who registered

_\_snuggeryRealm_: The realm associated with the new snuggery chosen by the player

_\_referrer_: The address of the referrer, if any; otherwise, the zero address

### MunchableImported

Listen for events for the mainAccount, when it is received update your snuggery data

_\_player_: The address of the player who imported the munchable

_\_tokenId_: The token ID of the munchable that was imported

### MunchableExported

Listen for events for the mainAccount, when it is received update your snuggery data

_\_player_: The address of the player who exported the munchable

_\_tokenId_: The token ID of the munchable that was exported

### MunchableFed

Listen for events for your mainAccount and when this is received update the particular token in the snuggery by reloading the NFT data

_\_player_: The address of the player who fed the munchable

_\_tokenId_: The token ID of the munchable that was fed

_\_baseChonks_: The base amount of chonks that were gained by feeding, will be equal to the schnibbles fed

_\_bonusChonks_: The additional bonus chonks that were awarded during the feeding

### MunchablePetted

Listen for events where your mainAccount petted and where it was pet

- If your mainAccount was petted, update the unfedMunchables total
- If your account was petted then, update the unfedMunchables total, also optionally load the
  lastPetTime for the munchable if you use that

_\_petter_: The address of the player who petted the munchable

_\_petted_: The address of the player who owns the petted munchable

_\_tokenId_: The token ID of the munchable that was petted

_\_petterSchnibbles_: The amount of schnibbles awarded to the petter

_\_pettedSchnibbles_: The amount of schnibbles awarded to the owner of the petted munchable

### Harvested

Listen for events where \_player is your mainAccount and update unfedSchnibbles total

_\_player_: The address of the player who harvested schnibbles

_\_harvestedScnibbles_: The total amount of schnibbles that were harvested

### SubAccountAdded

If you are managing sub accounts (ie the logged in user is not a subAccount), then use this event to reload your cache of sub accounts

_\_player_: The address of the main account to which a sub-account was added

_\_subAccount_: The address of the sub-account that was added

### SubAccountRemoved

If you are managing sub accounts (ie the logged in user is not a subAccount), then use this event to reload your cache of sub accounts

_\_player_: The address of the main account from which a sub-account was removed

_\_subAccount_: The address of the sub-account that was removed
