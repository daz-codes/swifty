---
title: The Template File
tags:
  - swifty
  - docs
  - config
position: 4
summary: Setting up the template file
---

The template file (template.html) acts as the main structure of your site, wrapping all generated content. Everything in this page will be included on every page of the site, so it's a good place to put the HTML `<head>` and other set-up information.

An example file is generated like the one below when you run `swifty init`:

```
  <meta charset="UTF-8">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <nav>
    <a href="/" class="nav-link">Home</a>
  </nav>
    {{ content }}
</body>
</html>
```

The placeholder `{{ content }}` should go where the content from each page will be inserted.