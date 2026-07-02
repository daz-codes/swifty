import { execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "swifty-package-"));

try {
  const packResult = execFileSync(
    npm,
    ["pack", "--silent", "--json", "--pack-destination", tempDir],
    { encoding: "utf-8" },
  );
  const [{ filename }] = JSON.parse(packResult);
  const packagePath = path.join(tempDir, filename);

  await fs.writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  execFileSync(
    npm,
    ["install", "--no-audit", "--no-fund", packagePath],
    { cwd: tempDir, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      'import swifty, { build } from "@daz4126/swifty"; if (swifty !== build) process.exit(1);',
    ],
    { cwd: tempDir, stdio: "inherit" },
  );
} finally {
  await fs.rm(tempDir, { force: true, recursive: true });
}
