---
tags:
  - swifty
  - docs
  - layouts
position: 6
summary: Wrap your pages in reusable layouts.
---

Layouts are like picture frames for your content. They wrap around your page content and give it structure - headers, footers, sidebars, whatever you fancy.

## Creating a Layout

Layouts live in the `layouts/` folder and are always HTML files. Here's a simple example:

**layouts/default.html**
```html
<article class="page">
  <header>
    <h1>{{ title }}</h1>
    <p class="meta">{{ date }}</p>
  </header>
  <main>
    {{ content }}
  </main>
</article>
```

The magic happens with `{{ content }}` - that's where your page content gets inserted. You can also use any front matter variables like `{{ title }}` or config values like `{{ sitename }}`.

## How Layouts Are Applied

Swifty uses **convention over configuration** (borrowed from Ruby on Rails) to automatically pick layouts:

1. **Folder-matched layouts**: Pages in a folder called `blog/` automatically use `layouts/blog.html` if it exists
2. **Default fallback**: If no matching layout exists, pages use `layouts/default.html`
3. **Explicit override**: Set `layout: special` in front matter to use `layouts/special.html`

This means you can create different looks for different sections without configuring anything. Just name your layout file after your folder!

## Choosing a Specific Layout

Want a page to use a particular layout? Just say so in the front matter:

```markdown
---
title: My Special Page
layout: fancy
---

This page will use layouts/fancy.html
```

## Going Layout-Free

Sometimes you want full control. Set `layout: false` to skip the layout entirely:

```markdown
---
layout: false
---

<div class="custom-page">
  This content won't be wrapped in any layout.
</div>
```

This is handy for landing pages or anything with a completely custom structure.

## Nesting Content

Layouts are applied *after* your Markdown is converted to HTML, so you get the full formatted content. The flow goes:

1. Your Markdown page is parsed
2. Front matter variables are extracted
3. Markdown converts to HTML
4. Layout wraps around the HTML
5. Template wraps around everything

It's layouts all the way down!
