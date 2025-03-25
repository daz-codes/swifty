---
tags:
  - swifty
  - docs
  - config
position: 6
summary: Using layouts
---

Layouts are used to add content before and after the main page content.

They go in the layouts folder and are always HTML files.

Place `{{ content }}` at the point where you want the page content to be inserted.

## Default layouts

By default every page tries to apply the layout named after the folder they are in. So if a page is inside a folder called 'posts' then it will try to apply a layout called 'posts.html', otherwise it will apply the layout called 'default.html'. Top level pages apply the 'default.html' layout. 

You can specify a particular layout for a page by adding the 'layout' propety to the front matter data of a page. The following will try to apply the layout called 'special_layout.html':

```
---
layout: special_layout
---
```

If a layout file doesn't exist then it is no layout will be applied.