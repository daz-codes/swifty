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
minify: true
minify_html: true
minify_css: true
minify_js: true
morphing: true
prefetching: true
morph_target: main
search: true
server_port: 3000

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
| `default_og_image` | Fallback social sharing image when a page has no `image` or `og_image` |
| `minify` | Enable or disable all output minification |
| `minify_html` | Enable or disable HTML minification |
| `minify_css` | Enable or disable CSS minification |
| `minify_js` | Enable or disable Terser JavaScript compression (identifiers are not mangled) |
| `morphing` | Enable Idiomorph-powered same-origin page transitions |
| `prefetching` | Prefetch likely pages on hover, focus, or touch intent |
| `morph_target` | CSS selector for the element Swifty morphs between pages |
| `search` | Generate `/search.json` for client-side search |
| `server_port` | Port used by the local development server |
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

## Base Path Deployments

Set `base_path` when the generated site is hosted below the domain root, such as a GitHub Pages project site:

```yaml
site_url: https://example.github.io
base_path: /my-project
```

Swifty prefixes generated and authored root-relative URLs, feeds, sitemap entries, images, CSS, and JavaScript. Output still builds directly into `dist/`; deploy that directory at `/my-project`.

## Morph Navigation

By default, Swifty fetches same-origin HTML links and morphs the configured page target with Idiomorph. It keeps the outer layout in place while updating the URL, title, focus, and scroll position.

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

Swifty generates `/search.json` by default. The index contains each searchable
page's title, URL, summary, normalized text content, and tags. URLs include
`base_path` automatically.

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

Here is a minimal browser-side search:

```html
<input type="search" id="search" placeholder="Search">
<ul id="search-results"></ul>

<script type="module">
  const basePath = "<%= base_path %>";
  const { pages } = await fetch(`${basePath}/search.json`).then((response) => response.json());
  const input = document.querySelector("#search");
  const results = document.querySelector("#search-results");

  input.addEventListener("input", () => {
    const terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = terms.length
      ? pages.filter((page) => {
          const text = [page.title, page.summary, page.content, ...page.tags]
            .join(" ")
            .toLowerCase();
          return terms.every((term) => text.includes(term));
        }).slice(0, 10)
      : [];

    results.replaceChildren(...matches.map((page) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = page.url;
      link.textContent = page.title;
      item.append(link);
      return item;
    }));
  });
</script>
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
