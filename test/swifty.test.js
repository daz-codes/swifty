import assert from "assert";
import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import "../swifty.js";

// Helper function to ensure directories exist and copy assets
async function ensureDirectoriesAndCopyAssets(sourceDir, targetDir) {
  // Ensure the target directory exists
  await fsExtra.ensureDir(targetDir);

  // Copy assets from source to target
  await copyAssets(sourceDir, targetDir);
}

// Function to render a page with layout and dynamic content
async function renderPageWithLayout(pagePath, layoutPath) {
  // Read the content of the page and layout
  const pageContent = await fs.readFile(pagePath, "utf-8");
  const layoutContent = await fs.readFile(layoutPath, "utf-8");

  // Apply the layout and wrap content
  const wrappedContent = await applyLayoutAndWrapContent(pageContent, layoutContent);

  // Render the final output
  return await render(wrappedContent);
}

// Generate a page and write it to the output directory
async function generateAndWritePage(pageData, outputDir) {
  const pagePath = path.join(outputDir, `${pageData.title}.html`);
  
  // Generate the page content
  const pageContent = await generatePages(pageData);

  // Write the generated content to the page file
  await fs.writeFile(pagePath, pageContent);

  console.log(`Page generated at: ${pagePath}`);
}

// Function to ensure and copy necessary files, then render and generate the pages
async function prepareAndGeneratePages(sourceDir, targetDir, pagesData) {
  // Ensure directories and copy assets
  await ensureDirectoriesAndCopyAssets(sourceDir, targetDir);

  // Loop through the pagesData and generate pages
  for (const pageData of pagesData) {
    const outputPagePath = path.join(targetDir, `${pageData.title}.html`);

    // Ensure the target page directory exists
    await fsExtra.ensureDir(path.dirname(outputPagePath));

    // Generate and write the page
    await generateAndWritePage(pageData, targetDir);
  }
}

// Example function to demonstrate usage
async function main() {
  const sourceDir = "./pages"; // Directory where source markdown or assets are located
  const targetDir = "./dist";  // Output directory for generated pages
  const pagesData = [
    { title: "home", content: "Welcome to our homepage" },
    { title: "about", content: "Learn more about us" },
  ];

  try {
    // Ensure and generate pages
    await prepareAndGeneratePages(sourceDir, targetDir, pagesData);
    console.log("Pages successfully generated!");
  } catch (error) {
    console.error("Error generating pages:", error);
  }
}

// Run the main function
main();
