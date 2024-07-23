# Report


## Gas Optimizations


| |Issue|Instances|
|-|:-|:-:|
| [GAS-1](#GAS-1) | Use ERC721A instead ERC721 | 1 |
| [GAS-2](#GAS-2) | `a = a + b` is more gas effective than `a += b` for state variables (excluding arrays and mappings) | 2 |
| [GAS-3](#GAS-3) | Cache array length outside of loop | 1 |
| [GAS-4](#GAS-4) | For Operations that will not overflow, you could use unchecked | 19 |
| [GAS-5](#GAS-5) | Functions guaranteed to revert when called by normal users can be marked `payable` | 1 |
| [GAS-6](#GAS-6) | `++i` costs less gas compared to `i++` or `i += 1` (same for `--i` vs `i--` or `i -= 1`) | 2 |
| [GAS-7](#GAS-7) | Increments/decrements can be unchecked in for-loops | 2 |
### <a name="GAS-1"></a>[GAS-1] Use ERC721A instead ERC721
ERC721A standard, ERC721A is an improvement standard for ERC721 tokens. It was proposed by the Azuki team and used for developing their NFT collection. Compared with ERC721, ERC721A is a more gas-efficient standard to mint a lot of of NFTs simultaneously. It allows developers to mint multiple NFTs at the same gas price. This has been a great improvement due to Ethereum's sky-rocketing gas fee.

    Reference: https://nextrope.com/erc721-vs-erc721a-2/

*Instances (1)*:
```solidity
File: ./src/managers/LandManager.sol

9: import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="GAS-2"></a>[GAS-2] `a = a + b` is more gas effective than `a += b` for state variables (excluding arrays and mappings)
This saves **16 gas per instance.**

*Instances (2)*:
```solidity
File: ./src/managers/LandManager.sol

295:             renterMetadata.unfedSchnibbles += (schnibblesTotal -

298:             landlordMetadata.unfedSchnibbles += schnibblesLandlord;

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="GAS-3"></a>[GAS-3] Cache array length outside of loop
If not cached, the solidity compiler will always read the length of the array during each iteration. That is, if it is a storage array, this is an extra sload operation (100 additional extra gas for each iteration except for the first) and if it is a memory array, this is an extra mload operation (3 additional gas for each iteration except for the first).

*Instances (1)*:
```solidity
File: ./src/managers/LandManager.sol

247:         for (uint8 i = 0; i < staked.length; i++) {

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="GAS-4"></a>[GAS-4] For Operations that will not overflow, you could use unchecked

*Instances (19)*:
```solidity
File: ./src/managers/LandManager.sol

4: import "../interfaces/ILandManager.sol";

5: import "../interfaces/ILockManager.sol";

6: import "../interfaces/IAccountManager.sol";

7: import "./BaseBlastManagerUpgradeable.sol";

8: import "../interfaces/INFTAttributesManager.sol";

9: import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

247:         for (uint8 i = 0; i < staked.length; i++) {

273:                         (uint256(immutableAttributes.realm) * 5) +

276:                 ) +

281:                 (timestamp - _toiler.lastToilDate) *

284:                 (int256(schnibblesTotal) +

285:                     (int256(schnibblesTotal) * finalBonus)) / 100

288:                 (schnibblesTotal * _toiler.latestTaxRate) /

295:             renterMetadata.unfedSchnibbles += (schnibblesTotal -

298:             landlordMetadata.unfedSchnibbles += schnibblesLandlord;

305:                 schnibblesTotal - schnibblesLandlord,

318:         for (uint256 i = 0; i < stakedLength; i++) {

322:                 ][stakedLength - 1];

345:         return lockManager.getLockedWeightedValue(_account) / PRICE_PER_PLOT;

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="GAS-5"></a>[GAS-5] Functions guaranteed to revert when called by normal users can be marked `payable`
If a function modifier such as `onlyOwner` is used, the function will revert if a normal user tries to pay the function. Marking the function as `payable` will lower the gas cost for legitimate callers because the compiler will not include checks for whether a payment was provided.

*Instances (1)*:
```solidity
File: ./src/managers/LandManager.sol

88:     function configUpdated() external override onlyConfigStorage {

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="GAS-6"></a>[GAS-6] `++i` costs less gas compared to `i++` or `i += 1` (same for `--i` vs `i--` or `i -= 1`)
Pre-increments and pre-decrements are cheaper.

For a `uint256 i` variable, the following is true with the Optimizer enabled at 10k:

**Increment:**

- `i += 1` is the most expensive form
- `i++` costs 6 gas less than `i += 1`
- `++i` costs 5 gas less than `i++` (11 gas less than `i += 1`)

**Decrement:**

- `i -= 1` is the most expensive form
- `i--` costs 11 gas less than `i -= 1`
- `--i` costs 5 gas less than `i--` (16 gas less than `i -= 1`)

Note that post-increments (or post-decrements) return the old value before incrementing or decrementing, hence the name *post-increment*:

```solidity
uint i = 1;  
uint j = 2;
require(j == i++, "This will be false as i is incremented after the comparison");
```
  
However, pre-increments (or pre-decrements) return the new value:
  
```solidity
uint i = 1;  
uint j = 2;
require(j == ++i, "This will be true as i is incremented before the comparison");
```

In the pre-increment case, the compiler has to create a temporary variable (when used) for returning `1` instead of `2`.

Consider using pre-increments and pre-decrements where they are relevant (meaning: not where post-increments/decrements logic are relevant).

*Saves 5 gas per instance*

*Instances (2)*:
```solidity
File: ./src/managers/LandManager.sol

247:         for (uint8 i = 0; i < staked.length; i++) {

318:         for (uint256 i = 0; i < stakedLength; i++) {

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="GAS-7"></a>[GAS-7] Increments/decrements can be unchecked in for-loops
In Solidity 0.8+, there's a default overflow check on unsigned integers. It's possible to uncheck this in for-loops and save some gas at each iteration, but at the cost of some code readability, as this uncheck cannot be made inline.

[ethereum/solidity#10695](https://github.com/ethereum/solidity/issues/10695)

The change would be:

```diff
- for (uint256 i; i < numIterations; i++) {
+ for (uint256 i; i < numIterations;) {
 // ...  
+   unchecked { ++i; }
}  
```

These save around **25 gas saved** per instance.

The same can be applied with decrements (which should use `break` when `i == 0`).

The risk of overflow is non-existent for `uint256`.

*Instances (2)*:
```solidity
File: ./src/managers/LandManager.sol

247:         for (uint8 i = 0; i < staked.length; i++) {

318:         for (uint256 i = 0; i < stakedLength; i++) {

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)


## Non Critical Issues


| |Issue|Instances|
|-|:-|:-:|
| [NC-1](#NC-1) | `constant`s should be defined rather than using magic numbers | 3 |
| [NC-2](#NC-2) | Control structures do not follow the Solidity Style Guide | 18 |
| [NC-3](#NC-3) | Functions should not be longer than 50 lines | 6 |
| [NC-4](#NC-4) | Use a `modifier` instead of a `require/if` statement for a special `msg.sender` actor | 5 |
| [NC-5](#NC-5) | Consider using named mappings | 5 |
| [NC-6](#NC-6) | Take advantage of Custom Error's return value property | 15 |
| [NC-7](#NC-7) | Variables need not be initialized to zero | 2 |
### <a name="NC-1"></a>[NC-1] `constant`s should be defined rather than using magic numbers
Even [assembly](https://github.com/code-423n4/2022-05-opensea-seaport/blob/9d7ce4d08bf3c3010304a0476a785c70c0e90ae7/contracts/lib/TokenTransferrer.sol#L35-L39) can benefit from using readable constants instead of hex/numeric literals

*Instances (3)*:
```solidity
File: ./src/managers/LandManager.sol

140:         if (munchablesStaked[mainAccount].length > 10)

273:                         (uint256(immutableAttributes.realm) * 5) +

285:                     (int256(schnibblesTotal) * finalBonus)) / 100

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="NC-2"></a>[NC-2] Control structures do not follow the Solidity Style Guide
See the [control structures](https://docs.soliditylang.org/en/latest/style-guide.html#control-structures) section of the Solidity Style Guide

*Instances (18)*:
```solidity
File: ./src/managers/LandManager.sol

94:         if (newTaxRate < MIN_TAX_RATE || newTaxRate > MAX_TAX_RATE)

96:         if (plotMetadata[landlord].lastUpdated == 0)

106:         if (plotMetadata[mainAccount].lastUpdated != 0)

137:         if (landlord == mainAccount) revert CantStakeToSelfError();

138:         if (plotOccupied[landlord][plotId].occupied)

140:         if (munchablesStaked[mainAccount].length > 10)

142:         if (munchNFT.ownerOf(tokenId) != mainAccount)

146:         if (plotId >= totalPlotsAvail) revert PlotTooHighError();

148:         if (

178:         if (_toiler.landlord == address(0)) revert NotStakedError();

179:         if (munchableOwner[tokenId] != mainAccount) revert InvalidOwnerError();

207:         if (_toiler.landlord == address(0)) revert NotStakedError();

208:         if (munchableOwner[tokenId] != mainAccount) revert InvalidOwnerError();

209:         if (plotOccupied[_toiler.landlord][plotId].occupied)

211:         if (plotId >= totalPlotsAvail) revert PlotTooHighError();

251:             if (_toiler.dirty) continue;

329:         if (!found) revert InvalidTokenIdError();

340:         if (_player.registrationDate == 0) revert PlayerNotRegisteredError();

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="NC-3"></a>[NC-3] Functions should not be longer than 50 lines
Overly complex code can make understanding functionality more difficult, try to further modularize your code to ensure readability 

*Instances (6)*:
```solidity
File: ./src/managers/LandManager.sol

45:     function initialize(address _configStorage) public override initializer {

88:     function configUpdated() external override onlyConfigStorage {

92:     function updateTaxRate(uint256 newTaxRate) external override notPaused {

104:     function triggerPlotMetadata() external override notPaused {

228:     function farmPlots() external override notPaused {

344:     function _getNumPlots(address _account) internal view returns (uint256) {

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="NC-4"></a>[NC-4] Use a `modifier` instead of a `require/if` statement for a special `msg.sender` actor
If a function is supposed to be access-controlled, a `modifier` should be used instead of a `require/if` statement for more readability.

*Instances (5)*:
```solidity
File: ./src/managers/LandManager.sol

93:         (address landlord, ) = _getMainAccountRequireRegistered(msg.sender);

105:         (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);

136:         (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);

176:         (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);

203:         (address mainAccount, ) = _getMainAccountRequireRegistered(msg.sender);

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="NC-5"></a>[NC-5] Consider using named mappings
Consider moving to solidity version 0.8.18 or later, and using [named mappings](https://ethereum.stackexchange.com/questions/51629/how-to-name-the-arguments-in-mapping/145555#145555) to make it easier to understand the purpose of each mapping

*Instances (5)*:
```solidity
File: ./src/managers/LandManager.sol

21:     mapping(address => PlotMetadata) plotMetadata;

23:     mapping(address => mapping(uint256 => Plot)) plotOccupied;

25:     mapping(uint256 => address) munchableOwner;

27:     mapping(address => uint256[]) munchablesStaked;

29:     mapping(uint256 => ToilerState) toilerState;

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="NC-6"></a>[NC-6] Take advantage of Custom Error's return value property
An important feature of Custom Error is that values such as address, tokenID, msg.value can be written inside the () sign, this kind of approach provides a serious advantage in debugging and examining the revert details of dapps such as tenderly.

*Instances (15)*:
```solidity
File: ./src/managers/LandManager.sol

95:             revert InvalidTaxRateError();

97:             revert PlotMetadataNotUpdatedError();

107:             revert PlotMetadataTriggeredError();

137:         if (landlord == mainAccount) revert CantStakeToSelfError();

141:             revert TooManyStakedMunchiesError();

143:             revert InvalidOwnerError();

146:         if (plotId >= totalPlotsAvail) revert PlotTooHighError();

151:         ) revert NotApprovedError();

178:         if (_toiler.landlord == address(0)) revert NotStakedError();

179:         if (munchableOwner[tokenId] != mainAccount) revert InvalidOwnerError();

207:         if (_toiler.landlord == address(0)) revert NotStakedError();

208:         if (munchableOwner[tokenId] != mainAccount) revert InvalidOwnerError();

211:         if (plotId >= totalPlotsAvail) revert PlotTooHighError();

329:         if (!found) revert InvalidTokenIdError();

340:         if (_player.registrationDate == 0) revert PlayerNotRegisteredError();

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="NC-7"></a>[NC-7] Variables need not be initialized to zero
The default value for variables is zero, so initializing them to zero is superfluous.

*Instances (2)*:
```solidity
File: ./src/managers/LandManager.sol

247:         for (uint8 i = 0; i < staked.length; i++) {

318:         for (uint256 i = 0; i < stakedLength; i++) {

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)


## Low Issues


| |Issue|Instances|
|-|:-|:-:|
| [L-1](#L-1) | Initializers could be front-run | 2 |
| [L-2](#L-2) | Loss of precision | 1 |
| [L-3](#L-3) | Unsafe ERC20 operation(s) | 2 |
| [L-4](#L-4) | Upgradeable contract is missing a `__gap[50]` storage variable to allow for new storage variables in later versions | 4 |
| [L-5](#L-5) | Upgradeable contract not initialized | 6 |
### <a name="L-1"></a>[L-1] Initializers could be front-run
Initializers could be front-run, allowing an attacker to either set their own values, take ownership of the contract, and in the best case forcing a re-deployment

*Instances (2)*:
```solidity
File: ./src/managers/LandManager.sol

45:     function initialize(address _configStorage) public override initializer {

46:         BaseBlastManagerUpgradeable.initialize(_configStorage);

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="L-2"></a>[L-2] Loss of precision
Division by large numbers may result in the result being zero, due to solidity not supporting fractions. Consider requiring a minimum amount for the numerator to ensure that it is always larger than the denominator

*Instances (1)*:
```solidity
File: ./src/managers/LandManager.sol

345:         return lockManager.getLockedWeightedValue(_account) / PRICE_PER_PLOT;

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="L-3"></a>[L-3] Unsafe ERC20 operation(s)

*Instances (2)*:
```solidity
File: ./src/managers/LandManager.sol

152:         munchNFT.transferFrom(mainAccount, address(this), tokenId);

195:         munchNFT.transferFrom(address(this), mainAccount, tokenId);

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="L-4"></a>[L-4] Upgradeable contract is missing a `__gap[50]` storage variable to allow for new storage variables in later versions
See [this](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps) link for a description of this storage variable. While some contracts may not currently be sub-classed, adding the variable now protects against forgetting to add it in the future.

*Instances (4)*:
```solidity
File: ./src/managers/LandManager.sol

7: import "./BaseBlastManagerUpgradeable.sol";

11: contract LandManager is BaseBlastManagerUpgradeable, ILandManager {

46:         BaseBlastManagerUpgradeable.initialize(_configStorage);

85:         __BaseBlastManagerUpgradeable_reconfigure();

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

### <a name="L-5"></a>[L-5] Upgradeable contract not initialized
Upgradeable contracts are initialized via an initializer function rather than by a constructor. Leaving such a contract uninitialized may lead to it being taken over by a malicious user

*Instances (6)*:
```solidity
File: ./src/managers/LandManager.sol

7: import "./BaseBlastManagerUpgradeable.sol";

11: contract LandManager is BaseBlastManagerUpgradeable, ILandManager {

37:         _disableInitializers();

45:     function initialize(address _configStorage) public override initializer {

46:         BaseBlastManagerUpgradeable.initialize(_configStorage);

85:         __BaseBlastManagerUpgradeable_reconfigure();

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)


## Medium Issues


| |Issue|Instances|
|-|:-|:-:|
| [M-1](#M-1) | Using `transferFrom` on ERC721 tokens | 2 |
### <a name="M-1"></a>[M-1] Using `transferFrom` on ERC721 tokens
The `transferFrom` function is used instead of `safeTransferFrom` and [it's discouraged by OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/109778c17c7020618ea4e035efb9f0f9b82d43ca/contracts/token/ERC721/IERC721.sol#L84). If the arbitrary address is a contract and is not aware of the incoming ERC721 token, the sent token could be locked.

*Instances (2)*:
```solidity
File: ./src/managers/LandManager.sol

152:         munchNFT.transferFrom(mainAccount, address(this), tokenId);

195:         munchNFT.transferFrom(address(this), mainAccount, tokenId);

```
[Link to code](https://github.com/code-423n4/2024-07-munchables/blob/main/./src/managers/LandManager.sol)

