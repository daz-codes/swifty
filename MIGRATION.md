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

## Deterministic Dates

Display dates now default to `date_locale: en-GB` and `timezone: UTC`. Set both
options explicitly if the site previously relied on the build machine's locale
or timezone. A date such as `2026-07-18` publishes at midnight in the configured
timezone; an exact timestamp must include `Z` or an explicit offset.

The unused `default_page_count` option has been removed. Use `page_count` to
enable pagination explicitly.

Relative `image`, `og_image`, and `default_og_image` values require an absolute
`site_url`. Without it, Swifty omits `og:image` and `twitter:image`, and
`swifty check` reports the affected source.

## Strict Build Errors

Invalid configuration, front matter, JSON/YAML data, Eta templates, partial references, images, CSS, JavaScript, or generated HTML now fail the build. Fix the path reported in the error before deploying.

## Minification

Swifty now uses CleanCSS, Terser, and html-minifier-terser. JavaScript is compressed but identifiers are not mangled. Set `minify`, `minify_html`, `minify_css`, or `minify_js` to `false` if source formatting must be retained.

Syntax highlighting no longer loads its theme from cdnjs. Swifty copies the
default `monokai-sublime` theme locally and only links it on pages with fenced
code. Set `highlight_theme` to another theme name bundled with highlight.js if
you previously depended on a different stylesheet.

Generated search entries now keep at most 5,000 normalized content characters
by default. Set `search_content_limit` to a larger positive integer if an
existing site intentionally searches unusually long page bodies. Titles,
summaries, tags, and URLs are not truncated.

## Development Server

`swifty start` now uses Swifty's built-in static server. Set `server_port` in `config.yaml` to change its default port from `3000`.

File watching now uses native filesystem events by default. If changes are
missed on a cloud folder, network mount, or container volume, set
`watcher_use_polling: true`. `watcher_interval` controls the interval only when
polling is enabled.

## Deploy Command

`swifty deploy` stages only the configured output directory. It refuses to proceed when other changes are already staged, and it does not commit source changes automatically.

Commit source changes separately before deploying.
