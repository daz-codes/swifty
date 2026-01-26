import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import { defaultConfig } from "./config.js";

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

// Strip HTML tags for description
const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

// Truncate text for description
const truncate = (text, maxLength = 200) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

// Convert date to RFC 822 format for RSS
const toRfc822 = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toUTCString();
};

// Generate RSS XML for a set of pages
const generateRssFeed = (feedConfig, pages, siteUrl) => {
  const {
    title = defaultConfig.sitename || "RSS Feed",
    description = `Latest updates from ${title}`,
    folder,
  } = typeof feedConfig === "string" ? { folder: feedConfig } : feedConfig;

  const feedUrl = `${siteUrl}/${folder}/rss.xml`;
  const feedLink = `${siteUrl}/${folder}`;

  // Sort pages by date (newest first)
  const sortedPages = [...pages].sort((a, b) => {
    const dateA = new Date(a.data?.date || a.updated_at || 0);
    const dateB = new Date(b.data?.date || b.updated_at || 0);
    return dateB - dateA;
  });

  // Limit to most recent items (default 20)
  const maxItems = defaultConfig.rss_max_items || 20;
  const feedPages = sortedPages.slice(0, maxItems);

  const items = feedPages
    .map((page) => {
      const itemUrl = `${siteUrl}${page.url}`;
      const itemTitle = escapeXml(page.meta?.title || page.title || page.name);
      const itemDate = toRfc822(page.meta?.date || page.updated_at || new Date());
      const itemDescription = escapeXml(
        truncate(stripHtml(page.content), 300)
      );

      return `    <item>
      <title>${itemTitle}</title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <pubDate>${itemDate}</pubDate>
      <description>${itemDescription}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${feedLink}</link>
    <description>${escapeXml(description)}</description>
    <language>${defaultConfig.language || "en"}</language>
    <lastBuildDate>${toRfc822(new Date())}</lastBuildDate>
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
      if (page.url && page.url.startsWith(`/${folderName}/`) && !page.folder) {
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

    const feedXml = generateRssFeed(feedConfig, folderPages, siteUrl);
    const feedPath = path.join(outputDir, folder, "rss.xml");

    await fsExtra.ensureDir(path.dirname(feedPath));
    await fs.writeFile(feedPath, feedXml);
    console.log(`Generated RSS feed: ${folder}/rss.xml (${folderPages.length} items)`);
  }
};

export { generateRssFeeds, generateRssFeed, findPagesInFolder };
