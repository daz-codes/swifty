#!/usr/bin/env node

import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const packagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const packageVersion = JSON.parse(fs.readFileSync(packagePath, "utf-8")).version;
let outDir = "dist"; // default

// Look for --out [folder]
const outIndex = args.indexOf("--out");
if (outIndex !== -1 && args[outIndex + 1]) {
  outDir = args[outIndex + 1];
}

// Pass outDir as an environment variable too (optional, still useful)
process.env.OUT_DIR = outDir;

const printHelp = () => {
  console.log(`Usage:
  swifty new <sitename>            Create a new site
  swifty build [--out dir]         Build for production
  swifty build --drafts            Build with draft and scheduled pages
  swifty check                     Validate site content and generated routes
  swifty start [--out dir]         Build and serve with live reload
  swifty deploy ["message"]        Build, commit, and push generated output
  swifty --help                     Show this help
  swifty --version                  Show the installed version`);
};

const assertAllowedOptions = (command, allowed) => {
  const options = args.slice(1).filter((arg) => arg.startsWith("-"));
  const unknown = options.find((option) => !allowed.has(option));
  if (unknown) throw new Error(`Unknown option "${unknown}" for swifty ${command}`);
  if (allowed.has("--out")) {
    const index = args.indexOf("--out");
    if (index !== -1 && (!args[index + 1] || args[index + 1].startsWith("-"))) {
      throw new Error(`--out for swifty ${command} requires a directory`);
    }
  }
};

const commitAndPushOutput = (
  outputDir,
  commitMessage,
  { execFile = execFileSync, spawnFile = spawnSync } = {},
) => {
  const existingDiff = spawnFile("git", ["diff", "--cached", "--quiet"], {
    stdio: "ignore",
  });
  if (existingDiff.error) throw existingDiff.error;
  if (existingDiff.status === 1) {
    throw new Error("Refusing to deploy while unrelated changes are already staged.");
  }
  if (existingDiff.status !== 0) {
    throw new Error(
      `Unable to inspect staged changes (git exited ${existingDiff.status}).`,
    );
  }

  console.log(`Adding generated output from ${outputDir} to git...`);
  execFile("git", ["add", "--", outputDir], { stdio: "inherit" });

  const diffResult = spawnFile("git", ["diff", "--cached", "--quiet"], {
    stdio: "ignore",
  });
  if (diffResult.error) throw diffResult.error;
  if (diffResult.status === 0) {
    console.log("No generated output changes to deploy.");
    return false;
  }
  if (diffResult.status !== 1) {
    throw new Error(`Unable to inspect staged changes (git exited ${diffResult.status}).`);
  }

  console.log("Committing generated output...");
  execFile("git", ["commit", "-m", commitMessage], { stdio: "inherit" });

  console.log("Pushing to remote...");
  execFile("git", ["push"], { stdio: "inherit" });
  return true;
};

async function main() {
  const command = args[0];

  if (!command || ["--help", "-h", "help"].includes(command)) return printHelp();
  if (["--version", "-v"].includes(command)) {
    console.log(packageVersion);
    return;
  }

  switch (command) {
    case "new": {
      assertAllowedOptions(command, new Set());
      const sitename = args[1];
      if (!sitename || args.length !== 2) {
        throw new Error("Usage: swifty new <sitename>");
      }
      const init = await import("./init.js");
      await init.default(sitename);
      break;
    }
    case "build": {
      assertAllowedOptions(command, new Set(["--out", "--drafts"]));
      if (args.includes("--drafts")) process.env.SWIFTY_DRAFTS = "true";
      const build = await import("./build.js");
      if (typeof build.default === "function") {
        await build.default(outDir);
      }
      break;
    }
    case "check": {
      assertAllowedOptions(command, new Set());
      const check = await import("./check.js");
      const report = await check.default();
      if (!report.ok) process.exitCode = 1;
      break;
    }
    case "start": {
      assertAllowedOptions(command, new Set(["--out"]));
      // Set watch mode so livereload script is injected into pages
      process.env.SWIFTY_WATCH = "true";

      const build = await import("./build.js");
      if (typeof build.default === "function") {
        await build.default(outDir);
      }

      // Run watcher.js (non-blocking)
      const watcher = await import("./watcher.js");
      if (typeof watcher.default === "function") {
        watcher.default(outDir);
      }

      const server = await import("./server.js");
      await server.default(outDir);
      break;
    }
    case "watch": {
      assertAllowedOptions(command, new Set(["--out"]));
      const watch = await import("./watcher.js");
      if (typeof watch.default === "function") {
        await watch.default(outDir);
      }
      break;
    }
    case "deploy": {
      assertAllowedOptions(command, new Set(["--out"]));
      const commandArgs = args.slice(1).filter((arg, index, values) => {
        if (arg === "--out") return false;
        return index === 0 || values[index - 1] !== "--out";
      });
      const commitMessage = commandArgs[0] || "Deploying latest build";

      // Build the site
      const build = await import("./build.js");
      if (typeof build.default === "function") {
        await build.default(outDir);
      }

      // Git operations
      try {
        const deployed = commitAndPushOutput(outDir, commitMessage);
        if (deployed) console.log("Deployed successfully!");
      } catch (error) {
        console.error("Deploy failed:", error.message);
        process.exit(1);
      }
      break;
    }
    default: {
      throw new Error(
        `Unknown command "${command}". Use "swifty new <sitename>" to create a site or "swifty --help" for usage.`,
      );
    }
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])
) {
  main().catch((error) => {
    console.error(`Swifty failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export { commitAndPushOutput, main, printHelp };
