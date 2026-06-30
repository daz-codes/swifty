// markdown.js
// Central marked instance with syntax highlighting wired up via highlight.js.
// Importing marked from here (instead of "marked" directly) guarantees the
// highlight extension is configured before any markdown is parsed.
import { marked } from "marked";
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

export { marked };
