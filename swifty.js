const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const { generateIndexContent } = require('./index'); // Reuse your existing index generator

// Paths
const pagesDir = path.join(__dirname, 'pages');
const distDir = path.join(__dirname, 'dist');

// Ensure dist directory exists
fs.ensureDirSync(distDir);

// Read configuration JSON if present
const readConfig = async (dir) => {
  const configPath = path.join(dir, 'config.json');
  if (await fs.pathExists(configPath)) {
    return await fs.readJson(configPath);
  }
  return {};
};

// Convert Markdown to HTML and handle folders
const convertMarkdownToTurboFrame = async (sourceDir, outputDir, folderPath = '') => {
  if (!(await fs.pathExists(sourceDir))) {
    console.log(`Skipping ${sourceDir} - directory does not exist.`);
    return [];
  }

  const files = await fs.readdir(sourceDir);
  const links = [];
  const config = await readConfig(sourceDir);

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const outputFilePath = path.join(outputDir, folderPath, `${path.basename(file, '.md')}.html`);

    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const subfolder = file;
      const subfolderOutputDir = path.join(outputDir, subfolder);
      fs.ensureDirSync(subfolderOutputDir);

      // Recursive call for subfolder
      const subfolderLinks = await convertMarkdownToTurboFrame(
        path.join(sourceDir, subfolder),
        distDir,
        subfolder
      );

      // Generate index page for the subfolder
      const subfolderIndexContent = `
<turbo-frame id="content">
  <h1>${config.title || subfolder.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h1>
  <ul>
    ${subfolderLinks.join('\n')}
  </ul>
</turbo-frame>
      `;
      await fs.writeFile(
        path.join(distDir, `${subfolder}.html`),
        subfolderIndexContent
      );
      console.log(`Subfolder index created at ${subfolder}.html`);

      // Add a link to the subfolder's index page
      links.push(
        `<li><a href="/${subfolder}.html" data-turbo-frame="content" data-turbo-action="advance">${subfolder.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</a></li>`
      );
    } else if (path.extname(file) === '.md') {
      // Handle markdown file
      const markdownContent = await fs.readFile(filePath, 'utf-8');
      const htmlContent = marked(markdownContent);

      const createdDate = new Date(stats.birthtime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      const humanReadableTitle = path.basename(file, '.md').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const author = config.author || 'Unknown Author';

      const wrappedContent = `<turbo-frame id="content">
<h1>${humanReadableTitle}</h1>
<p>Posted on ${createdDate}, by ${author}</p>
${htmlContent}
</turbo-frame>`;

      await fs.writeFile(outputFilePath, wrappedContent);
      console.log(`Converted ${file} to ${outputFilePath}`);

      links.push(
        `<li><a href="/${folderPath}/${path.basename(file, '.md')}.html" data-turbo-frame="content" data-turbo-action="advance">${humanReadableTitle}</a></li>`
      );
    }
  }

  return links;
};

// Main Function
const generateSite = async () => {
  const links = await convertMarkdownToTurboFrame(pagesDir, distDir);

  // Generate the main index.html
  const indexContent = `
<turbo-frame id="content">
  <h1>Welcome to Swifty</h1>
  <ul>
    ${links.join('\n')}
  </ul>
</turbo-frame>
  `;
  await fs.writeFile(path.join(distDir, 'index.html'), indexContent);
  console.log('Main index.html created');
};

generateSite()
  .then(() => console.log('Site generation complete'))
  .catch((err) => console.error('Error generating site:', err));
