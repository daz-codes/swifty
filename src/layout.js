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
  getHighlightThemeSrc,
} from "./assets.js";

const layoutCache = new Map();
let template = null;
const templateVariants = new Map();
const highlightThemeToken = "__SWIFTY_HIGHLIGHT_THEME_STYLESHEET__";

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
  // The highlight theme token is resolved per page so code-free pages do not
  // load syntax-highlighting CSS.
  const template = templateContent.replace('</head>', `${preloads}\n${navigationScript}\n${highlightThemeToken}\n${imports}\n${livereloadScript}\n</head>`);
  return template;
};

const applyLayoutAndWrapContent = async (page,content) => {
    const layoutContent = await getLayout(page.meta.layout !== undefined ? page.meta.layout : page.layout);
    if (!layoutContent) return content;
    // Use function to avoid $` special replacement patterns in content
    return layoutContent.replace(/<%=\s*content\s*%>/g, () => content);
  };

const getTemplate = async ({ highlighted = false } = {}) => {
  if (!template) {
    template = await createTemplate();
  }
  const variant = highlighted ? "highlighted" : "plain";
  if (!templateVariants.has(variant)) {
    const highlightStylesheet = highlighted
      ? `<link rel="stylesheet" href="${await getHighlightThemeSrc()}">`
      : "";
    templateVariants.set(
      variant,
      template.replace(highlightThemeToken, highlightStylesheet),
    );
  }
  return templateVariants.get(variant);
};

const resetCaches = async () => {
  layoutCache.clear();
  templateVariants.clear();
  template = await createTemplate();
};

export { getLayout, applyLayoutAndWrapContent, getTemplate, resetCaches };
