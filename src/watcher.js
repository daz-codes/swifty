import livereload from "livereload";

import { defaultConfig, reloadConfig } from "./config.js";
import { createSourceWatcher } from "./watch-files.js";
import { createBuildQueue } from "./watch-queue.js";
import { createRebuildHandler } from "./watch-rebuild.js";

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
  const { optimizeSingleImage } = await import("./assets.js");

  const lrServer = livereload.createServer(createLiveReloadOptions());
  console.log(`LiveReload server started on port ${defaultConfig.livereload_port || 35729}`);

  // Refresh explicitly after a successful batch; watching output would refresh
  // the browser while pages are still being written.
  const runBatch = createRebuildHandler({
    build: build.default,
    rebuildPage: build.rebuildPage,
    optimizeSingleImage,
    reloadConfig,
    outputDir: outDir,
    refresh: (filePath) => lrServer.refresh(filePath),
  });
  const queue = createBuildQueue(runBatch, {
    delay: defaultConfig.watcher_delay || 100,
    onError: (error) => console.error(`Build failed: ${error.message}`),
  });
  const watcher = createSourceWatcher({
    outputDir: outDir,
    options: createWatcherOptions(),
    onChange: (change) => queue.enqueue(change),
  });
  watcher.on("error", (error) => console.error("Watcher error:", error));
  watcher.once("ready", () => console.log("Watching for file changes..."));

  return {
    watcher,
    queue,
    async close() {
      await watcher.close();
      await queue.close();
      lrServer.close();
    },
  };
}

export { createLiveReloadOptions, createWatcherOptions };
