---
title: The Template File
tags:
  - swifty
  - docs
  - template
position: 4
summary: The master wrapper for your entire site.
---

The template file is the big boss - it wraps around *everything*. While layouts wrap individual page content, the template wraps the whole shebang, including the layout.

Think of it as your site's skeleton: the `<html>`, `<head>`, and `<body>` tags that every page shares.

## The Basic Template

Create a `template.html` in your project root:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> | <%= sitename %></title>
</head>
<body>
  <nav>
    <a href="/"><%= sitename %></a>
    <%= nav_links %>
  </nav>

  <main>
    <%= content %>
  </main>

  <footer>
    <p>&copy; 2025 <%= sitename %></p>
  </footer>
</body>
</html>
```

The `<%= content %>` placeholder is where all your page content (including layouts) gets inserted.

## What Swifty Auto-Injects

You might notice your CSS and JS files magically appear in the built pages. That's because Swifty automatically injects:

- **All CSS files** from your `css/` folder (alphabetically sorted)
- **All JS files** from your `js/` folder (alphabetically sorted)
- **Syntax highlighting styles** for code blocks
- **Turbo script** (if enabled in config)
- **LiveReload script** (only during development with `swifty start`)

These get added just before the closing `</head>` tag. You don't need to manually link your stylesheets or scripts - just drop files in the right folders and they're included.

## Template Variables

Swifty uses [Eta](https://eta.js.org/) with EJS-style syntax for templates:

- `<%= variable %>` - Output a variable
- `<%= variable %>` - Same as above (both work identically)
- `<% code %>` - Execute JavaScript without output

| Variable | Syntax | What it does |
|----------|--------|--------------|
| `sitename` | `<%= sitename %>` | Your site's name from config |
| `title` | `<%= title %>` | Current page's title |
| `content` | `<%= content %>` | The page content (required!) |
| `nav_links` | `<%= nav_links %>` | Auto-generated navigation |
| `breadcrumbs` | `<%= breadcrumbs %>` | Breadcrumb trail |
| `author` | `<%= author %>` | Author from config or page |

## Using JavaScript in Templates

Since Swifty uses Eta, you can use full JavaScript in your templates:

```html
<!-- Conditionals -->
<% if (tags && tags.length > 0) { %>
  <div class="tags">
    <% for (const tag of tags) { %>
      <span class="tag"><%= tag %></span>
    <% } %>
  </div>
<% } %>

<!-- Expressions -->
<p>Published: <%= new Date(date).toLocaleDateString() %></p>

<!-- Computed values -->
<%= title.toUpperCase() %>
```

This gives you the power to add conditional content, loops, and dynamic logic right in your templates.

## Pro Tips

**Name your CSS files strategically**: Since they're loaded alphabetically, prefix with numbers for control:
```
css/
├── 1-reset.css
├── 2-base.css
└── 3-components.css
```

**Keep it lean**: The template appears on every page, so keep it minimal. Put section-specific stuff in layouts instead.

**Test your template**: Since it wraps everything, a broken template breaks your whole site. Start simple and build up.
