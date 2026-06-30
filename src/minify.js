const protectBlocks = (content, pattern) => {
  const blocks = [];
  const protectedContent = content.replace(pattern, (match) => {
    const token = `__SWIFTY_MINIFY_BLOCK_${blocks.length}__`;
    blocks.push(match);
    return token;
  });

  return {
    content: protectedContent,
    restore: (value) =>
      value.replace(/__SWIFTY_MINIFY_BLOCK_(\d+)__/g, (_, index) => blocks[index]),
  };
};

const protectCssValues = (css) => {
  const blocks = [];
  let content = "";

  const protect = (start, end) => {
    const token = `__SWIFTY_MINIFY_BLOCK_${blocks.length}__`;
    blocks.push(css.slice(start, end));
    content += token;
    return end;
  };

  const readStringEnd = (start) => {
    const quote = css[start];
    let index = start + 1;

    while (index < css.length) {
      if (css[index] === "\\") {
        index += 2;
        continue;
      }
      if (css[index] === quote) return index + 1;
      index += 1;
    }

    return css.length;
  };

  const readUrlEnd = (start) => {
    let index = start + 4;

    while (index < css.length) {
      const char = css[index];
      if (char === "\"" || char === "'") {
        index = readStringEnd(index);
        continue;
      }
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === ")") return index + 1;
      index += 1;
    }

    return css.length;
  };

  for (let index = 0; index < css.length; ) {
    const char = css[index];
    const isUrl = css.slice(index, index + 4).toLowerCase() === "url(";

    if (char === "/" && css[index + 1] === "*") {
      const commentEnd = css.indexOf("*/", index + 2);
      const end = commentEnd === -1 ? css.length : commentEnd + 2;
      content += css.slice(index, end);
      index = end;
    } else if (char === "\"" || char === "'") {
      index = protect(index, readStringEnd(index));
    } else if (isUrl) {
      index = protect(index, readUrlEnd(index));
    } else {
      content += char;
      index += 1;
    }
  }

  return {
    content,
    restore: (value) =>
      value.replace(/__SWIFTY_MINIFY_BLOCK_(\d+)__/g, (_, index) => blocks[index]),
  };
};

const minifyCss = (css) => {
  const values = protectCssValues(css);

  const minified = values.content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();

  return values.restore(minified);
};

const minifyJs = (js) => {
  const strings = protectBlocks(js, /(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1/g);

  const minified = strings.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return strings.restore(minified);
};

const minifyHtml = (html) => {
  const blocks = protectBlocks(
    html,
    /<(pre|code|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
  );

  const minified = blocks.content
    .replace(/<!--(?!\[if|<!|>)[\s\S]*?-->/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .trim();

  return blocks.restore(minified);
};

export { minifyCss, minifyHtml, minifyJs };
