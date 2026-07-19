import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import { defaultConfig } from "./config.js";
import { normalizeContentText } from "./content.js";
import { marked } from "./markdown.js";
import { replacePlaceholders } from "./partials.js";
import { withBasePath } from "./urls.js";

// Escape XML special characters
const escapeXml = (str) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

// Truncate text for description
const truncate = (text, maxLength = 200) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

const validDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Prefer machine-readable page dates. Display dates are locale-dependent and
// must not be parsed back into dates for feeds or sorting.
const getPageDate = (page) => {
  const candidates = [
    page.dateObj,
    page.date_iso,
    page.meta?.date_iso,
    page.updatedAtObj,
    page.updated_at_iso,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    const date = validDate(candidate);
    if (date) return date;
  }

  return null;
};

// Convert a valid date to RFC 822 format for RSS
const toRfc822 = (date) => validDate(date)?.toUTCString() || null;

const normalizeRssDescription = async (page) => {
  const rendered = await replacePlaceholders(String(page.content || ""), page);
  return truncate(normalizeContentText(marked.parse(rendered)), 300);
};

// Generate RSS XML for a set of pages
const generateRssFeed = async (feedConfig, pages, siteUrl) => {
  const {
    title = defaultConfig.sitename || "RSS Feed",
    description = `Latest updates from ${title}`,
    folder,
  } = typeof feedConfig === "string" ? { folder: feedConfig } : feedConfig;

  const feedUrl = `${siteUrl}${withBasePath(`/${folder}/rss.xml`)}`;
  const feedLink = `${siteUrl}${withBasePath(`/${folder}`)}`;

  // Sort pages by date (newest first)
  const sortedPages = [...pages].sort((a, b) => {
    const dateA = getPageDate(a)?.getTime() || 0;
    const dateB = getPageDate(b)?.getTime() || 0;
    return dateB - dateA;
  });

  // Limit to most recent items (default 20)
  const maxItems = defaultConfig.rss_max_items || 20;
  const feedPages = sortedPages.slice(0, maxItems);
  const feedDate = feedPages.map(getPageDate).find(Boolean) || new Date();

  const items = (
    await Promise.all(feedPages.map(async (page) => {
      const itemUrl = `${siteUrl}${page.url}`;
      const itemTitle = escapeXml(page.meta?.title || page.title || page.name);
      const itemDate = toRfc822(getPageDate(page) || feedDate);
      const itemDescription = escapeXml(await normalizeRssDescription(page));

      return `    <item>
      <title>${itemTitle}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <pubDate>${itemDate}</pubDate>
      <description>${itemDescription}</description>
    </item>`;
    })))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${feedLink}</link>
    <description>${escapeXml(description)}</description>
    <language>${defaultConfig.language || "en"}</language>
    <lastBuildDate>${toRfc822(feedDate)}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
};

// Find pages belonging to a specific folder
const findPagesInFolder = (pages, folderName) => {
  const found = [];

  const searchPages = (pageList) => {
    for (const page of pageList) {
      // Check if this page's URL starts with the folder path
      if (page.route?.startsWith(`/${folderName}/`) && !page.folder) {
        found.push(page);
      }
      // Recursively search nested pages
      // Use allPages for paginated folders to include all items in RSS
      const childPages = page.allPages || page.pages;
      if (childPages) {
        searchPages(childPages);
      }
    }
  };

  searchPages(pages);
  return found;
};

// Generate all RSS feeds based on config
const generateRssFeeds = async (pages, outputDir) => {
  const rssFeeds = defaultConfig.rss_feeds;
  if (!rssFeeds || !Array.isArray(rssFeeds) || rssFeeds.length === 0) {
    return;
  }

  const siteUrl = defaultConfig.site_url || defaultConfig.url || "";

  for (const feedConfig of rssFeeds) {
    const folder =
      typeof feedConfig === "string" ? feedConfig : feedConfig.folder;

    if (!folder) {
      console.warn("RSS feed config missing folder name, skipping");
      continue;
    }

    const folderPages = findPagesInFolder(pages, folder);

    if (folderPages.length === 0) {
      console.warn(`No pages found for RSS feed: ${folder}`);
      continue;
    }

    const feedXml = await generateRssFeed(feedConfig, folderPages, siteUrl);
    const feedPath = path.join(outputDir, folder, "rss.xml");

    await fsExtra.ensureDir(path.dirname(feedPath));
    await fs.writeFile(feedPath, feedXml);
    console.log(`Generated RSS feed: ${folder}/rss.xml (${folderPages.length} items)`);
  }
};

export {
  generateRssFeeds,
  generateRssFeed,
  findPagesInFolder,
  getPageDate,
  normalizeRssDescription,
  toRfc822,
};
