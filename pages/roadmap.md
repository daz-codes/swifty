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

## On the Radar

### Sitemap Generation
Automatic sitemap.xml for better SEO.

### Search
Add search functionality to find pages across your site. Probably a simple client-side search using a generated JSON index.

### Table of Contents
Auto-generate `<%= toc %>` from page headings. Perfect for documentation and long-form content.

### Content Summaries
Auto-generate `<%= summary %>` from the first paragraph or a `<!--more-->` marker. Great for blog index pages showing excerpts.

### Related Content
`<%= related_pages %>` based on shared tags. "You might also like..." suggestions at the bottom of posts.

### Shortcodes
Embed YouTube videos, tweets, and other rich content with simple syntax like `<%= youtube: VIDEO_ID %>` or `<%= gist: GIST_ID %>`.

## Maybe Someday

- **Image galleries**: Special handling for image-heavy pages
- **i18n support**: Multi-language sites with automatic linking

## Want Something?

If you've got ideas, bugs, or just want to say hi, open an issue on [GitHub](https://github.com/daz4126/swifty/issues). Swifty is built by people who use it, and your feedback shapes what comes next.
