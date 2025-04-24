import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';

// Directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine the project root directory
const isInstalled = process.cwd() !== __dirname;
const baseDir = isInstalled ? process.cwd() : __dirname;

const dirs = {
  pages: path.join(baseDir, 'pages'),
  images: path.join(baseDir, 'images'),
  dist: path.join(baseDir, 'dist'),
  layouts: path.join(baseDir, 'layouts'),
  css: path.join(baseDir, 'css'),
  js: path.join(baseDir, 'js'),
  partials: path.join(baseDir, 'partials'),
};

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      } else {
        return hljs.highlightAuto(code).value; // Auto-detect the language
      }
    },
  })
);

const tagsMap = new Map();
const addToTagMap = (tag, page) => {
  if (!tagsMap.has(tag)) tagsMap.set(tag, []);
  tagsMap.get(tag).push({ title: page.title, url: page.url });
};
const pageIndex = [];
const partialCache = new Map();

const loadPartial = async (partialName) => {
  if (partialCache.has(partialName)) {
    return partialCache.get(partialName);
  }

  const partialPath = path.join(dirs.partials, `${partialName}.md`);
  if (await fsExtra.pathExists(partialPath)) {
    const partialContent = await fs.readFile(partialPath, "utf-8");
    partialCache.set(partialName, partialContent); // Store in cache
    return partialContent;
  } else {
    console.warn(`Include "${partialName}" not found.`);
    return `<p>Include "${partialName}" not found.</p>`;
  }
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

async function optimizeImages() {
  try {
    const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
    const images_folder = path.join(dirs.dist, "images");
    const files = await fs.readdir(images_folder);
    
    await Promise.all(files.map(async (file) => {
      const filePath = path.join(images_folder, file);
      const ext = path.extname(file).toLowerCase();
    
      if (!IMAGE_EXTENSIONS.includes(ext)) return;
    
      const optimizedPath = path.join(images_folder, `${path.basename(file, ext)}.webp`);
    
      if (filePath !== optimizedPath) {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        const originalWidth = metadata.width || 0;
        const maxWidth = defaultConfig.max_image_size || 800;
        const resizeWidth = Math.min(originalWidth, maxWidth);
    
        await image
          .resize({ width: resizeWidth })
          .toFormat('webp', { quality: 80 })
          .toFile(optimizedPath);
    
        await fs.unlink(filePath);
    
        console.log(`Optimized ${file} -> ${optimizedPath}`);
      }
    }));
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
};

// Utility: Generate HTML imports for assets
const generateAssetImports = async (dir, tagTemplate, validExts) => {
  if (!(await fsExtra.pathExists(dir))) return '';
  const files = await fs.readdir(dir);
  return files
    .filter(file => validExts.includes(path.extname(file).toLowerCase()))
    .sort() 
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

const createTemplate = async () => {
  // Read the template from pages folder
  const templatePath = path.join(baseDir, 'template.html');
  let templateContent = await fs.readFile(templatePath, 'utf-8');

  // Add the meta tag for Turbo refresh method
  const turboMetaTag = `<meta name="turbo-refresh-method" content="morph">`;
  const css = await getCssImports();
  const js = await getJsImports();
  const imports = css + js;

  const highlightCSS = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/monokai-sublime.min.css">`;
  templateContent = templateContent.replace('</head>', `${turboMetaTag}\n${imports}\n${highlightCSS}\n</head>`);

  // Add the missing script to the template
  const turboScript = `
<script type="module">
  import * as Turbo from 'https://esm.sh/@hotwired/turbo';
</script>
`;
  // Inject the script at the end of the template
  templateContent = templateContent.replace('</body>', `${turboScript}</body>`);
  return templateContent;
};

const template = await createTemplate();

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
      return null;
    }
  }
  return layoutCache.get(layoutName);
};

// Utility: Apply layout and wrap content in a Turbo Frame
const applyLayoutAndWrapContent = async (page,content) => {
  const layoutContent = await getLayout(page.data.layout !== undefined ? page.data.layout : page.layout);
  if (!layoutContent) return content;
  return layoutContent.replace(/\{\{\s*content\s*\}\}/g, content);
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
      const isDirectory = file.isDirectory();
      const layoutFileExists = parent && await fsExtra.pathExists(dirs.layouts + "/" + parent.filename + ".html");
      const layout = layoutFileExists ? parent.filename : parent ? parent.layout : "pages";

      const page = {
        name, root, layout,
        filename: file.name.replace(/\.md$/, ""),
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
      if (path.extname(file.name) === ".md") {
        const markdownContent = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(markdownContent);
        const index = pages.findIndex(p => p.url === page.url);
        if (index !== -1) {
          Object.assign(pages[index], { data: { ...page.data, ...data }, content });
          continue;
        }
        else Object.assign(page, { data: { ...page.data, ...data }, content });
      }
      if (isDirectory) {
        page.pages = await generatePages(filePath, baseDir, page);
        page.pages.sort((a, b) => {
          if (a.data.position && b.data.position) {
            return a.data.position - b.data.position; // Sort by position first
          }
          return new Date(a.updated_at) - new Date(b.updated_at); // If position is the same, sort by date
        });
        const index = pages.findIndex(p => p.url === page.url);
        if (index !== -1) {
          page.content = pages[index].content;
          pages.splice(index, 1);
        }
        else page.content = await generateLinkList(page.filename,page.pages);     
      }

    // add tags
    if (page.data.tags) page.data.tags.forEach(tag => addToTagMap(tag, page));

    pages.push(page);
    pageIndex.push({url: page.url, title: page.title || page.title, nav: page.nav})
    }

  } catch (err) {
    console.error("Error reading directory:", err);
  }

  // make Tags page
  if(!parent && tagsMap.size){
    const tagLayout = await fsExtra.pathExists(dirs.layouts + "/tags.html");
    const tagPage = {
        path: "/tags",
        url: "/tags.html",
        nav: false,
        folder: true,
        name: "Tags",
        title: "All Tags",
        layout: "pages",
        updated_at: new Date().toLocaleDateString(undefined,defaultConfig.dateFormat),
        data: {...config},
    }
    tagPage.pages = [];
    for (const [tag, pages] of tagsMap) {
          const page = { 
            name: tag,
            title: tag,
            updated_at: new Date().toLocaleDateString(undefined,defaultConfig.dateFormat),
            path: `/tags/${tag}`,
            url:  `/tags/${tag}.html`,
            layout: tagLayout ? "tags" : "pages",
            data: {...config, title: `Pages tagged with ${capitalize(tag)}`},
          };
          page.content = pages
          .map(page =>`* <a href="${page.url}" data-turbo-frame="content" data-turbo-action="advance">${page.title}</a>`)
          .join('\n');
          tagPage.pages.push(page);
    }
    tagPage.content = await generateLinkList("tags",tagPage.pages);
    pages.push(tagPage);
  }
  return pages;
};

const generateLinkList = async (name,pages) => {
  const partial = `${name}.md`;
  const partialPath = path.join(dirs.partials, partial);
  const linksPath = path.join(dirs.partials, "links.md");
  // Check if either file exists in the 'partials' folder
  const fileExists = await fsExtra.pathExists(partialPath);
  const defaultExists = await fsExtra.pathExists(linksPath);
  if (fileExists || defaultExists) {
    const partial = await fs.readFile(fileExists ? partialPath : linksPath, "utf-8");
    const content = await Promise.all(pages.map(page => replacePlaceholders(partial, page)));
    return content.join('\n');
  } else {
    return `${pages.map(page => `<li><a href="${page.url}" class="${defaultConfig.link_class}" data-turbo-frame="content">${page.title}</a></li>`).join`\n`}`
  }
};

const render = async page => {
  const htmlContent = marked.parse(page.content); // Markdown processed once
  const wrappedContent = await applyLayoutAndWrapContent(page, htmlContent);
  const htmlWithTemplate = template.replace(/\{\{\s*content\s*\}\}/g, wrappedContent);
  const htmlWithLinks = htmlWithTemplate.replace(
    /<a\s+([^>]*?)href="(\/[^"#?]+?)"(.*?)>/g,
    (match, beforeHref, href, afterHref) => {
      // Don't double-add .html
      const fullHref = href.endsWith('.html') ? href : `${href}.html`;
  
      return `<a ${beforeHref}href="${fullHref}"${afterHref}>`;
    }
  );
  const finalContent = await replacePlaceholders(htmlWithLinks, page);
  return finalContent;
};

const createPages = async (pages, distDir=dirs.dist) => {
  for (const page of pages) {
    let html = await render(page);
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
    let partialContent = await loadPartial(partialName);
    partialContent = await replacePlaceholders(partialContent, values); // Recursive replacement
    return marked(partialContent); // Convert Markdown to HTML
  });
  // replace image extensions with optimized extension
  template = template.replace(/\.(png|jpe?g|webp)/gi, ".webp");
  // Replace other placeholders **only outside of code blocks**
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`|<(pre|code)[^>]*>[\s\S]*?<\/\1>/g;
    const codeBlocks = [];
    template = template.replace(codeBlockRegex, match => {
        codeBlocks.push(match);
        return `{{CODE_BLOCK_${codeBlocks.length - 1}}}`; // Temporary placeholder
    });
    // Replace placeholders outside of code blocks
    template = template.replace(/{{\s*([^}\s]+)\s*}}/g, (match, key) => {
      return(values.data && key in values?.data ? values.data[key] : key in values ? values[key] : match)
    });
    // Restore code blocks
    template = template.replace(/{{CODE_BLOCK_(\d+)}}/g, (_, index) => codeBlocks[index]);

  return template;
};

const addLinks = async (pages,parent) => {
  pages.forEach(async page => {
    page.data ||= {};
    page.data.links_to_tags = page?.data?.tags?.length
    ? page.data.tags.map(tag => `<a class="${defaultConfig.tag_class}" href="/tags/${tag}">${tag}</a>`).join`` : "";
    const crumb = page.root ? "" : ` ${defaultConfig.breadcrumb_separator} <a class="${defaultConfig.breadcrumb_class}" href="${page.url}" data-turbo-frame="content" data-turbo-action="advance">${page.name}</a>`;
    page.data.breadcrumbs = parent ? parent.data.breadcrumbs + crumb
    : `<a class="${defaultConfig.breadcrumb_class}" href="/">Home</a>` + crumb;
    page.data.links_to_children = page.pages ? await generateLinkList(page.filename,page.pages) : "";
    page.data.links_to_siblings = await generateLinkList(page.parent?.filename || "pages",pages.filter(p => p.url !== page.url));
    page.data.links_to_self_and_siblings = await generateLinkList(page.parent?.filename || "pages",pages);
    page.data.nav_links = await generateLinkList("nav",pageIndex.filter(p => p.nav));
    if(page.pages) {
      await addLinks(page.pages,page)
    }
  });
}

// Main function to handle conversion and site generation
const generateSite = async () => {
  console.log('Starting build process...');
  // Copy images, CSS, and JS files
  await copyAssets();
  await optimizeImages();
  // Convert markdown in pages directory
  const pages = await generatePages(dirs.pages);
  await addLinks(pages);
  await createPages(pages);
};

// Run the site generation process
generateSite()
  .then(() => console.log('🚀 Site generated successfully! 🥳'))
  .catch(err => console.error('🛑 Error generating site:', err));