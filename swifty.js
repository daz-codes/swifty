const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');
const yaml = require('js-yaml');

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
  if (await fs.pathExists(source)) {
    await fs.ensureDir(destination);

    const files = await fs.readdir(source);
    for (const file of files) {
      const filePath = path.join(source, file);
      const ext = path.extname(file).toLowerCase();
      if (validExts.includes(ext)) {
        await fs.copy(filePath, path.join(destination, file));
      }
    }
    console.log(`Copied valid files from ${source} to ${destination}`);
  } else {
    console.log(`No ${path.basename(source)} found in ${source}`);
  }
};

// Copy assets with file type validation
const copyAssets = async () => {
  await ensureAndCopy(dirs.css, path.join(dirs.dist, 'css'), validExtensions.css);
  await ensureAndCopy(dirs.js, path.join(dirs.dist, 'js'), validExtensions.js);
  await ensureAndCopy(dirs.images, path.join(dirs.dist, 'images'), validExtensions.images);
};

// Utility: Generate HTML imports for assets
const generateAssetImports = async (dir, tagTemplate, validExts) => {
  if (!(await fs.pathExists(dir))) return '';
  const files = await fs.readdir(dir);
  return files
    .filter(file => validExts.includes(path.extname(file).toLowerCase()))
    .map(file => tagTemplate(file))
    .join('\n');
};

// Generate CSS and JS imports
const getCssImports = () => generateAssetImports(dirs.css, (file) => `<link rel="stylesheet" href="/css/${file}" />`,validExtensions.css);
const getJsImports = () => generateAssetImports(dirs.js, (file) => `<script src="/js/${file}"></script>`,validExtensions.js);

const tagsMap = new Map(); // Use Map for tag-to-pages mapping

// Utility function to capitalize strings
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);


// Function to read configuration JSON or YAML for a specific folder and merge with the parent config
const readMergedConfig = async (folderPath, parentConfig = {}) => {
  const configFiles = ['config.json', 'config.yaml', 'config.yml']; // Supported config files
  let folderConfig = { ...defaultConfig, ...parentConfig };

  for (const fileName of configFiles) {
    const filePath = path.join(folderPath, fileName);
    if (await fs.pathExists(filePath)) {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedConfig =
        fileName.endsWith('.json') ? JSON.parse(fileContent) : yaml.load(fileContent);
      folderConfig = { ...folderConfig, ...parsedConfig };
      break; // Stop after the first valid config file
    }
  }

  return folderConfig;
};

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

  // 2. Replace partial placeholders manually for async support
  const partialRegex = /{{\s*partial:\s*([\w-]+)\s*}}/g;
  const matches = [...modifiedTemplate.matchAll(partialRegex)];
  for (const match of matches) {
    const [fullMatch, partialName] = match;
    const partialPath = path.join(dirs.partials, `${partialName}.md`);
    let replacement = `<p>Partial "${partialName}" not found.</p>`;
    if (await fs.pathExists(partialPath)) {
      let partialContent = await fs.readFile(partialPath, 'utf-8');
      // Recursively replace placeholders in the partial content
      partialContent = await replacePlaceholders(partialContent, values);
      replacement = marked(partialContent); // Convert Markdown to HTML
    } else {
      console.warn(`Partial "${partialName}" not found.`);
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

// Utility: Cache and load layouts
const layoutCache = new Map();
const getLayout = async layoutName => {
  if (!layoutName) return null;
  if (layoutCache.has(layoutName)) return layoutCache.get(layoutName);

  const layoutPath = path.join(dirs.layouts, `${layoutName}.html`);
  if (await fs.pathExists(layoutPath)) {
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

function generateBreadcrumbs(filePath) {
  const relativePath = path.relative(dirs.pages, filePath); // Get the relative path from the pages directory
  const parts = relativePath.replace(/\.md$/, "").split(path.sep); // Ensure .html extension

  const breadcrumbs = parts.map((part, index) => {
    const link = "/" + parts.slice(0, index + 1).join('/') + ".html"; // Build the relative link
    const title = part
      .replace(/-/g, " ") // Replace dashes with spaces
      .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize each word

    return { link, title };
  });

  breadcrumbs.unshift({ link: '/', title: 'Home' });

  return breadcrumbs;
}

const generateSiblingLinks = (currentFile, folderFiles, parentPath) => {
  return folderFiles
    .filter(file => file !== currentFile && path.extname(file) === '.md')
    .map(file => ({
      title: capitalize(file.replace(/-/g, ' ').replace(/\.md$/, '')),
      path: `/${parentPath}/${file.replace(/\.md$/, '.html')}`,
    }));
};

const generateParentLink = parentPath => {
  return parentPath
    ? {
        title: capitalize(path.basename(parentPath)),
        path: `/${parentPath}.html`,
      }
    : null;
};

// Utility: Apply layout and wrap content in a Turbo Frame
const applyLayoutAndWrapContent = async (content, config, layoutName) => {
  const layoutContent = await getLayout(layoutName || config.layout);
  const [beforeLayout, afterLayout] = await applyLayout(layoutContent, config);

  return `
<turbo-frame id="content">
  <head><title>${config.title} | ${config.sitename}</title></head>
  ${beforeLayout}
  ${content}
  ${afterLayout}
</turbo-frame>
  `;
};

// Utility: Write an HTML page
const writePage = async (filePath, content) => {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
};

const makeLinkConfig = async (file,filePath,folderFiles,parentTitle) => {
    const breadcrumbs = generateBreadcrumbs(filePath);
    const siblingLinks = generateSiblingLinks(file, folderFiles, parentTitle || '');
    const parentLink = generateParentLink(parentTitle);
    config = {}
    config.breadcrumbs = breadcrumbs
      .map(crumb => `<a class="breadcrumb" href="${crumb.link}" data-turbo-frame="content" data-turbo-action="advance">${crumb.title}</a>`)
      .join(" &raquo; ");
    config.siblingLinks = siblingLinks
      .map(sibling => `<a class="sibling" href="${sibling.path}" data-turbo-frame="content" data-turbo-action="advance">${sibling.title}</a>`)
      .join('');

    config.parentLink = parentLink
      ? `<a class="parent" href="${parentLink.path}" data-turbo-frame="content" data-turbo-action="advance">${parentLink.title}</a>`
      : '';

    return config
}

const convertMarkdownToTurboFrame = async (sourceDir, outputDir, parentTitle = null, parentConfig = {}) => {
  if (!(await fs.pathExists(sourceDir))) return [];

  const files = await fs.readdir(sourceDir);
  const links = [];

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const folderFiles = files.filter(f => f !== file); // Files in the same folder
    const stats = await fs.stat(filePath);
    
    const linkConfig = await makeLinkConfig(file,filePath,folderFiles,parentTitle);
    const folderConfig = await readMergedConfig(sourceDir, {...parentConfig,...linkConfig});
    const titleFromFilename = capitalize(file.replace(/\.md$/, '').replace(/-/g, ' '));
  
    if (stats.isDirectory()) {
       // Handle subfolder
       folderConfig.title = titleFromFilename;
       const outputFolder = path.join(outputDir, file);
       fs.ensureDirSync(outputFolder);
       const folderLinks = await convertMarkdownToTurboFrame(
         path.join(sourceDir, file),
         outputFolder,
         file,
         folderConfig
       );
 
       // Create folder index page
       const folderIndexFilePath = path.join(outputDir, `${file}.html`);
       await generateFolderIndex(folderIndexFilePath, file, folderLinks, folderConfig);
  
       links.push({ title: capitalize(file), path: `/${file}` });
    } else if (path.extname(file) === '.md') {
      // Handle markdown file
      const markdownContent = await fs.readFile(filePath, 'utf-8');
      //const markdownWithPartials = await processPartials(markdownContent, dirs.partials);
      const { data: pageConfig, content: parsedContent } = matter(markdownContent);
      const config = { ...defaultConfig, ...parentConfig, ...folderConfig, ...pageConfig };
      config.title = pageConfig.title || titleFromFilename;
      config.date = new Date(pageConfig.date || stats.mtime).toLocaleDateString(undefined,config.dateFormat);
       // Handle tags
      const tags = config.tags;
      if (tags) {
        for (const tag of tags) {
          if (!tagsMap.has(tag)) {
            tagsMap.set(tag, []);
          }
          tagsMap.get(tag).push({
            title: config.title,
            path: `${parentTitle ? `/${parentTitle}` : ''}/${path.basename(file, '.md')}`
          });
        }
      }
      config.tagLinks = tags && tags.length
        ? `<div class="tags">${tags.map(tag => `<a class="tag" href="/tags/${tag}.html" data-turbo-frame="content" data-turbo-action="advance">${tag}</a>`).join('')}</div>`
        : '';
      const content = await replacePlaceholders(parsedContent, config);
      const markedContent = marked(content);
      const wrappedContent = await applyLayoutAndWrapContent(markedContent, config, config.layout);
      const outputFilePath = path.join(outputDir, `${path.basename(file, '.md')}.html`);

      await writePage(outputFilePath, wrappedContent);

      // Correct the link path to include folder structure
      const relativePath = path.relative(dirs.pages, filePath); // Calculate relative path from source base
      const linkPath = `/${relativePath.replace(/\.md$/, '').replace(/\\/g, '/')}`; // Ensure proper URL formatting
      links.push({ title: titleFromFilename, path: linkPath, date: config.date });
    }
  }

  return links;
};

// Function to generate a folder index
const generateFolderIndex = async (indexFilePath, folderName, folderLinks, config) => {
  const listItems = folderLinks
    .map(link => `<li>${link.date}: <a href="${link.path}.html" data-turbo-frame="content">${link.title}</a></li>`)
    .join('');
  const content = `<ul>${listItems}</ul>`;
  const wrappedContent = await applyLayoutAndWrapContent(content, config, config.layout);

  await writePage(indexFilePath, wrappedContent);
};

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
          `<li><a href="${page.path}.html" data-turbo-frame="content" data-turbo-action="advance">${page.title}</a></li>`
      )
      .join('\n')
    const content = `<ul>${listItems}</ul>`;

    const files = await fs.readdir(dirs.pages);
    const linkConfig = await makeLinkConfig(isIndexPage ? "tags" : tag, path.join(dirs.pages, `tags`), files,isIndexPage ? null : "tags");
    const folderConfig = await readMergedConfig(dirs.pages, { ...defaultConfig, ...linkConfig });
    const config = { ...folderConfig, title: isIndexPage ? 'All Tags' : `Pages tagged with ${capitalize(tag)}` };

    const wrappedContent = await applyLayoutAndWrapContent(content, config);
    
    const outputDir = isIndexPage ? path.join(dirs.dist, 'tags.html') : path.join(dirs.dist, 'tags', `${tag}.html`);

    await writePage(outputDir, wrappedContent);
  }
};

// Function to generate the main navigation HTML
const generateNavigation = links => {
  // Remove "home" from links to avoid duplicate entry
  const filteredLinks = links.filter(link => link.title.toLowerCase() !== 'index');

  const navLinks = filteredLinks
    .map(
      link =>
        `<a href="${link.path}.html" data-turbo-frame="content" data-turbo-action="advance">${link.title}</a>`
    )
    .join('\n');

  return `
  <nav>
    ${navLinks}
  </nav>`;
};

// Function to read and render the index template
const renderIndexTemplate = async (homeHtmlContent, siteConfig, pageLinks) => {
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
  templateContent = await replacePlaceholders(templateContent,{...defaultConfig,...siteConfig,content,nav: generateNavigation(pageLinks)})

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

// Main function to handle conversion and site generation
const generateSite = async () => {
  console.log('Starting build process...');

  // Start with default config
  const siteConfig = await readMergedConfig(dirs.pages);

  // Copy images, CSS, and JS files
  await copyAssets();

  // Convert markdown in pages directory
  const pageLinks = await convertMarkdownToTurboFrame(dirs.pages, dirs.dist, null, siteConfig);

  // Read home.md file and generate home page content
  const homeFilePath = path.join(dirs.pages, 'index.md');
  let homeHtmlContent = '';
  if (await fs.pathExists(homeFilePath)) {
    const homeMarkdown = await fs.readFile(homeFilePath, 'utf-8');
    homeHtmlContent = marked(homeMarkdown);
  }

  await generateTagPages(tagsMap);
  await generateTagPages(tagsMap,true);


  // Generate index page with the dynamic content
  const indexHtml = await renderIndexTemplate(homeHtmlContent, siteConfig, pageLinks);

  // Write the final HTML to the dist directory
  await fs.writeFile(path.join(dirs.dist, 'index.html'), indexHtml);
};

// Run the site generation process
generateSite()
  .then(() => console.log('Site generated successfully!'))
  .catch(err => console.error('Error generating site:', err));