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

```
sitename: Swifty
author: Taylor Swift
breadcrumb_separator: "&raquo;"
breadcrumb_class: swifty_breadcrumb
link_class: swifty_link
tag_class: tag

dateFormat: 
  weekday: short
  month: short
  day: numeric
  year: numeric
```

