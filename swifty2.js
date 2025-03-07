import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

// TO DO
// make index DONE
// Turbo frames DONE
// config ... yaml or json files in indexes DONE
// layouts DONE
// partials DONE
// add variables DONE
// make index page for folders DONE
// tags DONE .... possible needs refactoring into pages
// Site Navigation
// Get layout and title working properly
// consider if page.data is even needed, could just be page.tags etc
// sibling, parent, child page links
// Have a parial for displaying index pages

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const baseDir = __dirname;
const dirs = {
  pages: path.join(baseDir, 'pages'),
  images: path.join(baseDir, 'images'),
  dist: path.join(baseDir, 'dist'),
  layouts: path.join(baseDir, 'layouts'),
  css: path.join(baseDir, 'css'),
  js: path.join(baseDir, 'js'),
  partials: path.join(baseDir, 'partials'),
};

const tagsMap = new Map(); // Use Map for tag-to-pages mapping

// Valid file extensions for assets
const validExtensions = {
  css: ['.css'],
  js: ['.js'],
  images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
};

// Default configuration
const defaultConfig = {
  sitename: "Swifty",
  title: "My Swifty Site",
  author: "Taylor Swift",
  dateFormat: {weekday: "short",month: "short", day: "numeric", year: "numeric"}
};

// Ensure and copy valid assets
const ensureAndCopy = async (source, destination, validExts) => {
  if (await fsExtra.pathExists(source)) {
    await fsExtra.ensureDir(destination);

    const files = await fs.readdir(source);
    for (const file of files) {
      const filePath = path.join(source, file);
      const ext = path.extname(file).toLowerCase();
      if (validExts.includes(ext)) {
        await fsExtra.copy(filePath, path.join(destination, file));
      }
    }
    console.log(`Copied valid files from ${source} to ${destination}`);
  } else {
    console.log(`No ${path.basename(source)} found in ${source}`);
  }
};

// Helper function to capitalize words
const capitalize = (str) => str.replace(/\b\w/g, (char) => char.toUpperCase());

// Copy assets with file type validation
const copyAssets = async () => {
  await ensureAndCopy(dirs.css, path.join(dirs.dist, 'css'), validExtensions.css);
  await ensureAndCopy(dirs.js, path.join(dirs.dist, 'js'), validExtensions.js);
  await ensureAndCopy(dirs.images, path.join(dirs.dist, 'images'), validExtensions.images);
};

// Utility: Generate HTML imports for assets
const generateAssetImports = async (dir, tagTemplate, validExts) => {
  if (!(await fsExtra.pathExists(dir))) return '';
  const files = await fs.readdir(dir);
  return files
    .filter(file => validExts.includes(path.extname(file).toLowerCase()))
    .map(file => tagTemplate(file))
    .join('\n');
};

// Generate CSS and JS imports
const getCssImports = () => generateAssetImports(dirs.css, (file) => `<link rel="stylesheet" href="/css/${file}" />`,validExtensions.css);
const getJsImports = () => generateAssetImports(dirs.js, (file) => `<script src="/js/${file}"></script>`,validExtensions.js);

const loadConfig = async (dir) => {
  const configFiles = ['config.yaml', 'config.yml', 'config.json'];
  
  for (const file of configFiles) {
    const filePath = path.join(dir, file);
    try {
      await fs.access(filePath); // Check if file exists
      const content = await fs.readFile(filePath, 'utf-8');
      return file.endsWith('.json') ? JSON.parse(content) : yaml.load(content);
    } catch (err) {
      // File not found, continue to next option
    }
  }

  return {}; // Return an empty object if no config file is found
};

// Utility: Cache and load layouts
const layoutCache = new Map();
const getLayout = async layoutName => {
  if (!layoutName) return null;
  if (layoutCache.has(layoutName)) return layoutCache.get(layoutName);

  const layoutPath = path.join(dirs.layouts, `${layoutName}.html`);
  if (await fsExtra.pathExists(layoutPath)) {
    const layoutContent = await fs.readFile(layoutPath, 'utf-8');
    layoutCache.set(layoutName, layoutContent);
    return layoutContent;
  }
  console.warn(`Layout "${layoutName}" not found.`);
  return null;
};

// Apply layout content to a page
const applyLayout = async (layoutContent, config) => {
  if (!layoutContent) return ['', ''];
  const [before, after] = layoutContent.split(/{{\s*content\s*}}/);
  return [
    await replacePlaceholders(before || '', config),
    await replacePlaceholders(after || '', config),
  ];
};


// Utility: Apply layout and wrap content in a Turbo Frame
const applyLayoutAndWrapContent = async (page,content) => {
  const layoutContent = await getLayout(page.layout);
  const [beforeLayout, afterLayout] = await applyLayout(layoutContent, page.data);

  return `
<turbo-frame id="content">
  <head><title>${page.title} || ${page.data.sitename}</title></head>
  ${beforeLayout}
  ${content}
  ${afterLayout}
</turbo-frame>
  `;
};


const isValid = async (filePath) => {
  const stats = await fs.stat(filePath);
  return stats.isDirectory() || path.extname(filePath) === '.md'
}

const generatePages = async (sourceDir, baseDir = sourceDir, prevConfig = defaultConfig) => {
  const pages = [];

  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(sourceDir, file.name);
      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/"); // Normalize slashes
      // Check if the file is "index.md", and if so, set path to "/"
      const finalPath = `/${relativePath.replace(/\.md$/, "")}`;
      if (file.name === 'index.md') continue;
      const stats = await fs.stat(filePath);
      const isDirectory = file.isDirectory();
      const folderConfig = await loadConfig(sourceDir);
      const config = {...prevConfig,...folderConfig};

      let page = {
        path: finalPath,
        filepath: filePath,
        url: finalPath + ".html",
        parent: finalPath.substring(0, finalPath.lastIndexOf('/')) || '/',
        folder: isDirectory,
        name: file.name,
        title: capitalize(file.name.replace(/\.md$/, "").replace(/-/g, " ")),
        created_at: new Date(stats.birthtime).toLocaleDateString(undefined,config.dateFormat),
        updated_at: new Date(stats.mtime).toLocaleDateString(undefined,config.dateFormat),
        layout: "layout",
        content: "",
        data: config
      };

      page.data.date = page.updated_at;
      page.data.title ||= page.title;
      if (page.data.tags) {
        for (const tag of page.data.tags) {
          if (!tagsMap.has(tag)) {
            tagsMap.set(tag, []);
          }
          tagsMap.get(tag).push({
            title: page.title,
            url: page.url
          });
        }
      };
      page.data.tagLinks = page.data.tags && page.data.tags.length
        ? `<div class="tags">${page.data.tags.map(tag => `<a class="tag" href="/tags/${tag}.html" data-turbo-frame="content" data-turbo-action="advance">${tag}</a>`).join('')}</div>`
        : '';

      const parts = finalPath.split("/");
      const breadcrumbs = parts.map((part, index) => {
        const link = "/" + parts.slice(0, index + 1).join('/') + ".html"; // Build the relative link
        const title = part
          .replace(/-/g, " ") // Replace dashes with spaces
          .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize each word
    
        return { link, title };
      });
    
      breadcrumbs.unshift({ link: '/', title: 'Home' });
    
      page.data.breadcrumbs = breadcrumbs
      .map(crumb => `<a class="breadcrumb" href="${crumb.link}" data-turbo-frame="content" data-turbo-action="advance">${crumb.title}</a>`)
      .join(" &raquo; ");

      console.log("DATA: ", page.data)
      if (isDirectory) {
        page.pages = await generatePages(filePath, baseDir, config);
        page.children = page.pages.map(p => ({title: p.title, url: p.url}))
        const content = generateIndexPage(page);
        page.content = await render(page,content);
      } else if (path.extname(file.name) === ".md") {
        const markdownContent = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(markdownContent);
        page.data = {...page.data, ...data};
        page.content = await render(page,content);
      } else {
        continue;
      }
      pages.push(page);
    }
  } catch (err) {
    console.error("Error reading directory:", err);
  }
  return pages;
};

const generateIndexPage = page => {
  return `<h1>${page.title}</h1>
  <ul>
  ${page.pages.map(page => `<li>${page.updated_at}: <a href="${page.url}" data-turbo-frame="content">${page.title}</a></li>`).join``}
  </ul>`
}

const render = async (page,content) => {
  const replacedContent = await replacePlaceholders(content, page.data);
  const markedContent = marked(replacedContent);
  const wrappedContent = await applyLayoutAndWrapContent(page,markedContent);
  return wrappedContent
}

// Function to read and render the index template
const renderIndexTemplate = async (homeHtmlContent, config) => {
  // Read the template from pages folder
  const templatePath = path.join(__dirname, 'index.html');
  let templateContent = await fs.readFile(templatePath, 'utf-8');

  // Add the meta tag for Turbo refresh method
  const turboMetaTag = `<meta name="turbo-refresh-method" content="morph">`;
  templateContent = templateContent.replace('<head>', `<head>\n  ${turboMetaTag}`);
  const css = await getCssImports();
  const js = await getJsImports();
  const imports = css + js;

  templateContent = templateContent.replace('</head>', `${imports}\n<head>`);

  const content =   `<turbo-frame id="content">
  ${homeHtmlContent}
  </turbo-frame>`

  // Replace placeholders with dynamic values
  templateContent = await replacePlaceholders(templateContent,{...defaultConfig,...config,content})

  // Add the missing script to the template
  const turboScript = `
<script type="module">
  import * as Turbo from 'https://esm.sh/@hotwired/turbo';

  // Ensure the turbo-frame loads the correct content based on the current URL
  (function() {
    const turboFrame = document.querySelector("turbo-frame#content");
    const path = window.location.pathname;

    // Set the src attribute for the turbo frame
      const pagePath = path.endsWith(".html") ? path : path + ".html";
      turboFrame.setAttribute("src", pagePath);
  })();

  // Update the page title and address bar dynamically
  document.addEventListener("turbo:frame-load", event => {
    const turboFrame = event.target;
    // Update the address bar without appending '/home' for the root
    const frameSrc = turboFrame.getAttribute("src");
    if (frameSrc && frameSrc.endsWith("home.html")) {
      window.history.pushState({}, "", "/");
    } else if (frameSrc && frameSrc.endsWith(".html")) {
      const newPath = frameSrc.replace(".html", "");
      window.history.pushState({}, "", newPath);
    }

    const rootUrl = "/"; // Define the root URL to exclude

    document.querySelectorAll('#content a[href]').forEach(link => {
      const href = link.getAttribute('href');

      // Skip external links and the root URL
      if (
        href.startsWith('#') || // Skip anchor links
        href.startsWith('http') || // Skip external links
        href === rootUrl // Skip the root URL
      ) {
        return;
      }

      // Add Turbo attributes for internal links
      link.setAttribute('data-turbo-frame', 'content');
      link.setAttribute('data-turbo-action', 'advance');
      link.setAttribute('href', href + (href.endsWith(".html") ? "" : ".html"));
    });
  });
</script>
  `;

  // Inject the script at the end of the template
  templateContent = templateContent.replace('</body>', `${turboScript}</body>`);

  return templateContent;
};

const createPages = async (pages, distDir=dirs.dist) => {
  for (const page of pages) {
    const pagePath = path.join(distDir, page.url);
    // If it's a folder, create the directory and recurse into its pages
    if (page.folder) {
      try {
        await fs.mkdir(path.join(distDir, page.path), { recursive: true }); // Create directory
        // Recurse into pages inside the directory
        await createPages(page.pages); // Process nested pages inside the folder
      } catch (err) {
        console.error(`Error creating directory ${pagePath}:`, err);
      }
    }
    // create an HTML file
    try {
      await fs.writeFile(pagePath, page.content);
      console.log(`Created file: ${pagePath}`);
    } catch (err) {
      console.error(`Error writing file ${pagePath}:`, err);
    }
  }
};

// Main function to handle conversion and site generation
const generateSite = async () => {
  console.log('Starting build process...');

  // Start with default config
  const siteConfig = defaultConfig;
  //await readMergedConfig(dirs.pages);

  // Copy images, CSS, and JS files
  await copyAssets();

  // Convert markdown in pages directory
  const pages = await generatePages(dirs.pages);
  await createPages(pages);
  const navLinks = pages.map(
          page =>
            `<a href="${page.url}" data-turbo-frame="content" data-turbo-action="advance">${page.title}</a>`
        )
        .join('\n');

  const nav = `
  <nav>
    ${navLinks}
  </nav>`

  // Read home.md file and generate home page content
  const homeFilePath = path.join(dirs.pages, 'index.md');
  let homeHtmlContent = '';
  if (await fsExtra.pathExists(homeFilePath)) {
      const content = await fs.readFile(homeFilePath, 'utf-8');
      const page = {title: "Home", layout: "layout", data: siteConfig};
      homeHtmlContent = await render(page,content);
  }

  await generateTagPages(tagsMap);
  await generateTagPages(tagsMap,true);

  // Generate index page with the dynamic content
  const indexHtml = await renderIndexTemplate(homeHtmlContent, {nav});

  // Write the final HTML to the dist directory
  await fs.writeFile(path.join(dirs.dist, 'index.html'), indexHtml);
};

// Run the site generation process
generateSite()
  .then(() => console.log('Site generated successfully!'))
  .catch(err => console.error('Error generating site:', err));



// const tagsMap = new Map(); // Use Map for tag-to-pages mapping


// Function to replace {{ value }} placeholders in a string
const replacePlaceholders = async (template, values) => {
  // 1. Extract code blocks to avoid unintended replacements within them
  const codeBlockRegex = /(```[\s\S]*?```|<pre>[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>)/g;
  const codeBlocks = [];
  let modifiedTemplate = template.replace(codeBlockRegex, match => {
    const placeholder = `<<swifty_code_block_${codeBlocks.length}>>`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2. Replace partials
  const partialRegex = /{{\s*partial:\s*([\w-]+)\s*}}/g;
  const matches = [...modifiedTemplate.matchAll(partialRegex)];
  for (const match of matches) {
    const [fullMatch, partialName] = match;
    const partialPath = path.join(dirs.partials, `${partialName}.md`);
    let replacement = `<p>Include "${partialName}" not found.</p>`;
    if (await fsExtra.pathExists(partialPath)) {
      let partialContent = await fs.readFile(partialPath, 'utf-8');
      // Recursively replace placeholders in the include content
      partialContent = await replacePlaceholders(partialContent, values);
      replacement = marked(partialContent); // Convert Markdown to HTML
    } else {
      console.warn(`Include "${partialName}" not found.`);
    }
    modifiedTemplate = modifiedTemplate.replace(fullMatch, replacement);
  }

  // 3. Replace other placeholders
  modifiedTemplate = modifiedTemplate.replace(/{{\s*([^}\s]+)\s*}}/g, (match, key) => {
    return key in values ? values[key] : match; // Preserve unmatched placeholders
  });
  // 4. Re-insert the code blocks back into the template
  modifiedTemplate = modifiedTemplate.replace(/<<swifty_code_block_(\d+)>>/g, (match, index) => {
    return codeBlocks[index];
  });

  return modifiedTemplate;
};

// // Function to generate the main navigation HTML
// const generateNavigation = links => {
//   // Remove "home" from links to avoid duplicate entry
//   const filteredLinks = links.filter(link => link.title.toLowerCase() !== 'index');

//   const navLinks = filteredLinks
//     .map(
//       link =>
//         `<a href="${link.path}.html" data-turbo-frame="content" data-turbo-action="advance">${link.title}</a>`
//     )
//     .join('\n');

//   return `
//   <nav>
//     ${navLinks}
//   </nav>`;
// };

const generateTagPages = async (tagsMap, isIndexPage = false) => {
    for (const [tag, pages] of tagsMap) {
      // Generate the list of tags and their associated links
      const listItems = isIndexPage ? 
      Array.from(tagsMap.keys())
        .map(
          tag =>
            `<li><a href="/tags/${tag}.html" data-turbo-frame="content" data-turbo-action="advance">${tag}</a></li>`
        )
        .join('\n')
      : pages
        .map(
          page =>
            `<li><a href="${page.url}.html" data-turbo-frame="content" data-turbo-action="advance">${page.title}</a></li>`
        )
        .join('\n')
      const content = `<ul>${listItems}</ul>`;
  
      const page = { data: defaultConfig, title: isIndexPage ? 'All Tags' : `Pages tagged with ${capitalize(tag)}`, layout: "layout" };
      const wrappedContent = await applyLayoutAndWrapContent(page,content);
      const pagePath = isIndexPage ? path.join(dirs.dist, 'tags.html') : path.join(dirs.dist, 'tags', `${tag}.html`);
      await fsExtra.ensureDir(path.join(dirs.dist, "tags"));
      // create the tags pages
      try {
        await fs.writeFile(pagePath, wrappedContent);
        console.log(`Created file: ${pagePath}`);
      } catch (err) {
        console.error(`Error writing file ${pagePath}:`, err);
      }
    }
  };