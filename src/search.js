import fs from "fs/promises";
import path from "path";

import fsExtra from "fs-extra";

import { defaultConfig, dirs } from "./config.js";
import { marked } from "./markdown.js";
import { replacePlaceholders } from "./partials.js";
import { routeToOutputPath } from "./urls.js";

const SEARCH_INDEX_FILENAME = "search.json";
const SEARCH_INDEX_VERSION = 1;

const decodeHtmlEntities = (value) => {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi, (entity, code) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const hexadecimal = code[1]?.toLowerCase() === "x";
    const number = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!Number.isFinite(number)) return entity;
    try {
      return String.fromCodePoint(number);
    } catch {
      return entity;
    }
  });
};

const normalizeSearchText = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ");
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
};

const flattenSearchablePages = (pages) => {
  const searchable = [];
  const visit = (pageList) => {
    for (const page of pageList) {
      const authoredFolder = page.folder && page.hasIndexContent;
      const authoredPage = page.filePath && (!page.folder || authoredFolder);
      if (
        authoredPage &&
        !page.notFound &&
        page.meta?.search !== false &&
        page.meta?.sitemap !== false
      ) {
        searchable.push(page);
      }
      if (page.pages) visit(page.pages);
    }
  };
  visit(pages);
  return searchable;
};

const findReservedPathOwner = (pages) => {
  const visit = (pageList) => {
    for (const page of pageList) {
      if (!page.notFound) {
        const outputPath = routeToOutputPath(page.route || page.url);
        if (outputPath.replace(/\\/g, "/") === SEARCH_INDEX_FILENAME) {
          return page.filePath || page.url;
        }
      }
      const childOwner = page.pages ? visit(page.pages) : null;
      if (childOwner) return childOwner;
      const paginationOwner = page.paginatedPages ? visit(page.paginatedPages) : null;
      if (paginationOwner) return paginationOwner;
    }
    return null;
  };
  return visit(pages);
};

const renderSearchText = async (
  value,
  page,
  { markdown = false, renderContext } = {},
) => {
  if (value === undefined || value === null || value === "") return "";
  const replaced = await replacePlaceholders(String(value), page, renderContext);
  const rendered = markdown ? marked.parse(replaced) : replaced;
  return normalizeSearchText(rendered);
};

const capSearchContent = (value, limit) => {
  if (!limit || value.length <= limit) return value;
  const leading = value.slice(0, limit);
  const wordBoundary = leading.lastIndexOf(" ");
  return leading
    .slice(0, wordBoundary >= Math.floor(limit * 0.8) ? wordBoundary : limit)
    .trim();
};

const createSearchEntry = async (page) => {
  const renderContext = {};
  const renderedContent = await renderSearchText(page.content || "", page, {
    markdown: true,
    renderContext,
  });
  const contentLimit =
    page.meta?.search_content_limit ?? defaultConfig.search_content_limit ?? 5000;
  if (!Number.isInteger(contentLimit) || contentLimit <= 0) {
    throw new TypeError(
      `search_content_limit for ${page.filePath || page.url || "search entry"} must be a positive integer`,
    );
  }
  const content = capSearchContent(renderedContent, contentLimit);
  const configuredSummary = page.meta?.summary || page.meta?.description || "";
  const summary = configuredSummary
    ? await renderSearchText(configuredSummary, page, {
        markdown: true,
        renderContext,
      })
    : renderedContent.slice(0, 200).trim();
  const tags = Array.isArray(page.meta?.tags)
    ? page.meta.tags.map((tag) => normalizeSearchText(tag)).filter(Boolean)
    : [];

  return {
    title: normalizeSearchText(page.meta?.title || page.title || page.name),
    url: page.url,
    summary,
    content,
    tags,
  };
};

const createSearchIndex = async (pages) => {
  const entries = await Promise.all(flattenSearchablePages(pages).map(createSearchEntry));
  entries.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  return { version: SEARCH_INDEX_VERSION, pages: entries };
};

const generateSearchIndex = async (pages, outputDir = dirs.dist) => {
  if (defaultConfig.search === false) return false;

  const outputPath = path.join(outputDir, SEARCH_INDEX_FILENAME);
  const routeOwner = findReservedPathOwner(pages);
  const publicIndexPath = path.join(dirs.public, SEARCH_INDEX_FILENAME);
  if (routeOwner || (await fsExtra.pathExists(publicIndexPath))) {
    const owner = routeOwner || publicIndexPath;
    throw new Error(
      `${SEARCH_INDEX_FILENAME} is reserved for the generated search index, but ${owner} already writes that path`,
    );
  }

  const index = await createSearchIndex(pages);
  await fsExtra.ensureDir(outputDir);
  await fs.writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`);
  return index;
};

export {
  SEARCH_INDEX_FILENAME,
  SEARCH_INDEX_VERSION,
  capSearchContent,
  createSearchEntry,
  createSearchIndex,
  findReservedPathOwner,
  flattenSearchablePages,
  generateSearchIndex,
  normalizeSearchText,
};
