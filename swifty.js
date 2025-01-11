const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');
const yaml = require('js-yaml'); 


// Paths for source and destination directories
const pagesDir = path.join(__dirname, 'pages');
const imagesDir = path.join(__dirname, 'images');
const distDir = path.join(__dirname, 'dist');
const layoutsDir = path.join(__dirname, 'layouts');
const cssDir = path.join(__dirname, 'css');
const jsDir = path.join(__dirname, 'js');

const tagsMap = new Map(); // Use Map for tag-to-pages mapping

// Default configuration
const defaultConfig = {
  title: "My Swifty Site",
  author: "Taylor Swift",
};

// Ensure dist directory exists
fs.ensureDirSync(distDir);

// Utility function to capitalize strings
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Function to generate import statements for CSS files
const getCssImports = async () => {
  if (!(await fs.pathExists(cssDir))) return '';
  const cssFiles = await fs.readdir(cssDir);
  return cssFiles
    .filter((file) => file.endsWith('.css'))
    .map((file) => `<link rel="stylesheet" href="/css/${file}" />`)
    .join('\n');
};

// Function to generate script tags for JS files
const getJsImports = async () => {
  if (!(await fs.pathExists(jsDir))) return '';
  const jsFiles = await fs.readdir(jsDir);
  return jsFiles
    .filter((file) => file.endsWith('.js'))
    .map((file) => `<script src="/js/${file}"></script>`)
    .join('\n');
};

const copyCss = async () => {
  const cssOutputDir = path.join(distDir, 'css');
  if (await fs.pathExists(cssDir)) {
    await fs.ensureDir(cssOutputDir);
    await fs.copy(cssDir, cssOutputDir);
    console.log(`CSS files copied to ${cssOutputDir}`);
  } else {
    console.log(`No CSS folder found in ${cssDir}`);
  }
};

const copyJs = async () => {
  const jsOutputDir = path.join(distDir, 'js');
  if (await fs.pathExists(jsDir)) {
    await fs.ensureDir(jsOutputDir);
    await fs.copy(jsDir, jsOutputDir);
    console.log(`JS files copied to ${jsOutputDir}`);
  } else {
    console.log(`No JS folder found in ${jsDir}`);
  }
};

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
const replacePlaceholders = (template, values) => {
  // 1. Extract code blocks (both inline and block)
  const codeBlockRegex = /(```[\s\S]*?```|`[^`]+`|<pre>[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>)/g;
  const codeBlocks = [];
  let modifiedTemplate = template.replace(codeBlockRegex, (match) => {
    // Store code blocks and replace them with placeholders
    const placeholder = `{{code_block_${codeBlocks.length}}}`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2. Replace placeholders in the rest of the content
  modifiedTemplate = modifiedTemplate.replace(/{{\s*([^}\s]+)\s*}}/g, (match, key) => {
    return key in values ? values[key] : "";
  });

  // 3. Re-insert the code blocks back into their original positions
  modifiedTemplate = modifiedTemplate.replace(/{{code_block_(\d+)}}/g, (match, index) => {
    return codeBlocks[index]; // Re-insert the code block
  });

  return modifiedTemplate;
};

const copyImages = async () => {
  const imagesOutputDir = path.join(distDir, 'images');
  if (await fs.pathExists(imagesDir)) {
    await fs.ensureDir(imagesDir);
    await fs.copy(imagesDir, imagesOutputDir);
    console.log(`Images copied to ${imagesOutputDir}`);
  } else {
    console.log(`No images folder found in ${imagesDir}`);
  }
};

const layoutCache = new Map(); // Use Map for layout caching

// Function to load and cache layouts
const getLayout = async (layoutName) => {
  if(layoutName == null) return
  if (layoutCache.has(layoutName)) {
    return layoutCache.get(layoutName);
  }

  const layoutPath = path.join(layoutsDir, `${layoutName}.html`);
  if (!(await fs.pathExists(layoutPath))) {
    console.warn(`Layout "${layoutName}" not found.`);
    return null;
  }

  const layoutContent = await fs.readFile(layoutPath, 'utf-8');
  layoutCache.set(layoutName, layoutContent); // Cache the layout
  return layoutContent;
};

// Function to apply layout to content
const applyLayout = (layoutContent, config) => {
  if (layoutContent == null) return ["", ""];

  // Specifically replace `{{ content }}`
  const splitLayout = layoutContent.split(/{{\s*content\s*}}/);

  // Ensure both before and after layout are defined
  const beforeLayout = replacePlaceholders(splitLayout[0],config) || "";
  const afterLayout = replacePlaceholders(splitLayout[1],config) || "";
  return [beforeLayout, afterLayout];
};

const processPartials = async (content, partialsDir) => {
  // Regex for identifying code blocks, both in Markdown (` ```code block``` `) and HTML (`<pre><code>...</code></pre>`)
  const codeBlockRegex = /(```[\s\S]*?```|<pre><code>[\s\S]*?<\/code><\/pre>)/g;

  // Function to replace partial placeholders, but ignoring code blocks
  const replacePlaceholdersIgnoringCodeBlocks = async (content) => {
    // First, escape the code block content by replacing it with a placeholder
    let codeBlockMatches = [];
    content = content.replace(codeBlockRegex, (match) => {
      const placeholder = `{{codeBlock_${codeBlockMatches.length}}}`;
      codeBlockMatches.push(match);
      return placeholder;
    });

    // Now replace the partials in the non-code block content
    const partialMatches = content.match(/{{\s*partial:\s*([\w-]+)\s*}}/g) || [];
    for (const match of partialMatches) {
      const partialName = match.match(/{{\s*partial:\s*([\w-]+)\s*}}/)[1];
      const partialPath = path.join(partialsDir, `${partialName}.md`);
      
      let renderedPartial = match;
      if (await fs.pathExists(partialPath)) {
        const partialContent = await fs.readFile(partialPath, 'utf-8');
        renderedPartial = marked(partialContent); // Convert partial markdown to HTML
      } else {
        console.warn(`Partial "${partialName}" not found in ${partialsDir}`);
        renderedPartial = `<p>Partial "${partialName}" not found.</p>`;
      }

      content = content.replace(match, renderedPartial);
    }

    // Replace placeholders with original code block content
    content = content.replace(/{{codeBlock_\d+}}/g, (match) => {
      const index = parseInt(match.match(/\d+/)[0]);
      return codeBlockMatches[index];
    });

    return content;
  };

  // Replace placeholders while ignoring code blocks
  content = await replacePlaceholdersIgnoringCodeBlocks(content);

  return content;
};

function generateBreadcrumbs(filePath) {
  const relativePath = path.relative(pagesDir, filePath); // Get the relative path from the pages directory
  const parts = relativePath.replace(/\.md$/, '.html').split(path.sep); // Ensure .html extension

  const breadcrumbs = parts.map((part, index) => {
    const link = '/' + parts.slice(0, index + 1).join('/'); // Build the relative link
    const title = part
      .replace(/-/g, ' ') // Replace dashes with spaces
      .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize each word

    return { link, title };
  });

  breadcrumbs.unshift({ link: '/', title: 'Home' });

  return breadcrumbs;
}

const generateSiblingLinks = (currentFile, folderFiles, parentPath) => {
  return folderFiles
    .filter((file) => file !== currentFile && path.extname(file) === '.md')
    .map((file) => ({
      title: capitalize(file.replace(/-/g, ' ').replace(/\.md$/, '')),
      path: `/${parentPath}/${file.replace(/\.md$/, '.html')}`,
    }));
};

const generateParentLink = (parentPath) => {
  return parentPath
    ? {
        title: capitalize(path.basename(parentPath)),
        path: `/${parentPath}.html`,
      }
    : null;
};

// Function to convert markdown files to turbo-frame-wrapped HTML
const convertMarkdownToTurboFrame = async (sourceDir, outputDir, parentTitle = null, parentConfig = {}) => {
  const partialsDir = path.join(__dirname, 'partials'); // Define partials directory

  if (!(await fs.pathExists(sourceDir))) return [];

  const files = await fs.readdir(sourceDir);
  const links = [];

  // Read and merge config for the current folder
  const folderConfig = await readMergedConfig(sourceDir, parentConfig);
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const folderFiles = files.filter((f) => f !== file); // Files in the same folder

    const breadcrumbs = generateBreadcrumbs(filePath);
    const siblingLinks = generateSiblingLinks(file, folderFiles, parentTitle || '');
    const parentLink = generateParentLink(parentTitle);

    folderConfig.breadcrumbs = breadcrumbs
      .map(crumb => `<a href="${crumb.link}" data-turbo-frame="content" data-turbo-action="advance">${crumb.title}</a>`)
      .join(' &raquo; ');

    folderConfig.siblingLinks = siblingLinks
      .map(sibling => `<a href="${sibling.path}" data-turbo-frame="content" data-turbo-action="advance">${sibling.title}</a>`)
      .join('');

    folderConfig.parentLink = parentLink
      ? `<a href="${parentLink.path}" data-turbo-frame="content">${parentLink.title}</a>`
      : '';

    if ((await fs.stat(filePath)).isDirectory()) {
      // Handle subfolder
      const folderName = file;
      const outputFolder = path.join(outputDir, folderName);
      fs.ensureDirSync(outputFolder);
      const folderLinks = await convertMarkdownToTurboFrame(
        path.join(sourceDir, folderName),
        outputFolder,
        folderName,
        folderConfig
      );

      // Create folder index page
      const folderIndexFilePath = path.join(outputDir, `${folderName}.html`);
      await generateFolderIndex(folderIndexFilePath, folderName, folderLinks, folderConfig);

      links.push({ title: capitalize(folderName), path: `/${folderName}` });
    } else if (path.extname(file) === '.md') {
      // Handle markdown file
      const markdownContent = await fs.readFile(filePath, 'utf-8');
      // Process partials
      const markdownContentWithPartials = await processPartials(markdownContent, partialsDir);
      const parsed = matter(markdownContentWithPartials);
      const pageConfig = parsed.data || {};
      const parsedContent = parsed.content;

      const stats = await fs.stat(filePath);

      // Merge configurations with precedence: pageConfig > folderConfig > parentConfig > defaultConfig
      const config = {
        ...defaultConfig,
        ...parentConfig,
        ...folderConfig,
        ...pageConfig,
      };

      const humanReadableTitle = path
      .basename(file, '.md')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

      config.title = pageConfig.title || humanReadableTitle;

      config.date = new Date(pageConfig.date || stats.mtime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      config.backlink = parentTitle
      ? `<a href="/${parentTitle}.html" data-turbo-frame="content" data-turbo-action="advance">${capitalize(
          parentTitle
        )}</a>`
      : '';

    // Handle tags
    const tags = config.tags;
    if (tags) {
      for (const tag of tags) {
        if (!tagsMap.has(tag)) {
          tagsMap.set(tag, []);
        }
        tagsMap.get(tag).push({
          title: config.title,
          path: `${parentTitle ? `/${parentTitle}` : ''}/${path.basename(file, '.md')}`,
        });
      }
    }
    config.tagLinks = tags && tags.length
      ? `<div class="tags">${tags.map((tag) => `<a class="tag" href="/tags/${tag}.html" data-turbo-frame="content" data-turbo-action="advance">${tag}</a>`).join('')}</div>`
      : '';

      // Replace {{ value }} placeholders in the markdown content
      const content = replacePlaceholders(parsedContent, config);

      // Convert markdown to HTML
      const htmlContent = marked(content);

      // Get layout, if specified
      const layoutName = config.layout;
      const layoutContent = await getLayout(layoutName);

      // Apply layout if it exists
      const [beforeLayout,afterLayout] = applyLayout(layoutContent,config);

      const wrappedContent = `
<turbo-frame id="content" data-title="${config.title || humanReadableTitle}">
  ${beforeLayout}
  ${htmlContent}
  ${afterLayout}
</turbo-frame>
      `;

      const outputFilePath = path.join(outputDir, `${path.basename(file, '.md')}.html`);
      await fs.writeFile(outputFilePath, wrappedContent);

      links.push({ title: humanReadableTitle, path: `${parentTitle ? `/${parentTitle}` : ''}/${path.basename(file, '.md')}` });
    }
  }

  return links;
};

// Function to generate folder index HTML
const generateFolderIndex = async (indexFilePath, folderName, folderLinks, config) => {
  const folderPath = path.dirname(indexFilePath);
  // Example of replacing placeholders or using the config
  config.title = capitalize(folderName);

  // Get layout, if specified
  const layoutName = config.layout;
  const layoutContent = await getLayout(layoutName);

  // Apply layout if it exists
  const [beforeLayout,afterLayout] = applyLayout(layoutContent,config);

  // Generate the index content
  const htmlContent = `
  <ul>
    ${folderLinks
      .map(link => `<li><a href="${link.path}.html" data-turbo-frame="content">${link.title}</a></li>`)
      .join('')}
  </ul>
  `;

  const folderIndexContent = `
<turbo-frame id="content" data-title="${config.title || humanReadableTitle}">
  ${beforeLayout}
  ${htmlContent}
  ${afterLayout}
</turbo-frame>
      `;

  // Write the folder index file
  await fs.writeFile(indexFilePath, folderIndexContent);
};



const generateTagPages = async (outputDir) => {
  const tagsDir = path.join(outputDir, 'tags');
  fs.ensureDirSync(tagsDir);

  for (const [tag, pages] of tagsMap) {
    const tagFilePath = path.join(tagsDir, `${tag}.html`);

    const content = `
<turbo-frame id="content">
  <h1>Pages tagged with "${tag}"</h1>
  <ul>
    ${pages
      .map(
        (page) =>
          `<li><a href="${page.path}.html" data-turbo-frame="content" data-turbo-action="advance">${page.title}</a></li>`
      )
      .join('\n')}
  </ul>
</turbo-frame>
    `;

    await fs.writeFile(tagFilePath, content);
  }
};

const generateTagsIndexPage = async (outputDir) => {
  const tagsPagePath = path.join(outputDir, 'tags.html');

  const content = `
<turbo-frame id="content">
  <h1>All Tags</h1>
  <ul>
    ${Array.from(tagsMap.keys())
      .map(
        (tag) =>
          `<li><a href="/tags/${tag}.html" data-turbo-frame="content" data-turbo-action="advance">${tag}</a></li>`
      )
      .join('\n')}
  </ul>
</turbo-frame>
  `;

  await fs.writeFile(tagsPagePath, content);
};

// Function to generate the main navigation HTML
const generateNavigation = (links) => {
  // Remove "home" from links to avoid duplicate entry
  const filteredLinks = links.filter(link => link.title.toLowerCase() !== 'index');

  const navLinks = filteredLinks
    .map(
      (link) =>
        `<li><a href="${link.path}.html" data-turbo-frame="content" data-turbo-action="advance">${link.title}</a></li>`
    )
    .join('\n');

  return `
  <nav><ul>
    ${navLinks}
  </ul></nav>
  `;
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

  // Replace placeholders with dynamic values
  templateContent = templateContent
    .replaceAll('{{title}}', siteConfig.title || defaultConfig.title)
    .replaceAll('{{nav}}', generateNavigation(pageLinks))
    .replaceAll('{{content}}', homeHtmlContent);

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
  document.addEventListener("turbo:frame-load", (event) => {
    const turboFrame = event.target;

    // Update the title
    const newTitle = turboFrame.getAttribute("data-title");
    console.log("newTitle: ",newTitle,turboFrame)
    if (newTitle) {
      document.title = newTitle;
    }

    // Update the address bar without appending '/home' for the root
    const frameSrc = turboFrame.getAttribute("src");
    if (frameSrc && frameSrc.endsWith("home.html")) {
      window.history.pushState({}, "", "/");
    } else if (frameSrc && frameSrc.endsWith(".html")) {
      const newPath = frameSrc.replace(".html", "");
      window.history.pushState({}, "", newPath);
    }
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
  const siteConfig = await readMergedConfig(pagesDir);

  // Copy images, CSS, and JS files
  await copyImages();
  await copyCss();
  await copyJs();

  // Convert markdown in pages directory
  const pageLinks = await convertMarkdownToTurboFrame(pagesDir, distDir, null, siteConfig);

  // Read home.md file and generate home page content
  const homeFilePath = path.join(pagesDir, 'index.md');
  let homeHtmlContent = '';
  if (await fs.pathExists(homeFilePath)) {
    const homeMarkdown = await fs.readFile(homeFilePath, 'utf-8');
    homeHtmlContent = marked(homeMarkdown);
  }

  await generateTagPages(distDir);
  await generateTagsIndexPage(distDir);

  // Generate index page with the dynamic content
  const indexHtml = await renderIndexTemplate(homeHtmlContent, siteConfig, pageLinks);

  // Write the final HTML to the dist directory
  await fs.writeFile(path.join(distDir, 'index.html'), indexHtml);
};

// Run the site generation process
generateSite()
  .then(() => console.log('Site generated successfully!'))
  .catch((err) => console.error('Error generating site:', err));
