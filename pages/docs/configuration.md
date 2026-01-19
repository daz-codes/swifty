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
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: tag
default_layout_name: default
default_link_name: links
max_image_size: 800
turbo: false

dateFormat:
  weekday: short
  month: short
  day: numeric
  year: numeric
```

## What Does What?

| Option | What it does |
|--------|--------------|
| `sitename` | Your site's name - use `{{ sitename }}` anywhere to display it |
| `author` | Your name (or whoever's taking credit) |
| `breadcrumb_separator` | The character between breadcrumb links |
| `breadcrumb_class` | CSS class for breadcrumb links |
| `link_class` | CSS class for auto-generated links |
| `tag_class` | CSS class for tag links |
| `default_layout_name` | The fallback layout when no other applies |
| `default_link_name` | The partial used for generating link lists |
| `max_image_size` | Maximum width for optimized images (in pixels) |
| `turbo` | Enable Turbo for SPA-like navigation |
| `dateFormat` | How dates are formatted throughout your site |

## Using Config Values in Pages

Any config value can be dropped into your pages or layouts using double curly braces:

```markdown
Welcome to {{ sitename }}!
Written by {{ author }}.
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
