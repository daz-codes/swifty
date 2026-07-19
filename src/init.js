#!/usr/bin/env node

import fs from "fs";
import path from "path";

function getStructure(sitename) {
  return {
    "pages/index.md": `---
title: Home
---

# Welcome to ${sitename}

Your new Swifty site is ready. Edit \`pages/index.md\` to make it yours.`,
    "layouts/default.html": `<article class="page">
  <%= content %>
</article>`,
    "partials/": null,
    "css/style.css": `:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  --accent: #db2777;
  --surface: color-mix(in srgb, Canvas 94%, CanvasText 6%);
}

* { box-sizing: border-box; }
body { margin: 0; background: Canvas; color: CanvasText; }
a { color: var(--accent); }
.site-header, .site-footer, .page {
  width: min(100% - 2rem, 64rem);
  margin-inline: auto;
}
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 1.25rem;
  border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
}
.site-title { color: inherit; font-weight: 750; text-decoration: none; }
.site-header nav { display: flex; flex-wrap: wrap; gap: 1rem; }
.page { min-height: 70vh; padding-block: clamp(3rem, 8vw, 7rem); }
.page > :first-child { margin-top: 0; }
pre { overflow-x: auto; border-radius: .5rem; }
.site-footer { padding-block: 2rem; color: color-mix(in srgb, CanvasText 70%, transparent); }
`,
    "js/": null,
    "images/": null,
    "data/": null,
    "public/": null,
    ".gitignore": `node_modules/
.swifty-cache/`,
    "config.yaml": `sitename: ${sitename}
base_path: ""
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: swifty_tag
default_layout_name: default
default_link_name: links
max_image_width: 800
responsive_image_widths:
  - 320
  - 640
  - 800
responsive_image_sizes: 100vw
default_og_image: ""
highlight_theme: monokai-sublime
minify: true
morphing: true
prefetching: true
search: true
search_content_limit: 5000
search_results_limit: 10
summary_length: 200
related_pages_limit: 3
morph_target: main
date_locale: en-GB
timezone: UTC

dateFormat:
  weekday: short
  month: short
  day: numeric
  year: numeric`,
    "template.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= sitename %> | <%= title %></title>
</head>
<body>
  <header class="site-header">
    <a class="site-title" href="/"><%= sitename %></a>
    <nav><%= nav_links %></nav>
  </header>
  <main>
    <%= content %>
  </main>
  <footer class="site-footer">
    <p>This site was built with Swifty, the super speedy static site generator.</p>
  </footer>
</body>
</html>
  `,
  };
}

function createStructure(basePath, structure) {
  Object.entries(structure).forEach(([filePath, content]) => {
    const fullPath = path.join(basePath, filePath);
    if (content === null) {
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
  });
}

export default function init(sitename) {
  if (
    typeof sitename !== "string" ||
    !sitename.trim() ||
    sitename.startsWith("-") ||
    path.isAbsolute(sitename) ||
    path.basename(sitename) !== sitename ||
    [".", ".."].includes(sitename)
  ) {
    throw new Error(`Invalid site name "${sitename}"`);
  }
  const projectRoot = path.join(process.cwd(), sitename);

  // Check if folder already exists
  if (fs.existsSync(projectRoot)) {
    throw new Error(`Folder "${sitename}" already exists.`);
  }

  const structure = getStructure(sitename);
  createStructure(projectRoot, structure);

  console.log(`Site "${sitename}" created successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${sitename}`);
  console.log(`  npx swifty start`);
}
