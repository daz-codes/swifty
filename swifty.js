import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

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

const tagsMap = new Map();
const addToTagMap = (tag, page) => {
  if (!tagsMap.has(tag)) tagsMap.set(tag, []);
  tagsMap.get(tag).push({ title: page.title, url: page.url });
};

// Valid file extensions for assets
const validExtensions = {
  css: ['.css'],
  js: ['.js'],
  images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
};

// Ensure and copy valid assets
const ensureAndCopy = async (source, destination, validExts) => {
  if (await fsExtra.pathExists(source)) {
    await fsExtra.ensureDir(destination);

    const files = await fs.readdir(source);
    await Promise.all(
      files
        .filter(file => validExts.includes(path.extname(file).toLowerCase()))
        .map(file => fsExtra.copy(path.join(source, file), path.join(destination, file)))
    );
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

// Default configuration
const defaultConfig = await loadConfig(baseDir);

// Utility: Cache and load layouts
const layoutCache = new Map();
const getLayout = async (layoutName) => {
  if (!layoutName) return null;
  if (!layoutCache.has(layoutName)) {
    const layoutPath = path.join(dirs.layouts, `${layoutName}.html`);
    if (await fsExtra.pathExists(layoutPath)) {
      const layoutContent = await fs.readFile(layoutPath, 'utf-8');
      layoutCache.set(layoutName, layoutContent);
    } else {
      console.warn(`Layout "${layoutName}" not found.`);
      return null;
    }
  }
  return layoutCache.get(layoutName);
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
  const layoutContent = await getLayout(page.data.layout || page.layout);
  const [beforeLayout, afterLayout] = await applyLayout(layoutContent, page);
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
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory() || path.extname(filePath) === '.md';
  } catch (err) {
    return false; // Handle errors like file not found
  }
};

const generatePages = async (sourceDir, baseDir = sourceDir, parent) => {
  const pages = [];
  const folderConfig = await loadConfig(sourceDir);
  const config = {...defaultConfig,...parent?.data,...folderConfig};
  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(sourceDir, file.name);
      const valid = await isValid(filePath);
      if(!valid) continue;
      const root = file.name === "index.md" && !parent;
      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/"); // Normalize slashes
      const finalPath = `/${relativePath.replace(/\.md$/, "")}`;
      const name = root ? "Home" : capitalize(file.name.replace(/\.md$/, "").replace(/-/g, " "));
      const stats = await fs.stat(filePath);
      const isDirectory = file.isDirectory()

      const page = {
        name, root,
        path: finalPath,
        filepath: filePath,
        url: root ? "/" : finalPath + ".html",
        nav: !parent && !root,
        parent: parent ? {title: parent.data.title, url: parent.url} : undefined,
        folder: isDirectory,
        title: name,
        created_at: new Date(stats.birthtime).toLocaleDateString(undefined,config.dateFormat),
        updated_at: new Date(stats.mtime).toLocaleDateString(undefined,config.dateFormat),
        date: new Date(stats.mtime).toLocaleDateString(undefined,config.dateFormat),
        data: root ? {...defaultConfig} : {...config}
      };
      if (isDirectory) {
        page.pages = await generatePages(filePath, baseDir, page);
        page.content = await generateIndexPage(page);
      } else if (path.extname(file.name) === ".md") {
        const markdownContent = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(markdownContent);
        Object.assign(page, { data: { ...page.data, ...data }, content });
      }
    // add tags
    if (page.data.tags) page.data.tags.forEach(tag => addToTagMap(tag, page));
    
    pages.push(page);
    }

  } catch (err) {
    console.error("Error reading directory:", err);
  }

  // make Tags page
  if(!parent && tagsMap.size){
    const tagPage = {
        path: "/tags",
        url: "/tags.html",
        nav: false,
        folder: true,
        name: "Tags",
        title: "All Tags",
        updated_at: new Date().toLocaleDateString(undefined,defaultConfig.dateFormat),
        data: {...config},
    }
    tagPage.pages = [];
    for (const [tag, pages] of tagsMap) {
          const page = { 
            name: tag,
            title: `Pages tagged with ${capitalize(tag)}`,
            updated_at: new Date().toLocaleDateString(undefined,defaultConfig.dateFormat),
            path: `/tags/${tag}`,
            url:  `/tags/${tag}.html`,
            data: {...config},
          };
          page.content = pages
          .map(page =>`* <a href="${page.url}" data-turbo-frame="content" data-turbo-action="advance">${page.title}</a>`)
          .join('\n');
          tagPage.pages.push(page);
    }
    tagPage.content = await generateIndexPage(tagPage);
    pages.push(tagPage);
  }
  return pages;
};

const generateIndexPage = async page => {
  const partial = `${page.path.split('/').pop()}.md`; // 'post.md' or 'list.md'
    const partialPath = path.join(dirs.partials, partial);
  // Check if either file exists in the 'partials' folder
  const fileExists = await fsExtra.pathExists(partialPath); // Use await here
  if (fileExists) {
    const partial = await fs.readFile(partialPath, "utf-8");
    const content = await Promise.all(page.pages.map(child => replacePlaceholders(partial, child)));
    return content.join('\n');
  } else {
    return `${page.pages.map(page => `* ${page.updated_at}: <a href="${page.url}" data-turbo-frame="content">${page.title}</a></li>`).join`\n`}`
  }
};

const render = async page => {
  const replacedContent = await replacePlaceholders(page.content, page);
  const htmlContent = marked.parse(replacedContent, { gfm: true, breaks: true }); // Markdown processed once
  const wrappedContent = await applyLayoutAndWrapContent(page, htmlContent);
  return wrappedContent;
};

// Function to read and render the index template
const renderIndexTemplate = async (homeHtmlContent, config) => {
  // Read the template from pages folder
  const templatePath = path.join(__dirname, 'template.html');
  let templateContent = await fs.readFile(templatePath, 'utf-8');

  // Add the meta tag for Turbo refresh method
  const turboMetaTag = `<meta name="turbo-refresh-method" content="morph">`;
  const css = await getCssImports();
  const js = await getJsImports();
  const imports = css + js;

  templateContent = templateContent.replace('</head>', `${turboMetaTag}\n${imports}\n</head>`);

  const content =   `<turbo-frame id="content">
  ${homeHtmlContent}
  </turbo-frame>`

  // Replace placeholders with dynamic values
  templateContent = await replacePlaceholders(templateContent,{...defaultConfig,...config,content})

  // Add the missing script to the template
  const turboScript = `
<script type="module">
  import * as Turbo from 'https://esm.sh/@hotwired/turbo';

  function loadFrameContent() {
    const turboFrame = document.querySelector("turbo-frame#content");
    const path = window.location.pathname;
    const pagePath = path.endsWith(".html") ? path : path + ".html";

    if (turboFrame) {
      Turbo.visit(pagePath, { frame: "content" });
    }
  }

  // Load content into turbo-frame on initial page load
  loadFrameContent();

  // Handle back/forward navigation
  window.addEventListener("popstate", loadFrameContent);

  document.addEventListener("turbo:frame-load", event => {
    const turboFrame = event.target;
    const frameSrc = turboFrame.getAttribute("src");

    // Update the address bar without ".html"
    if (frameSrc && frameSrc.endsWith(".html")) {
      const newPath = frameSrc.replace(".html", "");
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, "", newPath);
      }
    }

    document.querySelectorAll('#content a[href]').forEach(link => {
      const href = link.getAttribute('href');

      // Skip external and anchor links
      if (href.startsWith('#') || href.startsWith('http') || href === "/") return;

      link.setAttribute('data-turbo-frame', 'content');
      link.setAttribute('data-turbo-action', 'advance');
      link.setAttribute('href', href.endsWith(".html") ? href : href + ".html");
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
  let html = await render(page);
  if(page.root){
      const navLinks = pages.filter(page => page?.nav || page?.data?.nav).map(
      page => `<a href="${page.url}" data-turbo-frame="content" data-turbo-action="advance">${page.title}</a>`).join('\n');
      page.data.nav = `<nav>${navLinks}</nav>`; 
      html = await renderIndexTemplate(html,page.data);
    }
    const pagePath = path.join(distDir, page.root ? "/index.html" : page.url);
    // If it's a folder, create the directory and recurse into its pages
    if (page.folder) {
      if (!(await fsExtra.pathExists(path.join(distDir, page.path)))) {
        await fs.mkdir(path.join(distDir, page.path), { recursive: true });
      }
        // Recurse into pages inside the directory
        await createPages(page.pages); // Process nested pages inside the folder
    }
    // create an HTML file
    try {
      await fs.writeFile(pagePath, html);
      console.log(`Created file: ${pagePath}`);
    } catch (err) {
      console.error(`Error writing file ${pagePath}:`, err);
    }
  }
};

const replacePlaceholders = async (template, values) => {
  const partialRegex = /{{\s*partial:\s*([\w-]+)\s*}}/g;

  // Async replace function
  const replaceAsync = async (str, regex, asyncFn) => {
    const matches = [];
    str.replace(regex, (match, ...args) => {
      matches.push(asyncFn(match, ...args));
      return match;
    });

    const results = await Promise.all(matches);
    return str.replace(regex, () => results.shift());
  };

  // Replace partial includes
  template = await replaceAsync(template, partialRegex, async (match, partialName) => {
    const partialPath = path.join(dirs.partials, `${partialName}.md`);
    if (await fsExtra.pathExists(partialPath)) {
      let partialContent = await fs.readFile(partialPath, "utf-8");
      partialContent = await replacePlaceholders(partialContent, values); // Recursive replacement
      return marked(partialContent); // Convert Markdown to HTML
    } else {
      console.warn(`Include "${partialName}" not found.`);
      return `<p>Include "${partialName}" not found.</p>`;
    }
  });

  // Replace other placeholders **only outside of code blocks**
  template = template.replace(
    /(?<!`{3}[^]*?){{\s*([^}\s]+)\s*}}(?![^]*?`{3})/g,
    (match, key) => (values.data && key in values?.data ? values.data[key] : key in values ? values[key] : match)
  );
  return template;
};

const addLinks = (pages,parent) => {
  const generateLink = ({title,url}) => `<li><a href="${url}" data-turbo-frame="content" data-turbo-action="advance">${title}</a></li>`
  pages.forEach(page => {
    page.data ||= {};
    page.data.links_to_tags = page?.data?.tags?.length
    ? `<div class="tags">${page.data.tags.map(tag => `<a class="tag" href="/tags/${tag}.html" data-turbo-frame="content" data-turbo-action="advance">${tag}</a>`).join``}</div>`
    : "";
    const crumb = page.root ? "" : ` &raquo; <a class="breadcrumb" href="${page.url}" data-turbo-frame="content" data-turbo-action="advance">${page.name}</a>`;
    page.data.breadcrumbs = parent ? parent.data.breadcrumbs + crumb
    : `<a class="breadcrumb" href="/" data-turbo-frame="content" data-turbo-action="advance">Home</a>` + crumb;
    page.data.links_to_children = page.pages ? `<ul class="links">` + page.pages.map(child => generateLink(child)).join`` + "</ul>" : "";
    page.data.links_to_siblings = pages.filter(p => p.url !== page.url).map(sibling => generateLink(sibling)).join`` + "</ul>";
    page.data.links_to_self_and_siblings = pages.map(sibling => generateLink(sibling)).join`` + "</ul>";
    if(page.pages) {
      addLinks(page.pages,page)
    }
  });
}

// Main function to handle conversion and site generation
const generateSite = async () => {
  console.log('Starting build process...');
  // Copy images, CSS, and JS files
  await copyAssets();
  // Convert markdown in pages directory
  const pages = await generatePages(dirs.pages);
  addLinks(pages);
  await createPages(pages);
};

// Run the site generation process
generateSite()
  .then(() => console.log('Site generated successfully!'))
  .catch(err => console.error('Error generating site:', err));