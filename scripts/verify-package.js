import assert from "assert";
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
  // Resolve dependencies from the registry, including Morpheus. Substituting a
  // sibling checkout here can hide missing or incomplete published packages.
  execFileSync(
    npm,
    ["install", "--no-audit", "--no-fund", packagePath],
    { cwd: tempDir, stdio: "inherit" },
  );

  const swifty = path.join(
    tempDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "swifty.cmd" : "swifty",
  );
  const cliOutput = execFileSync(swifty, [], {
    cwd: tempDir,
    encoding: "utf-8",
    shell: process.platform === "win32",
  });
  if (!cliOutput.includes("Usage:")) {
    throw new Error("The installed swifty executable did not run the CLI.");
  }

  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      'import swifty, { build } from "@daz4126/swifty"; if (swifty !== build) process.exit(1);',
    ],
    { cwd: tempDir, stdio: "inherit" },
  );

  const runCli = (args, cwd) => execFileSync(swifty, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  runCli(["new", "smoke-site"], tempDir);
  const siteDir = path.join(tempDir, "smoke-site");
  await fs.writeFile(
    path.join(siteDir, "pages", "about.md"),
    [
      "---", "title: Package smoke test", "tags: [release]", "---", "",
      "# Package smoke test", "", "[Home](/)", "",
      "![Sample](/images/sample.png)", "",
      "```javascript", "const installed = true;", "```", "",
      "<%= partial: search %>",
    ].join("\n"),
  );
  // Exercise the installed Sharp binary, rather than the checkout's copy.
  execFileSync(process.execPath, ["--input-type=module", "--eval", `
    import { createRequire } from "module";
    const require = createRequire(import.meta.resolve("@daz4126/swifty"));
    const sharp = require("sharp");
    await sharp({ create: {
      width: 16, height: 16, channels: 3, background: "#db2777",
    } }).png().toFile("images/sample.png");
  `], { cwd: siteDir, stdio: "inherit" });

  runCli(["build"], siteDir);
  runCli(["check"], siteDir);

  const outputDir = path.join(siteDir, "dist");
  for (const filename of [
    "index.html", "about/index.html", "tags/release/index.html",
    "sitemap.xml", "robots.txt", "images/sample.webp",
  ]) {
    await fs.access(path.join(outputDir, filename));
  }
  const search = JSON.parse(await fs.readFile(path.join(outputDir, "search.json"), "utf-8"));
  assert.ok(search.pages.some((page) => page.url === "/about"));
  const assets = await fs.readdir(path.join(outputDir, "swifty"));
  assert.ok(assets.some((filename) => /^swifty-navigation\.[a-f0-9]+\.js$/.test(filename)));
  assert.ok(assets.some((filename) => /^swifty-search\.[a-f0-9]+\.js$/.test(filename)));
  console.log("Package verification passed: registry install, API, scaffold, build, images, and site check.");
} finally {
  await fs.rm(tempDir, { force: true, recursive: true });
}
