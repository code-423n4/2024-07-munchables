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

[ ⭐️ SPONSORS: add info here ]

## Links

- **Previous audits:** [C4 audit for `LockManager`](https://github.com/code-423n4/2024-05-munchables/)
- **Documentation:**
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

_See [out_of_scope.txt](https://github.com/code-423n4/2024-07-munchables/blob/main/out_of_scope.txt)_

## Scoping Q &amp; A

### General questions

| Question                                | Answer                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| ERC20 used by the protocol              | NOne                                                                    |
| Test coverage                           | ✅ SCOUTS: Please populate this after running the test coverage command |
| ERC721 used by the protocol             | Munchable NFTs                                                          |
| ERC777 used by the protocol             | None                                                                    |
| ERC1155 used by the protocol            | None                                                                    |
| Chains the protocol will be deployed on | Blast                                                                   |

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

All Admin roles are trusted. Every role in ConfigStorage is trusted.

✅ SCOUTS: Please format the response above 👆 using the template below👇

| Role          | Description     |
| ------------- | --------------- |
| Owner         | Has superpowers |
| Administrator | Can change fees |

## Describe any novel or unique curve logic or mathematical models implemented in the contracts:

N/A

## Running tests

Dependecies:

- [pnpm](https://pnpm.io/)
- [nvm](https://github.com/nvm-sh/nvm)

```bash
git clone https://github.com/code-423n4/2024-07-munchables
cd 2024-07-munchables

cp .env.example .env
# fill out the `PRIVATE_KEY` field in the `.env` file with a priavet key (in hex format `0x...`)
# Example script to create private key: https://gist.github.com/0xA5DF/3618fd9577777b30305442430bec800d

nvm install && nvm use
pnpm install
pnpm build

# This currently runs only tests for LandManager
# to run all tests modify the line here: https://github.com/code-423n4/2024-07-munchables/blob/main/tests/run.ts#L10
pnpm test:typescript

# note that some tests might fail
pnpm test:solidity
```

To run code coverage

```bash
forge coverage --ir-minimum
```

✅ SCOUTS: Add a screenshot of your terminal showing the test coverage

## Miscellaneous

Employees of Munchables and employees' family members are ineligible to participate in this audit.
