// pages.js
import fs from "fs/promises";
import path from "path";

import fsExtra from "fs-extra";

import { replacePlaceholders } from "./partials.js";
import { dirs, defaultConfig, loadConfig } from "./config.js";
import { getTemplate, applyLayoutAndWrapContent } from "./layout.js";
import { chunkPages, generatePaginationNav } from "./pagination.js";
import { marked } from "./markdown.js";
import { mapLimit } from "./concurrency.js";
import { minifyHtml } from "./minify.js";
import { parseFrontMatter } from "./frontmatter.js";
import {
  applyBasePathToHtml,
  normalizePermalink,
  routeToOutputPath,
  withBasePath,
} from "./urls.js";

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

const applyMarkdownFileToPage = async (
  page,
  filePath,
  { notFound = false, folderIndex = false } = {},
) => {
  let parsed;
  try {
    const markdownContent = await fs.readFile(filePath, "utf-8");
    parsed = parseFrontMatter(markdownContent);
  } catch (error) {
    throw new Error(`Unable to parse Markdown file ${filePath}: ${error.message}`, {
      cause: error,
    });
  }
  const { data, content } = parsed;
  Object.assign(page, { meta: { ...page.meta, ...data }, content });

  if (data.permalink !== undefined) {
    page.route = normalizePermalink(data.permalink);
    page.url = withBasePath(page.route);
  }

  if (folderIndex) {
    const stats = await fs.stat(filePath);
    const { dateFormat } = page.meta;
    page.hasIndexContent = true;
    page.indexFilePath = filePath;
    page.createdAtObj = stats.birthtime;
    page.updatedAtObj = stats.mtime;
    page.created_at = new Date(stats.birthtime).toLocaleDateString(
      undefined,
      dateFormat,
    );
    page.updated_at = new Date(stats.mtime).toLocaleDateString(
      undefined,
      dateFormat,
    );
    page.date = new Date(stats.birthtime).toLocaleDateString(undefined, dateFormat);
  }

  if (notFound && data.sitemap === undefined) {
    page.meta.sitemap = false;
  }

  page.title = page.meta.title || page.title;
  page.name = page.meta.title || page.name;

  if (typeof data.nav === "boolean") {
    page.nav = data.nav;
  }

  if (data.date) {
    const parsedDate = parseDate(data.date);
    if (parsedDate) {
      page.dateObj = parsedDate;
      page.date = parsedDate.toLocaleDateString(undefined, page.meta.dateFormat);
      page.meta.date = page.date;
    }
  }
};

const tagsMap = new Map();
const pageIndex = [];
const pageIndexUrls = new Set();
const partialExtensions = [".md", ".html"];

const getBuildConcurrency = () => defaultConfig.build_concurrency || 16;
const minificationEnabled = () =>
  defaultConfig.minify !== false && defaultConfig.minify_html !== false;

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

    const fileResults = await mapLimit(
      files,
      async (file) => {
        const filePath = path.join(sourceDir, file.name);
        if (parent && file.name === "index.md") return null;

        const stats = await getValidStats(filePath);
        if (!stats) return null;

        const root = file.name === "index.md" && !parent;
        const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/");
        const notFound = relativePath === "404.md" && !parent;
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

        const route = root ? "/" : notFound ? "/404.html" : finalPath;
        const page = {
          name,
          root,
          layout,
          filePath,
          filename: file.name.replace(/\.md$/, ""),
          route,
          url: withBasePath(route),
          nav: !parent && !root && !notFound,
          parent: parent
            ? { title: parent.meta.title, url: parent.url }
            : undefined,
          folder: isDirectory,
          notFound,
          title: name,
          createdAtObj: stats.birthtime,
          updatedAtObj: stats.mtime,
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
          await applyMarkdownFileToPage(page, filePath, { notFound });
        } else if (isDirectory) {
          const indexPath = path.join(filePath, "index.md");
          if (await fsExtra.pathExists(indexPath)) {
            await applyMarkdownFileToPage(page, indexPath, { folderIndex: true });
          }
        }

        // For directories, we defer recursion separately
        return { page, isDirectory };
      },
      getBuildConcurrency(),
    );

    // Now handle directories recursively
    await mapLimit(fileResults, async (result) => {
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
        const mergedConfig = {
          ...dirConfig,
          ...page.meta,
          // Only set default page_count if explicitly specified in either page meta or dir config
          page_count: page.meta.page_count ?? dirConfig.page_count,
        };
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
          if (!page.hasIndexContent) {
            page.content = await generateLinkList(page.filename, chunks[0]);
          }
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
              route: `${page.route}/page/${pageNum}`,
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
          if (!page.hasIndexContent) {
            page.content = await generateLinkList(page.filename, page.pages);
          }
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
    }, getBuildConcurrency());
  } catch (error) {
    throw new Error(`Unable to generate pages from ${sourceDir}: ${error.message}`, {
      cause: error,
    });
  }

  // Make Tags page
  if (!parent && tagsMap.size) {
    const tagLayout = await fsExtra.pathExists(`${dirs.layouts}/tags.html`);
    const tagPage = {
      route: "/tags",
      url: withBasePath("/tags"),
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
      const route = `/tags/${tag}`;
      const page = {
        name: tag,
        title: tag,
        updated_at: new Date().toLocaleDateString(
          undefined,
          defaultConfig.dateFormat,
        ),
        route,
        url: withBasePath(route),
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
  const findPartialPath = async (partialName) => {
    for (const ext of partialExtensions) {
      const partialPath = path.join(dirs.partials, `${partialName}${ext}`);
      if (await fsExtra.pathExists(partialPath)) return partialPath;
    }
    return null;
  };

  const partialPath = await findPartialPath(name);
  const defaultPath = await findPartialPath(
    defaultConfig.default_link_name || "links",
  );

  if (partialPath || defaultPath) {
    const partialContent = await fs.readFile(partialPath || defaultPath, "utf-8");
    const content = await mapLimit(
      pages,
      (page) => replacePlaceholders(partialContent, page),
      getBuildConcurrency(),
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
  try {
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
    return applyBasePathToHtml(finalContent);
  } catch (error) {
    throw new Error(`Unable to render page ${page.url}: ${error.message}`, {
      cause: error,
    });
  }
};

const createPages = async (pages, distDir = dirs.dist) => {
  await mapLimit(
    pages,
    async (page) => {
      const renderedHtml = await render(page);
      let html = renderedHtml;
      if (minificationEnabled()) {
        try {
          html = await minifyHtml(renderedHtml);
        } catch (error) {
          throw new Error(`Unable to minify HTML for ${page.url}: ${error.message}`, {
            cause: error,
          });
        }
      }
      const pagePath = page.notFound
        ? path.join(distDir, "404.html")
        : path.join(distDir, routeToOutputPath(page.route || page.url));
      await fsExtra.ensureDir(path.dirname(pagePath));
      await fs.writeFile(pagePath, html);
      if (page.folder) {
        await createPages(page.pages, distDir);
        // Write pagination pages if they exist
        if (page.paginatedPages?.length) {
          await createPages(page.paginatedPages, distDir);
        }
      }
    },
    getBuildConcurrency(),
  );
};

const addLinks = async (pages, parent) => {
  const linkablePages = pages.filter((p) => !p.notFound);
  // Filter out folders and index pages for prev/next calculation (only content pages)
  const contentPages = linkablePages.filter((p) => !p.folder && p.filename !== 'index');

  await mapLimit(
    pages,
    async (page) => {
      page.meta ||= {};
      page.meta.links_to_tags = page?.meta?.tags?.length
        ? page.meta.tags
            .map(
              (tag) =>
                `<a class="${defaultConfig.tag_class}" href="${withBasePath(`/tags/${tag}`)}">${tag}</a>`,
            )
            .join("")
        : "";
      const crumbTitle = page.meta.title || page.title || page.name;
      const crumb = page.root
        ? ""
        : ` ${defaultConfig.breadcrumb_separator} <a class="${defaultConfig.breadcrumb_class}" href="${page.url}">${crumbTitle}</a>`;
      page.meta.breadcrumbs = parent
        ? parent.meta.breadcrumbs + crumb
        : `<a class="${defaultConfig.breadcrumb_class}" href="${withBasePath("/")}">Home</a>` +
          crumb;

      // Generate prev/next links based on sibling position (only for content pages, not folders or index)
      const linkClass = defaultConfig.prev_next_class || defaultConfig.link_class || '';
      const classAttr = linkClass ? ` class="${linkClass}"` : '';

      if (!page.folder && page.filename !== 'index' && !page.notFound) {
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
            linkablePages.filter((p) => p.url !== page.url),
          ),
          generateLinkList(page.parent?.filename || "pages", linkablePages),
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
    },
    getBuildConcurrency(),
  );
};

export { generatePages, createPages, pageIndex, addLinks };
