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

Within the `_farmPlots()` function, the following edge case can happen:
If the plot ID is lower than the max plot amount, the system uses the last updated plot metadata time and tracks this with a dirty boolean flag. The edge case occurs when a user hasn’t farmed in a while and the landlord updates the plots multiple times (ie unlocks/locks multiple times), causing the last updated time to reflect the latest lock update rather than the first. This is a known edge case that we are comfortable with. HOWEVER, we will accept alternative solutions to mitigate this issue. Pointing it out will not result in a valid finding.

_Note for C4 wardens: Anything included in this `Automated Findings / Publicly Known Issues` section is considered a publicly known issue and is ineligible for awards._

# Overview

Munchables is a GameFi project with a twist.

The objective of the game is to earn as many Munch Points as possible. In crypto terms, you could call this "point farming".

Built on top of Blast, Munchables leverages the unique on-chain primitives to create a reward-filled journey. Players collect Munchables and keep them safe, fed and comfortable in their snuggery.
Once in a snuggery, a Munchable can start earning rewards for that player. A variety of factors influence the rewards earned, so players will have to be smart when choosing which Munchables to put in their snuggery and the strategies they use to play the game.

## Links

- **Previous audits:** [C4 audit for `LockManager`](https://github.com/code-423n4/2024-05-munchables/)
- [Nethermind audit](https://2940425202-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FTntovqRqNnTMbN2jq0Oh%2Fuploads%2Fv8NSqjP7Bg0Ej4yCYmh2%2FNM_0236_Munchables_Final.pdf?alt=media&token=63cf2154-cbf7-4855-86d0-0b7427b73d07)
- **Documentation:** [/guides/\*.md](https://github.com/code-423n4/2024-05-munchables/tree/main/guides)
- **Website:** https://www.munchables.app/
- **X/Twitter:** [@_munchables_](https://x.com/_munchables_)
- **Discord:** https://discord.com/invite/munchables

---

# Scope

_See [scope.txt](https://github.com/code-423n4/2024-07-munchables/blob/main/scope.txt)_

### Files in scope

| File                          | Logic Contracts | Interfaces | nSLOC   | Purpose | Libraries used                                            |
| ----------------------------- | --------------- | ---------- | ------- | ------- | --------------------------------------------------------- |
| /src/managers/LandManager.sol | 1               | \*\*\*\*   | 277     |         | openzeppelin-contracts/contracts/token/ERC721/IERC721.sol |
| **Totals**                    | **1**           | \*\*\*\*   | **277** |         |                                                           |

### Files out of scope

Any file not listed in the 'in scope' section.

Note that the following files are inherited by the file in scope, but they're NOT in scope:

| Contract                                     |
| -------------------------------------------- |
| src/managers/BaseBlastManager.sol            |
| src/config/BaseConfigStorage.sol             |
| src/managers/BaseBlastManagerUpgradeable.sol |
| src/config/BaseConfigStorageUpgradeable.sol  |

_See [out_of_scope.txt](https://github.com/code-423n4/2024-07-munchables/blob/main/out_of_scope.txt)_

## Scoping Q &amp; A

### General questions

| Question                                | Answer         |
| --------------------------------------- | -------------- |
| ERC20 used by the protocol              | None           |
| Test coverage                           | -              |
| ERC721 used by the protocol             | Munchable NFTs |
| ERC777 used by the protocol             | None           |
| ERC1155 used by the protocol            | None           |
| Chains the protocol will be deployed on | Blast          |

### External integrations (e.g., Uniswap) behavior in scope:

| Question                                                  | Answer |
| --------------------------------------------------------- | ------ |
| Enabling/disabling fees (e.g. Blur disables/enables fees) | No     |
| Pausability (e.g. Uniswap pool gets paused)               | Yes    |
| Upgradeability (e.g. Uniswap gets upgraded)               | Yes    |

### EIP compliance checklist

N/A

# Additional context

## Main invariants

You can assume ConfigStorage is run by valid actors and that the only entity that can upgrade the contract is a valid entity.

## Attack ideas (where to focus for bugs)

The biggest concerns are people being able to unstake a different individual's Munchables or deadlocks (ie. where an individual's Munchable is stuck).

## All trusted roles in the protocol



| Role     | Description                                    |
| -------- | ---------------------------------------------- |
| Owner    | Can upgrade contract                           |
| Landlord | Can change their own tax rate                  |
| Rentor   | Can stake Munchable on Landlord's land to toil |

## Describe any novel or unique curve logic or mathematical models implemented in the contracts:

N/A

## Running tests

Dependecies:

- [pnpm](https://pnpm.io/)
- [nvm](https://github.com/nvm-sh/nvm)

```bash
git clone https://github.com/code-423n4/2024-07-munchables
cd 2024-07-munchables


nvm install && nvm use
pnpm install
pnpm build:abi

# This currently runs only tests for LandManager
# to run all tests modify the line here: https://github.com/code-423n4/2024-07-munchables/blob/main/tests/run.ts#L10
pnpm test:typescript

```

## Miscellaneous

Employees of Munchables and employees' family members are ineligible to participate in this audit.
