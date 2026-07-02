#!/usr/bin/env node

import { execFileSync, spawnSync } from "child_process";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
let outDir = "dist"; // default

// Look for --out [folder]
const outIndex = args.indexOf("--out");
if (outIndex !== -1 && args[outIndex + 1]) {
  outDir = args[outIndex + 1];
}

// Pass outDir as an environment variable too (optional, still useful)
process.env.OUT_DIR = outDir;

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

  // No arguments - show usage
  if (!command) {
    console.log(`Usage:`);
    console.log(`  swifty <sitename>              Create a new site in <sitename> folder`);
    console.log(`  swifty build [--out folder]    Build the site`);
    console.log(`  swifty start [--out folder]    Build and serve with live reload`);
    console.log(`  swifty deploy ["message"]      Build, commit, and push to git`);
    return;
  }

  switch (command) {
    case "build": {
      const build = await import("./build.js");
      if (typeof build.default === "function") {
        await build.default(outDir);
      }
      break;
    }
    case "start": {
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
      const watch = await import("./watcher.js");
      if (typeof watch.default === "function") {
        await watch.default(outDir);
      }
      break;
    }
    case "deploy": {
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
      // Treat as sitename for new project creation
      const sitename = command;
      const init = await import("./init.js");
      if (typeof init.default === "function") {
        await init.default(sitename);
      }
      break;
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`Swifty failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export { commitAndPushOutput, main };
