import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import fsExtra from "fs-extra";
import sharp from "sharp";

import { dirs, defaultConfig } from "./config.js";
import { mapLimit } from "./concurrency.js";
import { minifyCss, minifyJs } from "./minify.js";
import {
  applyBasePathToCss,
  withBasePath,
  withoutBasePath,
} from "./urls.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientAssetsDir = path.join(__dirname, "client");

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
const responsiveImageMap = new Map();

const getBuildConcurrency = () => defaultConfig.build_concurrency || 16;
const navigationEnabled = () => defaultConfig.morphing !== false;
const minificationEnabled = (type) =>
  defaultConfig.minify !== false && defaultConfig[`minify_${type}`] !== false;
const normalizeImageUrl = (url) =>
  withoutBasePath((url || "").split(/[?#]/)[0]);

const getImageCacheDirectory = () => {
  const signature = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        image_quality: defaultConfig.image_quality || 80,
        max_image_width: defaultConfig.max_image_width || 800,
        responsive_image_widths:
          defaultConfig.responsive_image_widths || [320, 640, 800],
      }),
    )
    .digest("hex")
    .slice(0, 12);
  return path.join(dirs.cache, "images", signature);
};

const prepareImageCache = async () => {
  const cacheRoot = path.join(dirs.cache, "images");
  const cacheDirectory = getImageCacheDirectory();
  await fsExtra.ensureDir(cacheDirectory);

  const entries = await fs.readdir(cacheRoot, { withFileTypes: true });
  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          path.join(cacheRoot, entry.name) !== cacheDirectory,
      )
      .map((entry) => fsExtra.remove(path.join(cacheRoot, entry.name))),
  );

  return cacheDirectory;
};

const removeStaleCachedImages = async (cacheDirectory, expectedFiles) => {
  const files = await fs.readdir(cacheDirectory);
  await Promise.all(
    files
      .filter((file) => !expectedFiles.has(file))
      .map((file) => fsExtra.remove(path.join(cacheDirectory, file))),
  );
};

const getResponsiveWidths = (originalWidth) => {
  const maxWidth = defaultConfig.max_image_width || 800;
  const configuredWidths = Array.isArray(defaultConfig.responsive_image_widths)
    ? defaultConfig.responsive_image_widths
    : [320, 640, maxWidth];
  const outputWidth =
    originalWidth > 0 ? Math.min(originalWidth, maxWidth) : maxWidth;
  const widths = configuredWidths
    .map((width) => Number(width))
    .filter((width) => Number.isInteger(width) && width > 0)
    .map((width) => Math.min(width, maxWidth));

  widths.push(outputWidth);

  return [...new Set(widths)]
    .filter((width) => !originalWidth || width <= originalWidth)
    .sort((a, b) => a - b);
};

const variantFilename = (filename, ext, width, outputWidth) =>
  width === outputWidth
    ? `${path.basename(filename, ext)}.webp`
    : `${path.basename(filename, ext)}-${width}.webp`;

const registerResponsiveImage = (filename, ext, variants) => {
  const basename = path.basename(filename, ext);
  const entry = {
    src: withBasePath(`/images/${basename}.webp`),
    srcset: variants
      .map((variant) => `${variant.url} ${variant.width}w`)
      .join(", "),
    sizes: defaultConfig.responsive_image_sizes || "100vw",
    variants,
  };

  responsiveImageMap.set(normalizeImageUrl(withBasePath(`/images/${filename}`)), entry);
  responsiveImageMap.set(normalizeImageUrl(entry.src), entry);
};

const getResponsiveImage = (url) =>
  responsiveImageMap.get(normalizeImageUrl(url)) || null;

const getNavigationAssetName = async (filename = "swifty-navigation.js") => {
  const sourcePath = path.join(clientAssetsDir, filename);
  const content = await fs.readFile(sourcePath);
  const hash = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 10);
  const ext = path.extname(filename);
  return `${path.basename(filename, ext)}.${hash}${ext}`;
};

const getNavigationScriptSrc = async () => {
  if (!navigationEnabled()) return "";
  return withBasePath(`/swifty/${await getNavigationAssetName()}`);
};

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

const optimizeImageVariantToWebp = async (
  source,
  destination,
  cacheDestination,
  width,
) => {
  let optimized = false;

  if (!(await isDestinationFresh(source, cacheDestination))) {
    const imageQuality = defaultConfig.image_quality || 80;
    await fsExtra.ensureDir(path.dirname(cacheDestination));

    await sharp(source)
      .resize({ width })
      .toFormat("webp", { quality: imageQuality })
      .toFile(cacheDestination);
    optimized = true;
  }

  await copyIfStale(cacheDestination, destination);
  return optimized;
};

const optimizeImageToWebp = async (
  source,
  imagesFolder,
  cacheDirectory,
  filename,
  ext,
  expectedCacheFiles,
) => {
  const metadata = await sharp(source).metadata();
  const originalWidth = metadata.width || 0;
  const maxWidth = defaultConfig.max_image_width || 800;
  const outputWidth =
    originalWidth > 0 ? Math.min(originalWidth, maxWidth) : maxWidth;
  const variants = getResponsiveWidths(originalWidth).map((width) => {
    const file = variantFilename(filename, ext, width, outputWidth);
    expectedCacheFiles?.add(file);
    return {
      width,
      file,
      url: withBasePath(`/images/${file}`),
      destination: path.join(imagesFolder, file),
      cacheDestination: path.join(cacheDirectory, file),
    };
  });

  const results = await Promise.all(
    variants.map((variant) =>
      optimizeImageVariantToWebp(
        source,
        variant.destination,
        variant.cacheDestination,
        variant.width,
      ),
    ),
  );

  registerResponsiveImage(
    filename,
    ext,
    variants.map(({ width, file, url }) => ({ width, file, url })),
  );

  return results.some(Boolean);
};

const processTextAsset = async (source, destination, type) => {
  const content = await fs.readFile(source, "utf-8");
  let nextContent = content;

  try {
    if (type === "css" && minificationEnabled("css")) {
      nextContent = minifyCss(applyBasePathToCss(content));
    } else if (type === "js" && minificationEnabled("js")) {
      nextContent = await minifyJs(content);
    } else if (type === "css") {
      nextContent = applyBasePathToCss(content);
    }
  } catch (error) {
    throw new Error(`Unable to minify ${source}: ${error.message}`, {
      cause: error,
    });
  }

  try {
    const currentContent = await fs.readFile(destination, "utf-8");
    if (
      currentContent === nextContent &&
      (await isDestinationFresh(source, destination))
    ) {
      return false;
    }
  } catch (err) {}

  await fsExtra.ensureDir(path.dirname(destination));
  await fs.writeFile(destination, nextContent);
  return true;
};

const ensureAndCopy = async (source, destination, validExts) => {
  if (await fsExtra.pathExists(source)) {
    await fsExtra.ensureDir(destination);

    const files = await fs.readdir(source);
    await Promise.all(
      files
        .filter((file) => validExts.includes(path.extname(file).toLowerCase()))
        .map((file) => {
          const ext = path.extname(file).toLowerCase();
          const type = validExtensions.css.includes(ext) ? "css" : "js";
          return processTextAsset(
            path.join(source, file),
            path.join(destination, file),
            type,
          );
        }),
    );
    console.log(`Copied valid files from ${source} to ${destination}`);
  } else {
    console.log(`No ${path.basename(source)} found in ${source}`);
  }
};

const copyNavigationAssets = async (outputDir = dirs.dist) => {
  if (!navigationEnabled()) return;
  if (!(await fsExtra.pathExists(clientAssetsDir))) return;

  const destination = path.join(outputDir, "swifty");
  await fsExtra.ensureDir(destination);

  const files = await fs.readdir(clientAssetsDir);
  await mapLimit(
    files,
    async (file) => {
      const sourcePath = path.join(clientAssetsDir, file);
      const destinationFilename =
        file === "swifty-navigation.js"
          ? await getNavigationAssetName(file)
          : file;
      const destinationPath = path.join(destination, destinationFilename);
      const copied = await copyIfStale(sourcePath, destinationPath);
      if (copied) {
        console.log(`Copied Swifty navigation asset ${destinationFilename}`);
      }
    },
    getBuildConcurrency(),
  );
};

const copyAssets = async (outputDir = dirs.dist) => {
  if (await fsExtra.pathExists(dirs.public)) {
    await fsExtra.copy(dirs.public, outputDir, { overwrite: true });
  }
  await ensureAndCopy(
    dirs.css,
    path.join(outputDir, "css"),
    validExtensions.css,
  );
  await ensureAndCopy(dirs.js, path.join(outputDir, "js"), validExtensions.js);
  await copyNavigationAssets(outputDir);
};
async function optimizeImages(outputDir = dirs.dist) {
  responsiveImageMap.clear();

  try {
    if (!(await fsExtra.pathExists(dirs.images))) {
      await fsExtra.remove(path.join(dirs.cache, "images"));
      console.log(`No ${path.basename(dirs.images)} found in ${dirs.images}`);
      return;
    }

    const imagesFolder = path.join(outputDir, "images");
    const cacheDirectory = await prepareImageCache();
    const expectedCacheFiles = new Set();
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

        const optimized = await optimizeImageToWebp(
          filePath,
          imagesFolder,
          cacheDirectory,
          file,
          ext,
          expectedCacheFiles,
        );
        if (optimized) {
          console.log(`Optimized ${file}`);
        }
      },
      getBuildConcurrency(),
    );
    await removeStaleCachedImages(cacheDirectory, expectedCacheFiles);
  } catch (error) {
    throw new Error(`Unable to optimize images: ${error.message}`, {
      cause: error,
    });
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
    (file, mtime) => `<link rel="stylesheet" href="${withBasePath(`/css/${file}`)}?v=${mtime}" />`,
    validExtensions.css,
  );
const getJsImports = () =>
  generateAssetImports(
    dirs.js,
    (file, mtime) => `<script src="${withBasePath(`/js/${file}`)}?v=${mtime}"></script>`,
    validExtensions.js,
  );
const getCssPreloads = () =>
  generateAssetImports(
    dirs.css,
    (file, mtime) => `<link rel="preload" href="${withBasePath(`/css/${file}`)}?v=${mtime}" as="style" />`,
    validExtensions.css,
  );
const getJsPreloads = () =>
  generateAssetImports(
    dirs.js,
    (file, mtime) => `<link rel="preload" href="${withBasePath(`/js/${file}`)}?v=${mtime}" as="script" />`,
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

  await processTextAsset(
    filePath,
    path.join(destDir, filename),
    validExtensions.css.includes(ext) ? "css" : "js",
  );
  console.log(`Copied ${filename}`);
  return true;
};

// Process a single image
const optimizeSingleImage = async (filePath, outputDir = dirs.dist) => {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const imagesFolder = path.join(outputDir, "images");
  const cacheDirectory = await prepareImageCache();

  await fsExtra.ensureDir(imagesFolder);

  // For non-optimizable images (svg, webp, gif), just copy
  if (!optimizableImageExtensions.includes(ext)) {
    const copied = await copyIfStale(filePath, path.join(imagesFolder, filename));
    if (copied) {
      console.log(`Copied ${filename}`);
    }
    return true;
  }

  const optimized = await optimizeImageToWebp(
    filePath,
    imagesFolder,
    cacheDirectory,
    filename,
    ext,
  );
  if (optimized) {
    console.log(`Optimized ${filename}`);
  }
  return true;
};

export {
  copyAssets,
  optimizeImages,
  getCssImports,
  getJsImports,
  getCssPreloads,
  getJsPreloads,
  copySingleAsset,
  optimizeSingleImage,
  getNavigationScriptSrc,
  getResponsiveImage,
  getImageCacheDirectory,
};
