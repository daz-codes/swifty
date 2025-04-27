import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import sharp from "sharp";
import { dirs, defaultConfig } from "./config.js";

const validExtensions = {
    css: [".css"],
    js: [".js"],
    images: [".png", ".jpg", ".jpeg", ".gif", ".svg"," .webp"],
  };

const ensureAndCopy = async (source, destination, validExts) => {
  if (await fsExtra.pathExists(source)) {
    await fsExtra.ensureDir(destination);

    const files = await fs.readdir(source);
    await Promise.all(
      files
        .filter(file => validExts.includes(path.extname(file).toLowerCase()))
        .map(file => fsExtra.copy(path.join(source, file), path.join(destination, file)))
    );
    console.log(`Copied valid files from ${source} to ${destination}`);
  } else {
    console.log(`No ${path.basename(source)} found in ${source}`);
  }
};
const copyAssets = async () => {
  await ensureAndCopy(dirs.css, path.join(dirs.dist, 'css'), validExtensions.css);
  await ensureAndCopy(dirs.js, path.join(dirs.dist, 'js'), validExtensions.js);
  await ensureAndCopy(dirs.images, path.join(dirs.dist, 'images'), validExtensions.images);
};
async function optimizeImages() {
  try {
    const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
    const images_folder = path.join(dirs.dist, "images");
    const files = await fs.readdir(images_folder);
    
    await Promise.all(files.map(async (file) => {
      const filePath = path.join(images_folder, file);
      const ext = path.extname(file).toLowerCase();
    
      if (!IMAGE_EXTENSIONS.includes(ext)) return;
    
      const optimizedPath = path.join(images_folder, `${path.basename(file, ext)}.webp`);
    
      if (filePath !== optimizedPath) {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        const originalWidth = metadata.width || 0;
        const maxWidth = defaultConfig.max_image_size || 800;
        const resizeWidth = Math.min(originalWidth, maxWidth);
    
        await image
          .resize({ width: resizeWidth })
          .toFormat('webp', { quality: 80 })
          .toFile(optimizedPath);
    
        await fs.unlink(filePath);
    
        console.log(`Optimized ${file} -> ${optimizedPath}`);
      }
    }));
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
};
const generateAssetImports = async (dir, tagTemplate, validExts) => {
  if (!(await fsExtra.pathExists(dir))) return '';
  const files = await fs.readdir(dir);
  return files
    .filter(file => validExts.includes(path.extname(file).toLowerCase()))
    .sort() 
    .map(file => tagTemplate(file))
    .join('\n');
};
const getCssImports = () => generateAssetImports(dirs.css, (file) => `<link rel="stylesheet" href="/css/${file}" />`, validExtensions.css);
const getJsImports = () => generateAssetImports(dirs.js, (file) => `<script src="/js/${file}"></script>`, validExtensions.js);

export { copyAssets, optimizeImages, getCssImports, getJsImports };