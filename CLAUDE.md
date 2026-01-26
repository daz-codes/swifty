# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Swifty is a static site generator that converts Markdown files into a fast static website using Turbo.js for instant page transitions via morphing. It emphasizes convention over configuration.

## Commands

```bash
npm test                        # Run tests (mocha)
npm run build                   # Build static site to dist/
npm start                       # Build and serve at http://localhost:3000
npx swifty <sitename>           # Create new site in <sitename>/ folder
npx swifty build                # Build for production (no dev scripts)
npx swifty start                # Development server with live reload
npx swifty build --out dir      # Build to custom output directory
npx swifty deploy ["message"]   # Build, git add, commit, and push
```

### Development vs Production

- `swifty <sitename>` - Creates a new site folder with the given name and sets sitename in config.
- `swifty start` - Development mode with live reload and file watching. Injects livereload script into pages.
- `swifty build` - Production build with clean output (no livereload script). Use this before deploying.
- `swifty deploy "message"` - Builds site and commits/pushes to git in one command.

## Architecture

### Build Pipeline

```
copyAssets → optimizeImages → generatePages → addLinks → createPages → generateRssFeeds
```

### Core Modules (src/)

- **cli.js** - Entry point, routes commands: build, start, watch, deploy, and site creation
- **build.js** - Orchestrates build pipeline
- **pages.js** - Reads Markdown from `pages/`, parses front matter, generates page objects and HTML
- **layout.js** - Wraps content in layouts from `layouts/`, injects Turbo.js and CSS
- **partials.js** - Handles `<%= partial: name %>` includes and ERB-style variable replacement
- **assets.js** - Copies CSS/JS, optimizes images to WebP using Sharp
- **config.js** - Loads config.yaml/yml/json, provides directory mappings
- **watcher.js** - Uses chokidar to watch files and trigger rebuilds
- **rss.js** - Generates RSS feeds for configured folders

### Directory Conventions

| Directory | Purpose |
|-----------|---------|
| `pages/` | Markdown content (folder structure = URL structure) |
| `layouts/` | HTML layout templates |
| `partials/` | Reusable content snippets |
| `css/` | Stylesheets (auto-injected) |
| `js/` | JavaScript files (auto-injected) |
| `images/` | Images (auto-optimized to WebP) |
| `data/` | JSON/YAML data files |
| `dist/` | Generated output |

### Documentation Files

- `README.md` - Project readme with features and quickstart
- `pages/docs/tutorial.md` - Step-by-step tutorial for building a brochure site
- `pages/roadmap.md` - Feature roadmap (update when implementing new features)

### Template System (Eta with EJS-style syntax)

Swifty uses [Eta](https://eta.js.org/) as its templating engine with EJS-compatible syntax:

**Variable output:**
- `<%= variable %>` - Output variable (e.g., `<%= title %>`, `<%= sitename %>`)
- `<%= page.variable %>` - Namespaced access (also supported)

**Always use `<%=` for output.** The `<%-` syntax is supported for EJS compatibility but is converted to `<%=` internally (autoEscape is off, so both are identical).

**JavaScript execution:**
- `<% code %>` - Execute JavaScript without output
- `<%= expression %>` - Output the result of a JavaScript expression

**Partials:**
- `<%= partial: name %>` - Include partial from partials/

**Examples:**
```html
<!-- Conditionals -->
<% if (tags && tags.length > 0) { %>
  <div class="tags"><%= tags.join(', ') %></div>
<% } %>

<!-- Loops -->
<% for (const item of items) { %>
  <li><%= item.title %></li>
<% } %>
```

Built-in variables:
- Text: `title`, `sitename`, `author`, `date`, `summary`, `created_at`, `updated_at`, `word_count`, `reading_time`
- HTML: `content`, `breadcrumbs`, `nav_links`, `links_to_children`, `links_to_siblings`, `links_to_tags`, `pagination`, `og_tags`, `prev_page`, `next_page`
- Data: `data.filename` - contents of `data/filename.json` or `data/filename.yaml`

**Page metadata:**
- `page.title`, `page.tags`, etc. - front matter values
- `page.meta.title` - explicit access to front matter

### Front Matter

Pages support YAML front matter for metadata:
```yaml
---
title: Page Title
layout: custom_layout
tags: [tag1, tag2]
position: 1  # Sort order for navigation
draft: true  # Only show in development (swifty start), hide in production (swifty build)
date: 2025-06-15  # Future dates hide page until that date (scheduled publishing)
description: Short page description  # Used for og:description
image: /images/hero.jpg  # Used for og:image
nav: true  # Include in main navigation (opt in nested pages, opt out top-level pages with false)
---
```

### Open Graph Tags

Add `<%= og_tags %>` in your template `<head>` to auto-generate Open Graph and Twitter Card meta tags:

```html
<head>
  <title><%= title %></title>
  <%= og_tags %>
</head>
```

Generated tags use:
- `title` → `og:title`, `twitter:title`
- `sitename` → `og:site_name`
- `site_url` + `url` → `og:url`
- `description` or `summary` → `og:description`, `twitter:description`
- `image` → `og:image`, `twitter:image`
- `author` → `article:author`
- `tags` → `article:tag` (one per tag)
- `og:type` → "article" for pages, "website" for folders

### RSS Feeds

Configure RSS feeds in `config.yaml` to auto-generate feeds for specific folders:
```yaml
site_url: https://example.com  # Required for full URLs in feed
rss_feeds:
  - blog                        # Simple: generates /blog/rss.xml
  - folder: news                # With options
    title: News Feed
    description: Latest news updates
```

Additional RSS config options:
- `rss_max_items: 20` - Maximum items per feed (default: 20)
- `language: en` - Feed language (default: en)

### Pagination

Enable pagination for folders with many child pages by setting `page_count`:
```yaml
# Global config (config.yaml)
page_count: 10

# Or per-folder (pages/blog/config.yaml)
page_count: 5
```

Pagination creates:
- `/folder/` - First page
- `/folder/page/2/` - Page 2
- `/folder/page/3/` - Page 3, etc.

Use `<%- pagination %>` in templates to render navigation links.

Config options:
- `pagination_class` - Container class (default: `swifty_pagination`)
- `pagination_link_class` - Link class (default: `swifty_pagination_link`)
- `pagination_current_class` - Current page class (default: `swifty_pagination_current`)

## Key Implementation Details

- ES Modules (`"type": "module"`)
- Uses Eta templating engine with EJS-compatible syntax
- Heavy use of async/await and Promise.all for parallel file operations
- Layout and partial caching via Map objects
- Code blocks are protected from template variable replacement
- URLs normalized with forward slashes for cross-platform compatibility
