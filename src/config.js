import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isInstalled = process.cwd() !== __dirname;
const baseDir = isInstalled ? process.cwd() : __dirname;

const dirs = {
  pages: path.join(baseDir, "pages"),
  images: path.join(baseDir, "images"),
  dist: path.join(baseDir, "dist"),
  layouts: path.join(baseDir, "layouts"),
  css: path.join(baseDir, "css"),
  js: path.join(baseDir, "js"),
  partials: path.join(baseDir, "partials"),
  data: path.join(baseDir, "data"),
};

async function loadConfig(dir) {
  const configFiles = ['config.yaml', 'config.yml', 'config.json'];
  for (const file of configFiles) {
    const filePath = path.join(dir, file);
    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      return file.endsWith('.json') ? JSON.parse(content) : yaml.load(content);
    } catch {}
  }
  return {};
}

// Hardcoded defaults (used if not specified in config file)
const builtInDefaults = {
  default_layout_name: 'default',
  // Reading time calculation
  words_per_minute: 200,
  // Image optimization settings
  max_image_width: 800,
  image_quality: 80,
  // LiveReload and watcher settings
  livereload_port: 35729,
  watcher_delay: 100,
  watcher_interval: 500,
  // Pagination
  default_page_count: 2,
};

const loadedConfig = await loadConfig(baseDir);
const defaultConfig = { ...builtInDefaults, ...loadedConfig };

export { baseDir, dirs, defaultConfig, loadConfig };