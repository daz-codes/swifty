const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter'); // For parsing front matter


// Paths for source and destination directories
const pagesDir = path.join(__dirname, 'pages');
const distDir = path.join(__dirname, 'dist');

// Default configuration
const defaultConfig = {
  title: 'My Swifty Site',
  author: null,
  dates: false,
  tags: [],
  showHeading: true,
};

// Ensure dist directory exists
fs.ensureDirSync(distDir);

// Utility function to capitalize strings
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Function to read configuration JSON for a specific folder and merge with the parent config
const readMergedConfig = async (folderPath, parentConfig = {}) => {
  const folderConfigPath = path.join(folderPath, 'config.json');
  let folderConfig = { ...defaultConfig, ...parentConfig };

  if (await fs.pathExists(folderConfigPath)) {
    const folderSpecificConfig = await fs.readJson(folderConfigPath);
    folderConfig = { ...folderConfig, ...folderSpecificConfig };
  }

  return folderConfig;
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
      const content = parsed.content;
      const htmlContent = marked(content);

      const humanReadableTitle = path
        .basename(file, '.md')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      const stats = await fs.stat(filePath);
      const createdDate = new Date(stats.birthtime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      // Merge configurations with precedence: frontMatter > folderConfig > parentConfig > defaultConfig
      const effectiveConfig = {
        ...defaultConfig,
        ...parentConfig,
        ...folderConfig,
        ...frontMatter,
      };

      // Get values from the merged config
      const author = effectiveConfig.author || null;
      const showDate = effectiveConfig.dates === true;  // If dates is explicitly set to "true", show date
      const showHeading = effectiveConfig.showHeading !== false;  // Check if showHeading is explicitly false
      const backlink = parentTitle
        ? `<p><a href="/${parentTitle}.html" data-turbo-frame="content" data-turbo-action="advance">Back to ${capitalize(
            parentTitle
          )}</a></p>`
        : '';

      // Only include author if it exists
      const infoLine = author
      ? `<p>Posted by ${author}${showDate ? ` on ${createdDate}` : ''}</p>`
      : '';

      // Handle tags
      const tags = effectiveConfig.tags || [];
      const tagsHtml = tags.length
        ? `<div class="tags">${tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>`
        : '';

      // Only include <h1> if showHeading is true
      const heading = showHeading ? `<h1>${humanReadableTitle}</h1>` :  '';

      const wrappedContent = `
<turbo-frame id="content" data-title="${effectiveConfig.title || humanReadableTitle}">
  ${backlink}
  ${heading}
  ${infoLine}
  ${tagsHtml}
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

// Function to generate the main navigation HTML
const generateNavigation = (links) => {
  // Remove "home" from links to avoid duplicate entry
  const filteredLinks = links.filter(link => link.title.toLowerCase() !== 'home');

  const homeLink = `<li><a href="/" data-turbo-frame="content" data-turbo-action="advance">Home</a></li>`;
  const otherLinks = filteredLinks
    .map(
      (link) =>
        `<li><a href="${link.path}.html" data-turbo-frame="content" data-turbo-action="advance">${link.title}</a></li>`
    )
    .join('\n');

  return `
<nav>
  <ul>
    ${homeLink} <!-- Add Home link once at the top -->
    ${otherLinks}
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
    if (path === "/" || path === "/home.html") {
      turboFrame.setAttribute("src", "/home.html"); // Load home.html for the root path
    } else {
      const pagePath = path.endsWith(".html") ? path : path + ".html";
      turboFrame.setAttribute("src", pagePath);
    }
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

  const siteTitle = siteConfig.title || defaultConfig.title;

  // Convert markdown in pages directory
  const pageLinks = await convertMarkdownToTurboFrame(pagesDir, distDir, null, siteConfig);

  // Read home.md file and generate home page content
  const homeFilePath = path.join(pagesDir, 'home.md');
  let homeHtmlContent = '';
  if (await fs.pathExists(homeFilePath)) {
    const homeMarkdown = await fs.readFile(homeFilePath, 'utf-8');
    homeHtmlContent = marked(homeMarkdown);
  }

  // Generate index page with the dynamic content
  const indexHtml = await renderIndexTemplate(homeHtmlContent, siteConfig, pageLinks);

  // Write the final HTML to the dist directory
  await fs.writeFile(path.join(distDir, 'index.html'), indexHtml);
};

// Run the site generation process
generateSite()
  .then(() => console.log('Site generated successfully!'))
  .catch((err) => console.error('Error generating site:', err));
