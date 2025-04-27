import { copyAssets, optimizeImages } from "./assets.js";
import { generatePages, createPages, addLinks } from "./pages.js";
import { dirs } from "./config.js";

async function buildSite() {
  await copyAssets();
  await optimizeImages();
  const pages = await generatePages(dirs.pages);
  console.log(pages.length)
  await addLinks(pages);
  await createPages(pages);
}

buildSite();