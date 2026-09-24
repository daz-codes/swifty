import path from "path";

import { getChangeType } from "./watch-files.js";

const createRebuildHandler = ({
  build,
  rebuildPage,
  optimizeSingleImage,
  reloadConfig,
  outputDir,
  cwd = process.cwd(),
  refresh,
  logger = console,
}) => {
  let needsFullBuild = false;
  const fullBuild = async () => {
    await reloadConfig();
    await build(outputDir);
  };

  return async (changes) => {
    const start = performance.now();
    const { event, filePath } = changes[0];
    const type = getChangeType(filePath, cwd);
    try {
      if (needsFullBuild || changes.length > 1 || event !== "change" || type === "full") {
        logger.log(`📝 ${changes.length} source change(s). Running full build...`);
        await fullBuild();
      } else if (type === "image") {
        logger.log(`🖼️ Image changed: ${path.basename(filePath)}`);
        await optimizeSingleImage(filePath, outputDir);
      } else {
        const result = await rebuildPage(filePath, outputDir);
        if (!result.rebuilt) {
          logger.log(`📝 Page changed: ${path.basename(filePath)}. Running full build (${result.reason})...`);
          await fullBuild();
        }
      }
      needsFullBuild = false;
      refresh("/");
      logger.log(`   Rebuild completed in ${((performance.now() - start) / 1000).toFixed(2)}s`);
    } catch (error) {
      // A failed build may have cleared output or changed shared caches. The
      // next batch must restore the whole site before resuming incremental work.
      needsFullBuild = true;
      throw error;
    }
  };
};

export { createRebuildHandler };
