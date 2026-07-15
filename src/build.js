import fs from "fs";
import { argv } from "process";
import path from "path";
import { fileURLToPath } from "url";

import fsExtra from "fs-extra";

import { copyAssets, optimizeImages } from "./assets.js";
import { generatePages, createPages, addLinks } from "./pages.js";
import { generateRssFeeds } from "./rss.js";
import { generateSeoFiles } from "./sitemap.js";
import { generateSearchIndex } from "./search.js";
import { baseDir, dirs } from "./config.js";
import { clearDataCache } from "./data.js";
import { resetCaches } from "./layout.js";
import { clearCache as clearPartialCache } from "./partials.js";

const prepareOutputDirectory = async (outputDir) => {
  const projectPath = path.resolve(baseDir);
  const outputPath = path.resolve(baseDir, outputDir);
  const outputContainsProject =
    projectPath === outputPath || projectPath.startsWith(`${outputPath}${path.sep}`);
  const sourceDirectories = Object.entries(dirs)
    .filter(([name]) => name !== "dist")
    .map(([, directory]) => path.resolve(directory));
  const outputOverlapsSource = sourceDirectories.some(
    (directory) =>
      outputPath === directory || outputPath.startsWith(`${directory}${path.sep}`),
  );

  if (outputContainsProject || outputOverlapsSource) {
    throw new Error(`Refusing to empty unsafe output directory: ${outputPath}`);
  }

  await fsExtra.emptyDir(outputPath);
  return outputPath;
};

export default async function build(outputDir = dirs.dist) {
  const startTime = performance.now();
  console.log("🚀 Starting build...");
  const resolvedOutputDir = await prepareOutputDirectory(outputDir);
  clearDataCache();
  clearPartialCache();
  
  const copyStart = performance.now();
  await copyAssets(resolvedOutputDir);
  const copyTime = performance.now() - copyStart;
  console.log(`📁 Assets copied in ${(copyTime / 1000).toFixed(2)}s`);
  await resetCaches();
  
  const imageStart = performance.now();
  await optimizeImages(resolvedOutputDir);
  const imageTime = performance.now() - imageStart;
  console.log(`🖼️  Images optimized in ${(imageTime / 1000).toFixed(2)}s`);
  
  const pagesStart = performance.now();
  const pages = await generatePages(dirs.pages);
  const pagesTime = performance.now() - pagesStart;
  console.log(`📄 Pages generated in ${(pagesTime / 1000).toFixed(2)}s`);
  
  const linksStart = performance.now();
  await addLinks(pages);
  const linksTime = performance.now() - linksStart;
  console.log(`🔗 Links added in ${(linksTime / 1000).toFixed(2)}s`);
  
  const createStart = performance.now();
  await createPages(pages, resolvedOutputDir);
  const createTime = performance.now() - createStart;
  console.log(`✨ Pages created in ${(createTime / 1000).toFixed(2)}s`);

  const searchStart = performance.now();
  const searchIndex = await generateSearchIndex(pages, resolvedOutputDir);
  const searchTime = performance.now() - searchStart;
  console.log(
    searchIndex
      ? `🔎 Search index generated in ${(searchTime / 1000).toFixed(2)}s`
      : "🔎 Search index disabled",
  );
  
  const rssStart = performance.now();
  await generateRssFeeds(pages, resolvedOutputDir);
  const rssTime = performance.now() - rssStart;
  console.log(`📡 RSS feeds generated in ${(rssTime / 1000).toFixed(2)}s`);

  const seoStart = performance.now();
  await generateSeoFiles(pages, resolvedOutputDir);
  const seoTime = performance.now() - seoStart;
  console.log(`🧭 SEO files generated in ${(seoTime / 1000).toFixed(2)}s`);
  
  const totalTime = performance.now() - startTime;
  console.log(`\n✅ Build completed in ${(totalTime / 1000).toFixed(2)}s`);
  
  // Performance summary
  const stages = [
    { name: "Assets", time: copyTime },
    { name: "Images", time: imageTime },
    { name: "Pages", time: pagesTime },
    { name: "Links", time: linksTime },
    { name: "Create", time: createTime },
    { name: "Search", time: searchTime },
    { name: "RSS", time: rssTime },
    { name: "SEO", time: seoTime }
  ];
  
  const slowest = stages.sort((a, b) => b.time - a.time)[0];
  if (slowest.time > totalTime * 0.3) {
    console.log(`⚠️  Slowest stage: ${slowest.name} (${(slowest.time / 1000).toFixed(2)}s)`);
  }
  
  // Force output to appear
  if (process.stdout.isTTY) {
    process.stdout.write('\n');
  }
}

export { prepareOutputDirectory };

// Run the build when invoked directly (e.g. `npm run build`, `npm start`),
// not when imported as a module (e.g. by cli.js).
if (argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(argv[1])) {
  build().catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });
}
