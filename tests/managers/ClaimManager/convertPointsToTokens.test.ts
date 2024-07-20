import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role, StorageKey } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { STARTING_TIMESTAMP, testClient } from "../../utils/consts";
import {
  TestERC20ContractType,
  deployTestERC20Contract,
  getTestContracts,
  getTestRoleAddresses,
} from "../../utils/contracts";
import {
  MockNFTAttributesManagerContractType,
  MockSnuggeryManagerContractType,
  deployMockNFTAttributesManager,
  deployMockSnuggeryManager,
} from "../../utils/mock-contracts";
import { registerPlayer } from "../../utils/players";

describe("ClaimManager: convertPointsToTokens()", () => {
  let admin: `0x${string}`;
  let bob: `0x${string}`;
  let alice: `0x${string}`;
  let newPeriodRole: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let mockSnuggeryManager: MockSnuggeryManagerContractType;
  let mockNFTAttributesManager: MockNFTAttributesManagerContractType;
  let munchToken: TestERC20ContractType;

  before(async () => {
    testContracts = await getTestContracts();

    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [bob, alice] = testRoleAddresses.users;
    newPeriodRole = testRoleAddresses[Role.NewPeriod];
    admin = testRoleAddresses[Role.Admin];
    munchToken = await deployTestERC20Contract({ account: admin });

    const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
      StorageKey.MunchToken,
      munchToken.address,
      true,
    ]);
    await assertTxSuccess({ txHash: configSetAddressTxHash });

    mockNFTAttributesManager = await deployMockNFTAttributesManager({
      testContracts,
    });
    mockSnuggeryManager = await deployMockSnuggeryManager({ testContracts });

    await testClient.setBalance({
      address: newPeriodRole,
      value: parseEther("10"),
    });
  });

  beforeEach(async () => {
    beforeEachSnapshot = await testClient.snapshot();
  });

  afterEach(async () => {
    await testClient.revert({ id: beforeEachSnapshot });
  });

  after(async () => {
    await testClient.revert({ id: beforeSnapshot });
  });

  describe("all pathways", () => {
    beforeEach(async () => {
      await registerPlayer({
        account: alice,
        realm: 1,
        testContracts,
      });
      await registerPlayer({
        account: bob,
        realm: 1,
        referrer: alice,
        testContracts,
      });

      const snuggery: { tokenId: bigint; importedDate: number }[] = [];
      for (let i = 1; i < 6; i++) {
        const setNFTAttrsTxHash = await mockNFTAttributesManager.write.setAttributesForTest([
          BigInt(i),
          {
            chonks: 1000n,
            level: i,
            evolution: 0,
            lastPettedTime: 0n,
          },
        ]);
        await assertTxSuccess({ txHash: setNFTAttrsTxHash });

        snuggery.push({ tokenId: BigInt(i), importedDate: 0 });
      }

      const setSnuggeryTxHash = await mockSnuggeryManager.write.setSnuggeryForTest([
        alice,
        snuggery,
      ]);
      await assertTxSuccess({ txHash: setSnuggeryTxHash });

      let txHash = await mockSnuggeryManager.write.setGlobalTotalChonk([45000n], {
        account: admin,
      });
      await assertTxSuccess({ txHash });
      await testClient.setNextBlockTimestamp({ timestamp: STARTING_TIMESTAMP });
      txHash = await testContracts.claimManagerProxy.contract.write.newPeriod({
        account: newPeriodRole,
      });
      await assertTxSuccess({ txHash });
      txHash = await testContracts.claimManagerProxy.contract.write.claimPoints({ account: alice });
      await assertTxSuccess({ txHash });
    });
    it("revert if paused", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.Paused, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([1000n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "ContractsPausedError")
      );
    });
    it("revert if not swappable", async () => {
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([1000n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "SwapDisabledError")
      );
    });
    it("revert if no points available", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.SwapEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([1000n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoClaimablePointsError")
      );
    });
    it("revert if send in zero points", async () => {
      const txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.SwapEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([0n], {
          account: bob,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NoClaimablePointsError")
      );
    });
    it("revert if points per token is 0", async () => {
      let txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.SwapEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.PointsPerToken, 0n, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([1000n], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PointsPerTokenNotSetError")
      );
    });
    it("revert if tries to convert too many points", async () => {
      let txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.SwapEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.PointsPerToken, 1000n, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([BigInt(1e26)], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "NotEnoughPointsError")
      );
    });
    it("revert if token mint is zero", async () => {
      let txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.SwapEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.PointsPerToken, 1000n, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([BigInt(100)], {
          account: alice,
        }),
        (err: Error) => assertContractFunctionRevertedError(err, "PointAmountToSmallError")
      );
    });
    it("revert if munch token is not set", async () => {
      let txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.SwapEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.PointsPerToken, 1000n, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      const configSetAddressTxHash = await testContracts.configStorage.contract.write.setAddress([
        StorageKey.MunchToken,
        zeroAddress,
        true,
      ]);
      await assertTxSuccess({ txHash: configSetAddressTxHash });

      await assert.rejects(
        testContracts.claimManagerProxy.contract.simulate.convertPointsToTokens([BigInt(100)], {
          account: alice,
        })
      );
    });
    it("successful points to token converstion", async () => {
      let txHash = await testContracts.configStorage.contract.write.setBool(
        [StorageKey.SwapEnabled, true, true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });
      txHash = await testContracts.configStorage.contract.write.setUint(
        [StorageKey.PointsPerToken, BigInt(1e13), true],
        {
          account: admin,
        }
      );
      await assertTxSuccess({ txHash });

      const pointsBeforeBalance = await testContracts.claimManagerProxy.contract.read.getPoints([
        alice,
      ]);
      const tokensBeforeBalance = await munchToken.read.balanceOf([alice]);
      txHash = await testContracts.claimManagerProxy.contract.write.convertPointsToTokens(
        [BigInt(100)],
        {
          account: alice,
        }
      );
      const txReceipt = await assertTxSuccess({ txHash });
      assertTransactionEvents({
        abi: testContracts.claimManagerRoot.contract.abi,
        logs: txReceipt.logs,
        expectedEvents: [
          {
            eventName: "PointsConverted",
            args: {
              _player: alice,
              _points: 100n,
              _tokens: 1000n,
            },
          },
        ],
      });
      const pointsAfterBalance = await testContracts.claimManagerProxy.contract.read.getPoints([
        alice,
      ]);
      const tokensAfterBalance = await munchToken.read.balanceOf([alice]);
      assert.equal(pointsBeforeBalance - 100n, pointsAfterBalance);
      assert.equal(tokensBeforeBalance + 1000n, tokensAfterBalance);
    });
  });
});
