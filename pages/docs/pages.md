---
tags:
  - swifty
  - docs
  - pages
position: 5
summary: Create pages with Markdown and front matter.
---

Pages are where your content lives. Write them in Markdown, drop them in the `pages/` folder, and Swifty turns them into beautiful HTML. Simple as that.

## Your First Page

Create a Markdown file in `pages/`:

**pages/hello.md**
```markdown
---
title: Hello World
---

# Welcome!

This is my first Swifty page. *Exciting times.*
```

Build your site and visit `/hello` - your page is live!

## Front Matter

That stuff between the `---` lines at the top? That's front matter. It's YAML that defines metadata about your page:

```markdown
---
title: My Awesome Post
layout: blog
tags:
  - tutorial
  - swifty
position: 1
author: Your Name
anything_you_want: totally works
---
```

### Built-in Properties

| Property | What it does |
|----------|--------------|
| `title` | Page title (also used in navigation) |
| `layout` | Which layout to use (see [Layouts](/docs/layouts)) |
| `tags` | List of tags for categorization |
| `position` | Sort order in navigation (lower = first) |
| `draft` | Set to `true` to hide page in production builds |
| `date` | Publication calendar date or exact offset-bearing ISO timestamp |
| `nav` | Set to `true` to include in main nav, `false` to exclude |
| `search` | Set to `false` to exclude the page from `/search.json` |
| `description` | Short description (used for Open Graph tags) |
| `image` | Image URL for social sharing (used for og:image; falls back to `default_og_image`) |
| `summary` | Authored summary; otherwise Swifty generates one from the page content |
| `permalink` | Custom output URL such as `/company/about.html` |

### Custom Properties

Here's the fun part: add *any* property you like and use it in your content:

```markdown
---
title: Product Page
price: $29.99
rating: 5 stars
---

# <%= title %>

**Price:** <%= price %>
**Rating:** <%= rating %>
```

Your custom properties become template variables. Neat, right?

## Automatic Summaries

`<%= summary %>` uses the first available source:

1. `summary` in front matter
2. `description` in front matter
3. Content before an `<!--more-->` marker
4. The first useful Markdown paragraph

Generated summaries strip Markdown formatting and code blocks and are limited by
`summary_length` (200 characters by default). Add `<!--more-->` when you want an
exact excerpt boundary without duplicating the text in front matter.

## Heading Anchors and Table of Contents

Every Markdown heading gets a stable, lowercase `id`. Spaces become hyphens,
Unicode letters are preserved, and repeated headings receive numeric suffixes:

```markdown
## Installation       <!-- id="installation" -->
## Installation       <!-- id="installation-1" -->
## Café & Tea         <!-- id="café-tea" -->
```

Add `<%= toc %>` to a page or layout to render an accessible, nested table of
contents for that page. Its links use those generated IDs, and `swifty check`
validates authored links to them like `[Installation](#installation)`.

## Related Content

Pages that share tags automatically receive `<%= related_pages %>`. Results are
ranked by the number of shared tags, use the normal deterministic page order for
ties, and are limited by `related_pages_limit` (3 by default).

Put the variable in a blog layout, for example:

```html
<aside aria-label="Related pages">
  <h2>Related</h2>
  <%= related_pages %>
</aside>
```

Create `partials/related.md` or `partials/related.html` to customize each result.
The partial receives the related page's usual variables plus `related_score` and
`shared_tags`. If it is absent, Swifty uses your default link-list partial.

## Tag Routes

Tags keep their authored label for display while their generated routes use safe,
lowercase slugs:

| Authored tag | Generated route |
|--------------|-----------------|
| `Web Dev` | `/tags/web-dev` |
| `Café` | `/tags/cafe` |
| `Ruby` and `ruby` | One shared `/tags/ruby` page |

Whitespace and case differences refer to the same tag identity, including when
Swifty ranks related pages. If distinct labels reduce to the same slug, such as
`C#` and `C++`, Swifty adds stable hash suffixes so neither route overwrites the
other. Use `<%= links_to_tags %>` for page tag links so custom `base_path` values
and collision suffixes are always handled correctly.

## URLs Follow Folders

Your folder structure *is* your URL structure:

```
pages/
├── index.md          → /
├── 404.md            → /404.html
├── about.md          → /about
├── blog/
│   ├── index.md      → /blog
│   ├── first-post.md → /blog/first-post
│   └── second-post.md→ /blog/second-post
└── docs/
    └── getting-started.md → /docs/getting-started
```

No config files, no route definitions. Just folders and files.

### Custom Permalinks

Use `permalink` when a page must keep a legacy URL or use a specific filename:

```markdown
---
title: About
permalink: /company/about.html
---
```

This writes `dist/company/about.html` and exposes `/company/about.html` as the page URL.

## Convention Over Configuration

This is a concept borrowed from [Ruby on Rails](https://rubyonrails.org). Swifty makes smart assumptions so you don't have to configure everything:

- Pages in `blog/` automatically use `layouts/blog.html` (if it exists)
- Pages in `docs/` automatically use `layouts/docs.html` (if it exists)
- Navigation is generated from your folder structure
- Tags create canonical, URL-safe pages automatically

You *can* override these defaults, but you often won't need to.

## Draft Pages

Working on something that's not ready for prime time? Mark it as a draft:

```markdown
---
title: My Work In Progress
draft: true
---
```

Draft pages:
- **Show** during development (`swifty start`)
- **Show** in preview builds (`swifty build --drafts`)
- **Hidden** in production builds (`swifty build`)

This means drafts won't appear in navigation, tag pages, or RSS feeds when you deploy. Perfect for previewing work before publishing.

## Scheduled Pages

Want to publish a page at a future date? Just set the date in front matter:

```markdown
---
title: Coming Soon
date: 2025-06-15
---
```

Pages with a future date:
- **Show** during development (`swifty start`)
- **Show** in preview builds (`swifty build --drafts`)
- **Hidden** in production builds until the date arrives

This lets you write content ahead of time and have it automatically appear when you next build after the scheduled date.

Scheduling does not run builds for you. On Git-based hosting, arrange a cron or
scheduled deployment if pages must appear without another content commit after
their publication time.

A calendar date publishes at midnight in the configured `timezone`:

```yaml
timezone: Europe/London
```

Use an ISO timestamp with `Z` or an explicit offset when the exact instant
matters:

```markdown
date: 2026-07-18T09:30:00+01:00
```

Timestamps without a timezone offset are rejected because their meaning would
depend on the build machine.

## Auto-Generated Goodness

Every page automatically gets some handy variables:

| Variable | What you get |
|----------|--------------|
| `<%= breadcrumbs %>` | Breadcrumb navigation links |
| `<%= nav_links %>` | Top-level navigation links |
| `<%= links_to_children %>` | Links to child pages (for folder index pages) |
| `<%= links_to_siblings %>` | Links to sibling pages |
| `<%= links_to_tags %>` | Links to this page's tags |
| `<%= date %>` | Formatted publication date: front matter, then Git commit date, then file mtime |
| `<%= date_iso %>` | Machine-readable page date in ISO 8601 format |
| `<%= created_at %>` | Formatted Git-backed fallback date |
| `<%= created_at_iso %>` | Machine-readable Git-backed fallback date |
| `<%= updated_at %>` | Formatted modification date for display |
| `<%= updated_at_iso %>` | Machine-readable modification date used by sitemap metadata |
| `<%= word_count %>` | Number of words in the page |
| `<%= reading_time %>` | Estimated reading time (e.g., "2 min read") |
| `<%= prev_page %>` | Link to previous sibling page |
| `<%= next_page %>` | Link to next sibling page |
| `<%= og_tags %>` | Open Graph meta tags for social sharing |
| `<%= pagination %>` | Pagination navigation (for paginated folders) |
| `<%= toc %>` | Nested table of contents linked to generated heading anchors |
| `<%= pages %>` | Immutable authored-page collection for archives, recent posts, and custom lists |
| `<%= collections.pages %>` | Namespaced alias for the authored-page collection |

Just drop these into your layouts or pages wherever you need them.

Each collection item includes `title`, `url`, display and ISO dates, `summary`,
and `tags`. Generated tag and pagination routes, 404 pages, and unpublished
pages are excluded. For example:

```html
<% for (const item of pages.filter((item) => item.tags.includes("news")).slice(0, 5)) { %>
  <a href="<%= item.url %>"><%= item.title %></a>
<% } %>
```

For tracked files, Swifty uses the file's most recent Git commit date instead of
filesystem birthtime. This keeps dates stable when a site is cloned in CI or
moved through a cloud-synced folder. Files without Git history fall back to
their modification time. An explicit front-matter `date` always controls the
publication date, while sitemap `lastmod` continues to use the Git-backed
modification date.
