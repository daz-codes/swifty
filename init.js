#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Define the structure
const structure = {
  "pages/index.md": "This my home page.",
  "layouts/": null,
  "partials/": null,
  "css/": null,
  "js/": null,
  "images/": null,
  "config.yaml": "site_name: My Swifty Site",
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
    <p><a href="/tags.html" data-turbo-frame="content" data-turbo-action="advance">All Tags</a></p>
  </footer>
</body>
</html>
  `
};

// Function to create files and folders
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

// Execute script
const projectRoot = process.cwd();
createStructure(projectRoot, structure);

console.log("✅ Swifty project initialized successfully!");
