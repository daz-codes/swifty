import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const highlightPackageRoot = path.dirname(
  require.resolve("highlight.js/package.json"),
);
const HIGHLIGHT_LICENSE_PATH = path.join(highlightPackageRoot, "LICENSE");
const DEFAULT_HIGHLIGHT_THEME = "monokai-sublime";
const themeNamePattern = /^[a-z0-9][a-z0-9-]*$/;

const resolveHighlightTheme = (
  value = DEFAULT_HIGHLIGHT_THEME,
  filePath = "config",
) => {
  const name = value ?? DEFAULT_HIGHLIGHT_THEME;
  if (typeof name !== "string" || !themeNamePattern.test(name)) {
    throw new TypeError(
      `highlight_theme in ${filePath} must be a bundled highlight.js theme name`,
    );
  }

  try {
    return {
      name,
      sourcePath: require.resolve(`highlight.js/styles/${name}.min.css`),
    };
  } catch {
    throw new TypeError(
      `highlight_theme "${name}" in ${filePath} is not bundled with highlight.js`,
    );
  }
};

export {
  DEFAULT_HIGHLIGHT_THEME,
  HIGHLIGHT_LICENSE_PATH,
  resolveHighlightTheme,
};
