// pages.js
import fs from "fs/promises";
import path from "path";

import fsExtra from "fs-extra";

import {
  replacePlaceholders,
  rewriteLocalImageReferences,
} from "./partials.js";
import { dirs, defaultConfig, loadConfig } from "./config.js";
import { getTemplate, applyLayoutAndWrapContent } from "./layout.js";
import { chunkPages, generatePaginationNav } from "./pagination.js";
import {
  collectMarkdownHeadings,
  renderMarkdown,
  renderTableOfContents,
} from "./markdown.js";
import { mapLimit } from "./concurrency.js";
import { minifyHtml } from "./minify.js";
import { parseFrontMatter } from "./frontmatter.js";
import {
  clearGitDateCache,
  formatDisplayDate,
  parseDate,
  parsePageDate,
  resolveFileDate,
} from "./dates.js";
import { extractSummary } from "./content.js";
import {
  createStandaloneTagSlug,
  createTagSlugBase,
  createTagSlugMap,
  normalizeTagIdentity,
  normalizeTagLabel,
} from "./tags.js";
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

const setFallbackDates = (page, date, config) => {
  page.createdAtObj = date;
  page.updatedAtObj = date;
  page.created_at_iso = date.toISOString();
  page.updated_at_iso = date.toISOString();
  page.date_iso = date.toISOString();
  page.created_at = formatDisplayDate(date, config);
  page.updated_at = formatDisplayDate(date, config);
  page.date = formatDisplayDate(date, config);
};

const hasPosition = (page) => Number.isFinite(page.meta?.position);

const compareRoutes = (a, b) =>
  String(a.route || a.url || "").localeCompare(String(b.route || b.url || ""));

const comparePages = (a, b, dateSortOrder = "desc") => {
  const aPositioned = hasPosition(a);
  const bPositioned = hasPosition(b);

  if (aPositioned !== bPositioned) return aPositioned ? -1 : 1;
  if (aPositioned && bPositioned) {
    const positionDifference = a.meta.position - b.meta.position;
    return positionDifference || compareRoutes(a, b);
  }

  const dateA = (a.dateObj || a.createdAtObj)?.getTime?.() || 0;
  const dateB = (b.dateObj || b.createdAtObj)?.getTime?.() || 0;
  const dateDifference =
    String(dateSortOrder).toLowerCase() === "asc"
      ? dateA - dateB
      : dateB - dateA;
  return dateDifference || compareRoutes(a, b);
};

const applyPublicationDate = (page, dateValue, filePath) => {
  const parsed = parsePageDate(dateValue, page.meta.timezone);
  if (!parsed) {
    throw new Error(
      `Invalid date "${String(dateValue)}" in ${filePath}. Use YYYY-MM-DD, DD/MM/YYYY, or an ISO timestamp with a timezone offset.`,
    );
  }
  page.dateObj = parsed.date;
  page.dateOnly = parsed.dateOnly;
  page.date_iso = parsed.date.toISOString();
  page.date = formatDisplayDate(parsed.date, page.meta);
  page.meta.date = page.date;
  page.meta.date_iso = page.date_iso;
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
  page._sourceMeta = { ...data };
  const summary =
    data.summary ||
    data.description ||
    extractSummary(content, page.meta.summary_length || defaultConfig.summary_length);
  page.summary = summary;
  page.meta.summary = summary;

  if (data.permalink !== undefined) {
    page.route = normalizePermalink(data.permalink);
    page.url = withBasePath(page.route);
  }

  if (folderIndex) {
    const stats = await fs.stat(filePath);
    const fallbackDate = await resolveFileDate(filePath, stats.mtime);
    page.hasIndexContent = true;
    page.indexFilePath = filePath;
    setFallbackDates(page, fallbackDate, page.meta);
  }

  if (notFound && data.sitemap === undefined) {
    page.meta.sitemap = false;
  }

  page.title = page.meta.title || page.title;
  page.name = page.meta.title || page.name;

  if (typeof data.nav === "boolean") {
    page.nav = data.nav;
  }

  if (data.date !== undefined && data.date !== null && data.date !== "") {
    applyPublicationDate(page, data.date, filePath);
  }
};

const tagsMap = new Map();
const pageIndex = [];
const pageIndexUrls = new Set();
const partialExtensions = [".md", ".html"];
let renderedContentTokenId = 0;

const getBuildConcurrency = () => defaultConfig.build_concurrency || 16;
const minificationEnabled = () =>
  defaultConfig.minify !== false && defaultConfig.minify_html !== false;
const containsHighlightedCode = (html) =>
  /<code\b[^>]*\bclass=["'][^"']*\bhljs\b/i.test(html || "");

const addToTagMap = (tag, page) => {
  const label = normalizeTagLabel(tag);
  const identity = normalizeTagIdentity(label);
  if (!identity) {
    throw new Error(`Empty tags are not allowed in ${page.filePath || page.url}`);
  }
  if (!tagsMap.has(identity)) {
    tagsMap.set(identity, {
      identity,
      label,
      slugBase: createTagSlugBase(label),
      slug: "",
      pages: [],
    });
  }
  const entry = tagsMap.get(identity);
  if (!entry.pages.some((tagPage) => tagPage.url === page.url)) {
    entry.pages.push({
      title: page.title,
      url: page.url,
      dateObj: page.dateObj,
      date_iso: page.date_iso,
      updatedAtObj: page.updatedAtObj,
      updated_at_iso: page.updated_at_iso,
    });
  }
};

const newestPageDate = (pages) =>
  pages.reduce((latest, page) => {
    const value = page.updatedAtObj || page.dateObj;
    return value instanceof Date && (!latest || value > latest) ? value : latest;
  }, null);

const finalizeTagSlugs = () => {
  const slugs = createTagSlugMap([...tagsMap.values()]);
  for (const entry of tagsMap.values()) {
    entry.slug = slugs.get(entry.identity);
  }
};

const getTagEntry = (tag) => tagsMap.get(normalizeTagIdentity(tag));

const getTagUrl = (tag) => {
  const entry = getTagEntry(tag);
  const slug = entry?.slug || createStandaloneTagSlug(tag);
  return withBasePath(`/tags/${slug}`);
};

const flattenAuthoredPages = (pages) => {
  const flattened = [];
  const visit = (pageList) => {
    for (const page of pageList) {
      if (page.filePath && !page.folder && !page.notFound) flattened.push(page);
      if (page.pages) visit(page.pages);
    }
  };
  visit(pages);
  return flattened;
};

const addRelatedPages = async (pages) => {
  const authoredPages = flattenAuthoredPages(pages);

  await mapLimit(
    authoredPages,
    async (page) => {
      const pageTags = new Set(
        Array.isArray(page.meta?.tags)
          ? page.meta.tags.map(normalizeTagIdentity)
          : [],
      );
      const limit =
        page.meta?.related_pages_limit || defaultConfig.related_pages_limit || 3;
      const related = authoredPages
        .filter((candidate) => candidate !== page)
        .map((candidate) => {
          const sharedTags = Array.isArray(candidate.meta?.tags)
            ? [...new Set(candidate.meta.tags.map(normalizeTagIdentity))]
                .filter((identity) => pageTags.has(identity))
                .map((identity) => tagsMap.get(identity)?.label || identity)
            : [];
          return { candidate, sharedTags };
        })
        .filter(({ sharedTags }) => sharedTags.length > 0)
        .sort((a, b) => {
          const scoreDifference = b.sharedTags.length - a.sharedTags.length;
          return (
            scoreDifference ||
            comparePages(a.candidate, b.candidate, page.meta?.date_sort_order)
          );
        })
        .slice(0, limit)
        .map(({ candidate, sharedTags }) => ({
          ...candidate,
          related_score: sharedTags.length,
          shared_tags: sharedTags,
        }));

      page.relatedPages = related;
      page.meta.related_pages = related.length
        ? await generateLinkList("related", related)
        : "";
    },
    getBuildConcurrency(),
  );
};

const findPageBySource = (pages, filePath) => {
  const target = path.resolve(filePath);
  const visit = (pageList) => {
    for (const page of pageList) {
      const sourcePath = page.indexFilePath || page.filePath;
      if (sourcePath && path.resolve(sourcePath) === target) return page;
      const child = page.pages ? visit(page.pages) : null;
      if (child) return child;
    }
    return null;
  };
  return visit(pages);
};

const refreshPageContent = async (page, filePath, content) => {
  const stats = await fs.stat(filePath);
  clearGitDateCache(filePath);
  const fallbackDate = await resolveFileDate(filePath, stats.mtime);
  setFallbackDates(page, fallbackDate, page.meta);
  const sourceDate = page._sourceMeta?.date;
  if (sourceDate !== undefined && sourceDate !== null && sourceDate !== "") {
    applyPublicationDate(page, sourceDate, filePath);
  } else {
    delete page.dateObj;
    delete page.dateOnly;
    delete page.meta.date;
    delete page.meta.date_iso;
  }
  page.content = content;
  return page;
};

const generatePages = async (sourceDir, baseDir = sourceDir, parent) => {
  // Clear module-level state on root call to prevent accumulation across rebuilds
  if (!parent) {
    tagsMap.clear();
    pageIndex.length = 0;
    pageIndexUrls.clear();
    clearGitDateCache();
  }

  const pages = [];
  const folderConfig = await loadConfig(sourceDir);
  const config = { ...defaultConfig, ...parent?.meta, ...folderConfig };

  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });

    const fileResults = await mapLimit(
      files,
      async (file) => {
        const filePath = path.join(sourceDir, file.name);
        if (parent && file.name === "index.md") return null;

        const stats = await getValidStats(filePath);
        if (!stats) return null;
        const fallbackDate = await resolveFileDate(filePath, stats.mtime);

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
            ? {
                title: parent.meta.title || parent.title,
                url: parent.url,
                filename: parent.filename,
              }
            : undefined,
          folder: isDirectory,
          notFound,
          title: name,
          meta: root ? { ...defaultConfig } : { ...config },
        };
        setFallbackDates(page, fallbackDate, page.meta);

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
    const processedPages = await mapLimit(fileResults, async (result) => {
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

        page.pages.sort((a, b) =>
          comparePages(a, b, mergedConfig.date_sort_order),
        );

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
              createdAtObj: page.createdAtObj,
              updatedAtObj: page.updatedAtObj,
              created_at: page.created_at,
              created_at_iso: page.created_at_iso,
              updated_at: page.updated_at,
              updated_at_iso: page.updated_at_iso,
              date: page.date,
              date_iso: page.date_iso,
              parent: {
                title: page.meta.title || page.name,
                url: page.url,
                filename: page.filename,
              },
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

      return page;
    }, getBuildConcurrency());
    pages.push(...processedPages.filter(Boolean));
  } catch (error) {
    throw new Error(`Unable to generate pages from ${sourceDir}: ${error.message}`, {
      cause: error,
    });
  }

  pages.sort((a, b) => comparePages(a, b, config.date_sort_order));

  // Make Tags page
  if (!parent) {
    const collectTags = (pageList) => {
      for (const page of pageList) {
        if (Array.isArray(page.meta?.tags)) {
          page.meta.tags.forEach((tag) => addToTagMap(tag, page));
        }
        if (page.pages) collectTags(page.pages);
      }
    };
    collectTags(pages);
    finalizeTagSlugs();
    await addRelatedPages(pages);
  }

  if (!parent && tagsMap.size) {
    const tagLayout = await fsExtra.pathExists(`${dirs.layouts}/tags.html`);
    const generatedTagDate = newestPageDate(
      [...tagsMap.values()].flatMap((tag) => tag.pages),
    ) || new Date(0);
    const tagPage = {
      route: "/tags",
      url: withBasePath("/tags"),
      nav: false,
      folder: true,
      name: "Tags",
      title: "All Tags",
      layout: tagLayout ? "tags" : defaultConfig.default_layout_name,
      meta: { ...config },
      pages: [],
    };
    setFallbackDates(tagPage, generatedTagDate, tagPage.meta);

    const tagEntries = [...tagsMap.values()].sort((a, b) =>
      a.identity.localeCompare(b.identity),
    );
    for (const tag of tagEntries) {
      const route = `/tags/${tag.slug}`;
      const tagDate = newestPageDate(tag.pages) || generatedTagDate;
      const page = {
        name: tag.label,
        title: tag.label,
        route,
        url: withBasePath(route),
        layout: tagLayout ? "tags" : defaultConfig.default_layout_name,
        meta: { ...config, title: `Pages tagged with ${tag.label}` },
      };
      setFallbackDates(page, tagDate, page.meta);
      page.content = await generateLinkList("tags", tag.pages);

      tagPage.pages.push(page);
    }
    tagPage.content = await generateLinkList("tags", tagPage.pages);
    pages.push(tagPage);
  }

  pages.sort((a, b) => comparePages(a, b, config.date_sort_order));

  if (!parent) {
    const addToPageIndex = (pageList) => {
      for (const page of pageList) {
        if (page.filePath && !pageIndexUrls.has(page.url)) {
          pageIndexUrls.add(page.url);
          pageIndex.push({ url: page.url, title: page.title, nav: page.nav });
        }
        if (page.pages) addToPageIndex(page.pages);
      }
    };
    addToPageIndex(pages);
  }
  return pages;
};

const createLinkListCache = () => ({
  partialPaths: new Map(),
  partialContents: new Map(),
  items: new Map(),
  lists: new Map(),
  pageIds: new WeakMap(),
  nextPageId: 0,
  navPages: null,
  stats: {
    partialReads: 0,
    itemRenders: 0,
    itemHits: 0,
    listRenders: 0,
    listHits: 0,
  },
});

const getCachedPageId = (page, cache) => {
  if (!cache.pageIds.has(page)) {
    cache.pageIds.set(page, cache.nextPageId);
    cache.nextPageId += 1;
  }
  return cache.pageIds.get(page);
};

const findPartialPath = async (partialName, cache) => {
  const find = async () => {
    for (const ext of partialExtensions) {
      const partialPath = path.join(dirs.partials, `${partialName}${ext}`);
      if (await fsExtra.pathExists(partialPath)) return partialPath;
    }
    return null;
  };

  if (!cache) return find();
  if (!cache.partialPaths.has(partialName)) {
    cache.partialPaths.set(partialName, find());
  }
  return cache.partialPaths.get(partialName);
};

const resolveLinkPartial = async (name, cache) => {
  const partialPath = await findPartialPath(name, cache);
  if (partialPath) return partialPath;
  return findPartialPath(defaultConfig.default_link_name || "links", cache);
};

const loadLinkPartial = async (partialPath, cache) => {
  if (!cache) return fs.readFile(partialPath, "utf-8");
  if (!cache.partialContents.has(partialPath)) {
    cache.stats.partialReads += 1;
    cache.partialContents.set(partialPath, fs.readFile(partialPath, "utf-8"));
  }
  return cache.partialContents.get(partialPath);
};

const renderLinkItem = async (page, partialPath, cache) => {
  const render = async () => {
    if (cache) cache.stats.itemRenders += 1;
    if (partialPath) {
      const partialContent = await loadLinkPartial(partialPath, cache);
      return replacePlaceholders(partialContent, page);
    }
    return `<li><a href="${page.url}" class="${defaultConfig.link_class}">${page.title}</a></li>`;
  };

  if (!cache) return render();
  const key = `${partialPath || "__default_link__"}\0${getCachedPageId(page, cache)}`;
  if (cache.items.has(key)) {
    cache.stats.itemHits += 1;
    return cache.items.get(key);
  }
  const rendered = render();
  cache.items.set(key, rendered);
  return rendered;
};

const generateLinkList = async (name, pages, cache) => {
  const partialPath = await resolveLinkPartial(name, cache);
  const render = async () => {
    if (cache) cache.stats.listRenders += 1;
    const content = await mapLimit(
      pages,
      (page) => renderLinkItem(page, partialPath, cache),
      getBuildConcurrency(),
    );
    return content.join("\n");
  };

  if (!cache) return render();
  const pageSet = pages.map((page) => getCachedPageId(page, cache)).join(",");
  const key = `${partialPath || "__default_link__"}\0${pageSet}`;
  if (cache.lists.has(key)) {
    cache.stats.listHits += 1;
    return cache.lists.get(key);
  }
  const rendered = render();
  cache.lists.set(key, rendered);
  return rendered;
};

const render = async (page) => {
  try {
    const renderContext = {};
    const tocToken = `__SWIFTY_TOC_${renderedContentTokenId}__`;
    page.meta.toc = tocToken;
    let replacedContent = await replacePlaceholders(
      page.content,
      page,
      renderContext,
    );
    const headings = collectMarkdownHeadings(replacedContent);
    page.meta.toc = renderTableOfContents(headings);
    replacedContent = replacedContent.replaceAll(tocToken, () => page.meta.toc);
    const htmlContent = renderMarkdown(replacedContent); // Markdown processed once
    const contentToken =
      `__SWIFTY_RENDERED_PAGE_CONTENT_${renderedContentTokenId}__`;
    renderedContentTokenId += 1;
    const wrappedContent = await applyLayoutAndWrapContent(page, contentToken);
    let highlighted = containsHighlightedCode(htmlContent);
    let template = await getTemplate({ highlighted });
    let htmlWithTemplate = template.replace(
      /<%=\s*content\s*%>/g,
      () => wrappedContent,
    );
    let renderedShell = await replacePlaceholders(
      htmlWithTemplate,
      page,
      renderContext,
    );
    if (!highlighted && containsHighlightedCode(renderedShell)) {
      highlighted = true;
      template = await getTemplate({ highlighted });
      htmlWithTemplate = template.replace(
        /<%=\s*content\s*%>/g,
        () => wrappedContent,
      );
      renderedShell = await replacePlaceholders(
        htmlWithTemplate,
        page,
        renderContext,
      );
    }
    const finalContent = renderedShell.replaceAll(contentToken, () => htmlContent);
    return applyBasePathToHtml(rewriteLocalImageReferences(finalContent));
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

const addLinks = async (pages, parent, linkCache = createLinkListCache()) => {
  const linkablePages = pages.filter((p) => !p.notFound);
  // Filter out folders and index pages for prev/next calculation (only content pages)
  const contentPages = linkablePages.filter((p) => !p.folder && p.filename !== 'index');
  const contentPagePositions = new Map(
    contentPages.map((page, index) => [page, index]),
  );
  if (!linkCache.navPages) {
    linkCache.navPages = pageIndex.filter((page) => page.nav);
  }

  // Populate the complete sibling set before rendering cached partial items so
  // output cannot depend on which concurrent page reaches the cache first.
  for (const page of pages) {
    page.meta ||= {};
    page.meta.links_to_tags = page?.meta?.tags?.length
      ? page.meta.tags
          .map(
            (tag) =>
              `<a class="${defaultConfig.tag_class}" href="${getTagUrl(tag)}">${normalizeTagLabel(tag)}</a>`,
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

    const linkClass = defaultConfig.prev_next_class || defaultConfig.link_class || '';
    const classAttr = linkClass ? ` class="${linkClass}"` : '';
    const position = contentPagePositions.get(page);
    if (position !== undefined) {
      const prevSibling = position > 0 ? contentPages[position - 1] : null;
      const nextSibling = position < contentPages.length - 1
        ? contentPages[position + 1]
        : null;
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
  }

  await mapLimit(
    pages,
    async (page) => {
      // Run independent link generation in parallel
      // Use visiblePages for paginated folders (first page only shows its chunk)
      const childPages = page.visiblePages || page.pages;
      const sectionPartial = parent?.filename || page.parent?.filename || "pages";
      const [links_to_children, links_to_siblings, links_to_self_and_siblings, nav_links] =
        await Promise.all([
          childPages
            ? generateLinkList(page.filename, childPages, linkCache)
            : Promise.resolve(""),
          generateLinkList(
            sectionPartial,
            linkablePages.filter((p) => p.url !== page.url),
            linkCache,
          ),
          generateLinkList(sectionPartial, linkablePages, linkCache),
          generateLinkList("nav", linkCache.navPages, linkCache),
        ]);

      page.meta.links_to_children = links_to_children;
      page.meta.links_to_siblings = links_to_siblings;
      page.meta.links_to_self_and_siblings = links_to_self_and_siblings;
      page.meta.nav_links = nav_links;

      if (page.pages) {
        await addLinks(page.pages, page, linkCache);
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

export {
  generatePages,
  createPages,
  pageIndex,
  addLinks,
  comparePages,
  createLinkListCache,
  extractSummary,
  flattenAuthoredPages,
  findPageBySource,
  generateLinkList,
  refreshPageContent,
  parseDate,
};
