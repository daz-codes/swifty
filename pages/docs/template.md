---
title: The Template File
tags:
  - swifty
  - docs
  - config
position: 4
summary: Setting up the template file
---

The template file (template.html) acts as the main structure of your site, wrapping all generated content. It includes:

A <head> section for metadata, styles, and scripts.

A <turbo-frame id="content"> wrapper for dynamic content loading.

Example:

```
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <nav>
    <a href="/" class="nav-link">Home</a>
  </nav>
  <turbo-frame id="content">
    {{ content }}
  </turbo-frame>
</body>
</html>
```


The template file is the main template that includes all of the html that is included in every page.

This should contain the main HTML.

The placeholder `{{ content }}` should go where the main content from any page will go.