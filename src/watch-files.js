import path from "path";

import chokidar from "chokidar";

const configFiles = new Set(["config.yaml", "config.yml", "config.json"]);
const rootFiles = new Set(["template.html", ...configFiles]);
const dirExtensions = {
  pages: [".md", ".html"],
  layouts: [".html"],
  images: null,
  css: [".css"],
  js: [".js"],
  partials: [".md", ".html"],
  data: [".json", ".yaml", ".yml"],
  public: null,
};

const isInside = (directory, filePath) => {
  const relative = path.relative(directory, filePath);
  return relative === "" || (
    !path.isAbsolute(relative) && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`)
  );
};

const shouldTriggerBuild = (filePath, cwd, directory = false) => {
  const relative = path.relative(cwd, filePath);
  if (!relative || !isInside(cwd, filePath)) return false;
  const parts = relative.split(path.sep);
  const topDir = parts[0];
  if (directory) return Object.hasOwn(dirExtensions, topDir);
  if (parts.length === 1) return rootFiles.has(relative);
  if (!Object.hasOwn(dirExtensions, topDir)) return false;
  if (topDir === "pages" && configFiles.has(path.basename(filePath))) return true;
  const extensions = dirExtensions[topDir];
  return extensions === null || extensions.includes(path.extname(filePath).toLowerCase());
};

const getChangeType = (filePath, cwd = process.cwd()) => {
  const topDir = path.relative(cwd, filePath).split(path.sep)[0];
  if (topDir === "images") return "image";
  if (topDir === "pages" && path.extname(filePath).toLowerCase() === ".md") return "page";
  return "full";
};

const createSourceWatcher = ({ cwd = process.cwd(), outputDir = "dist", options = {}, onChange }) => {
  const root = path.resolve(cwd);
  const outputPath = path.resolve(root, outputDir);
  const watcher = chokidar.watch(root, {
    ...options,
    ignoreInitial: true,
    // Watching the root discovers source directories and config files added
    // after startup. Prune unrelated trees before Chokidar traverses them.
    ignored: (filePath) => {
      const absolutePath = path.resolve(filePath);
      if (absolutePath === root) return false;
      if (!isInside(root, absolutePath) || isInside(outputPath, absolutePath)) return true;
      const relative = path.relative(root, absolutePath);
      const topDir = relative.split(path.sep)[0];
      return !Object.hasOwn(dirExtensions, topDir) && !rootFiles.has(relative);
    },
  });

  for (const event of ["add", "change", "unlink", "addDir", "unlinkDir"]) {
    watcher.on(event, (filePath) => {
      if (shouldTriggerBuild(filePath, root, event.endsWith("Dir"))) {
        onChange({ event, filePath });
      }
    });
  }
  return watcher;
};

export { createSourceWatcher, getChangeType, shouldTriggerBuild };
