# Swifty

Swifty is a convention-first static site generator for documentation, blogs,
brochure sites, and other content-focused websites. Put Markdown in `pages/`,
add layouts when you need them, and get fast, deployable HTML without assembling
a plugin stack first.

It requires Node.js 22 or newer.

## Why Swifty?

- **A useful starter, not an empty directory.** New sites include a responsive
  stylesheet, default layout, page template, and tiny JavaScript example.
- **Content structure is site structure.** Folders become routes and drive
  layouts, navigation, breadcrumbs, sibling links, and feeds.
- **Documentation features are built in.** Stable heading anchors, generated
  tables of contents, syntax highlighting, search, and link validation work
  without external services.
- **Publishing has sensible controls.** Drafts, scheduled pages, deterministic
  dates, summaries, related content, pagination, RSS, sitemaps, and social tags
  share the same content model.
- **The browser runtime stays local.** Search, Morpheus navigation, Idiomorph,
  and highlight.js themes are copied into the generated site rather than loaded
  from a CDN.
- **There is a small escape hatch.** Optional `swifty.config.js` can expose Eta
  globals/helpers or register Marked extensions when conventions are not enough.

## Quick Start

```bash
npm install -g @daz4126/swifty
swifty new my-site
cd my-site
swifty start
```

Open [http://localhost:3000](http://localhost:3000). The development server
rebuilds and refreshes the browser as files change.

The scaffold looks like this:

```text
my-site/
├── pages/
│   └── index.md
├── layouts/
│   └── default.html
├── partials/
├── css/
│   └── style.css
├── js/
│   └── hello-swifty.js
├── images/
├── data/
├── public/
├── template.html
├── swifty.config.js  # Optional; add only when needed
└── config.yaml
```

## Pages Become Routes

```text
pages/
├── index.md                 → /
├── about.md                 → /about
├── 404.md                   → /404.html
└── docs/
    ├── index.md             → /docs
    └── getting-started.md   → /docs/getting-started
```

A page is Markdown with optional YAML front matter:

```markdown
---
title: Getting Started
summary: Install and configure the project.
tags: [docs, setup]
---

# Getting Started

Write normal **Markdown** here.
```

Folder names select matching layouts and link partials by convention. A page in
`pages/docs/` uses `layouts/docs.html` when it exists; a `partials/docs.md`
customizes generated child and sibling links for that section.

## Templates, Layouts, and Partials

Swifty uses Eta syntax in `template.html`, layouts, partials, and Markdown:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= title %> · <%= sitename %></title>
  <%= og_tags %>
</head>
<body>
  <nav><%= nav_links %></nav>
  <main><%= content %></main>
</body>
</html>
```

Include project partials with `<%= partial: name %>`. CSS and JavaScript files
in their respective folders are minified, cache-busted with modification times,
and injected automatically.

Useful page variables include:

| Variable | Purpose |
| --- | --- |
| `<%= breadcrumbs %>` | Folder-aware breadcrumb links |
| `<%= links_to_children %>` | Child pages for a folder index |
| `<%= links_to_siblings %>` | Other pages in the current section |
| `<%= links_to_tags %>` | Canonical generated tag links |
| `<%= prev_page %>` / `<%= next_page %>` | Ordered sibling navigation |
| `<%= summary %>` | Authored or automatically extracted summary |
| `<%= related_pages %>` | Pages ranked by shared tags |
| `<%= word_count %>` / `<%= reading_time %>` | Prose metrics; fenced code is excluded |
| `<%= toc %>` | Nested links to generated heading IDs |
| `pages` / `collections.pages` | Immutable authored-page metadata collection |

## Search, TOC, and Collections

Add the self-hosted search interface anywhere:

```html
<%= partial: search %>
```

Swifty generates `/search.json`; `search_content_limit` bounds normalized body
text per entry while titles, URLs, summaries, and tags remain complete.

Every Markdown heading gets a stable ID. Put `<%= toc %>` in a long-form layout
to render an accessible outline, and use ordinary links such as
`[Configuration](#configuration)` for deep linking.

Build recent-post lists, archives, or custom homepages from the page collection:

```html
<% for (const post of collections.pages.filter((page) => page.tags.includes("news")).slice(0, 5)) { %>
  <article>
    <h2><a href="<%= post.url %>"><%= post.title %></a></h2>
    <p><%= post.summary %></p>
  </article>
<% } %>
```

Collection entries include title, URL, summary, tags, and display and ISO dates.
Generated routes, 404 pages, drafts, and future pages are excluded from
production collections.

## Drafts and Scheduled Pages

```yaml
---
title: Work in Progress
draft: true
---
```

Draft and future-dated pages appear during `swifty start`. Preview them in a
standalone build with:

```bash
swifty build --drafts --out preview
```

A normal production build excludes them. Future pages publish on the first
build after their configured date; use scheduled deployments when publication
must happen without a content commit.

## Configuration

Defaults are intentionally usable. A typical `config.yaml` might contain:

```yaml
sitename: My Site
site_url: https://example.com
base_path: ""

highlight_theme: monokai-sublime
search: true
search_content_limit: 5000
search_results_limit: 10

morphing: true
prefetching: true
morph_target: main
navigation_cache_size: 20
navigation_cache_ttl: 15

date_locale: en-GB
timezone: UTC
words_per_minute: 200

watcher_use_polling: false
build_concurrency: 16
```

Native filesystem events are the default. Enable `watcher_use_polling` only for
cloud folders, network mounts, container volumes, or filesystems that miss
events. Pagination is also explicit: set `page_count` globally or in a folder's
`config.yaml` when that section needs it.

See the [configuration guide](https://swifty-oo3v.onrender.com/docs/configuration)
for every option, including RSS feeds, responsive images, minification, date
formatting, and base-path deployments.

## Minimal Extension Point

Most sites only need layouts, partials, and data files. For small reusable hooks,
add `swifty.config.js`:

```javascript
module.exports = {
  globals: {
    productName: "My Site",
  },
  helpers: {
    uppercase(value) {
      return String(value).toUpperCase();
    },
  },
  markedExtensions: [],
};
```

Then use `<%= uppercase(productName) %>` in any Eta template. Projects with
`"type": "module"` use `export default { ... }`. Restart `swifty start` after
editing the extension file because it loads when the process starts.

## Commands

| Command | What it does |
| --- | --- |
| `swifty new <name>` | Create a styled starter site |
| `swifty start [--out dir]` | Build, serve, watch, and live reload |
| `swifty build [--out dir]` | Create a clean production build |
| `swifty build --drafts` | Include draft and scheduled pages in a preview |
| `swifty check` | Validate config, templates, routes, links, anchors, and assets |
| `swifty deploy ["message"]` | Build, commit only generated output, and push |
| `swifty --help` | Show CLI usage |
| `swifty --version` | Show the installed version |

Unknown commands fail safely; they never create directories implicitly.

## Validation and Production Builds

Run this before deployment:

```bash
swifty check
swifty build
```

`swifty check` renders into a temporary directory without changing `dist/`. It
reports malformed configuration or front matter, duplicate routes, broken
internal links and heading anchors, missing images, partials and layouts, and
invalid canonical/social metadata.

Production builds minify HTML, CSS, and JavaScript; optimize local raster images
to responsive WebP output; generate search, RSS, sitemap, and robots files; and
omit development scripts. The result is ordinary static files deployable to any
static host.

## Programmatic API

Swifty also exports its build and check functions as ESM:

```javascript
import build, { checkSite } from "@daz4126/swifty";

await build();
const report = await checkSite();
```

The current API is intentionally one-site-per-process because configuration,
indexes, and caches are module-scoped. Use a separate process per independent
site.

## Documentation

- [Getting started](https://swifty-oo3v.onrender.com/docs/get-started)
- [Complete tutorial](https://swifty-oo3v.onrender.com/docs/tutorial)
- [Configuration](https://swifty-oo3v.onrender.com/docs/configuration)
- [Pages and template variables](https://swifty-oo3v.onrender.com/docs/pages)
- [Migration guide](MIGRATION.md)
- [Roadmap](https://swifty-oo3v.onrender.com/roadmap)

## Development

```bash
npm install
npm test
npm run test:package
npm run build
```

Swifty normally installs `@daz4126/morpheus` from npm. When developing both
projects as sibling checkouts, run `npm run morpheus:link` to use
`../morpheus` without changing `package.json` or `package-lock.json`. Re-run
`npm install` to return to the registry release.

`npm run test:package` always installs dependencies from npm, even when a sibling
Morpheus checkout exists. It verifies the packed CLI and API, scaffolds a site,
builds Markdown and images, and runs `swifty check` against the installed package.

Swifty is released under the [MIT License](LICENSE).
