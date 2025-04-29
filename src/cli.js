#!/usr/bin/env node

import { spawn } from "child_process";

const args = process.argv.slice(2);
let outDir = "dist"; // default

// Look for --out [folder]
const outIndex = args.indexOf("--out");
if (outIndex !== -1 && args[outIndex + 1]) {
  outDir = args[outIndex + 1];
}

// Pass outDir as an environment variable too (optional, still useful)
process.env.OUT_DIR = outDir;

async function main() {
  const command = args[0];

  switch (command) {
    case "init":
      await import("./init.js");
      break;
    case "build": {
      const build = await import("./build.js");
      if (typeof build.default === "function") {
        await build.default(outDir);
      }
      break;
    }
    case "start": {
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
    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Usage: swifty [init|build|start|watch] [--out folder]`);
  }
}

main();
