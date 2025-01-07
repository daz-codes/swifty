const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');
const yaml = require('js-yaml'); 


// Paths for source and destination directories
const pagesDir = path.join(__dirname, 'pages');
const imagesDir = path.join(__dirname, 'images');
const distDir = path.join(__dirname, 'dist');

const tagsMap = new Map(); // Use Map for tag-to-pages mapping

// Default configuration
const defaultConfig = {
  title: "My Swifty Site",
  author: "Taylor Swift",
  dates: false,
  showHeading: true,
};

// Ensure dist directory exists
fs.ensureDirSync(distDir);

// Utility function to capitalize strings
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);


// Function to read configuration JSON or YAML for a specific folder and merge with the parent config
const readMergedConfig = async (folderPath, parentConfig = {}) => {
  const jsonConfigPath = path.join(folderPath, 'config.json');
  const yamlConfigPath = path.join(folderPath, 'config.yaml');
  const ymlConfigPath = path.join(folderPath, 'config.yml');
  let folderConfig = { ...defaultConfig, ...parentConfig };

  if (await fs.pathExists(jsonConfigPath)) {
    // Read JSON config
    const jsonConfig = await fs.readJson(jsonConfigPath);
    folderConfig = { ...folderConfig, ...jsonConfig };
  } else if (await fs.pathExists(yamlConfigPath)) {
    // Read YAML config
    const yamlConfig = yaml.load(await fs.readFile(yamlConfigPath, 'utf-8'));
    folderConfig = { ...folderConfig, ...yamlConfig };
  } else if (await fs.pathExists(ymlConfigPath)) {
    // Read .yml config (alternative YAML extension)
    const ymlConfig = yaml.load(await fs.readFile(ymlConfigPath, 'utf-8'));
    folderConfig = { ...folderConfig, ...ymlConfig };
  }

  return folderConfig;
};

// Function to replace {{ value }} placeholders in a string
const replacePlaceholders = (template, values) => {
  return template.replace(/{{\s*([^}\s]+)\s*}}/g, (match, key) => {
    return key in values ? values[key] : match;
  });
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

// Function to convert markdown files to turbo-frame-wrapped HTML
const convertMarkdownToTurboFrame = async (sourceDir, outputDir, parentTitle = null, parentConfig = {}) => {
  if (!(await fs.pathExists(sourceDir))) return [];

  const files = await fs.readdir(sourceDir);
  const links = [];

  // Read and merge config for the current folder
  const folderConfig = await readMergedConfig(sourceDir, parentConfig);

  for (const file of files) {
    const filePath = path.join(sourceDir, file);

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
      await generateFolderIndex(folderIndexFilePath, folderName, folderLinks);

      links.push({ title: capitalize(folderName), path: `/${folderName}` });
    } else if (path.extname(file) === '.md') {
      // Handle markdown file
      const markdownContent = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(markdownContent);
      const frontMatter = parsed.data || {};
      const parsedContent = parsed.content;

      const stats = await fs.stat(filePath);


      // Merge configurations with precedence: frontMatter > folderConfig > parentConfig > defaultConfig
      const config = {
        ...defaultConfig,
        ...parentConfig,
        ...folderConfig,
        ...frontMatter,
      };

      const humanReadableTitle = path
      .basename(file, '.md')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

      const title = frontMatter.title || humanReadableTitle;

      const date = config.date || new Date(stats.birthtime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      // Replace {{ value }} placeholders in the markdown content
      const content = replacePlaceholders(parsedContent, config);

      // Update image links in the Markdown content
      const contentWithImages = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, altText, imgPath) => {
        const relativePath = `/images/${path.basename(imgPath)}`;
        return `![${altText}](${relativePath})`;
      });

      // Convert markdown to HTML
      const htmlContent = marked(contentWithImages);

      // Get values from the merged config
      const author = config.author;
      const showInfo = config.showInfo;  
      const showHeading = config.showHeading;
      const backlink = parentTitle
        ? `<p><a href="/${parentTitle}.html" data-turbo-frame="content" data-turbo-action="advance">Back to ${capitalize(
            parentTitle
          )}</a></p>`
        : '';

      // Only include author if it exists
      const infoLine = showInfo ? `<p>Posted by ${author} on ${date}</p>` : '';

      const summaryHtml = config.summary ? `<div class="summary">${config.summary}</div>` : '';


      // Handle tags
      const tags = config.tags;
      if (tags) {
        for (const tag of tags) {
          if (!tagsMap.has(tag)) {
            tagsMap.set(tag, []);
          }
          tagsMap.get(tag).push({
            title: title,
            path: `${parentTitle ? `/${parentTitle}` : ''}/${path.basename(file, '.md')}`,
          });
        }
      }
      const tagsHtml = tags && tags.length
        ? `<div class="tags">${tags.map((tag) => `<a class="tag" href="/tags/${tag}.html" data-turbo-frame="content" data-turbo-action="advance">${tag}</a>`).join('')}</div>`
        : '';

      // Only include <h1> if showHeading is true
      const heading = showHeading ? `<h1>${title}</h1>` :  '';

      const wrappedContent = `
<turbo-frame id="content" data-title="${config.title || humanReadableTitle}">
  ${backlink}
  ${heading}
  ${infoLine}
  ${tagsHtml}
  ${summaryHtml}
  ${htmlContent}
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
const generateFolderIndex = async (filePath, folderName, links) => {
  const content = `
<turbo-frame id="content">
  <h1>${capitalize(folderName)}</h1>
  <ul>
    ${links
      .map(
        (link) =>
          `<li><a href="${link.path}.html" data-turbo-frame="content" data-turbo-action="advance">${link.title}</a></li>`
      )
      .join('\n')}
  </ul>
</turbo-frame>
  `;

  await fs.writeFile(filePath, content);
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
<nav>
  <ul>
    ${navLinks}
  </ul>
</nav>
  `;
};

// Function to read and render the index template
const renderIndexTemplate = async (homeHtmlContent, siteConfig, pageLinks) => {
  // Read the template from pages folder
  const templatePath = path.join(pagesDir, 'index.html');
  let templateContent = await fs.readFile(templatePath, 'utf-8');

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
  // Start with default config
  const siteConfig = await readMergedConfig(pagesDir);

  await copyImages(pagesDir, distDir);


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
