#!/usr/bin/env node

const args = process.argv.slice(2);

switch (args[0]) {
  case "init":
    import('./init.js');
    break;
  case "build":
    import('./swifty.js');
    break;
  case "start":
    // Optional: call build, then run a dev server
    import('./swifty.js').then(async () => {
      const { execSync } = await import('child_process');
      execSync('npx serve dist', { stdio: 'inherit' });
    });
    break;
  default:
    console.log(`Unknown command: ${args[0]}`);
    console.log(`Usage: swifty [init|build|start]`);
}
