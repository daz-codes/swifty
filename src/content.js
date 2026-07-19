const decodeBasicEntities = (value) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

const normalizeContentText = (value) =>
  decodeBasicEntities(String(value || ""))
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}(?:[-*+] |\d+\. )/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/[>|]/g, " ")
    .replace(/<%[\s\S]*?%>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncateSummary = (value, maxLength) => {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength + 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > maxLength * 0.6 ? boundary : maxLength).trim()}…`;
};

const extractSummary = (content, maxLength = 200) => {
  const source = String(content || "");
  const markerIndex = source.indexOf("<!--more-->");
  if (markerIndex !== -1) {
    const excerpt = source
      .slice(0, markerIndex)
      .replace(/^\s{0,3}#{1,6}\s+.*$/gm, " ");
    return truncateSummary(
      normalizeContentText(excerpt),
      maxLength,
    );
  }

  const withoutFences = source.replace(/```[\s\S]*?```/g, "");
  const paragraphs = withoutFences.split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    if (/^\s{0,3}#{1,6}\s+/.test(paragraph)) continue;
    const text = normalizeContentText(paragraph);
    if (text && !/^[-=]{3,}$/.test(text)) {
      return truncateSummary(text, maxLength);
    }
  }
  return "";
};

export { extractSummary, normalizeContentText, truncateSummary };
