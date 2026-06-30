import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import sharp from "sharp";
import { dirs, defaultConfig } from "./config.js";
import { mapLimit } from "./concurrency.js";

// Get file modification timestamp for cache busting
const getFileMtime = async (filePath) => {
  const stats = await fs.stat(filePath);
  return Math.floor(stats.mtimeMs);
};

const validExtensions = {
  css: [".css"],
  js: [".js"],
  images: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"],
};

const optimizableImageExtensions = [".jpg", ".jpeg", ".png"];

const getBuildConcurrency = () => defaultConfig.build_concurrency || 16;

const isDestinationFresh = async (source, destination) => {
  try {
    const [sourceStats, destinationStats] = await Promise.all([
      fs.stat(source),
      fs.stat(destination),
    ]);
    return destinationStats.mtimeMs >= sourceStats.mtimeMs;
  } catch (err) {
    return false;
  }
};

const copyIfStale = async (source, destination) => {
  if (await isDestinationFresh(source, destination)) {
    return false;
  }

  await fsExtra.copy(source, destination);
  return true;
};

const optimizeImageToWebp = async (source, destination) => {
  if (await isDestinationFresh(source, destination)) {
    return false;
  }

  const image = sharp(source);
  const metadata = await image.metadata();
  const originalWidth = metadata.width || 0;
  const maxWidth = defaultConfig.max_image_width || 800;
  const imageQuality = defaultConfig.image_quality || 80;
  const resizeOptions =
    originalWidth > 0 ? { width: Math.min(originalWidth, maxWidth) } : {};

  await image
    .resize(resizeOptions)
    .toFormat("webp", { quality: imageQuality })
    .toFile(destination);

  return true;
};

const ensureAndCopy = async (source, destination, validExts) => {
  if (await fsExtra.pathExists(source)) {
    await fsExtra.ensureDir(destination);

    const files = await fs.readdir(source);
    await Promise.all(
      files
        .filter((file) => validExts.includes(path.extname(file).toLowerCase()))
        .map((file) =>
          fsExtra.copy(path.join(source, file), path.join(destination, file)),
        ),
    );
    console.log(`Copied valid files from ${source} to ${destination}`);
  } else {
    console.log(`No ${path.basename(source)} found in ${source}`);
  }
};
const copyAssets = async (outputDir = dirs.dist) => {
  await ensureAndCopy(
    dirs.css,
    path.join(outputDir, "css"),
    validExtensions.css,
  );
  await ensureAndCopy(dirs.js, path.join(outputDir, "js"), validExtensions.js);
};
async function optimizeImages(outputDir = dirs.dist) {
  try {
    if (!(await fsExtra.pathExists(dirs.images))) {
      console.log(`No ${path.basename(dirs.images)} found in ${dirs.images}`);
      return;
    }

    const imagesFolder = path.join(outputDir, "images");
    await fsExtra.ensureDir(imagesFolder);

    const files = await fs.readdir(dirs.images);

    await mapLimit(
      files.filter((file) =>
        validExtensions.images.includes(path.extname(file).toLowerCase()),
      ),
      async (file) => {
        const filePath = path.join(dirs.images, file);
        const ext = path.extname(file).toLowerCase();

        if (!optimizableImageExtensions.includes(ext)) {
          const destination = path.join(imagesFolder, file);
          const copied = await copyIfStale(filePath, destination);
          if (copied) {
            console.log(`Copied ${file}`);
          }
          return;
        }

        const optimizedPath = path.join(
          imagesFolder,
          `${path.basename(file, ext)}.webp`,
        );

        const optimized = await optimizeImageToWebp(filePath, optimizedPath);
        if (optimized) {
          console.log(`Optimized ${file} -> ${optimizedPath}`);
        }
      },
      getBuildConcurrency(),
    );
  } catch (error) {
    console.error("Error optimizing images:", error);
  }
}
const generateAssetImports = async (dir, tagTemplate, validExts) => {
  if (!(await fsExtra.pathExists(dir))) return "";
  const files = await fs.readdir(dir);
  const validFiles = files
    .filter((file) => validExts.includes(path.extname(file).toLowerCase()))
    .sort();

  const imports = await Promise.all(
    validFiles.map(async (file) => {
      const mtime = await getFileMtime(path.join(dir, file));
      return tagTemplate(file, mtime);
    })
  );
  return imports.join("\n");
};
const getCssImports = () =>
  generateAssetImports(
    dirs.css,
    (file, mtime) => `<link rel="stylesheet" href="/css/${file}?v=${mtime}" />`,
    validExtensions.css,
  );
const getJsImports = () =>
  generateAssetImports(
    dirs.js,
    (file, mtime) => `<script src="/js/${file}?v=${mtime}"></script>`,
    validExtensions.js,
  );
const getCssPreloads = () =>
  generateAssetImports(
    dirs.css,
    (file, mtime) => `<link rel="preload" href="/css/${file}?v=${mtime}" as="style" />`,
    validExtensions.css,
  );
const getJsPreloads = () =>
  generateAssetImports(
    dirs.js,
    (file, mtime) => `<link rel="preload" href="/js/${file}?v=${mtime}" as="script" />`,
    validExtensions.js,
  );

// Copy a single asset file (CSS or JS)
const copySingleAsset = async (filePath, outputDir = dirs.dist) => {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let destDir;
  if (validExtensions.css.includes(ext)) {
    destDir = path.join(outputDir, "css");
  } else if (validExtensions.js.includes(ext)) {
    destDir = path.join(outputDir, "js");
  } else {
    return false;
  }

  await fsExtra.ensureDir(destDir);
  await fsExtra.copy(filePath, path.join(destDir, filename));
  console.log(`Copied ${filename}`);
  return true;
};

// Process a single image
const optimizeSingleImage = async (filePath, outputDir = dirs.dist) => {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const imagesFolder = path.join(outputDir, "images");

  await fsExtra.ensureDir(imagesFolder);

  // For non-optimizable images (svg, webp, gif), just copy
  if (!optimizableImageExtensions.includes(ext)) {
    const copied = await copyIfStale(filePath, path.join(imagesFolder, filename));
    if (copied) {
      console.log(`Copied ${filename}`);
    }
    return true;
  }

  // Optimize jpg/jpeg/png to webp
  const optimizedPath = path.join(imagesFolder, `${path.basename(filename, ext)}.webp`);
  const optimized = await optimizeImageToWebp(filePath, optimizedPath);
  if (optimized) {
    console.log(`Optimized ${filename} -> ${path.basename(optimizedPath)}`);
  }
  return true;
};

export { copyAssets, optimizeImages, getCssImports, getJsImports, getCssPreloads, getJsPreloads, copySingleAsset, optimizeSingleImage };
