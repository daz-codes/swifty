#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Needed to emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the structure
const structure = {
  "pages/index.md": "This my home page.",
  "layouts/": null,
  "partials/": null,
  "css/": null,
  "js/": null,
  "images/": null,
  "config.yaml": `sitename: Swifty
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: tag
default_layout_name: site
default_link_name: links
max_image_size: 800

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
  <link rel="icon" href="favicon.ico" sizes="48x48" type="image/x-icon">
  <link rel="icon" href="favicon-16x16.png" sizes="16x16" type="image/x-icon">
  <link rel="icon" href="favicon-32x32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="path/to/apple-touch-icon.png">
  <link rel="icon" sizes="192x192" href="android-chrome-192x19.png">
  <link rel="icon" sizes="512x512" href="android-chrome-512x512.png">
  <title>{{ sitename }} || {{ title }}</title>
</head>
<body>
  <header>
      <h1>Swifty</h1>
  </header>
    <main>
    {{ content }}
  </main>
    <footer>
    <p>This site was built with Swifty, the super speedy static site generator.</p>
  </footer>
</body>
</html>
  `
};

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

const projectRoot = process.cwd();
createStructure(projectRoot, structure);

console.log("✅ Swifty project initialized successfully!");
