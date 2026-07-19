import chokidar from "chokidar";
import livereload from "livereload";
import path from "path";
import fs from "fs";
import { defaultConfig, reloadConfig } from "./config.js";

// Directory to extension mapping for filtering
const dirExtensions = {
  pages: [".md", ".html"],
  layouts: [".html"],
  images: null, // null means all files
  css: [".css"],
  js: [".js"],
  partials: [".md", ".html"],
  data: [".json", ".yaml", ".yml"],
  public: null,
};

// Build watch paths
function getWatchPaths() {
  const cwd = process.cwd();
  const watchPaths = [];

  // Add directories that exist
  for (const dir of Object.keys(dirExtensions)) {
    const dirPath = path.join(cwd, dir);
    if (fs.existsSync(dirPath)) {
      watchPaths.push(dirPath);
    }
  }

  // Add specific config files that exist
  const configFiles = ["template.html", "config.yaml", "config.yml", "config.json"];
  for (const file of configFiles) {
    const filePath = path.join(cwd, file);
    if (fs.existsSync(filePath)) {
      watchPaths.push(filePath);
    }
  }

  return watchPaths;
}

// Check if a file should trigger a rebuild
function shouldTriggerBuild(filePath) {
  const cwd = process.cwd();
  const relativePath = path.relative(cwd, filePath);
  const parts = relativePath.split(path.sep);
  const topDir = parts[0];

  // Config files at root level
  if (parts.length === 1) {
    return true;
  }

  // Check against directory extension mapping
  if (dirExtensions[topDir] !== undefined) {
    const allowedExts = dirExtensions[topDir];
    // null means all files allowed
    if (allowedExts === null) {
      return true;
    }
    const ext = path.extname(filePath).toLowerCase();
    return allowedExts.includes(ext);
  }

  return false;
}

// Determine what type of change this is
function getChangeType(filePath) {
  const cwd = process.cwd();
  const relativePath = path.relative(cwd, filePath);
  const parts = relativePath.split(path.sep);
  const topDir = parts[0];

  if (topDir === "css") return "css";
  if (topDir === "js") return "js";
  if (topDir === "images") return "image";
  if (topDir === "data") return "data";
  if (topDir === "pages" && path.extname(filePath).toLowerCase() === ".md") {
    return "page";
  }
  return "full"; // pages, layouts, partials, config files
}

const isRootConfigFile = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  return (
    !relativePath.includes(path.sep) &&
    ["config.yaml", "config.yml", "config.json"].includes(relativePath)
  );
};

const createLiveReloadOptions = (config = defaultConfig) => ({
  port: config.livereload_port || 35729,
  usePolling: config.watcher_use_polling === true,
  delay: config.watcher_delay || 100,
});

const createWatcherOptions = (config = defaultConfig) => {
  const usePolling = config.watcher_use_polling === true;
  const watcherDelay = config.watcher_delay || 100;
  return {
    persistent: true,
    ignoreInitial: true,
    usePolling,
    ...(usePolling ? { interval: config.watcher_interval || 500 } : {}),
    awaitWriteFinish: {
      stabilityThreshold: watcherDelay * 2,
      pollInterval: watcherDelay,
    },
  };
};

export default async function watch(outDir = "dist") {
  const build = await import("./build.js");
  const { copySingleAsset, optimizeSingleImage } = await import("./assets.js");
  const { resetCaches } = await import("./layout.js");
  const { clearCache: clearPartialCache } = await import("./partials.js");
  const { clearDataCache } = await import("./data.js");
  const watchPaths = getWatchPaths();

  if (watchPaths.length === 0) {
    console.log("No directories or files to watch.");
    return;
  }

  // Start livereload server
  const livereloadPort = defaultConfig.livereload_port || 35729;
  const lrServer = livereload.createServer(createLiveReloadOptions());
  const outPath = path.join(process.cwd(), outDir);
  lrServer.watch(outPath);
  console.log(`LiveReload server started on port ${livereloadPort}`);

  // Native filesystem events are the default. Poll only when explicitly enabled
  // for cloud folders, network mounts, containers, and similar filesystems.
  const watcher = chokidar.watch(watchPaths, createWatcherOptions());

  // Handle file changes with incremental builds where possible
  async function handleFileChange(event, filePath) {
    if (!shouldTriggerBuild(filePath)) {
      return;
    }

    const changeType = getChangeType(filePath);
    const filename = path.basename(filePath);

    try {
      if (isRootConfigFile(filePath)) {
        await reloadConfig();
      }

      if (event === "deleted") {
        // For deletions, do a full rebuild to clean up
        console.log(`🗑️  File deleted: ${filename}. Running full build...`);
        const rebuildStart = performance.now();
        clearPartialCache();
        await resetCaches();
        await build.default(outDir);
        const rebuildTime = performance.now() - rebuildStart;
        console.log(`   Rebuild completed in ${(rebuildTime / 1000).toFixed(2)}s`);
      } else if (changeType === "css" || changeType === "js") {
        // Full rebuild for CSS/JS to update cache-busting query strings in HTML
        console.log(`🎨 Asset ${event}: ${filename}. Rebuilding...`);
        const rebuildStart = performance.now();
        await resetCaches();
        await build.default(outDir);
        const rebuildTime = performance.now() - rebuildStart;
        console.log(`   Rebuild completed in ${(rebuildTime / 1000).toFixed(2)}s`);
      } else if (changeType === "image") {
        // Incremental: just process the changed image
        const imageStart = performance.now();
        console.log(`🖼️  Image ${event}: ${filename}`);
        await optimizeSingleImage(filePath, outDir);
        const imageTime = performance.now() - imageStart;
        console.log(`   Optimized in ${(imageTime / 1000).toFixed(2)}s`);
      } else if (changeType === "data") {
        // Data file changed - clear data cache and rebuild
        console.log(`📊 Data ${event}: ${filename}. Rebuilding...`);
        const rebuildStart = performance.now();
        clearDataCache();
        await build.default(outDir);
        const rebuildTime = performance.now() - rebuildStart;
        console.log(`   Rebuild completed in ${(rebuildTime / 1000).toFixed(2)}s`);
      } else if (changeType === "page" && event === "changed") {
        const rebuildStart = performance.now();
        const result = await build.rebuildPage(filePath, outDir);
        if (result.rebuilt) {
          const rebuildTime = performance.now() - rebuildStart;
          console.log(
            `⚡ Page changed: ${filename}. Incremental rebuild completed in ${(rebuildTime / 1000).toFixed(2)}s`,
          );
        } else {
          console.log(
            `📝 Page changed: ${filename}. Running full build (${result.reason})...`,
          );
          clearPartialCache();
          await resetCaches();
          await build.default(outDir);
          const rebuildTime = performance.now() - rebuildStart;
          console.log(`   Rebuild completed in ${(rebuildTime / 1000).toFixed(2)}s`);
        }
      } else {
        // Full rebuild for pages, layouts, partials, config, and new CSS/JS files
        console.log(`📝 File ${event}: ${filename}. Running full build...`);
        const rebuildStart = performance.now();
        clearPartialCache();
        await resetCaches();
        await build.default(outDir);
        const rebuildTime = performance.now() - rebuildStart;
        console.log(`   Rebuild completed in ${(rebuildTime / 1000).toFixed(2)}s`);
      }
      // Trigger browser refresh
      lrServer.refresh("/");
    } catch (error) {
      console.error(`Build failed: ${error.message}`);
    }
  }

  // Set up event listeners
  watcher
    .on("change", (filePath) => handleFileChange("changed", filePath))
    .on("add", (filePath) => handleFileChange("added", filePath))
    .on("unlink", (filePath) => handleFileChange("deleted", filePath))
    .on("error", (error) => console.error("Watcher error:", error));

  console.log("Watching for file changes...");
}

export { createLiveReloadOptions, createWatcherOptions };
