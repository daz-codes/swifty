#!/usr/bin/env node

import fs from "fs";
import path from "path";

function getStructure(sitename) {
  return {
    "pages/index.md": `# Welcome to ${sitename}\n\nThis is my home page.`,
    "layouts/": null,
    "partials/": null,
    "css/": null,
    "js/": null,
    "images/": null,
    "data/": null,
    "config.yaml": `sitename: ${sitename}
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: swifty_tag
default_layout_name: default
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
  <title><%= sitename %> | <%= title %></title>
</head>
<body>
  <header>
      <h1>${sitename}</h1>
  </header>
    <main>
    <%= content %>
  </main>
    <footer>
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
  const projectRoot = path.join(process.cwd(), sitename);

  // Check if folder already exists
  if (fs.existsSync(projectRoot)) {
    console.error(`Error: Folder "${sitename}" already exists.`);
    process.exit(1);
  }

  const structure = getStructure(sitename);
  createStructure(projectRoot, structure);

  console.log(`Site "${sitename}" created successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${sitename}`);
  console.log(`  npx swifty start`);
}
