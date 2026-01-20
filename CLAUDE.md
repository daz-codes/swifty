# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Swifty is a static site generator that converts Markdown files into a fast static website using Turbo.js for instant page transitions via morphing. It emphasizes convention over configuration.

## Commands

```bash
npm test                    # Run tests (mocha)
npm run build               # Build static site to dist/
npm start                   # Build and serve at http://localhost:3000
npx swifty init             # Create new project structure
npx swifty build            # Build for production (no dev scripts)
npx swifty start            # Development server with live reload
npx swifty build --out dir  # Build to custom output directory
```

### Development vs Production

- `swifty start` - Development mode with live reload and file watching. Injects livereload script into pages.
- `swifty build` - Production build with clean output (no livereload script). Use this before deploying.

## Architecture

### Build Pipeline

```
copyAssets → optimizeImages → generatePages → addLinks → createPages → generateRssFeeds
```

### Core Modules (src/)

- **cli.js** - Entry point, routes commands: init, build, start, watch
- **build.js** - Orchestrates build pipeline
- **pages.js** - Reads Markdown from `pages/`, parses front matter, generates page objects and HTML
- **layout.js** - Wraps content in layouts from `layouts/`, injects Turbo.js and CSS
- **partials.js** - Handles `{{ partial: name }}` includes and `{{ variable }}` replacement
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
| `dist/` | Generated output |

### Template System

- `{{ content }}` - Page content placeholder
- `{{ partial: name }}` - Include partial from partials/
- `{{ variableName }}` - Replace with front matter or config value
- Built-in variables: `sitename`, `title`, `breadcrumbs`, `nav_links`, `links_to_children`, `links_to_siblings`, `links_to_tags`

### Front Matter

Pages support YAML front matter for metadata:
```yaml
---
title: Page Title
layout: custom_layout
tags: [tag1, tag2]
position: 1  # Sort order for navigation
---
```

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

## Key Implementation Details

- ES Modules (`"type": "module"`)
- Heavy use of async/await and Promise.all for parallel file operations
- Layout and partial caching via Map objects
- Code blocks are protected from template variable replacement
- URLs normalized with forward slashes for cross-platform compatibility
