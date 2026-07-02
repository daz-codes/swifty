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
  public: path.join(baseDir, "public"),
  cache: path.join(baseDir, ".swifty-cache"),
};

async function loadConfig(dir) {
  const configFiles = ['config.yaml', 'config.yml', 'config.json'];
  for (const file of configFiles) {
    const filePath = path.join(dir, file);
    let content;

    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw new Error(`Unable to read config ${filePath}: ${error.message}`, {
        cause: error,
      });
    }

    try {
      const config = file.endsWith('.json') ? JSON.parse(content) : yaml.load(content);
      return validateConfig(config || {}, filePath);
    } catch (error) {
      throw new Error(`Unable to parse config ${filePath}: ${error.message}`, {
        cause: error,
      });
    }
  }
  return {};
}

const validateConfig = (config, filePath = "config") => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError(`${filePath} must contain a configuration object`);
  }

  const booleans = [
    "minify",
    "minify_html",
    "minify_css",
    "minify_js",
    "morphing",
    "prefetching",
  ];
  const positiveNumbers = [
    "build_concurrency",
    "image_quality",
    "livereload_port",
    "max_image_width",
    "server_port",
    "watcher_delay",
    "watcher_interval",
    "words_per_minute",
  ];

  for (const key of booleans) {
    if (config[key] !== undefined && typeof config[key] !== "boolean") {
      throw new TypeError(`${key} in ${filePath} must be a boolean`);
    }
  }
  for (const key of positiveNumbers) {
    if (
      config[key] !== undefined &&
      (!Number.isFinite(config[key]) || config[key] <= 0)
    ) {
      throw new TypeError(`${key} in ${filePath} must be a positive number`);
    }
  }
  if (
    config.base_path !== undefined &&
    (typeof config.base_path !== "string" ||
      /^(?:[a-z]+:)?\/\//i.test(config.base_path) ||
      config.base_path.includes("..") ||
      /[?#]/.test(config.base_path))
  ) {
    throw new TypeError(`base_path in ${filePath} must be a URL path`);
  }
  if (
    config.responsive_image_widths !== undefined &&
    (!Array.isArray(config.responsive_image_widths) ||
      config.responsive_image_widths.some(
        (width) => !Number.isInteger(width) || width <= 0,
      ))
  ) {
    throw new TypeError(
      `responsive_image_widths in ${filePath} must contain positive integers`,
    );
  }
  if (config.rss_feeds !== undefined && !Array.isArray(config.rss_feeds)) {
    throw new TypeError(`rss_feeds in ${filePath} must be an array`);
  }

  return config;
};

// Hardcoded defaults (used if not specified in config file)
const builtInDefaults = {
  default_layout_name: 'default',
  base_path: '',
  // Reading time calculation
  words_per_minute: 200,
  // Image optimization settings
  max_image_width: 800,
  image_quality: 80,
  responsive_image_widths: [320, 640, 800],
  responsive_image_sizes: '100vw',
  default_og_image: '',
  // Output minification
  minify: true,
  minify_html: true,
  minify_css: true,
  minify_js: true,
  // LiveReload and watcher settings
  server_port: 3000,
  livereload_port: 35729,
  watcher_delay: 100,
  watcher_interval: 500,
  // Pagination
  default_page_count: 2,
  // Build safety
  build_concurrency: 16,
  // Navigation
  morphing: true,
  prefetching: true,
  morph_target: 'main',
  navigation_cache_size: 20,
  navigation_cache_ttl: 15,
};

const defaultConfig = {};

const reloadConfig = async () => {
  const loadedConfig = await loadConfig(baseDir);
  const hasConfig = (key) =>
    Object.prototype.hasOwnProperty.call(loadedConfig, key);

  if (hasConfig('turbo')) {
    console.warn('The "turbo" config option is deprecated. Use "morphing" and "prefetching" instead.');
    if (!hasConfig('morphing')) {
      loadedConfig.morphing = loadedConfig.turbo;
    }
  }

  for (const key of Object.keys(defaultConfig)) {
    delete defaultConfig[key];
  }
  Object.assign(defaultConfig, builtInDefaults, loadedConfig);
  return defaultConfig;
};

await reloadConfig();

export { baseDir, dirs, defaultConfig, loadConfig, reloadConfig, validateConfig };
