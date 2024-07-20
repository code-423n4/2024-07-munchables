import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { CACHE_DIR, ENV } from "../utils/config-consts";
import { getScratchFilename } from "../utils/store";
dotenv.config();

async function main() {
  const env = process.env.ENV as ENV;
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const filename = `deployment-${timestamp}.json`;
  const dir = path.join(CACHE_DIR, env);
  const fromFilepath = path.join(dir, getScratchFilename());
  const toFilepath = path.join(dir, filename);
  console.log(`Moving ${fromFilepath} to ${toFilepath}`);

  if (!fs.existsSync(fromFilepath)) {
    console.error(`Scratch file ${fromFilepath} not found`);
    process.exit(1);
  }
  fs.renameSync(fromFilepath, toFilepath);
}
main();
