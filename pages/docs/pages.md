---
tags:
  - swifty
  - docs
  - config
position: 5
summary: Creating pages
---

All Markdown files in the pages/ folder are converted to HTML pages. Each page can define metadata in front matter.

Example pages/about.md:

```
---
title: About Our Team
layout: about
tags: 
  - team
  - company
---

## About Our Team
Welcome to our company!
```

## Front Matter & Data Variables

## Convention over Configuration

This is a concept borrowed from [Ruby on rails](https://rubyonrails.org). Any layouts that are named after a folder will automatically be applied to any pages in that folder, without having to specify the layout explicitly. So any pages inside a folder called 'blog' will use the layout called 'blog.html' by default (if it exists).

