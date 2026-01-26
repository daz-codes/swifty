// pages.js
import { replacePlaceholders } from "./partials.js";
import { dirs, defaultConfig, loadConfig } from "./config.js";
import { getTemplate, applyLayoutAndWrapContent } from "./layout.js";
import { chunkPages, generatePaginationNav } from "./pagination.js";
import { marked } from "marked";
import matter from "gray-matter";
import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";

// Returns stats if valid (directory or .md file), null otherwise
const getValidStats = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory() || path.extname(filePath) === ".md") {
      return stats;
    }
    return null;
  } catch (err) {
    return null;
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
const pageIndexUrls = new Set();

const addToTagMap = (tag, page) => {
  if (!tagsMap.has(tag)) tagsMap.set(tag, []);
  tagsMap.get(tag).push({ title: page.title, url: page.url });
};

const generatePages = async (sourceDir, baseDir = sourceDir, parent) => {
  // Clear module-level state on root call to prevent accumulation across rebuilds
  if (!parent) {
    tagsMap.clear();
    pageIndex.length = 0;
    pageIndexUrls.clear();
  }

  const pages = [];
  const folderConfig = await loadConfig(sourceDir);
  const config = { ...defaultConfig, ...parent?.meta, ...folderConfig };
  const { dateFormat } = config;

  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });

    // Collect promises for processing all files
    const filePromises = files.map(async (file) => {
      const filePath = path.join(sourceDir, file.name);
      const stats = await getValidStats(filePath);
      if (!stats) return null;

      const root = file.name === "index.md" && !parent;
      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/");
      const finalPath = `/${relativePath.replace(/\.md$/, "")}`;
      const name = root
        ? "Home"
        : capitalize(file.name.replace(/\.md$/, "").replace(/-/g, " "));
      const isDirectory = stats.isDirectory();
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
          ? { title: parent.meta.title, url: parent.url }
          : undefined,
        folder: isDirectory,
        title: name,
        created_at: new Date(stats.birthtime).toLocaleDateString(
          undefined,
          dateFormat,
        ),
        updated_at: new Date(stats.mtime).toLocaleDateString(
          undefined,
          dateFormat,
        ),
        date: new Date(stats.birthtime).toLocaleDateString(
          undefined,
          dateFormat,
        ),
        meta: root ? { ...defaultConfig } : { ...config },
      };

      if (path.extname(file.name) === ".md") {
        const markdownContent = await fs.readFile(filePath, "utf-8");
        const { data, content } = matter(markdownContent);
        Object.assign(page, { meta: { ...page.meta, ...data }, content });

        // If front matter has a date, parse and format it
        if (data.date) {
          const parsedDate = parseDate(data.date);
          if (parsedDate) {
            page.dateObj = parsedDate;
            page.date = parsedDate.toLocaleDateString(undefined, dateFormat);
            page.meta.date = page.date;
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

      // Skip draft pages in production builds
      if (page.meta.draft && !process.env.SWIFTY_WATCH) return;

      // Skip scheduled pages (future date) in production builds
      if (page.dateObj && page.dateObj > new Date() && !process.env.SWIFTY_WATCH) return;

      if (isDirectory) {
        page.pages = await generatePages(page.filePath, baseDir, page);

        // Load folder's own config for pagination settings
        const dirConfig = await loadConfig(page.filePath);
        const mergedConfig = { ...page.meta, ...dirConfig };
        page.meta = mergedConfig;

        page.pages.sort((a, b) => {
          if (a.meta.position && b.meta.position) {
            return a.meta.position - b.meta.position;
          }
          const dateA = a.dateObj || new Date(a.created_at);
          const dateB = b.dateObj || new Date(b.created_at);
          const sortOrder = (mergedConfig.date_sort_order || "desc").toLowerCase();
          return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        });

        // Handle pagination if page_count is set
        const pageCount = mergedConfig.page_count;
        if (pageCount && page.pages.length > pageCount) {
          page.allPages = page.pages;
          const chunks = chunkPages(page.pages, pageCount);
          const totalPages = chunks.length;
          const baseUrl = `${page.url}/`;

          // Store visible pages for first page (used by links_to_children)
          page.visiblePages = chunks[0];

          // First page content
          page.content = await generateLinkList(page.filename, chunks[0]);
          page.meta.pagination = generatePaginationNav({
            currentPage: 1,
            totalPages,
            baseUrl,
            config: page.meta,
          });

          // Create pagination pages for page 2, 3, etc.
          page.paginatedPages = [];
          for (let i = 1; i < chunks.length; i++) {
            const pageNum = i + 1;
            const paginatedPage = {
              name: `${page.name} - Page ${pageNum}`,
              title: `${page.meta.title || page.name} - Page ${pageNum}`,
              url: `${page.url}/page/${pageNum}`,
              folder: false,
              layout: page.layout,
              parent: { title: page.meta.title || page.name, url: page.url },
              meta: {
                ...page.meta,
                title: `${page.meta.title || page.name} - Page ${pageNum}`,
                pagination: generatePaginationNav({
                  currentPage: pageNum,
                  totalPages,
                  baseUrl,
                  config: page.meta,
                }),
              },
              content: await generateLinkList(page.filename, chunks[i]),
            };
            page.paginatedPages.push(paginatedPage);
          }
        } else {
          page.content = await generateLinkList(page.filename, page.pages);
          page.meta.pagination = '';
        }
      }

      // Add tags
      if (page.meta.tags) {
        page.meta.tags.forEach((tag) => addToTagMap(tag, page));
      }

      pages.push(page);
      if (!pageIndexUrls.has(page.url)) {
        pageIndexUrls.add(page.url);
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
      meta: { ...config },
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
        meta: { ...config, title: `Pages tagged with ${capitalize(tag)}` },
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
  const partialFile = `${name}.md`;
  const partialPath = path.join(dirs.partials, partialFile);
  const linksPath = path.join(
    dirs.partials,
    defaultConfig.default_link_name || "links",
  );
  // Check if either file exists in the 'partials' folder (in parallel)
  const [fileExists, defaultExists] = await Promise.all([
    fsExtra.pathExists(partialPath),
    fsExtra.pathExists(linksPath),
  ]);
  if (fileExists || defaultExists) {
    const partialContent = await fs.readFile(
      fileExists ? partialPath : linksPath,
      "utf-8",
    );
    const content = await Promise.all(
      pages.map((page) => replacePlaceholders(partialContent, page)),
    );
    return content.join("\n");
  } else {
    return pages
      .map(
        (page) =>
          `<li><a href="${page.url}" class="${defaultConfig.link_class}">${page.title}</a></li>`,
      )
      .join("\n");
  }
};

const render = async (page) => {
  const replacedContent = await replacePlaceholders(page.content, page);
  const htmlContent = marked.parse(replacedContent); // Markdown processed once
  const wrappedContent = await applyLayoutAndWrapContent(page, htmlContent);
  // Use function to avoid $` special replacement patterns in content
  const template = await getTemplate();
  const htmlWithTemplate = template.replace(
    /<%=\s*content\s*%>/g,
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
        await createPages(page.pages, distDir);
        // Write pagination pages if they exist
        if (page.paginatedPages?.length) {
          await createPages(page.paginatedPages, distDir);
        }
      }
    }),
  );
};

const addLinks = async (pages, parent) => {
  // Filter out folders and index pages for prev/next calculation (only content pages)
  const contentPages = pages.filter((p) => !p.folder && p.filename !== 'index');

  await Promise.all(
    pages.map(async (page) => {
      page.meta ||= {};
      page.meta.links_to_tags = page?.meta?.tags?.length
        ? page.meta.tags
            .map(
              (tag) =>
                `<a class="${defaultConfig.tag_class}" href="/tags/${tag}">${tag}</a>`,
            )
            .join("")
        : "";
      const crumb = page.root
        ? ""
        : ` ${defaultConfig.breadcrumb_separator} <a class="${defaultConfig.breadcrumb_class}" href="${page.url}">${page.name}</a>`;
      page.meta.breadcrumbs = parent
        ? parent.meta.breadcrumbs + crumb
        : `<a class="${defaultConfig.breadcrumb_class}" href="/">Home</a>` +
          crumb;

      // Generate prev/next links based on sibling position (only for content pages, not folders or index)
      const linkClass = defaultConfig.prev_next_class || defaultConfig.link_class || '';
      const classAttr = linkClass ? ` class="${linkClass}"` : '';

      if (!page.folder && page.filename !== 'index') {
        const pageIndex = contentPages.indexOf(page);
        const prevSibling = pageIndex > 0 ? contentPages[pageIndex - 1] : null;
        const nextSibling = pageIndex < contentPages.length - 1 ? contentPages[pageIndex + 1] : null;

        page.meta.prev_page = prevSibling
          ? `<a href="${prevSibling.url}"${classAttr}>${prevSibling.title || prevSibling.name}</a>`
          : '';
        page.meta.next_page = nextSibling
          ? `<a href="${nextSibling.url}"${classAttr}>${nextSibling.title || nextSibling.name}</a>`
          : '';
      } else {
        page.meta.prev_page = '';
        page.meta.next_page = '';
      }

      // Run independent link generation in parallel
      // Use visiblePages for paginated folders (first page only shows its chunk)
      const childPages = page.visiblePages || page.pages;
      const [links_to_children, links_to_siblings, links_to_self_and_siblings, nav_links] =
        await Promise.all([
          childPages
            ? generateLinkList(page.filename, childPages)
            : Promise.resolve(""),
          generateLinkList(
            page.parent?.filename || "pages",
            pages.filter((p) => p.url !== page.url),
          ),
          generateLinkList(page.parent?.filename || "pages", pages),
          generateLinkList("nav", pageIndex.filter((p) => p.nav)),
        ]);

      page.meta.links_to_children = links_to_children;
      page.meta.links_to_siblings = links_to_siblings;
      page.meta.links_to_self_and_siblings = links_to_self_and_siblings;
      page.meta.nav_links = nav_links;

      if (page.pages) {
        await addLinks(page.pages, page);
      }

      // Process pagination pages - inherit breadcrumbs and nav_links
      if (page.paginatedPages) {
        for (const pp of page.paginatedPages) {
          pp.meta.breadcrumbs = page.meta.breadcrumbs;
          pp.meta.nav_links = nav_links;
        }
      }
    }),
  );
};

export { generatePages, createPages, pageIndex, addLinks };
