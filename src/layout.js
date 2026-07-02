import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import { dirs, baseDir, defaultConfig } from "./config.js";
import {
  getCssImports,
  getJsImports,
  getCssPreloads,
  getJsPreloads,
  getNavigationScriptSrc,
} from "./assets.js";

const layoutCache = new Map();
let template = null;

const escapeAttr = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getLayout = async (layoutName) => {
  if (!layoutName) return null;
  if (!layoutCache.has(layoutName)) {
    const layoutPath = path.join(dirs.layouts, `${layoutName}.html`);
    if (await fsExtra.pathExists(layoutPath)) {
      const layoutContent = await fs.readFile(layoutPath, 'utf-8');
      layoutCache.set(layoutName, layoutContent);
    } else {
      return null;
    }
  }
  return layoutCache.get(layoutName);
};

const createTemplate = async () => {
  // Read the template from pages folder
  const templatePath = path.join(baseDir, 'template.html');
  let templateContent;
  try {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error(`Unable to read template ${templatePath}: ${error.message}`, {
      cause: error,
    });
  }

  // Preconnect hints for external CDNs (improves connection setup time)
  const preconnectHints = [
    '<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>',
    '<link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">',
  ].join('\n');

  const navigationScriptSrc = await getNavigationScriptSrc();
  const navigationScript = navigationScriptSrc
    ? `<script type="module" src="${navigationScriptSrc}" data-swifty-navigation data-target="${escapeAttr(defaultConfig.morph_target || "main")}" data-prefetching="${defaultConfig.prefetching === false ? "off" : "intent"}" data-cache-size="${escapeAttr(defaultConfig.navigation_cache_size || 20)}" data-cache-ttl="${escapeAttr(defaultConfig.navigation_cache_ttl || 15)}"></script>`
    : '';
  const livereloadScript = process.env.SWIFTY_WATCH
    ? `<script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':${defaultConfig.livereload_port || 35729}/livereload.js?snipver=1"></' + 'script>')</script>`
    : '';

  // Preload local assets for faster loading
  const cssPreloads = await getCssPreloads();
  const jsPreloads = await getJsPreloads();
  const preloads = [cssPreloads, jsPreloads].filter(Boolean).join('\n');

  const css = await getCssImports();
  const js = await getJsImports();
  const imports = css + js;
  const highlightCSS = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/monokai-sublime.min.css">`;

  // Order: preconnect hints -> preloads -> actual assets -> scripts
  const template = templateContent.replace('</head>', `${preconnectHints}\n${preloads}\n${navigationScript}\n${highlightCSS}\n${imports}\n${livereloadScript}\n</head>`);
  return template;
};

const applyLayoutAndWrapContent = async (page,content) => {
    const layoutContent = await getLayout(page.meta.layout !== undefined ? page.meta.layout : page.layout);
    if (!layoutContent) return content;
    // Use function to avoid $` special replacement patterns in content
    return layoutContent.replace(/<%=\s*content\s*%>/g, () => content);
  };

const getTemplate = async () => {
  if (!template) {
    template = await createTemplate();
  }
  return template;
};

const resetCaches = async () => {
  layoutCache.clear();
  template = await createTemplate();
};

export { getLayout, applyLayoutAndWrapContent, getTemplate, resetCaches };
