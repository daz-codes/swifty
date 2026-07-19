---
title: Swifty Roadmap
tags:
  - future
  - wishlist
  - roadmap
---

Here's what's cooking in the Swifty kitchen. Some of these are half-baked ideas, others are ready to go. Got a feature request? We're all ears!

## Recently Shipped

### Bounded Search Index Entries
`search_content_limit` caps normalized leading page content at 5,000 characters
per entry by default. Titles, summaries, tags, and URLs remain complete in their
separate weighted fields.

### Shared Template Computations
Nested partial rendering now reuses page data, Open Graph tags, word count, and
reading-time computations while still merging late metadata for each render.

### Self-Hosted Syntax Highlighting Themes
Highlighted code now uses a fingerprinted local highlight.js theme with no CDN
or connection hints. `highlight_theme` selects any bundled theme, and code-free
pages omit the stylesheet entirely.

### Cached Navigation and Sibling Rendering
`addLinks` now caches resolved partials, rendered partial/page pairs, and complete
ordered page sets for the duration of each build. Large sibling collections no
longer repeat equivalent Eta work for every page, while distinct sibling output
and ordering remain unchanged.

### Table of Contents and Heading Anchors
Markdown headings now receive stable, unique IDs, and `<%= toc %>` renders an
accessible nested outline. Generated and authored anchor links are validated by
`swifty check`.

### Opt-In Watcher Polling
Chokidar and LiveReload now use native filesystem events by default. A validated
`watcher_use_polling` option enables polling for cloud folders, network mounts,
containers, and other filesystems that require it.

### Reusable Morpheus Navigation Core
Swifty's Idiomorph navigation and intent prefetching now live in a reusable,
Node-import-safe `Morpheus` browser class. A small compatibility adapter keeps
existing `swifty:*` events, data attributes, headers, history state, and globals
working while the standalone npm package API is prepared.

### Site Checker
`swifty check` catches duplicate routes, broken internal links, missing images,
partials and layouts, invalid canonical URLs, and malformed configuration before
deployment.

### Stable Dates and Deterministic Ordering
Undated tracked pages now use their Git commit date, with mtime as the non-Git
fallback. One transitive comparator handles positioned and dated pages at every
level, including root navigation and `position: 0`.

### Safer Single-Pass Content Rendering
Rendered page content and partials stay opaque during outer Eta rendering.
Replacement tokens remain literal, and code examples are protected from Eta and
image rewriting through the complete pipeline.

### Client-Side Search Index
Swifty generates `/search.json` with clean page text, titles, summaries, tags,
and base-path-aware URLs.

### Related Content and Automatic Summaries
`<%= summary %>` now preserves authored summaries or derives them from an
`<!--more-->` marker or the first useful paragraph. `<%= related_pages %>` ranks
tag-related pages deterministically with a configurable limit.

### Drop-In Search UI
`<%= partial: search %>` provides a self-hosted search interface with weighted
results, keyboard navigation, accessible status updates, base-path support, and
no external dependencies.

### Incremental Page Rebuilds
During `swifty start`, safe body-only Markdown edits rebuild the changed page and
derived search, feed, and SEO files. Metadata and structural changes clearly
fall back to a full build.

### Canonical Tag Routes
Tag identities now merge case and whitespace variants while preserving authored
display labels. Generated routes use safe lowercase slugs, with deterministic
hash suffixes preventing punctuation and Unicode slug collisions.

### Section-Specific Sibling Links
Child pages retain their parent section filename, so folder partials such as
`partials/blog.md` now consistently style child, sibling, and self-plus-sibling
link lists.

### Deterministic Dates and Scheduling
Display dates use validated `date_locale` and `timezone` settings with stable
defaults. Calendar dates publish at midnight in that timezone, exact ISO
timestamps retain their offset-defined instant, and sitemap/feed metadata stays
machine-readable throughout the pipeline.

### Valid Social Images and Clean RSS Excerpts
Relative Open Graph and Twitter images are emitted only with an absolute
`site_url`; otherwise they are omitted and `swifty check` reports the source.
RSS excerpts now come from normalized rendered content rather than raw Markdown.

### Explicit Pagination Contract
The unused `default_page_count` setting is gone. Pagination remains disabled
until `page_count` is explicitly configured at the site or folder level.

### RSS Feeds
Auto-generate RSS/Atom feeds for blog sections. Configure in `config.yaml` and feeds are created automatically.

### Draft Pages
Pages with `draft: true` in front matter are visible during development but hidden in production builds. Perfect for work-in-progress content.

### Scheduled Publishing
Set a future `date` in front matter and the page stays hidden until that date arrives. Write content ahead of time and publish on schedule.

### Full Tutorial
A complete [step-by-step guide](/docs/tutorial) building a bakery brochure site from scratch, using every Swifty feature along the way.

### Live Reload
Dev server now auto-refreshes your browser when you save changes. No more manual refreshing!

### Incremental Builds
CSS, JS, and image changes now rebuild only what's needed. Full rebuilds only happen when pages, layouts, or partials change.

### Pagination
For folders with lots of pages, automatically split index pages. Set `page_count` in config (globally or per-folder) and Swifty creates paginated pages with navigation links.

### Eta Templating Engine
Full JavaScript support in templates using [Eta](https://eta.js.org/) with EJS-compatible syntax. Use conditionals, loops, and expressions directly in your templates with `<% %>` and `<%= %>`.

### Data Files
Load JSON or YAML from a `data/` folder and use in templates. File name becomes the variable: `data/team.json` → `data.team`. Great for team members, products, testimonials without creating full pages.

### Open Graph & Twitter Cards
Add `<%= og_tags %>` to your template and Swifty generates all the meta tags for social sharing. Uses `title`, `description`, `image`, and `tags` from front matter.

### Word Count & Reading Time
`<%= word_count %>` and `<%= reading_time %>` variables auto-calculated from page content. Perfect for blog posts showing "5 min read".

### Previous/Next Navigation
`<%= prev_page %>` and `<%= next_page %>` auto-generate links to sibling pages in the same folder. Pages are linked based on their sort order (date or position). Perfect for blog series and multi-part tutorials.

## Next Features

### 1. Standalone Morpheus Package

Move the extracted browser core into its own package, add browser-level
navigation, history, prefetch, cancellation, focus, and fallback tests, and ship
both side-effect-free ESM and an optional auto-start browser entry. Keep Swifty
on the compatibility adapter while consumers migrate to `morpheus:*` events and
`data-morpheus-*` controls.

## Performance and Developer Experience

- Compute word count and reading time once from normalized rendered page content
  so rendered partial/data text is included where appropriate and code and
  template syntax are excluded consistently.
## Deferred

- **Shortcodes**: Eta and partials already cover most shortcode use cases.
- **i18n routing**: Valuable, but it adds routing and content-model complexity
  that needs a separate design before it fits Swifty's conventions.
- **Image galleries**: Revisit after the core blog and documentation workflows
  are complete.
- **Multi-site library contexts**: The programmatic API is intentionally
  one-site-per-process until module-level configuration, indexes, caches, and
  incremental state move behind an explicit site context.

## Want Something?

If you've got ideas, bugs, or just want to say hi, open an issue on [GitHub](https://github.com/daz-codes/swifty/issues). Swifty is built by people who use it, and your feedback shapes what comes next.
