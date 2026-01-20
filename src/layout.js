import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import { dirs, baseDir, defaultConfig } from "./config.js";
import { getCssImports, getJsImports } from "./assets.js";

const layoutCache = new Map();
let template = null;

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
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const turboScript = defaultConfig.turbo
    ? `<script type="module">import * as Turbo from 'https://esm.sh/@hotwired/turbo';</script>`
    : '';
  const livereloadScript = process.env.SWIFTY_WATCH
    ? `<script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>')</script>`
    : '';
  const css = await getCssImports();
  const js = await getJsImports();
  const imports = css + js;
  const highlightCSS = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/monokai-sublime.min.css">`;
  const template = templateContent.replace('</head>', `${turboScript}\n${highlightCSS}\n${imports}\n${livereloadScript}\n</head>`);
  return template;
};

const applyLayoutAndWrapContent = async (page,content) => {
    const layoutContent = await getLayout(page.data.layout !== undefined ? page.data.layout : page.layout);
    if (!layoutContent) return content;
    // Use function to avoid $` special replacement patterns in content
    return layoutContent.replace(/\{\{\s*content\s*\}\}/g, () => content);
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