import { zeroAddress } from "viem";
import { DeployedContractsType } from "../../deployments/actions/deploy-contracts";
import { Realm } from "../../deployments/utils/consts";
import { assertTxSuccess } from "./asserters";
import { MockAccountManagerType } from "./mock-contracts";

export async function registerPlayer({
  account,
  realm = Realm.Everfrost,
  referrer = zeroAddress,
  testContracts,
}: {
  account: `0x${string}`;
  realm?: Realm;
  referrer?: `0x${string}`;
  testContracts: DeployedContractsType;
}) {
  const registerTxHash = await testContracts.accountManagerProxy.contract.write.register(
    [realm, referrer],
    {
      account,
    }
  );
  await assertTxSuccess({ txHash: registerTxHash });
}

export async function registerSubAccount({
  account,
  subAccount,
  testContracts,
}: {
  account: `0x${string}`;
  subAccount: `0x${string}`;
  testContracts: DeployedContractsType;
}) {
  const registerTxHash = await testContracts.accountManagerProxy.contract.write.addSubAccount(
    [subAccount],
    {
      account,
    }
  );
  await assertTxSuccess({ txHash: registerTxHash });
}

export async function registerMockPlayer({
  account,
  realm = Realm.Everfrost,
  mockAccountManager,
}: {
  account: `0x${string}`;
  realm?: Realm;
  mockAccountManager: MockAccountManagerType;
}) {
  const registerTxHash = await mockAccountManager.write.register([realm, zeroAddress], {
    account,
  });
  await assertTxSuccess({ txHash: registerTxHash });
}

export async function registerMockSubAccount({
  account,
  subAccount,
  mockAccountManager,
}: {
  account: `0x${string}`;
  subAccount: `0x${string}`;
  mockAccountManager: MockAccountManagerType;
}) {
  const registerTxHash = await mockAccountManager.write.addSubAccount([subAccount], {
    account,
  });
  await assertTxSuccess({ txHash: registerTxHash });
}
