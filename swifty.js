const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const { generateIndexContent } = require('./index'); // Import the index content function

// Paths for source and destination directories
const pagesDir = path.join(__dirname, 'pages');
const distDir = path.join(__dirname, 'dist');
const postsDir = path.join(pagesDir, 'posts');
const distPostsDir = path.join(distDir, 'posts');
const indexFilePath = path.join(distDir, 'index.html');
const postsFilePath = path.join(distDir, 'posts.html');

// Ensure dist directories exist
fs.ensureDirSync(distDir);
fs.ensureDirSync(distPostsDir); // Ensure dist/posts directory exists

// Function to convert markdown files to turbo-frame-wrapped HTML
const convertMarkdownToTurboFrame = async (sourceDir, outputDir, isPost = false) => {
  if (!(await fs.pathExists(sourceDir))) {
    console.log(`Skipping ${sourceDir} - directory does not exist.`);
    return [];
  }

  const files = await fs.readdir(sourceDir);
  let links = [];

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const outputFilePath = path.join(outputDir, `${path.basename(file, '.md')}.html`);

    // Check if it's a Markdown file
    if (path.extname(file) === '.md') {
      const markdownContent = await fs.readFile(filePath, 'utf-8');
      const htmlContent = marked(markdownContent);

      // Initialize wrappedContent
      let wrappedContent;

      if (isPost) {
        // Get file creation date for posts
        const stats = await fs.stat(filePath);
        const createdDate = new Date(stats.birthtime).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }); // Format the date
        const humanReadableTitle = path.basename(file, '.md').replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); // Human-readable title

        // Build the wrapped content for posts
        wrappedContent = `<turbo-frame id="content">\n<a href="/posts.html" data-turbo-frame="content" data-turbo-action="advance">All Posts</a><h1>${humanReadableTitle}</h1>\n<p>posted on ${createdDate}, by DAZ</p>\n${htmlContent}\n</turbo-frame>`;
      } else {
        // For non-post pages, wrap content without title and date
        wrappedContent = `<turbo-frame id="content">\n${htmlContent}\n</turbo-frame>`;
      }
      // Save the resulting HTML in the correct directory
      await fs.writeFile(outputFilePath, wrappedContent);
      console.log(`Converted ${file} to ${outputFilePath}`);

      // Create link for the index, excluding "home.md"
      if (file !== 'home.md') {
        const linkPath = isPost ? `posts/${path.basename(file, '.md')}` : path.basename(file, '.md');
        const link = `<li><a href="/${linkPath}.html" data-turbo-frame="content" data-turbo-action="advance">${path.basename(file, '.md').replace(/-/g, ' ')}</a></li>`;
        links.push(link);
      }
    }
  }

  return links;
};

// Main function to handle conversion and index generation
const generateSite = async () => {
  // Convert markdown in pages directory and generate links
  const pageLinks = await convertMarkdownToTurboFrame(pagesDir, distDir);

  // Convert markdown in posts directory and generate links if the directory exists
  const postLinks = await convertMarkdownToTurboFrame(postsDir, distPostsDir, true);

  // Generate the index.html file
  const indexContent = generateIndexContent(pageLinks, postLinks); // Call the imported function

  // Append Turbo script and other script tags
  const fullIndexContent = indexContent.replace(
    '</body>',
    `
    <script type="module">import * as Turbo from 'https://esm.sh/@hotwired/turbo';</script>
    <script>
      (function() {
        const turboFrame = document.querySelector("turbo-frame#content");
        const path = window.location.pathname;

        // Set the src attribute for the turbo frame
        if (path === "/") {
          turboFrame.setAttribute("src", "/home.html"); // Load home.html for the root path
        } else {
          const pagePath = path.endsWith(".html") ? path : path + ".html";
          turboFrame.setAttribute("src", pagePath);
        }
      })();

      document.addEventListener("turbo:frame-load", (event) => {
        const frameSrc = event.target.getAttribute("src");

        // Update the address bar without appending '/home' for the root
        if (frameSrc && frameSrc.endsWith("home.html")) {
          window.history.pushState({}, "", "/");
        } else if (frameSrc && frameSrc.endsWith(".html")) {
          const newPath = frameSrc.replace(".html", "");
          window.history.pushState({}, "", newPath);
        }
      });
    </script>
  </body>`
  );

  // Write the index file to the dist directory
  await fs.writeFile(indexFilePath, fullIndexContent);
  console.log(`Index file created at ${indexFilePath}`);

  // Generate the posts.html file with a list of links to all posts if any posts exist
  if (postLinks.length > 0) {
    const postsContent = `
<turbo-frame id="content">
  <h1>Posts</h1>
  <ul>
    ${postLinks.join('\n')}
  </ul>
</turbo-frame>
    `;
    await fs.writeFile(postsFilePath, postsContent);
    console.log(`Posts file created at ${postsFilePath}`);
  }
};

// Run the site generation
generateSite()
  .then(() => console.log('All files converted and index created'))
  .catch((err) => console.error('Error during conversion:', err));
