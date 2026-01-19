---
tags:
  - swifty
  - docs
  - config
position: 2
summary: Configuration options
---

Swifty supports configuration via config.json, config.yaml, or config.yml located in the project root. The configuration file allows you to specify global settings like the site name, date format, and layout preferences.

This is the default config.yaml that it starts with and shows you all the different configuration options:

```yaml
sitename: Swifty
author: Taylor Swift
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: tag
turbo: false

dateFormat:
  weekday: short
  month: short
  day: numeric
  year: numeric
```

## Turbo

By default, Swifty generates plain static HTML pages with standard browser navigation. If you want SPA-like page transitions with prefetching on hover, you can enable [Turbo](https://turbo.hotwired.dev/):

```yaml
turbo: true
```

When enabled, Turbo will intercept link clicks, fetch pages via AJAX, and morph the DOM for smooth transitions. It also prefetches links on hover, making navigation feel instant.

For most sites, plain HTML navigation is already fast enough and keeps your pages lighter.

