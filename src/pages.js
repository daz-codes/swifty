// pages.js
import { replacePlaceholders } from "./partials.js";
import { dirs, defaultConfig, loadConfig } from "./config.js";
import { getTemplate, applyLayoutAndWrapContent } from "./layout.js";
import { marked } from "marked";
import matter from "gray-matter";
import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";

const isValid = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory() || path.extname(filePath) === ".md";
  } catch (err) {
    return false; // Handle errors like file not found
  }
};

const capitalize = (str) => str.replace(/\b\w/g, (char) => char.toUpperCase());

const parseDate = (dateValue) => {
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue !== "string") return null;

  // Try DD/MM/YYYY or D/M/YYYY format
  const ddmmyyyy = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(year, month - 1, day);
  }

  // Try standard Date parsing (ISO, etc.)
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const tagsMap = new Map();
const pageIndex = [];

const addToTagMap = (tag, page) => {
  if (!tagsMap.has(tag)) tagsMap.set(tag, []);
  tagsMap.get(tag).push({ title: page.title, url: page.url });
};

const generatePages = async (sourceDir, baseDir = sourceDir, parent) => {
  const pages = [];
  const folderConfig = await loadConfig(sourceDir);
  const config = { ...defaultConfig, ...parent?.data, ...folderConfig };

  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });

    // Collect promises for processing all files
    const filePromises = files.map(async (file) => {
      const filePath = path.join(sourceDir, file.name);
      if (!(await isValid(filePath))) return null;

      const root = file.name === "index.md" && !parent;
      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/");
      const finalPath = `/${relativePath.replace(/\.md$/, "")}`;
      const name = root
        ? "Home"
        : capitalize(file.name.replace(/\.md$/, "").replace(/-/g, " "));
      const stats = await fs.stat(filePath);
      const isDirectory = file.isDirectory();
      const layoutFileExists =
        parent &&
        (await fsExtra.pathExists(`${dirs.layouts}/${parent.filename}.html`));
      const layout = layoutFileExists
        ? parent.filename
        : parent
          ? parent.layout
          : config.default_layout_name;

      const page = {
        name,
        root,
        layout,
        filePath,
        filename: file.name.replace(/\.md$/, ""),
        url: root ? "/" : finalPath,
        nav: !parent && !root,
        parent: parent
          ? { title: parent.data.title, url: parent.url }
          : undefined,
        folder: isDirectory,
        title: name,
        created_at: new Date(stats.birthtime).toLocaleDateString(
          undefined,
          config.dateFormat,
        ),
        updated_at: new Date(stats.mtime).toLocaleDateString(
          undefined,
          config.dateFormat,
        ),
        date: new Date(stats.birthtime).toLocaleDateString(
          undefined,
          config.dateFormat,
        ),
        data: root ? { ...defaultConfig } : { ...config },
      };

      if (path.extname(file.name) === ".md") {
        const markdownContent = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(markdownContent);
        Object.assign(page, { data: { ...page.data, ...data }, content });

        // If front matter has a date, parse and format it
        if (data.date) {
          const parsedDate = parseDate(data.date);
          if (parsedDate) {
            page.dateObj = parsedDate;
            page.date = parsedDate.toLocaleDateString(undefined, config.dateFormat);
            page.data.date = page.date;
          }
        }
      }

      // For directories, we defer recursion separately
      return { page, isDirectory };
    });

    // Await all file processing
    const fileResults = await Promise.all(filePromises);

    // Now handle directories recursively
    const directoryPromises = fileResults.map(async (result) => {
      if (!result) return;

      const { page, isDirectory } = result;

      if (isDirectory) {
        page.pages = await generatePages(page.filePath, baseDir, page);

        page.pages.sort((a, b) => {
          if (a.data.position && b.data.position) {
            return a.data.position - b.data.position;
          }
          const dateA = a.dateObj || new Date(a.created_at);
          const dateB = b.dateObj || new Date(b.created_at);
          const sortOrder = (config.date_sort_order || "desc").toLowerCase();
          return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        });

        page.content = await generateLinkList(page.filename, page.pages);
      }

      // Add tags
      if (page.data.tags) {
        page.data.tags.forEach((tag) => addToTagMap(tag, page));
      }

      pages.push(page);
      if (!pageIndex.some((p) => p.url === page.url)) {
        pageIndex.push({ url: page.url, title: page.title, nav: page.nav });
      }
    });

    // Await all directory recursion
    await Promise.all(directoryPromises);
  } catch (err) {
    console.error("Error reading directory:", err);
  }

  // Make Tags page
  if (!parent && tagsMap.size) {
    const tagLayout = await fsExtra.pathExists(`${dirs.layouts}/tags.html`);
    const tagPage = {
      url: "/tags",
      nav: false,
      folder: true,
      name: "Tags",
      title: "All Tags",
      layout: tagLayout ? "tags" : defaultConfig.default_layout_name,
      updated_at: new Date().toLocaleDateString(
        undefined,
        defaultConfig.dateFormat,
      ),
      data: { ...config },
      pages: [],
    };

    for (const [tag, pagesForTag] of tagsMap) {
      const page = {
        name: tag,
        title: tag,
        updated_at: new Date().toLocaleDateString(
          undefined,
          defaultConfig.dateFormat,
        ),
        url: `/tags/${tag}`,
        layout: tagLayout ? "tags" : defaultConfig.default_layout_name,
        data: { ...config, title: `Pages tagged with ${capitalize(tag)}` },
      };
      page.content = await generateLinkList("tags", pagesForTag);

      tagPage.pages.push(page);
    }
    tagPage.content = await generateLinkList("tags", tagPage.pages);
    pages.push(tagPage);
  }
  return pages;
};

const generateLinkList = async (name, pages) => {
  const partial = `${name}.md`;
  const partialPath = path.join(dirs.partials, partial);
  const linksPath = path.join(
    dirs.partials,
    defaultConfig.default_link_name || "links",
  );
  // Check if either file exists in the 'partials' folder
  const fileExists = await fsExtra.pathExists(partialPath);
  const defaultExists = await fsExtra.pathExists(linksPath);
  if (fileExists || defaultExists) {
    const partial = await fs.readFile(
      fileExists ? partialPath : linksPath,
      "utf-8",
    );
    const content = await Promise.all(
      pages.map((page) => replacePlaceholders(partial, page)),
    );
    return content.join("\n");
  } else {
    return `${pages.map((page) => `<li><a href="${page.url}" class="${defaultConfig.link_class}">${page.title}</a></li>`).join`\n`}`;
  }
};

const render = async (page) => {
  const replacedContent = await replacePlaceholders(page.content, page);
  const htmlContent = marked.parse(replacedContent); // Markdown processed once
  const wrappedContent = await applyLayoutAndWrapContent(page, htmlContent);
  // Use function to avoid $` special replacement patterns in content
  const template = await getTemplate();
  const htmlWithTemplate = template.replace(
    /\{\{\s*content\s*\}\}/g,
    () => wrappedContent,
  );
  const finalContent = await replacePlaceholders(htmlWithTemplate, page);
  return finalContent;
};

const createPages = async (pages, distDir = dirs.dist) => {
  await Promise.all(
    pages.map(async (page) => {
      const html = await render(page);
      const pageDir = path.join(distDir, page.url);
      const pagePath = path.join(distDir, page.url, "index.html");
      await fsExtra.ensureDir(pageDir);
      await fs.writeFile(pagePath, html);
      if (page.folder) {
        await createPages(page.pages, distDir); // Recursive still needs to await
      }
    }),
  );
};

const addLinks = async (pages, parent) => {
  for (const page of pages) {
    page.data ||= {};
    page.data.links_to_tags = page?.data?.tags?.length
      ? page.data.tags.map(
          (tag) =>
            `<a class="${defaultConfig.tag_class}" href="/tags/${tag}">${tag}</a>`,
        ).join``
      : "";
    const crumb = page.root
      ? ""
      : ` ${defaultConfig.breadcrumb_separator} <a class="${defaultConfig.breadcrumb_class}" href="${page.url}">${page.name}</a>`;
    page.data.breadcrumbs = parent
      ? parent.data.breadcrumbs + crumb
      : `<a class="${defaultConfig.breadcrumb_class}" href="/">Home</a>` +
        crumb;
    page.data.links_to_children = page.pages
      ? await generateLinkList(page.filename, page.pages)
      : "";
    page.data.links_to_siblings = await generateLinkList(
      page.parent?.filename || "pages",
      pages.filter((p) => p.url !== page.url),
    );
    page.data.links_to_self_and_siblings = await generateLinkList(
      page.parent?.filename || "pages",
      pages,
    );
    page.data.nav_links = await generateLinkList(
      "nav",
      pageIndex.filter((p) => p.nav),
    );
    if (page.pages) {
      await addLinks(page.pages, page); // Recursive call
    }
  }
};

export { generatePages, createPages, pageIndex, addLinks };
