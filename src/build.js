import { copyAssets, optimizeImages } from "./assets.js";
import { generatePages, createPages, addLinks } from "./pages.js";
import { generateRssFeeds } from "./rss.js";
import { generateSeoFiles } from "./sitemap.js";
import { dirs } from "./config.js";

export default async function build(outputDir = dirs.dist) {
  const startTime = performance.now();
  console.log("🚀 Starting build...");
  
  const copyStart = performance.now();
  await copyAssets(outputDir);
  const copyTime = performance.now() - copyStart;
  console.log(`📁 Assets copied in ${(copyTime / 1000).toFixed(2)}s`);
  
  const imageStart = performance.now();
  await optimizeImages(outputDir);
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
  await createPages(pages, outputDir);
  const createTime = performance.now() - createStart;
  console.log(`✨ Pages created in ${(createTime / 1000).toFixed(2)}s`);
  
  const rssStart = performance.now();
  await generateRssFeeds(pages, outputDir);
  const rssTime = performance.now() - rssStart;
  console.log(`📡 RSS feeds generated in ${(rssTime / 1000).toFixed(2)}s`);

  const seoStart = performance.now();
  await generateSeoFiles(pages, outputDir);
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
