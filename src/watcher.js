import chokidar from "chokidar";
import { exec } from "child_process";
import path from "path";

// Define files to watch, resolving relative to the current working directory
const filesToWatch = [
  "pages/**/*.{md,html}",
  "layouts/**/*.html",
  "images/**/*",
  "css/**/*.css",
  "js/**/*.js",
  "partials/**/*.{md,html}",
  "template.html",
  "config.yaml",
  "config.yml",
  "config.json",
].map((pattern) => path.join(process.cwd(), pattern));

const buildScript = "npm run build";

// Initialize watcher
const watcher = chokidar.watch(filesToWatch, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
});

// Rebuild function
function triggerBuild(event, filePath) {
  console.log(`File ${event}: ${filePath}. Running build...`);
  exec(buildScript, (error, stdout, stderr) => {
    if (error) {
      console.error(`Build failed: ${error.message}`);
      return;
    }
    if (stderr) console.error(`stderr: ${stderr}`);
    if (stdout) console.log(stdout);
  });
}

// Set up event listeners
watcher
  .on("change", (filePath) => triggerBuild("changed", filePath))
  .on("add", (filePath) => triggerBuild("added", filePath))
  .on("unlink", (filePath) => triggerBuild("deleted", filePath));

console.log("Watching for file changes...");
