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
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: tag
prev_next_class: swifty_link
default_layout_name: default
default_link_name: links
max_image_size: 800
turbo: false

# Pagination
page_count: 10
pagination_class: swifty_pagination
pagination_link_class: swifty_pagination_link
pagination_current_class: swifty_pagination_current

# Sorting
date_sort_order: desc

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
| `site_url` | Full URL of your site (required for RSS feeds and Open Graph tags) |
| `breadcrumb_separator` | The character between breadcrumb links |
| `breadcrumb_class` | CSS class for breadcrumb links |
| `link_class` | CSS class for auto-generated links |
| `tag_class` | CSS class for tag links |
| `prev_next_class` | CSS class for previous/next page links |
| `default_layout_name` | The fallback layout when no other applies |
| `default_link_name` | The partial used for generating link lists |
| `max_image_size` | Maximum width for optimized images (in pixels) |
| `turbo` | Enable Turbo for SPA-like navigation |
| `page_count` | Number of items per page before pagination kicks in |
| `pagination_class` | CSS class for the pagination container |
| `pagination_link_class` | CSS class for pagination links |
| `pagination_current_class` | CSS class for the current page indicator |
| `date_sort_order` | Sort order for pages by date: "desc" (newest first) or "asc" |
| `dateFormat` | How dates are formatted throughout your site |

## Using Config Values in Pages

Any config value can be dropped into your pages or layouts using ERB-style syntax:

```markdown
Welcome to <%= sitename %>!
Written by <%= author %>.
```

Simple as that.

## Turbo Mode

By default, Swifty generates good old-fashioned HTML pages. But if you want that slick single-page-app feel with instant page transitions, flip on Turbo:

```yaml
turbo: true
```

When enabled, [Turbo](https://turbo.hotwired.dev/) intercepts link clicks, fetches pages in the background, and smoothly swaps content. It even prefetches links when you hover over them. Your visitors will think you're some kind of wizard.

For most sites though, plain HTML is already plenty fast. Only enable Turbo if you really want those buttery transitions.

## Folder-Level Config

Here's a neat trick: you can add a `config.yaml` inside any folder in `pages/` to set defaults for all pages in that folder. Great for giving a whole section its own author or layout without repeating yourself.

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
