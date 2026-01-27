import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import { dirs, defaultConfig } from "./config.js";
import { marked } from "marked";
import { Eta } from "eta";
import { loadData } from "./data.js";

const partialCache = new Map();

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
  const image = meta.image || meta.og_image || '';
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

const loadPartial = async (partialName) => {
  if (partialCache.has(partialName)) {
    return partialCache.get(partialName);
  }

  const partialPath = path.join(dirs.partials, `${partialName}.md`);
  if (await fsExtra.pathExists(partialPath)) {
    const partialContent = await fs.readFile(partialPath, "utf-8");
    partialCache.set(partialName, partialContent);
    return partialContent;
  } else {
    console.warn(`Include "${partialName}" not found.`);
    return `<p>Include "${partialName}" not found.</p>`;
  }
};

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
    let partialContent = await loadPartial(partialName);
    partialContent = await replacePlaceholders(partialContent, values);
    const renderedPartial = marked(partialContent);
    template = template.replace(fullMatch, renderedPartial);
  }

  // Convert <%- to <%= since autoEscape is false (all output is raw)
  // This provides EJS-style syntax compatibility
  template = template.replace(/<%-/g, '<%=');

  // Render with Eta
  try {
    template = eta.renderString(template, templateData);
  } catch (error) {
    console.warn(`Eta template error: ${error.message}`);
  }

  // Restore code blocks
  template = template.replace(
    /__CODE_BLOCK_(\d+)__/g,
    (_, index) => codeBlocks[index],
  );

  // Replace image extensions with optimized extension
  template = template.replace(/\.(png|jpe?g|webp)/gi, ".webp");

  return template;
};

const clearCache = () => {
  partialCache.clear();
};

export { loadPartial, replacePlaceholders, clearCache };
