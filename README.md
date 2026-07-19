# Swifty ![swiftyy-logo-pink-s png](https://github.com/user-attachments/assets/22fde975-7e2d-48e3-a253-41ea464d27f4)

## Super Speedy Static Site Generator

Swifty uses convention over configuration to make it super simple to build blazingly fast static sites.

## Features

- **Markdown pages** with YAML front matter
- **Automatic image optimization** to responsive WebP images with `srcset`
- **HTML, CSS, and JS minification** during production builds
- **Layouts and partials** for reusable templates
- **Auto-injected CSS/JS** from your css/ and js/ folders
- **Self-hosted code syntax highlighting** via configurable highlight.js themes
- **Tags and navigation** generated automatically
- **RSS feed generation** for blogs and content folders
- **Draft mode** for work-in-progress pages (visible in dev, hidden in production)
- **Scheduled publishing** via future dates in front matter
- **Contact forms** via third-party services (Formspree, Netlify Forms, etc.)
- **Pagination** for folders with many pages
- **Data files** - Load JSON/YAML data and use in templates
- **Open Graph tags** - Auto-generated social sharing meta tags
- **404 page convention** - `pages/404.md` builds to `dist/404.html`
- **Word count & reading time** - Auto-calculated for blog posts
- **Previous/next navigation** - Auto-generated links between sibling pages
- **[Eta templating](https://eta.js.org/)** - Full JavaScript in templates with EJS syntax
- **Morpheus navigation** powered by Idiomorph, with intent prefetching and SPA-like transitions
- **Custom permalinks and base paths** for flexible deployment URLs
- **Public asset passthrough** for files that should be copied unchanged
- **Site validation** for duplicate routes, broken links, missing assets, and invalid configuration
- **Automatic summaries and related content** ranked by shared tags
- **Drop-in client-side search** backed by the generated `/search.json` index
- **Incremental page rebuilds** for safe body-only edits during development
- **Heading anchors and table of contents** generated from Markdown headings

Requires Node.js 22 or newer. See [Migrating to Swifty 4](MIGRATION.md) when upgrading an existing site.

## Quickstart

```bash
npm install -g @daz4126/swifty
swifty new my-site
cd my-site
npx swifty start
```

Then visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
your-site/
├── pages/          # Markdown content (folder structure = URLs)
├── layouts/        # HTML layout templates
├── partials/       # Reusable content snippets
├── data/           # JSON/YAML data files
├── css/            # Stylesheets (auto-injected)
├── js/             # JavaScript (auto-injected)
├── images/         # Images (auto-optimized to responsive WebP)
├── public/         # Files copied unchanged to the output root
├── template.html   # Base HTML template
└── config.yaml     # Site configuration
```

## Commands

```bash
npx swifty new my-site      # Create new site in my-site/ folder
npx swifty build            # Build static site to dist/ (for production)
npx swifty build --drafts   # Preview draft and scheduled pages
npx swifty check            # Validate routes, links, images, templates, and config
npx swifty start            # Build, watch, and serve at localhost:3000 (for development)
npx swifty build --out dir  # Build to custom output directory
npx swifty deploy "message" # Build, commit the output folder, and push
npx swifty --help           # Show command help
npx swifty --version        # Show the installed version
```

### Site Validation

Run `npx swifty check` before deploying. It renders every page, including drafts
and scheduled pages, into a temporary directory and reports duplicate routes,
broken internal links and anchors, missing images, partials or explicitly requested
layouts, invalid canonical URLs, and malformed root or folder configuration.

The command does not change `dist/` and exits with a non-zero status when it finds
an issue. External URLs are not fetched.

### Programmatic API Scope

The exported Node API currently keeps configuration, page indexes, tag state,
template caches, and incremental-build state at module scope. Rebuilding one
site repeatedly in a process is supported; building multiple independent site
roots in one process is not. Use a separate worker or child process per site
until the build pipeline gains an explicit site-context object.

### Development vs Production

- **`swifty start`** - For development. Includes live reload and incremental rebuilds for assets and safe body-only page edits; metadata or structural changes trigger a full build.
- **`swifty build`** - For production deployment. Produces clean output without any development scripts.
- **`swifty deploy "message"`** - Builds the site, commits only the generated output folder, and pushes it to git.

Native filesystem events are used by default. Set `watcher_use_polling: true`
when developing on a cloud folder, network mount, container volume, or another
filesystem that does not reliably emit change events.

## Documentation

See the [full documentation](https://swifty-oo3v.onrender.com/docs) for details on configuration, layouts, partials, and more.
