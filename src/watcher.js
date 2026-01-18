import chokidar from "chokidar";
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

export default async function watch(outDir = "dist") {
  const build = await import("./build.js");

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
  async function triggerBuild(event, filePath) {
    console.log(`File ${event}: ${filePath}. Running build...`);
    try {
      await build.default(outDir);
      console.log("Build complete.");
    } catch (error) {
      console.error(`Build failed: ${error.message}`);
    }
  }

  // Set up event listeners
  watcher
    .on("change", (filePath) => triggerBuild("changed", filePath))
    .on("add", (filePath) => triggerBuild("added", filePath))
    .on("unlink", (filePath) => triggerBuild("deleted", filePath));

  console.log("Watching for file changes...");
}
