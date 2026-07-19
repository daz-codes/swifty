// markdown.js
// Central marked instance with syntax highlighting wired up via highlight.js.
// Importing marked from here (instead of "marked" directly) guarantees the
// highlight extension is configured before any markdown is parsed.
import { Marked, marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

marked.use(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

const createSlugger = () => {
  const slugs = new Map();

  return (value) => {
    const base = String(value)
      .trim()
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";
    const count = slugs.get(base) || 0;
    slugs.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
};

const decodeHtmlEntities = (value) =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) =>
      ({
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
      })[entity],
    );

const inlineText = (tokens = []) =>
  tokens
    .map((token) => {
      if (Array.isArray(token.tokens)) return inlineText(token.tokens);
      if (token.type === "image") return decodeHtmlEntities(token.text || "");
      return decodeHtmlEntities(token.text || "");
    })
    .join("");

const collectMarkdownHeadings = (source) => {
  const headings = [];
  const slug = createSlugger();
  const tokens = marked.lexer(source || "");

  marked.walkTokens(tokens, (token) => {
    if (token.type !== "heading") return;
    const text = inlineText(token.tokens).trim();
    headings.push({ depth: token.depth, text, id: slug(text) });
  });

  return headings;
};

const renderMarkdown = (source) => {
  const slug = createSlugger();
  const parser = new Marked(
    markedHighlight({
      emptyLangClass: "hljs",
      langPrefix: "hljs language-",
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      },
    }),
    {
      renderer: {
        heading({ tokens, depth }) {
          const text = inlineText(tokens).trim();
          const id = slug(text);
          return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
        },
      },
    },
  );

  return parser.parse(source || "");
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderTocItems = (items) => {
  if (!items.length) return "";
  return `<ul>\n${items
    .map(
      (item) =>
        `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>${renderTocItems(item.children)}</li>`,
    )
    .join("\n")}\n</ul>`;
};

const renderTableOfContents = (headings) => {
  if (!headings.length) return "";
  const root = { depth: 0, children: [] };
  const stack = [root];

  for (const heading of headings) {
    while (stack.length > 1 && stack.at(-1).depth >= heading.depth) {
      stack.pop();
    }
    const item = { ...heading, children: [] };
    stack.at(-1).children.push(item);
    stack.push(item);
  }

  return `<nav class="swifty_toc" aria-label="Table of contents">\n${renderTocItems(root.children)}\n</nav>`;
};

export {
  collectMarkdownHeadings,
  marked,
  renderMarkdown,
  renderTableOfContents,
};
