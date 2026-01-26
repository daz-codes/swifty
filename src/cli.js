#!/usr/bin/env node

import { spawn, execSync } from "child_process";

const args = process.argv.slice(2);
let outDir = "dist"; // default

// Look for --out [folder]
const outIndex = args.indexOf("--out");
if (outIndex !== -1 && args[outIndex + 1]) {
  outDir = args[outIndex + 1];
}

// Pass outDir as an environment variable too (optional, still useful)
process.env.OUT_DIR = outDir;

const reservedCommands = ["build", "start", "watch", "deploy"];

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

      // Start the server (blocking)
      spawn("npx", ["serve", outDir], { stdio: "inherit" });
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
      const commitMessage = args[1] || "Deploying latest build";

      // Build the site
      const build = await import("./build.js");
      if (typeof build.default === "function") {
        await build.default(outDir);
      }

      // Git operations
      try {
        console.log("Adding files to git...");
        execSync("git add .", { stdio: "inherit" });

        console.log("Committing changes...");
        execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
          stdio: "inherit",
        });

        console.log("Pushing to remote...");
        execSync("git push", { stdio: "inherit" });

        console.log("Deployed successfully!");
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

main();
