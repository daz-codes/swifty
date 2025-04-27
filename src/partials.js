import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import { dirs } from "./config.js";
import { marked } from "marked";

const partialCache = new Map();


const loadPartial = async (partialName) => {
  if (partialCache.has(partialName)) {
    return partialCache.get(partialName);
  }

  const partialPath = path.join(dirs.partials, `${partialName}.md`);
  if (await fsExtra.pathExists(partialPath)) {
    const partialContent = await fs.readFile(partialPath, "utf-8");
    partialCache.set(partialName, partialContent); // Store in cache
    return partialContent;
  } else {
    console.warn(`Include "${partialName}" not found.`);
    return `<p>Include "${partialName}" not found.</p>`;
  }
};

const replacePlaceholders = async (template, values) => {
  console.log(values)
  const partialRegex = /{{\s*partial:\s*([\w-]+)\s*}}/g;
  const replaceAsync = async (str, regex, asyncFn) => {
    const matches = [];
    str.replace(regex, (match, ...args) => {
      matches.push(asyncFn(match, ...args));
      return match;
    });
    const results = await Promise.all(matches);
    return str.replace(regex, () => results.shift());
  };

  // Replace partial includes
  template = await replaceAsync(template, partialRegex, async (match, partialName) => {
    let partialContent = await loadPartial(partialName);
    partialContent = await replacePlaceholders(partialContent, values); // Recursive replacement
    return marked(partialContent); // Convert Markdown to HTML
  });
  // replace image extensions with optimized extension
  template = template.replace(/\.(png|jpe?g|webp)/gi, ".webp");
  // Replace other placeholders **only outside of code blocks**
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`|<(pre|code)[^>]*>[\s\S]*?<\/\1>/g;
    const codeBlocks = [];
    template = template.replace(codeBlockRegex, match => {
        codeBlocks.push(match);
        return `{{CODE_BLOCK_${codeBlocks.length - 1}}}`; // Temporary placeholder
    });
    // Replace placeholders outside of code blocks
    template = template.replace(/{{\s*([^}\s]+)\s*}}/g, (match, key) => {
      return(values.data && key in values?.data ? values.data[key] : key in values ? values[key] : match)
    });
    // Restore code blocks
    template = template.replace(/{{CODE_BLOCK_(\d+)}}/g, (_, index) => codeBlocks[index]);

  return template;
};

export { loadPartial, replacePlaceholders };