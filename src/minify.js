import CleanCSS from "clean-css";
import { minify as minifyHtmlContent } from "html-minifier-terser";
import { minify as minifyJsContent } from "terser";

const minifyCss = (css) => {
  const result = new CleanCSS({
    level: 1,
    rebase: false,
  }).minify(css);

  if (result.errors.length) {
    throw new Error(result.errors.join("; "));
  }

  return result.styles;
};

const minifyJs = async (js) => {
  const result = await minifyJsContent(js, {
    compress: true,
    mangle: false,
    format: {
      comments: /^!/,
    },
  });

  return result.code || "";
};

const minifyHtml = (html) =>
  minifyHtmlContent(html, {
    caseSensitive: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    continueOnParseError: false,
    keepClosingSlash: true,
    minifyCSS: false,
    minifyJS: false,
    removeComments: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
  });

export { minifyCss, minifyHtml, minifyJs };
