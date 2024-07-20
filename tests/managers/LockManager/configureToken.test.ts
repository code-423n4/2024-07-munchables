import isEqual from "lodash.isequal";
import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { parseEther, zeroAddress } from "viem";
import { DeployedContractsType } from "../../../deployments/actions/deploy-contracts";
import { Role } from "../../../deployments/utils/config-consts";
import {
  assertContractFunctionRevertedError,
  assertTransactionEvents,
  assertTxSuccess,
} from "../../utils/asserters";
import { testClient } from "../../utils/consts";
import {
  TestERC20ContractType,
  deployTestERC20Contract,
  getTestContracts,
  getTestRoleAddresses,
} from "../../utils/contracts";

describe("LockManager: configureToken", () => {
  let alice: `0x${string}`;
  let admin: `0x${string}`;
  let beforeSnapshot: `0x${string}`;
  let beforeEachSnapshot: `0x${string}`;
  let testContracts: DeployedContractsType;
  let testERC20Contract: TestERC20ContractType;

  async function assertConfigureTokenSuccess({
    tokenContractAddress,
    tokenData,
    txHash,
  }: {
    tokenContractAddress: `0x${string}`;
    tokenData: {
      usdPrice: bigint;
      nftCost: bigint;
      active: boolean;
    };
    txHash: `0x${string}`;
  }) {
    const txReceipt = await assertTxSuccess({ txHash });

    assertTransactionEvents({
      abi: testContracts.lockManager.contract.abi,
      logs: txReceipt.logs,
      expectedEvents: [
        {
          eventName: "TokenConfigured",
          args: {
            _tokenContract: tokenContractAddress,
            _tokenData: tokenData,
          },
        },
      ],
    });

    const configuredToken = await testContracts.lockManager.contract.read.getConfiguredToken([
      tokenContractAddress,
    ]);
    assert(isEqual(configuredToken, tokenData));
  }

  before(async () => {
    testContracts = await getTestContracts();
    beforeSnapshot = await testClient.snapshot();

    const testRoleAddresses = await getTestRoleAddresses();
    [alice] = testRoleAddresses.users;
    admin = testRoleAddresses[Role.Admin];

    testERC20Contract = await deployTestERC20Contract({ account: alice });
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

  it("should revert with InvalidRoleError when called as non-admin", async () => {
    await assert.rejects(
      testContracts.lockManager.contract.simulate.configureToken(
        [
          zeroAddress,
          {
            usdPrice: 100n,
            nftCost: parseEther("2"),
            active: true,
            decimals: 18,
          },
        ],
        {
          account: alice,
        }
      ),
      (err: Error) => assertContractFunctionRevertedError(err, "InvalidRoleError")
    );
  });

  describe("when configuring already configured token", () => {
    beforeEach(async () => {
      // Configure zero-address with nothing so we know it gets changed in the test
      const configureTokenTxHash = await testContracts.lockManager.contract.write.configureToken([
        zeroAddress,
        {
          usdPrice: 0n,
          nftCost: 10n,
          active: false,
          decimals: 18,
        },
      ]);
      await assertTxSuccess({ txHash: configureTokenTxHash });
    });

    it("should succeed and update all token config properties", async () => {
      const tokenData = {
        usdPrice: 1337n * BigInt(1e18),
        nftCost: 69n,
        active: true,
        decimals: 18,
      };
      const { request } = await testContracts.lockManager.contract.simulate.configureToken(
        [zeroAddress, tokenData],
        {
          account: admin,
        }
      );
      const txHash = await testClient.writeContract(request);
      await assertConfigureTokenSuccess({
        tokenContractAddress: zeroAddress,
        tokenData,
        txHash,
      });
    });
  });

  describe("when configuring new token", () => {
    it("should succeed and set all token config properties", async () => {
      const tokenData = {
        usdPrice: 80085n * BigInt(1e18),
        nftCost: 42n,
        active: true,
        decimals: 18,
      };
      const { request } = await testContracts.lockManager.contract.simulate.configureToken(
        [testERC20Contract.address, tokenData],
        {
          account: admin,
        }
      );
      const txHash = await testClient.writeContract(request);
      await assertConfigureTokenSuccess({
        tokenContractAddress: testERC20Contract.address,
        tokenData,
        txHash,
      });
    });
  });
});
