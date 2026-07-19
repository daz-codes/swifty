---
tags:
  - swifty
  - docs
  - config
position: 2
summary: Customize Swifty to your liking.
---

Swifty believes in sensible defaults, but when you want to tweak things, the config file is your friend. Create a `config.yaml` (or `config.yml` or `config.json` if that's your jam) in your project root.

## The Full Config Menu

Here's everything you can configure, with the defaults shown:

```yaml
sitename: Swifty
author: Taylor Swift
site_url: https://yoursite.com
base_path: ""
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: tag
prev_next_class: swifty_link
default_layout_name: default
default_link_name: links
max_image_width: 800
image_quality: 80
responsive_image_widths: [320, 640, 800]
responsive_image_sizes: 100vw
default_og_image: /images/share.png
highlight_theme: monokai-sublime
minify: true
minify_html: true
minify_css: true
minify_js: true
morphing: true
prefetching: true
morph_target: main
search: true
search_content_limit: 5000
search_results_limit: 10
summary_length: 200
related_pages_limit: 3
server_port: 3000
livereload_port: 35729
watcher_delay: 100
watcher_interval: 500
watcher_use_polling: false

# Pagination (disabled until page_count is set)
# page_count: 10
pagination_class: swifty_pagination
pagination_link_class: swifty_pagination_link
pagination_current_class: swifty_pagination_current

# Sorting
date_sort_order: desc
date_locale: en-GB
timezone: UTC

dateFormat:
  weekday: short
  month: short
  day: numeric
  year: numeric
```

## What Does What?

| Option | What it does |
|--------|--------------|
| `sitename` | Your site's name - use `<%= sitename %>` anywhere to display it |
| `author` | Your name (or whoever's taking credit) |
| `site_url` | Full URL of your site; required for RSS and relative social images |
| `base_path` | URL prefix such as `/project` when the site is hosted below an origin path |
| `breadcrumb_separator` | The character between breadcrumb links |
| `breadcrumb_class` | CSS class for breadcrumb links |
| `link_class` | CSS class for auto-generated links |
| `tag_class` | CSS class for tag links |
| `prev_next_class` | CSS class for previous/next page links |
| `default_layout_name` | The fallback layout when no other applies |
| `default_link_name` | The partial used for generating link lists |
| `max_image_width` | Maximum width for optimized images (in pixels) |
| `image_quality` | WebP quality for optimized images |
| `responsive_image_widths` | Widths Swifty generates for responsive image `srcset` candidates |
| `responsive_image_sizes` | Default `sizes` attribute added to responsive local images |
| `default_og_image` | Fallback social image; relative paths require `site_url` |
| `highlight_theme` | Bundled highlight.js theme used by fenced code blocks |
| `minify` | Enable or disable all output minification |
| `minify_html` | Enable or disable HTML minification |
| `minify_css` | Enable or disable CSS minification |
| `minify_js` | Enable or disable Terser JavaScript compression (identifiers are not mangled) |
| `morphing` | Enable Idiomorph-powered same-origin page transitions |
| `prefetching` | Prefetch likely pages on hover, focus, or touch intent |
| `morph_target` | CSS selector for the element Swifty morphs between pages |
| `search` | Generate `/search.json` for client-side search |
| `search_content_limit` | Maximum normalized content characters stored per search entry |
| `search_results_limit` | Maximum results shown by the built-in search partial |
| `summary_length` | Maximum length of automatically generated page summaries |
| `related_pages_limit` | Maximum related pages selected for each tagged page |
| `server_port` | Port used by the local development server |
| `livereload_port` | Port used by the LiveReload server |
| `watcher_delay` | Delay used to debounce writes before rebuilding |
| `watcher_interval` | Filesystem polling interval when polling is enabled |
| `watcher_use_polling` | Use polling for both Chokidar and LiveReload instead of native events |
| `page_count` | Optional number of items per page; pagination is disabled when omitted |
| `pagination_class` | CSS class for the pagination container |
| `pagination_link_class` | CSS class for pagination links |
| `pagination_current_class` | CSS class for the current page indicator |
| `date_sort_order` | Sort order for pages by date: "desc" (newest first) or "asc" |
| `date_locale` | Locale used for deterministic display dates (default: `en-GB`) |
| `timezone` | IANA timezone used for display and date-only publishing (default: `UTC`) |
| `dateFormat` | How dates are formatted throughout your site |

There is no implicit pagination size. Set `page_count` in root configuration or
a folder's `config.yaml` to enable pagination for that scope.

Native filesystem events are the development default. Enable
`watcher_use_polling` for cloud-synced folders, network mounts, container
volumes, or other filesystems where `swifty start` misses changes:

```yaml
watcher_use_polling: true
watcher_interval: 500
```

## Syntax Highlighting Themes

Fenced code blocks are highlighted with a self-hosted highlight.js stylesheet.
The default is `monokai-sublime`; choose another theme by its bundled filename
without `.css` or `.min.css`:

```yaml
highlight_theme: github-dark
```

For example, `a11y-light`, `atom-one-dark`, `github`, and `github-dark` are
available. Invalid or unsafe names fail configuration validation. Swifty emits
a fingerprinted local asset under `/swifty/` and only links it from pages that
actually contain a highlighted fenced code block.

## Dates and Timezones

Swifty formats every display date with `date_locale`, `timezone`, and
`dateFormat`, so the same source produces the same HTML on local machines and in
CI. Calendar dates such as `2026-07-18` publish at midnight at the start of that
day in `timezone`. Exact timestamps must include `Z` or an offset and retain
their precise instant:

```yaml
date_locale: en-GB
timezone: Europe/London
```

Machine-readable feed and sitemap dates always use `Date` or ISO values; Swifty
does not parse formatted display strings back into metadata.

## Using Config Values in Pages

Any config value can be dropped into your pages or layouts using ERB-style syntax:

```markdown
Welcome to <%= sitename %>!
Written by <%= author %>.
```

Simple as that.

## Base Path Deployments

Set `base_path` when the generated site is hosted below the domain root, such as a GitHub Pages project site:

```yaml
site_url: https://example.github.io
base_path: /my-project
```

Swifty prefixes generated and authored root-relative URLs, feeds, sitemap entries, images, CSS, and JavaScript. Output still builds directly into `dist/`; deploy that directory at `/my-project`.

## Morph Navigation

By default, Swifty's reusable Morpheus client fetches same-origin HTML links and
morphs the configured page target with Idiomorph. It keeps the outer layout in
place while updating the URL, title, focus, and scroll position. Existing
`swifty:*` browser events and `data-swifty-*` controls remain available as
compatibility aliases for the generic `morpheus:*` API.

```yaml
morphing: true
prefetching: true
morph_target: main
```

Set `prefetching: false` if you want morphing without hover/focus/touch prefetches. Set `morphing: false` to return to plain browser navigation.

`turbo` is deprecated in Swifty 3. Use `morphing` and `prefetching` instead.

## Folder-Level Config

Here's a neat trick: you can add a `config.yaml` inside any folder in `pages/` to set defaults for all pages in that folder. Great for giving a whole section its own author or layout without repeating yourself.

## Client-Side Search

Swifty generates `/search.json` by default. Add its built-in, self-hosted search
interface to any page or layout with one line:

```html
<%= partial: search %>
```

It provides weighted results, keyboard navigation, accessible status updates,
and base-path-aware URLs without an external dependency. Control the displayed
result count with `search_results_limit` (10 by default). A project-level
`partials/search.html` or `partials/search.md` overrides the built-in interface.

The index contains each searchable page's title, URL, summary, normalized text
content, and tags. URLs include `base_path` automatically. Normalized content is
limited to 5,000 leading characters per entry by default so the initial search
download stays bounded; change that with `search_content_limit`. Titles,
summaries, tags, and URLs remain complete in their separate weighted fields.

The file has this shape:

```json
{
  "version": 1,
  "pages": [
    {
      "title": "Getting Started",
      "url": "/docs/get-started",
      "summary": "Install and build your first Swifty site.",
      "content": "Getting Started Install Swifty...",
      "tags": ["docs", "tutorial"]
    }
  ]
}
```

Set `search: false` in root configuration to disable the index, or in a page's
front matter to exclude only that page. Drafts, scheduled pages, 404 pages,
generated tag pages, pagination pages, and pages with `sitemap: false` are not
included in production search results.

## RSS Feeds

Want to offer RSS feeds for your blog or news section? Easy. Just add the folders you want feeds for:

```yaml
site_url: https://yoursite.com
rss_feeds:
  - blog
  - news
```

This generates `/blog/rss.xml` and `/news/rss.xml` automatically, including all pages within those folders.

### Custom Feed Options

Need more control? Use the expanded format:

```yaml
rss_feeds:
  - folder: blog
    title: My Awesome Blog
    description: Thoughts on code, coffee, and chaos
  - folder: news
    title: Company Updates
    description: The latest from our team
```

### RSS Config Options

| Option | What it does |
|--------|--------------|
| `site_url` | **Required for RSS.** The full URL of your site (used for absolute links in feeds) |
| `rss_feeds` | List of folders to generate feeds for |
| `rss_max_items` | Maximum items per feed (default: 20) |
| `language` | Feed language code (default: "en") |

Each feed includes the page title, URL, publication date, and a description snippet. Feeds are sorted by date with the newest items first.
Description snippets are rendered and normalized, so Markdown headings, links,
emphasis, and template syntax do not leak into feed text.
