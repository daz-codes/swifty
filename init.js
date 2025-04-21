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
author: Taylor Swift
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: tag
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
  <title>{{sitename}}</title>
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
