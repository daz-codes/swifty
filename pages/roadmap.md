---
title: Swifty Roadmap
tags:
  - future
  - wishlist
  - roadmap
---

Here's what's cooking in the Swifty kitchen. Some of these are half-baked ideas, others are ready to go. Got a feature request? We're all ears!

## Recently Shipped

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

## On the Radar

### Pagination
For blogs with lots of posts, automatically split index pages. Set posts-per-page in config and let Swifty handle the rest.

### Search
Add search functionality to find pages across your site. Probably a simple client-side search using a generated JSON index.

### Templating Languages
Support for Liquid, Nunjucks, or similar templating for more complex logic in layouts.

### Sitemap Generation
Automatic sitemap.xml for better SEO.

## Maybe Someday

- **Image galleries**: Special handling for image-heavy pages
- **i18n support**: Multi-language sites with automatic linking

## Want Something?

If you've got ideas, bugs, or just want to say hi, open an issue on [GitHub](https://github.com/daz4126/swifty/issues). Swifty is built by people who use it, and your feedback shapes what comes next.
