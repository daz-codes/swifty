import path from "path";

import { defaultConfig } from "./config.js";

const normalizeBasePath = (value = defaultConfig.base_path) => {
  if (!value || value === "/") return "";
  if (typeof value !== "string") {
    throw new TypeError("base_path must be a string");
  }

  const normalized = `/${value}`.replace(/\/+/g, "/").replace(/\/$/, "");
  if (normalized.includes("..") || /[?#]/.test(normalized)) {
    throw new Error(`Invalid base_path: ${value}`);
  }
  return normalized;
};

const withBasePath = (url, basePath = defaultConfig.base_path) => {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    return url;
  }

  const base = normalizeBasePath(basePath);
  if (!base || url === base || url.startsWith(`${base}/`)) return url;
  return url === "/" ? `${base}/` : `${base}${url}`;
};

const withoutBasePath = (url, basePath = defaultConfig.base_path) => {
  const base = normalizeBasePath(basePath);
  if (!base || typeof url !== "string") return url;
  if (url === base || url === `${base}/`) return "/";
  return url.startsWith(`${base}/`) ? url.slice(base.length) : url;
};

const normalizePermalink = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("permalink must be a non-empty string");
  }
  if (/^(?:[a-z]+:)?\/\//i.test(value.trim())) {
    throw new Error(`Invalid permalink: ${value}`);
  }

  const route = `/${value.trim()}`
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "") || "/";
  if (route.split("/").includes("..") || /[?#]/.test(route)) {
    throw new Error(`Invalid permalink: ${value}`);
  }
  return route;
};

const routeToOutputPath = (route) => {
  const normalized = normalizePermalink(route);
  if (normalized === "/") return "index.html";

  const relativeRoute = normalized.replace(/^\/+/, "");
  return path.extname(relativeRoute)
    ? relativeRoute
    : path.join(relativeRoute, "index.html");
};

const applyBasePathToHtml = (html, basePath = defaultConfig.base_path) => {
  const base = normalizeBasePath(basePath);
  if (!base) return html;

  const protectedBlocks = [];
  const protectedHtml = html.replace(
    /(<(script|style|pre|code)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi,
    (block, opening, tagName, content, closing) => {
      const token = `__SWIFTY_BASE_PATH_BLOCK_${protectedBlocks.length}__`;
      protectedBlocks.push(content);
      return `${opening}${token}${closing}`;
    },
  );

  const rewritten = protectedHtml
    .replace(
      /\b(href|src|action|poster)=(['"])(\/(?!\/)[^'"]*)\2/gi,
      (attribute, name, quote, url) =>
        `${name}=${quote}${withBasePath(url, base)}${quote}`,
    )
    .replace(/\bsrcset=(['"])(.*?)\1/gi, (attribute, quote, value) => {
      if (!/(?:^|,)\s*\//.test(value)) return attribute;
      const nextValue = value.replace(
        /(^|,\s*)(\/(?!\/)[^\s,]+)/g,
        (candidate, prefix, url) => `${prefix}${withBasePath(url, base)}`,
      );
      return `srcset=${quote}${nextValue}${quote}`;
    });

  return rewritten.replace(
    /__SWIFTY_BASE_PATH_BLOCK_(\d+)__/g,
    (token, index) => protectedBlocks[index],
  );
};

const applyBasePathToCss = (css, basePath = defaultConfig.base_path) => {
  const base = normalizeBasePath(basePath);
  if (!base) return css;

  return css.replace(
    /url\(\s*(['"]?)(\/(?!\/)[^)'"\s]+)\1\s*\)/gi,
    (value, quote, url) => `url(${quote}${withBasePath(url, base)}${quote})`,
  );
};

export {
  applyBasePathToCss,
  applyBasePathToHtml,
  normalizeBasePath,
  normalizePermalink,
  routeToOutputPath,
  withBasePath,
  withoutBasePath,
};
