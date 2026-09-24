import path from "path";

import { baseDir } from "./config.js";
import { routeToOutputPath } from "./urls.js";

const displayPath = (filePath) =>
  path.relative(baseDir, filePath).replace(/\\/g, "/") || ".";

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

const collectRouteManifest = (pages, add) => {
  const manifest = new Map();
  for (const page of flattenPages(pages)) {
    const source = page.indexFilePath
      ? displayPath(page.indexFilePath)
      : page.filePath
        ? displayPath(page.filePath)
        : `generated ${page.url}`;
    let outputPath;
    try {
      outputPath = (
        page.notFound ? "404.html" : routeToOutputPath(page.route || page.url)
      ).replace(/\\/g, "/");
    } catch (error) {
      add({
        code: "content",
        source,
        reference: page.route || page.url,
        message: error.message,
      });
      continue;
    }
    if (manifest.has(outputPath)) {
      add({
        code: "duplicate-route",
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

const assertUniqueRoutes = (pages) => {
  const issues = [];
  collectRouteManifest(pages, (issue) => issues.push(issue));
  if (issues.length) {
    const details = issues
      .map((issue) => `[${issue.code}] ${issue.source}: ${issue.message}`)
      .join("\n");
    throw new Error(`Unable to write pages with invalid routes:\n${details}`);
  }
};

export { assertUniqueRoutes, collectRouteManifest, flattenPages };
