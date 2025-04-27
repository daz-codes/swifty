#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];
let outDir = 'dist'; // default

// Look for --out [folder]
const outIndex = args.indexOf('--out');
if (outIndex !== -1 && args[outIndex + 1]) {
  outDir = args[outIndex + 1];
}

// Pass outDir as an environment variable
process.env.OUT_DIR = outDir;

switch (command) {
  case "init":
    import('./init.js');
    break;
  case "build":
    import('./build.js');
    break;
  case "start":
    import('./build.js').then(async () => {
      const { execSync } = await import('child_process');
      execSync(`npx serve ${process.env.OUT_DIR}`, { stdio: 'inherit' });
    });
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log(`Usage: swifty [init|build|start] [--out folder]`);
}
