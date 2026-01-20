import { copyAssets, optimizeImages } from "./assets.js";
import { generatePages, createPages, addLinks } from "./pages.js";
import { generateRssFeeds } from "./rss.js";
import { dirs } from "./config.js";

export default async function build(outputDir) {
  await copyAssets(outputDir);
  await optimizeImages(outputDir);
  const pages = await generatePages(dirs.pages);
  await addLinks(pages);
  await createPages(pages, outputDir);
  await generateRssFeeds(pages, outputDir);
}
