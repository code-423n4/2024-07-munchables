# Munchables audit details
- Total Prize Pool: $20,000 in USDC
  - HM awards: $15,900 in USDC
  - QA awards: $700 in USDC
  - Judge awards: $1,700 in USDC
  - Validator awards: $1,200 in USDC
  - Scout awards: $500 in USDC
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2024-07-munchables/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts July 23, 2024 20:00 UTC
- Ends July 29, 2024 20:00 UTC

## Automated Findings / Publicly Known Issues

The 4naly3er report can be found [here](https://github.com/code-423n4/2024-07-munchables/blob/main/4naly3er-report.md).

Within the _farmPlots function, the following edge case can happen:
If the plot ID is lower than the max plot amount, the system uses the last updated plot metadata time and tracks this with a dirty boolean flag. The edge case occurs when a user hasn’t farmed in a while and the landlord updates the plots multiple times (ie unlocks/locks multiple times), causing the last updated time to reflect the latest lock update rather than the first. This is a known edge case that we are comfortable with. HOWEVER, we will accept alternative solutions to mitigate this issue. Pointing it out will not result in a valid finding.

_Note for C4 wardens: Anything included in this `Automated Findings / Publicly Known Issues` section is considered a publicly known issue and is ineligible for awards._

✅ SCOUTS: Please format the response above 👆 so its not a wall of text and its readable.

# Overview

[ ⭐️ SPONSORS: add info here ]

## Links

- **Previous audits:**  
  - ✅ SCOUTS: If there are multiple report links, please format them in a list.
- **Documentation:** 
- **Website:** 🐺 CA: add a link to the sponsor's website
- **X/Twitter:** 🐺 CA: add a link to the sponsor's Twitter
- **Discord:** 🐺 CA: add a link to the sponsor's Discord

---

# Scope

[ ✅ SCOUTS: add scoping and technical details here ]

### Files in scope
- ✅ This should be completed using the `metrics.md` file
- ✅ Last row of the table should be Total: SLOC
- ✅ SCOUTS: Have the sponsor review and and confirm in text the details in the section titled "Scoping Q amp; A"

*For sponsors that don't use the scoping tool: list all files in scope in the table below (along with hyperlinks) -- and feel free to add notes to emphasize areas of focus.*

| Contract | SLOC | Purpose | Libraries used |  
| ----------- | ----------- | ----------- | ----------- |
| [contracts/folder/sample.sol](https://github.com/code-423n4/repo-name/blob/contracts/folder/sample.sol) | 123 | This contract does XYZ | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |

### Files out of scope
✅ SCOUTS: List files/directories out of scope

## Scoping Q &amp; A

### General questions
### Are there any ERC20's in scope?: No

✅ SCOUTS: If the answer above 👆 is "Yes", please add the tokens below 👇 to the table. Otherwise, update the column with "None".




### Are there any ERC777's in scope?: 

✅ SCOUTS: If the answer above 👆 is "Yes", please add the tokens below 👇 to the table. Otherwise, update the column with "None".



### Are there any ERC721's in scope?: Yes

✅ SCOUTS: If the answer above 👆 is "Yes", please add the tokens below 👇 to the table. Otherwise, update the column with "None".

Munchable NFTs

### Are there any ERC1155's in scope?: No

✅ SCOUTS: If the answer above 👆 is "Yes", please add the tokens below 👇 to the table. Otherwise, update the column with "None".



✅ SCOUTS: Once done populating the table below, please remove all the Q/A data above.

| Question                                | Answer                       |
| --------------------------------------- | ---------------------------- |
| ERC20 used by the protocol              |       🖊️             |
| Test coverage                           | ✅ SCOUTS: Please populate this after running the test coverage command                          |
| ERC721 used  by the protocol            |            🖊️              |
| ERC777 used by the protocol             |           🖊️                |
| ERC1155 used by the protocol            |              🖊️            |
| Chains the protocol will be deployed on | OtherBlast  |

### ERC20 token behaviors in scope

| Question                                                                                                                                                   | Answer |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [Missing return values](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#missing-return-values)                                                      |    |
| [Fee on transfer](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#fee-on-transfer)                                                                  |   |
| [Balance changes outside of transfers](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#balance-modifications-outside-of-transfers-rebasingairdrops) |    |
| [Upgradeability](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#upgradable-tokens)                                                                 |    |
| [Flash minting](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#flash-mintable-tokens)                                                              |    |
| [Pausability](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#pausable-tokens)                                                                      |    |
| [Approval race protections](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#approval-race-protections)                                              |    |
| [Revert on approval to zero address](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#revert-on-approval-to-zero-address)                            |    |
| [Revert on zero value approvals](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#revert-on-zero-value-approvals)                                    |    |
| [Revert on zero value transfers](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#revert-on-zero-value-transfers)                                    |    |
| [Revert on transfer to the zero address](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#revert-on-transfer-to-the-zero-address)                    |    |
| [Revert on large approvals and/or transfers](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#revert-on-large-approvals--transfers)                  |    |
| [Doesn't revert on failure](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#no-revert-on-failure)                                                   |    |
| [Multiple token addresses](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#revert-on-zero-value-transfers)                                          |    |
| [Low decimals ( < 6)](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#low-decimals)                                                                 |    |
| [High decimals ( > 18)](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#high-decimals)                                                              |    |
| [Blocklists](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#tokens-with-blocklists)                                                                |    |

### External integrations (e.g., Uniswap) behavior in scope:


| Question                                                  | Answer |
| --------------------------------------------------------- | ------ |
| Enabling/disabling fees (e.g. Blur disables/enables fees) | No   |
| Pausability (e.g. Uniswap pool gets paused)               |  Yes   |
| Upgradeability (e.g. Uniswap gets upgraded)               |   Yes  |


### EIP compliance checklist
N/A

✅ SCOUTS: Please format the response above 👆 using the template below👇

| Question                                | Answer                       |
| --------------------------------------- | ---------------------------- |
| src/Token.sol                           | ERC20, ERC721                |
| src/NFT.sol                             | ERC721                       |


# Additional context

## Main invariants

You can assume ConfigStorage is run by valid actors and that the only entity that can upgrade the contract is a valid entity.

✅ SCOUTS: Please format the response above 👆 so its not a wall of text and its readable.

## Attack ideas (where to focus for bugs)
The biggest concerns are people being able to unstake a different individual's Munchables or deadlocks (ie. where an individual's Munchable is stuck). 

✅ SCOUTS: Please format the response above 👆 so its not a wall of text and its readable.

## All trusted roles in the protocol

All Admin roles are trusted. Every role in ConfigStorage is trusted.

✅ SCOUTS: Please format the response above 👆 using the template below👇

| Role                                | Description                       |
| --------------------------------------- | ---------------------------- |
| Owner                          | Has superpowers                |
| Administrator                             | Can change fees                       |

## Describe any novel or unique curve logic or mathematical models implemented in the contracts:

N/A

✅ SCOUTS: Please format the response above 👆 so its not a wall of text and its readable.

## Running tests

nvm use
pnpm install
pnpm build
pnpm test

✅ SCOUTS: Please format the response above 👆 using the template below👇

```bash
git clone https://github.com/code-423n4/2023-08-arbitrum
git submodule update --init --recursive
cd governance
foundryup
make install
make build
make sc-election-test
```
To run code coverage
```bash
make coverage
```
To run gas benchmarks
```bash
make gas
```

✅ SCOUTS: Add a screenshot of your terminal showing the gas report
✅ SCOUTS: Add a screenshot of your terminal showing the test coverage

## Miscellaneous
Employees of Munchables and employees' family members are ineligible to participate in this audit.




# Scope

*See [scope.txt](https://github.com/code-423n4/2024-07-munchables/blob/main/scope.txt)*

### Files in scope


| File   | Logic Contracts | Interfaces | nSLOC | Purpose | Libraries used |
| ------ | --------------- | ---------- | ----- | -----   | ------------ |
| /src/managers/LandManager.sol | 1| **** | 277 | |openzeppelin-contracts/contracts/token/ERC721/IERC721.sol|
| **Totals** | **1** | **** | **277** | | |

### Files out of scope

*See [out_of_scope.txt](https://github.com/code-423n4/2024-07-munchables/blob/main/out_of_scope.txt)*

| File         |
| ------------ |
| ./src/config/BaseConfigStorage.sol |
| ./src/config/BaseConfigStorageUpgradeable.sol |
| ./src/config/ConfigStorage.sol |
| ./src/distributors/FundTreasuryDistributor.sol |
| ./src/interfaces/IAccountManager.sol |
| ./src/interfaces/IBaseBlastManager.sol |
| ./src/interfaces/IBlast.sol |
| ./src/interfaces/IBonusManager.sol |
| ./src/interfaces/IClaimManager.sol |
| ./src/interfaces/IConfigNotifiable.sol |
| ./src/interfaces/IConfigStorage.sol |
| ./src/interfaces/IDistributor.sol |
| ./src/interfaces/IERC20YieldClaimable.sol |
| ./src/interfaces/IHoldsGovernorship.sol |
| ./src/interfaces/ILandManager.sol |
| ./src/interfaces/ILockManager.sol |
| ./src/interfaces/IMigrationManager.sol |
| ./src/interfaces/IMunchNFT.sol |
| ./src/interfaces/IMunchToken.sol |
| ./src/interfaces/IMunchadexManager.sol |
| ./src/interfaces/INFTAttributesManager.sol |
| ./src/interfaces/INFTOverlord.sol |
| ./src/interfaces/IPrimordialManager.sol |
| ./src/interfaces/IRNGProxy.sol |
| ./src/interfaces/IRNGProxySelfHosted.sol |
| ./src/interfaces/IRewardsManager.sol |
| ./src/interfaces/ISnuggeryManager.sol |
| ./src/libraries/MunchablesCommonLib.sol |
| ./src/managers/AccountManager.sol |
| ./src/managers/BaseBlastManager.sol |
| ./src/managers/BaseBlastManagerUpgradeable.sol |
| ./src/managers/BonusManager.sol |
| ./src/managers/ClaimManager.sol |
| ./src/managers/LockManager.sol |
| ./src/managers/MigrationManager.sol |
| ./src/managers/MunchadexManager.sol |
| ./src/managers/NFTAttributeManagerV1.sol |
| ./src/managers/PrimordialManager.sol |
| ./src/managers/RewardsManager.sol |
| ./src/managers/SnuggeryManager.sol |
| ./src/mock/MockAccountManager.sol |
| ./src/mock/MockBlast.sol |
| ./src/mock/MockClaimManager.sol |
| ./src/mock/MockConfigNotifiable.sol |
| ./src/mock/MockLockManager.sol |
| ./src/mock/MockMigrationManager.sol |
| ./src/mock/MockMigrationManager2.sol |
| ./src/mock/MockMunchNFT.sol |
| ./src/mock/MockMunchadexManager.sol |
| ./src/mock/MockNFTAttributeManagerV1.sol |
| ./src/mock/MockNFTOverlord.sol |
| ./src/mock/MockPrimordialManager.sol |
| ./src/mock/MockRNGProxy.sol |
| ./src/mock/MockRNGRequester.sol |
| ./src/mock/MockRewardsManager.sol |
| ./src/mock/MockSnuggeryManager.sol |
| ./src/overlords/NFTOverlord.sol |
| ./src/proxy/ProxyFactory.sol |
| ./src/rng/BaseRNGProxy.sol |
| ./src/rng/RNGProxyAPI3.sol |
| ./src/rng/RNGProxySelfHosted.sol |
| ./src/test/ClaimGas.sol |
| ./src/test/ClaimYield.t.sol |
| ./src/test/MigrationManager.t.sol |
| ./src/test/MunchablesTest.sol |
| ./src/test/Playground.t.sol |
| ./src/test/SpeedRun.t.sol |
| ./src/test/SwapRewardsManager.sol |
| ./src/tokens/MunchNFT.sol |
| ./src/tokens/MunchToken.sol |
| ./src/tokens/OldMunchNFT.sol |
| ./src/tokens/OldMunchNFTTest.sol |
| ./src/tokens/TestBlastERC20Token.sol |
| ./src/tokens/TestERC20Token.sol |
| Totals: 74 |

