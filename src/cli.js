#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];
let outDir = "dist"; // default

// Look for --out [folder]
const outIndex = args.indexOf("--out");
if (outIndex !== -1 && args[outIndex + 1]) {
  outDir = args[outIndex + 1];
}

// Pass outDir as an environment variable too (optional, still useful)
process.env.OUT_DIR = outDir;

async function main() {
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
      const { execSync } = await import("child_process");
      execSync(`npx serve ${outDir}`, { stdio: "inherit" });
      break;
    }
    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Usage: swifty [init|build|start] [--out folder]`);
  }
}

main();
