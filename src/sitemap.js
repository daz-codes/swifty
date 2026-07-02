import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import { defaultConfig } from "./config.js";
import { withBasePath } from "./urls.js";

const escapeXml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatSitemapDate = (date) => {
  const parsed = date instanceof Date ? date : new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const flattenPages = (pages) => {
  const flattened = [];

  const addPages = (pageList) => {
    for (const page of pageList) {
      if (page.url && page.meta?.sitemap !== false) {
        flattened.push(page);
      }

      if (page.pages) addPages(page.pages);
      if (page.paginatedPages) addPages(page.paginatedPages);
    }
  };

  addPages(pages);
  return flattened;
};

const pageUrl = (siteUrl, page) => {
  const baseUrl = siteUrl.replace(/\/$/, "");
  return `${baseUrl}${page.url === "/" ? "/" : page.url}`;
};

const generateSitemapXml = (pages, siteUrl = "") => {
  const seenUrls = new Set();
  const urls = flattenPages(pages)
    .filter((page) => {
      if (seenUrls.has(page.url)) return false;
      seenUrls.add(page.url);
      return true;
    })
    .map((page) => {
      const lastmod = formatSitemapDate(
        page.updatedAtObj || page.dateObj || page.updated_at || new Date(),
      );
      const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";

      return `  <url>
    <loc>${escapeXml(pageUrl(siteUrl, page))}</loc>${lastmodLine}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
};

const generateRobotsTxt = (siteUrl = "") => {
  const lines = ["User-agent: *", "Allow: /"];
  if (siteUrl) {
    lines.push(
      `Sitemap: ${siteUrl.replace(/\/$/, "")}${withBasePath("/sitemap.xml")}`,
    );
  }
  return `${lines.join("\n")}\n`;
};

const generateSeoFiles = async (pages, outputDir) => {
  const siteUrl = defaultConfig.site_url || defaultConfig.url || "";
  const sitemapXml = generateSitemapXml(pages, siteUrl);
  const robotsTxt = generateRobotsTxt(siteUrl);

  await fsExtra.ensureDir(outputDir);
  await Promise.all([
    fs.writeFile(path.join(outputDir, "sitemap.xml"), sitemapXml),
    fs.writeFile(path.join(outputDir, "robots.txt"), robotsTxt),
  ]);
};

export { flattenPages, generateRobotsTxt, generateSeoFiles, generateSitemapXml };
