import { zeroAddress } from "viem";
import { DeployedContractsType } from "../../deployments/actions/deploy-contracts";
import { assertTxSuccess } from "./asserters";
import { BASE_TOKEN_DATA, ONE_WEEK, STARTING_TIMESTAMP } from "./consts";

export async function configureDefaultLock({
  admin,
  testContracts,
}: {
  admin: `0x${string}`;
  testContracts: DeployedContractsType;
}) {
  let txHash = await testContracts.lockManager.contract.write.configureLockdrop(
    [
      {
        start: Number(STARTING_TIMESTAMP),
        end: Number(STARTING_TIMESTAMP + ONE_WEEK),
        minLockDuration: Number(ONE_WEEK),
      },
    ],
    {
      account: admin,
    }
  );

  await assertTxSuccess({
    txHash,
  });

  txHash = await testContracts.lockManager.contract.write.configureToken(
    [zeroAddress, BASE_TOKEN_DATA],
    {
      account: admin,
    }
  );

  await assertTxSuccess({
    txHash,
  });
}
