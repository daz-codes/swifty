import fs from "fs/promises";
import path from "path";

import fsExtra from "fs-extra";
import { Eta } from "eta";

import { dirs, defaultConfig } from "./config.js";
import { marked } from "./markdown.js";
import { loadData } from "./data.js";
import { getResponsiveImage } from "./assets.js";
import { withBasePath, withoutBasePath } from "./urls.js";

const partialCache = new Map();
const imageExtensionRegex = /\.(png|jpe?g|webp)(?=([?#]|$))/i;
const rewriteableImageTags = new Set(["a", "img", "source"]);

// Helper to escape HTML attribute values
const escapeAttr = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Count words in content (strips HTML and markdown)
const countWords = (content) => {
  if (!content) return 0;
  // Strip HTML tags
  let text = content.replace(/<[^>]*>/g, ' ');
  // Strip markdown syntax (links, images, emphasis, etc.)
  text = text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1'); // links/images
  text = text.replace(/[*_~`#]+/g, ''); // emphasis, headers
  text = text.replace(/\n/g, ' ');
  // Split on whitespace and filter empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0);
  return words.length;
};

// Calculate reading time using config value or default 200 words per minute
const calculateReadingTime = (wordCount, wordsPerMinute = defaultConfig.words_per_minute || 200) => {
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
};

// Generate Open Graph meta tags from page data
const generateOgTags = (values) => {
  const meta = values.meta || {};
  const tags = [];

  // Basic OG tags
  const title = meta.title || values.title || '';
  const sitename = meta.sitename || values.sitename || '';
  const description = meta.description || meta.summary || '';
  const url = values.url || '';
  const siteUrl = (meta.site_url || values.site_url || '').replace(/\/$/, '');
  // Rewrite local image paths to .webp so they match the optimized output on disk
  const image = rewriteImageUrl(
    meta.image ||
      meta.og_image ||
      meta.default_og_image ||
      values.default_og_image ||
      defaultConfig.default_og_image ||
      '',
  );
  const type = meta.og_type || (values.folder ? 'website' : 'article');
  const author = meta.author || values.author || '';

  // Open Graph tags
  if (title) tags.push(`<meta property="og:title" content="${escapeAttr(title)}">`);
  if (sitename) tags.push(`<meta property="og:site_name" content="${escapeAttr(sitename)}">`);
  if (siteUrl && url) tags.push(`<meta property="og:url" content="${escapeAttr(siteUrl + url)}">`);
  tags.push(`<meta property="og:type" content="${escapeAttr(type)}">`);
  if (description) tags.push(`<meta property="og:description" content="${escapeAttr(description)}">`);
  if (image) {
    const imageUrl = image.startsWith('http') ? image : siteUrl + image;
    tags.push(`<meta property="og:image" content="${escapeAttr(imageUrl)}">`);
  }

  // Twitter Card tags
  tags.push(`<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`);
  if (title) tags.push(`<meta name="twitter:title" content="${escapeAttr(title)}">`);
  if (description) tags.push(`<meta name="twitter:description" content="${escapeAttr(description)}">`);
  if (image) {
    const imageUrl = image.startsWith('http') ? image : siteUrl + image;
    tags.push(`<meta name="twitter:image" content="${escapeAttr(imageUrl)}">`);
  }

  // Article-specific tags
  if (type === 'article') {
    if (author) tags.push(`<meta property="article:author" content="${escapeAttr(author)}">`);
    if (values.dateObj) {
      tags.push(`<meta property="article:published_time" content="${values.dateObj.toISOString()}">`);
    }
    if (meta.tags && Array.isArray(meta.tags)) {
      meta.tags.forEach(tag => {
        tags.push(`<meta property="article:tag" content="${escapeAttr(tag)}">`);
      });
    }
  }

  return tags.join('\n  ');
};

// Configure Eta with useWith for cleaner variable access
const eta = new Eta({
  views: dirs.partials,
  autoEscape: false,  // All output is raw (no HTML escaping)
  autoTrim: false,
  useWith: true,      // Allows direct variable access without 'it.' prefix
});

const loadPartialData = async (partialName) => {
  if (partialCache.has(partialName)) {
    return partialCache.get(partialName);
  }

  const partialFiles = [
    { path: path.join(dirs.partials, `${partialName}.md`), raw: false },
    { path: path.join(dirs.partials, `${partialName}.html`), raw: true },
  ];

  for (const partialFile of partialFiles) {
    const partialPath = partialFile.path;
    if (!(await fsExtra.pathExists(partialPath))) continue;

    const partialContent = await fs.readFile(partialPath, "utf-8");
    const partialData = { content: partialContent, raw: partialFile.raw };
    partialCache.set(partialName, partialData);
    return partialData;
  }

  throw new Error(`Partial "${partialName}" was not found in ${dirs.partials}`);
};

const loadPartial = async (partialName) => {
  const partialData = await loadPartialData(partialName);
  return partialData.content;
};

const shouldRewriteImageUrl = (url) => {
  const route = withoutBasePath(url);
  if (!route || !route.startsWith("/images/")) return false;
  return imageExtensionRegex.test(route);
};

const rewriteImageUrl = (url) => {
  if (!shouldRewriteImageUrl(url)) return url;
  return withBasePath(withoutBasePath(url).replace(imageExtensionRegex, ".webp"));
};

const rewriteSrcset = (srcset) =>
  srcset
    .split(",")
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      if (!parts[0]) return candidate;
      return [rewriteImageUrl(parts[0]), ...parts.slice(1)].join(" ");
    })
    .join(", ");

const getAttributeValue = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match ? match[2] : "";
};

const hasAttribute = (tag, name) =>
  new RegExp(`\\s${name}(?:=|\\s|>|/)`, "i").test(tag);

const appendAttribute = (tag, name, value) =>
  tag.replace(/\s*\/?>$/, (ending) => {
    const close = ending.includes("/") ? " />" : ">";
    return ` ${name}="${escapeAttr(value)}"${close}`;
  });

const addResponsiveImageAttributes = (tag) => {
  const imageUrl = getAttributeValue(tag, "src");
  const responsiveImage = getResponsiveImage(imageUrl);

  if (!responsiveImage || responsiveImage.variants.length < 2) return tag;

  let nextTag = tag;
  if (!hasAttribute(nextTag, "srcset")) {
    nextTag = appendAttribute(nextTag, "srcset", responsiveImage.srcset);
  }
  if (!hasAttribute(nextTag, "sizes")) {
    nextTag = appendAttribute(nextTag, "sizes", responsiveImage.sizes);
  }
  return nextTag;
};

const rewriteLocalImageReferences = (html) =>
  html.replace(/<([a-z][\w:-]*)(\s[^<>]*?)?>/gi, (tag, tagName) => {
    const normalizedTagName = tagName.toLowerCase();
    if (!rewriteableImageTags.has(normalizedTagName)) {
      return tag;
    }

    const rewrittenTag = tag.replace(
      /\s(src|href|srcset)=(["'])(.*?)\2/gi,
      (attribute, attributeName, quote, value) => {
        const nextValue =
          attributeName.toLowerCase() === "srcset"
            ? rewriteSrcset(value)
            : rewriteImageUrl(value);
        return ` ${attributeName}=${quote}${nextValue}${quote}`;
      },
    );

    return normalizedTagName === "img"
      ? addResponsiveImageAttributes(rewrittenTag)
      : rewrittenTag;
  });

const replacePlaceholders = async (template, values) => {
  // Default values for optional variables
  const defaults = {
    pagination: '',
    breadcrumbs: '',
    nav_links: '',
    links_to_children: '',
    links_to_siblings: '',
    links_to_tags: '',
    links_to_self_and_siblings: '',
    content: '',
    title: '',
    sitename: '',
    author: '',
    date: '',
    created_at: '',
    updated_at: '',
    og_tags: '',
    word_count: 0,
    reading_time: '',
    prev_page: '',
    next_page: '',
  };

  // Load data files from data/ folder
  const dataFiles = await loadData();

  // Generate OG tags
  const og_tags = generateOgTags(values);

  // Calculate word count and reading time from content
  const word_count = countWords(values.content);
  const reading_time = calculateReadingTime(word_count);

  // Build the data object for Eta
  // Merge defaults, config values, page metadata, and computed values
  const templateData = {
    ...defaults,
    ...values,
    ...(values.meta || {}),
    og_tags,
    word_count,
    reading_time,
    // Expose page namespace with meta
    page: {
      ...defaults,
      ...values,
      ...(values.meta || {}),
      meta: values.meta || {},
      og_tags,
      word_count,
      reading_time,
    },
    // Expose data folder contents
    data: dataFiles,
  };

  // Protect code blocks BEFORE Eta processing
  const codeBlockRegex =
    /```[\s\S]*?\n```|`[^`\n]+`|<(pre|code)[^>]*>[\s\S]*?<\/\1>/g;
  const codeBlocks = [];
  template = template.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Handle <%= partial: name %> syntax
  const partialRegex = /<%=\s*partial:\s*([\w-]+)\s*%>/g;
  const partialMatches = [...template.matchAll(partialRegex)];

  for (const match of partialMatches) {
    const [fullMatch, partialName] = match;
    const partialData = await loadPartialData(partialName);
    let partialContent = partialData.content;
    partialContent = await replacePlaceholders(partialContent, values);
    const renderedPartial = partialData.raw ? partialContent : marked(partialContent);
    template = template.replace(fullMatch, renderedPartial);
  }

  // Convert <%- to <%= since autoEscape is false (all output is raw)
  // This provides EJS-style syntax compatibility
  template = template.replace(/<%-/g, '<%=');

  // Render with Eta
  try {
    template = eta.renderString(template, templateData);
  } catch (error) {
    const source = values.filePath || values.url || values.title || "template";
    throw new Error(`Unable to render ${source}: ${error.message}`, {
      cause: error,
    });
  }

  // Restore code blocks
  template = template.replace(
    /__CODE_BLOCK_(\d+)__/g,
    (_, index) => codeBlocks[index],
  );

  template = rewriteLocalImageReferences(template);

  return template;
};

const clearCache = () => {
  partialCache.clear();
};

export { loadPartial, replacePlaceholders, clearCache };
