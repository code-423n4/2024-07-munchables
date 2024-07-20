import isEqual from "lodash.isequal";
import assert from "node:assert";
import {
  Abi,
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  Log,
  decodeErrorResult,
  decodeEventLog,
  parseEventLogs,
} from "viem";
import { testClient } from "./consts";

export async function assertTxSuccess({ txHash }: { txHash: `0x${string}` }) {
  const txReceipt = await testClient.waitForTransactionReceipt({
    hash: txHash,
  });
  assert.equal(txReceipt.status, "success");
  return txReceipt;
}

export function assertContractFunctionRevertedError(
  err: Error,
  expectedErrorName: string,
  abi: Abi | undefined = undefined
) {
  if (err instanceof BaseError) {
    const revertError = err.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      // @ts-expect-error TS2339
      if (!revertError.data?.errorName && !!err.cause?.signature && !!abi) {
        const decodedError = decodeErrorResult({
          abi,
          // @ts-expect-error TS2339
          data: err.cause?.signature,
        });
        assert.equal(decodedError.errorName, expectedErrorName);
      } else {
        assert.equal(revertError.data?.errorName, expectedErrorName);
      }
    } else {
      assert.fail("No ContractFunctionRevertedError found");
    }
  } else {
    assert.fail("Not an instance of viem's BaseError");
  }

  return true;
}

export function assertContractFunctionExecutionError(err: Error, expectedErrorName: string) {
  if (err instanceof BaseError) {
    const revertError = err.walk((err) => err instanceof ContractFunctionExecutionError);
    if (revertError instanceof ContractFunctionExecutionError) {
      if (revertError.metaMessages) {
        assert.equal(
          revertError.metaMessages.some((message) => message.includes(expectedErrorName)),
          true
        );
      } else {
        assert.fail("No metaMessages found");
      }
    } else {
      assert.fail("No ContractFunctionExecutionError found");
    }
  } else {
    assert.fail("Not an instance of viem's BaseError");
  }

  return true;
}

export function assertTransactionEvents<abi extends Abi | readonly unknown[] = Abi>({
  abi,
  logs,
  expectedEvents,
}: {
  abi: abi;
  logs: Log[];
  expectedEvents: {
    eventName: string;
    args: any;
  }[];
}) {
  const parsedLogs = parseEventLogs({ abi, logs });
  if (expectedEvents.length === 0) {
    assert.equal(parsedLogs.length, 0);
    return;
  }

  assert(
    parsedLogs.length >= expectedEvents.length,
    `Event length mismatch (actual: ${parsedLogs.length} < expected: ${expectedEvents.length})`
  );
  const decodedLogs = parsedLogs.map((parsedLog) =>
    decodeEventLog({
      abi,
      data: parsedLog.data,
      topics: parsedLog.topics,
    })
  );
  for (const expectedEvent of expectedEvents) {
    const matchingEvent = decodedLogs.find((decodedLog) => {
      if (decodedLog.eventName === expectedEvent.eventName) {
        for (const expectedArg in expectedEvent.args) {
          if (expectedEvent.args[expectedArg] === undefined) {
            decodedLog.args[expectedArg] = undefined;
          }
        }
        return isEqual(decodedLog.args, expectedEvent.args);
      }
    });
    if (!matchingEvent) {
      // Use console.error to assist in debugging since the events contain bigint's
      // and can't be serialized into a string for the assert message
      console.error(
        "Did not find expected event\n",
        "Actual events:\n",
        decodedLogs,
        "\nExpected event:\n",
        expectedEvent
      );
      assert.fail(`Did not find expected event "${expectedEvent.eventName}"`);
    }
  }
}
