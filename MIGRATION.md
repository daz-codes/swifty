# Migrating to Swifty 4

Swifty 4 focuses on deterministic builds, safer deployment, and explicit errors.

## Requirements

- Upgrade Node.js to version 22 or 24. Older Node.js releases are no longer supported.
- Run `npm install` after upgrading so the tracked lockfile installs the new minifiers.

## Clean Output and Public Files

Every full build empties the output directory. Files written directly to `dist/` are removed.

Move files that must pass through unchanged into `public/`:

```text
public/manifest.webmanifest -> dist/manifest.webmanifest
public/fonts/site.woff2     -> dist/fonts/site.woff2
```

Optimized images remain cached in `.swifty-cache/`, which should not be committed.

## Folder Index Pages

`pages/blog/index.md` is now the content and front matter for `/blog`. It no longer creates `/blog/index` or gets treated as a child page.

## Permalinks and Base Paths

Use `permalink` in page front matter to override a page URL:

```yaml
permalink: /company/about.html
```

For deployment below an origin path, set `base_path` and keep `site_url` as the origin:

```yaml
site_url: https://example.com
base_path: /project
```

The base path changes public URLs but does not add a `dist/project/` directory.

## Strict Build Errors

Invalid configuration, front matter, JSON/YAML data, Eta templates, partial references, images, CSS, JavaScript, or generated HTML now fail the build. Fix the path reported in the error before deploying.

## Minification

Swifty now uses CleanCSS, Terser, and html-minifier-terser. JavaScript is compressed but identifiers are not mangled. Set `minify`, `minify_html`, `minify_css`, or `minify_js` to `false` if source formatting must be retained.

## Development Server

`swifty start` now uses Swifty's built-in static server. Set `server_port` in `config.yaml` to change its default port from `3000`.

## Deploy Command

`swifty deploy` stages only the configured output directory. It refuses to proceed when other changes are already staged, and it does not commit source changes automatically.

Commit source changes separately before deploying.
