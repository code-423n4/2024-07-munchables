import { glob } from "glob";
import process from "node:process";
import { finished } from "node:stream";
import { run } from "node:test";
import { spec } from "node:test/reporters";
import { anvilDefault } from "./utils/consts";
import { getTestContracts } from "./utils/contracts";

// let testGlob = "**/*.test.ts"; // Default test glob
let testGlob = "**/LandManager/*.test.ts"; // run only LoanManager tests
if (process.argv[2]) {
  testGlob = process.argv[2] + ".test.ts";
}
console.log(`Running tests that match ${testGlob}`);

const stream = run({
  files: glob.sync(`tests/${testGlob}`, {
    ignore: ["tests/managers/MigrationManager/fullData.test.ts"],
  }),
  concurrency: false,
  timeout: 1000000,

  setup: async () => {
    // Test setup
    await anvilDefault.start();
    await getTestContracts();
  },
})
  .on("test:fail", () => {
    process.exitCode = 1;
  })
  .compose(new spec());

finished(stream, async () => {
  // Test teardown
  await anvilDefault.stop();
});

stream.pipe(process.stdout);
