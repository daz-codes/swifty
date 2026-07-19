import fs from "fs/promises";
import os from "os";
import path from "path";

import fsExtra from "fs-extra";
import yaml from "js-yaml";

import { copyAssets, optimizeImages } from "./assets.js";
import { baseDir, defaultConfig, dirs, validateConfig } from "./config.js";
import { clearDataCache } from "./data.js";
import { resetCaches } from "./layout.js";
import { addLinks, createPages, generatePages } from "./pages.js";
import {
  clearCache as clearPartialCache,
  resolveSocialImageUrl,
} from "./partials.js";
import { parseFrontMatter } from "./frontmatter.js";
import { generateRssFeeds } from "./rss.js";
import { generateSeoFiles } from "./sitemap.js";
import { generateSearchIndex } from "./search.js";
import {
  normalizePermalink,
  routeToOutputPath,
  withBasePath,
  withoutBasePath,
} from "./urls.js";

const CHECK_CODES = {
  BROKEN_LINK: "broken-link",
  BUILD: "build",
  CONFIG: "config",
  CONTENT: "content",
  DUPLICATE_ROUTE: "duplicate-route",
  INVALID_CANONICAL: "invalid-canonical",
  INVALID_SOCIAL_IMAGE: "invalid-social-image",
  MISSING_IMAGE: "missing-image",
  MISSING_LAYOUT: "missing-layout",
  MISSING_PARTIAL: "missing-partial",
};

const CONFIG_FILENAMES = new Set(["config.yaml", "config.yml", "config.json"]);
const BUILT_IN_PARTIALS = new Set(["search"]);
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

const toPosix = (value) => value.replace(/\\/g, "/");
const displayPath = (filePath) => toPosix(path.relative(baseDir, filePath)) || ".";

const walkFiles = async (directory, predicate = () => true) => {
  if (!(await fsExtra.pathExists(directory))) return [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(filePath, predicate);
      return predicate(filePath) ? [filePath] : [];
    }),
  );
  return nested.flat();
};

const createIssueCollector = () => {
  const issues = [];
  const seen = new Map();
  const add = (issue) => {
    const normalized = {
      code: issue.code,
      message: issue.message,
      reference: issue.reference || "",
      source: issue.source || "",
      sources: issue.source ? [issue.source] : [],
    };
    const key = JSON.stringify({
      code: normalized.code,
      message: normalized.message,
      reference: normalized.reference,
    });
    if (seen.has(key)) {
      const existing = seen.get(key);
      if (normalized.source && !existing.sources.includes(normalized.source)) {
        existing.sources.push(normalized.source);
      }
      return;
    }
    seen.set(key, normalized);
    issues.push(normalized);
  };
  return { add, issues };
};

const canonicalUrlError = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "must be a non-empty absolute HTTP(S) URL";
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "must be an absolute HTTP(S) URL";
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    return "must be an absolute HTTP(S) URL without credentials or a fragment";
  }
  return null;
};

const protectCodeBlocks = (source) =>
  source.replace(/```[\s\S]*?\n```|`[^`\n]+`|<(pre|code)[^>]*>[\s\S]*?<\/\1>/gi, "");

const validatePageMetadata = (data, source, add) => {
  if (data.layout !== undefined && data.layout !== null && data.layout !== false) {
    if (typeof data.layout !== "string" || !data.layout.trim()) {
      add({
        code: CHECK_CODES.CONTENT,
        source,
        message: "layout must be a non-empty string, false, or null",
      });
    }
  }
  if (
    data.tags !== undefined &&
    (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== "string"))
  ) {
    add({
      code: CHECK_CODES.CONTENT,
      source,
      message: "tags must be an array of strings",
    });
  }
  if (
    data.page_count !== undefined &&
    (!Number.isInteger(data.page_count) || data.page_count <= 0)
  ) {
    add({
      code: CHECK_CODES.CONTENT,
      source,
      message: "page_count must be a positive integer",
    });
  }
  for (const key of ["draft", "nav", "search", "sitemap"]) {
    if (data[key] !== undefined && typeof data[key] !== "boolean") {
      add({
        code: CHECK_CODES.CONTENT,
        source,
        message: `${key} must be a boolean`,
      });
    }
  }
  if (data.permalink !== undefined) {
    try {
      normalizePermalink(data.permalink);
    } catch (error) {
      add({
        code: CHECK_CODES.CONTENT,
        source,
        reference: String(data.permalink),
        message: error.message,
      });
    }
  }
  if (data.canonical !== undefined) {
    const error = canonicalUrlError(data.canonical);
    if (error) {
      add({
        code: CHECK_CODES.INVALID_CANONICAL,
        source,
        reference: String(data.canonical),
        message: `Canonical URL ${error}`,
      });
    }
  }
};

const checkLayoutReference = async (layout, source, add) => {
  if (typeof layout !== "string" || !layout.trim()) return;
  const layoutPath = path.join(dirs.layouts, `${layout}.html`);
  if (!(await fsExtra.pathExists(layoutPath))) {
    add({
      code: CHECK_CODES.MISSING_LAYOUT,
      source,
      reference: layout,
      message: `Layout "${layout}" was not found at ${displayPath(layoutPath)}`,
    });
  }
};

const collectSourceIssues = async (add) => {
  const pageFiles = await walkFiles(
    dirs.pages,
    (filePath) => path.extname(filePath).toLowerCase() === ".md",
  );
  const pageConfigFiles = await walkFiles(
    dirs.pages,
    (filePath) => CONFIG_FILENAMES.has(path.basename(filePath)),
  );
  const rootConfigFiles = [...CONFIG_FILENAMES]
    .map((filename) => path.join(baseDir, filename))
    .filter((filePath) => fsExtra.pathExistsSync(filePath));
  const configFiles = [...rootConfigFiles, ...pageConfigFiles];

  for (const filePath of configFiles) {
    const source = displayPath(filePath);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const config = filePath.endsWith(".json") ? JSON.parse(content) : yaml.load(content);
      validateConfig(config || {}, filePath);
      await checkLayoutReference(config?.layout, source, add);
    } catch (error) {
      add({
        code: CHECK_CODES.CONFIG,
        source,
        message: error.message,
      });
    }
  }

  for (const filePath of pageFiles) {
    const source = displayPath(filePath);
    try {
      const parsed = parseFrontMatter(await fs.readFile(filePath, "utf-8"));
      validatePageMetadata(parsed.data, source, add);
      await checkLayoutReference(parsed.data.layout, source, add);
    } catch (error) {
      add({
        code: CHECK_CODES.CONTENT,
        source,
        message: error.message,
      });
    }
  }

  const templatePath = path.join(baseDir, "template.html");
  const referenceFiles = [
    ...(await walkFiles(dirs.pages, (filePath) => path.extname(filePath) === ".md")),
    ...(await walkFiles(dirs.layouts, (filePath) => path.extname(filePath) === ".html")),
    ...(await walkFiles(dirs.partials, (filePath) =>
      [".html", ".md"].includes(path.extname(filePath)),
    )),
  ];
  if (await fsExtra.pathExists(templatePath)) referenceFiles.push(templatePath);

  for (const filePath of referenceFiles) {
    const source = displayPath(filePath);
    const content = protectCodeBlocks(await fs.readFile(filePath, "utf-8"));
    const references = [...content.matchAll(/<%=\s*partial:\s*([\w-]+)\s*%>/g)];
    for (const [, partialName] of references) {
      const candidates = [
        path.join(dirs.partials, `${partialName}.md`),
        path.join(dirs.partials, `${partialName}.html`),
      ];
      const exists = BUILT_IN_PARTIALS.has(partialName) || (
        await Promise.all(candidates.map((candidate) => fsExtra.pathExists(candidate)))
      ).some(Boolean);
      if (!exists) {
        add({
          code: CHECK_CODES.MISSING_PARTIAL,
          source,
          reference: partialName,
          message: `Partial "${partialName}" was not found in ${displayPath(dirs.partials)}`,
        });
      }
    }
  }

  return { configFiles: configFiles.length, pageFiles: pageFiles.length };
};

const flattenPages = (pages) => {
  const result = [];
  const visit = (items) => {
    for (const page of items) {
      result.push(page);
      if (page.pages) visit(page.pages);
      if (page.paginatedPages) visit(page.paginatedPages);
    }
  };
  visit(pages);
  return result;
};

const pageOutputPath = (page) =>
  toPosix(page.notFound ? "404.html" : routeToOutputPath(page.route || page.url));

const collectRouteManifest = (pages, add) => {
  const manifest = new Map();
  for (const page of flattenPages(pages)) {
    let outputPath;
    try {
      outputPath = pageOutputPath(page);
    } catch (error) {
      add({
        code: CHECK_CODES.CONTENT,
        source: page.filePath ? displayPath(page.filePath) : page.url,
        reference: page.route || page.url,
        message: error.message,
      });
      continue;
    }
    const source = page.indexFilePath
      ? displayPath(page.indexFilePath)
      : page.filePath
        ? displayPath(page.filePath)
        : `generated ${page.url}`;
    if (manifest.has(outputPath)) {
      add({
        code: CHECK_CODES.DUPLICATE_ROUTE,
        source,
        reference: page.route || page.url,
        message: `Route writes ${outputPath}, which is already written by ${manifest.get(outputPath).source}`,
      });
      continue;
    }
    manifest.set(outputPath, { page, source });
  }
  return manifest;
};

const collectSocialImageIssues = (pages, add) => {
  for (const page of flattenPages(pages)) {
    const meta = page.meta || {};
    const image =
      meta.image ||
      meta.og_image ||
      meta.default_og_image ||
      defaultConfig.default_og_image ||
      "";
    if (!image) continue;

    const siteUrl = meta.site_url || meta.url || defaultConfig.site_url || defaultConfig.url || "";
    if (resolveSocialImageUrl(image, siteUrl, meta.base_path)) continue;

    add({
      code: CHECK_CODES.INVALID_SOCIAL_IMAGE,
      source: page.filePath ? displayPath(page.filePath) : `generated ${page.url}`,
      reference: String(image),
      message: `Local social image "${image}" requires an absolute site_url before og:image and twitter:image can be emitted`,
    });
  }
};

const parseAttributes = (tag) => {
  const attributes = {};
  const pattern = /([^\s=<>]+)(?:\s*=\s*(?:(["'])(.*?)\2|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    if (name.startsWith("<") || name === "/") continue;
    attributes[name] = match[3] ?? match[4] ?? "";
  }
  return attributes;
};

const publicUrlForOutput = (relativePath) => {
  const normalized = toPosix(relativePath);
  let route;
  if (normalized === "index.html") route = "/";
  else if (normalized.endsWith("/index.html")) {
    route = `/${normalized.slice(0, -"/index.html".length)}`;
  } else {
    route = `/${normalized}`;
  }
  return withBasePath(route);
};

const outputFileForUrl = async (outputDir, pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(withoutBasePath(pathname));
  } catch {
    return null;
  }
  const relativePath = decoded.replace(/^\/+/, "");
  const candidates = relativePath.endsWith("/")
    ? [path.join(relativePath, "index.html")]
    : path.extname(relativePath)
      ? [relativePath]
      : [relativePath, path.join(relativePath, "index.html")];
  if (!relativePath) candidates.push("index.html");

  const resolvedOutput = path.resolve(outputDir);
  for (const candidate of candidates) {
    const filePath = path.resolve(outputDir, candidate);
    if (!filePath.startsWith(`${resolvedOutput}${path.sep}`)) continue;
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        return { filePath, relativePath: toPosix(path.relative(outputDir, filePath)) };
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
};

const referenceTarget = (reference, pageUrl) => {
  const value = reference.trim();
  if (!value || /^(?:data|javascript|mailto|tel):/i.test(value)) return null;

  const configuredSiteUrl = defaultConfig.site_url || defaultConfig.url || "";
  const origin = configuredSiteUrl
    ? new URL(configuredSiteUrl).origin
    : "https://swifty.invalid";
  let target;
  try {
    target = new URL(value, `${origin}${pageUrl}`);
  } catch {
    return { invalid: true };
  }
  if (!["http:", "https:"].includes(target.protocol)) return null;

  const explicitlyHosted = /^(?:[a-z]+:)?\/\//i.test(value);
  if (explicitlyHosted && target.origin !== origin) return null;
  return target.origin === origin ? target : null;
};

const hasAnchor = async (filePath, fragment) => {
  if (!fragment || path.extname(filePath).toLowerCase() !== ".html") return true;
  let anchor;
  try {
    anchor = decodeURIComponent(fragment.replace(/^#/, ""));
  } catch {
    return false;
  }
  if (!anchor) return true;
  const html = await fs.readFile(filePath, "utf-8");
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(?:id|name)=["']${escaped}["']`, "i").test(html);
};

const inspectReference = async ({
  add,
  image,
  outputDir,
  pageUrl,
  reference,
  source,
}) => {
  const target = referenceTarget(reference, pageUrl);
  const code = image ? CHECK_CODES.MISSING_IMAGE : CHECK_CODES.BROKEN_LINK;
  if (!target) return;
  if (target.invalid) {
    add({ code, source, reference, message: `Invalid internal URL: ${reference}` });
    return;
  }

  const outputFile = await outputFileForUrl(outputDir, target.pathname);
  if (!outputFile) {
    add({
      code,
      source,
      reference,
      message: `${image ? "Image" : "Internal URL"} does not exist in generated output`,
    });
    return;
  }
  if (!(await hasAnchor(outputFile.filePath, target.hash))) {
    add({
      code: CHECK_CODES.BROKEN_LINK,
      source,
      reference,
      message: `Anchor ${target.hash} does not exist in ${outputFile.relativePath}`,
    });
  }
};

const inspectHtmlFile = async (filePath, outputDir, source, add) => {
  const html = await fs.readFile(filePath, "utf-8");
  const pageUrl = publicUrlForOutput(path.relative(outputDir, filePath));
  const scannableHtml = html.replace(
    /(<(script|style|pre|code)\b[^>]*>)[\s\S]*?(<\/\2>)/gi,
    "$1$3",
  );
  const tags = scannableHtml.match(/<[a-z][^<>]*>/gi) || [];
  let canonicalCount = 0;

  for (const tag of tags) {
    const tagName = tag.match(/^<([a-z][\w:-]*)/i)?.[1].toLowerCase();
    const attributes = parseAttributes(tag);
    const rel = (attributes.rel || "").toLowerCase().split(/\s+/);

    if (tagName === "link" && rel.includes("canonical")) {
      canonicalCount += 1;
      const error = canonicalUrlError(attributes.href);
      if (error) {
        add({
          code: CHECK_CODES.INVALID_CANONICAL,
          source,
          reference: attributes.href,
          message: `Canonical URL ${error}`,
        });
      }
    }

    const references = [];
    if (["a", "area", "link"].includes(tagName) && attributes.href !== undefined) {
      references.push({ image: tagName === "link" && rel.some((value) => value.includes("icon")), value: attributes.href });
    }
    if (
      ["audio", "iframe", "img", "script", "source", "track", "video"].includes(tagName) &&
      attributes.src !== undefined
    ) {
      references.push({ image: ["img", "source", "video"].includes(tagName), value: attributes.src });
    }
    if (tagName === "video" && attributes.poster !== undefined) {
      references.push({ image: true, value: attributes.poster });
    }
    if (tagName === "form" && attributes.action !== undefined) {
      references.push({ image: false, value: attributes.action });
    }
    if (["img", "source"].includes(tagName) && attributes.srcset) {
      for (const candidate of attributes.srcset.split(",")) {
        references.push({ image: true, value: candidate.trim().split(/\s+/)[0] });
      }
    }
    if (
      tagName === "meta" &&
      [attributes.property, attributes.name]
        .filter(Boolean)
        .some((value) => /^(?:og:image|twitter:image)$/i.test(value)) &&
      attributes.content
    ) {
      references.push({ image: true, value: attributes.content });
    }

    for (const reference of references) {
      await inspectReference({
        add,
        image: reference.image,
        outputDir,
        pageUrl,
        reference: reference.value,
        source,
      });
    }
  }

  if (canonicalCount > 1) {
    add({
      code: CHECK_CODES.INVALID_CANONICAL,
      source,
      message: `Page contains ${canonicalCount} canonical links; expected at most one`,
    });
  }
};

const inspectCssFile = async (filePath, outputDir, add) => {
  const css = await fs.readFile(filePath, "utf-8");
  const source = toPosix(path.relative(outputDir, filePath));
  const pageUrl = publicUrlForOutput(source);
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    const reference = match[2];
    const extension = path.extname(reference.split(/[?#]/)[0]).toLowerCase();
    await inspectReference({
      add,
      image: IMAGE_EXTENSIONS.has(extension),
      outputDir,
      pageUrl,
      reference,
      source,
    });
  }
};

const inspectOutput = async (outputDir, manifest, add) => {
  const htmlFiles = await walkFiles(
    outputDir,
    (filePath) => path.extname(filePath).toLowerCase() === ".html",
  );
  const cssFiles = await walkFiles(
    outputDir,
    (filePath) => path.extname(filePath).toLowerCase() === ".css",
  );

  for (const filePath of htmlFiles) {
    const relativePath = toPosix(path.relative(outputDir, filePath));
    const source = manifest.get(relativePath)?.source || relativePath;
    await inspectHtmlFile(filePath, outputDir, source, add);
  }
  for (const filePath of cssFiles) {
    await inspectCssFile(filePath, outputDir, add);
  }
  return { cssFiles: cssFiles.length, htmlFiles: htmlFiles.length };
};

const checkSite = async () => {
  const collector = createIssueCollector();
  const sourceCounts = await collectSourceIssues(collector.add);
  const report = {
    counts: { ...sourceCounts, cssFiles: 0, htmlFiles: 0, routes: 0 },
    issues: collector.issues,
    ok: false,
  };

  if (
    collector.issues.some((issue) =>
      [CHECK_CODES.CONFIG, CHECK_CODES.CONTENT].includes(issue.code),
    )
  ) {
    return report;
  }

  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "swifty-check-"));
  let previousWatchValue;
  let hadWatchValue = false;
  try {
    clearDataCache();
    clearPartialCache();
    await copyAssets(outputDir);
    await optimizeImages(outputDir);

    hadWatchValue = Object.prototype.hasOwnProperty.call(process.env, "SWIFTY_WATCH");
    previousWatchValue = process.env.SWIFTY_WATCH;
    process.env.SWIFTY_WATCH = "true";
    const pages = await generatePages(dirs.pages);
    if (hadWatchValue) process.env.SWIFTY_WATCH = previousWatchValue;
    else delete process.env.SWIFTY_WATCH;

    await resetCaches();
    await addLinks(pages);
    const manifest = collectRouteManifest(pages, collector.add);
    collectSocialImageIssues(pages, collector.add);
    report.counts.routes = manifest.size;

    const hasMissingPartial = collector.issues.some(
      (issue) => issue.code === CHECK_CODES.MISSING_PARTIAL,
    );
    if (!hasMissingPartial) {
      try {
        await createPages(pages, outputDir);
        await generateSearchIndex(pages, outputDir);
        await generateRssFeeds(pages, outputDir);
        await generateSeoFiles(pages, outputDir);
      } catch (error) {
        collector.add({ code: CHECK_CODES.BUILD, message: error.message });
      }

      Object.assign(report.counts, await inspectOutput(outputDir, manifest, collector.add));
    }
  } catch (error) {
    collector.add({ code: CHECK_CODES.BUILD, message: error.message });
  } finally {
    if (hadWatchValue) process.env.SWIFTY_WATCH = previousWatchValue;
    else delete process.env.SWIFTY_WATCH;
    await fsExtra.remove(outputDir);
    clearDataCache();
    clearPartialCache();
  }

  report.ok = collector.issues.length === 0;
  return report;
};

const printCheckReport = (report, logger = console) => {
  if (report.ok) {
    logger.log(
      `✅ Swifty check passed: ${report.counts.routes} routes and ${report.counts.htmlFiles} HTML files checked.`,
    );
    return;
  }

  logger.error(`❌ Swifty check found ${report.issues.length} issue${report.issues.length === 1 ? "" : "s"}:`);
  report.issues.forEach((issue, index) => {
    logger.error(`\n${index + 1}. [${issue.code}] ${issue.message}`);
    if (issue.source) logger.error(`   Source: ${issue.source}`);
    if (issue.sources.length > 1) {
      logger.error(`   Also found in ${issue.sources.length - 1} other generated pages`);
    }
    if (issue.reference) logger.error(`   Reference: ${issue.reference}`);
  });
};

const runCheck = async () => {
  const report = await checkSite();
  printCheckReport(report);
  return report;
};

export {
  CHECK_CODES,
  canonicalUrlError,
  checkSite,
  collectRouteManifest,
  collectSocialImageIssues,
  printCheckReport,
  runCheck,
};
export default runCheck;
