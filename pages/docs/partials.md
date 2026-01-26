---
tags:
  - swifty
  - docs
  - partials
position: 7
summary: Reusable snippets for DRY content.
---

Partials are little snippets of content you can reuse across your site. Got a footer you want on every page? A call-to-action box? A fancy quote format? Partials have got you covered.

## Creating a Partial

Partials live in the `partials/` folder. They can be Markdown or HTML:

**partials/footer.md**
```markdown
---

Made with Swifty. Built with love.
```

**partials/cta.html**
```html
<div class="cta-box">
  <h3>Ready to get started?</h3>
  <a href="/signup" class="button">Sign Up Now</a>
</div>
```

## Using a Partial

Drop a partial into any page or layout with ERB-style syntax:

```markdown
Here's my page content...

<%= partial: footer %>
```

That's it! Swifty finds the partial and inserts it right there.

## Partials with Variables

Here's where it gets clever. Partials can use the same variables as the page they're included in:

**partials/author-bio.md**
```markdown
*Written by <%= author %> on <%= date %>*
```

When included in a page with `author: Jane` in the front matter, it renders with Jane's name. The partial inherits all the page's variables.

## Link List Partials

Swifty uses special partials to control how auto-generated links look. Create these in your partials folder:

**partials/links.md** (default for all link lists)
```markdown
- [<%= title %>](<%= url %>)
```

**partials/blog.md** (for links in the blog section)
```markdown
### [<%= title %>](<%= url %>)
*<%= date %>*
```

**partials/nav.md** (for navigation links)
```html
<a href="<%= url %>" class="nav-link"><%= title %></a>
```

Name a partial after a folder, and it'll be used for link lists in that section. This lets you style your blog index differently from your docs index.

## Why Use Partials?

- **Stay DRY**: Write once, use everywhere
- **Easy updates**: Change the partial, update every page
- **Cleaner pages**: Keep your Markdown focused on content
- **Flexible styling**: Different link formats for different sections

Think of partials as your site's building blocks. Mix and match them to create consistent, maintainable pages.
