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

Name a partial after a folder, and it'll be used for child, sibling, and
self-plus-sibling link lists in that section. For example, `partials/blog.md`
styles `<%= links_to_children %>` on the blog index as well as
`<%= links_to_siblings %>` and `<%= links_to_self_and_siblings %>` on its posts.
This lets you style your blog navigation differently from your docs navigation.

`partials/related.md` or `partials/related.html` controls the entries in
`<%= related_pages %>`. Related entries also expose `related_score` and
`shared_tags`.

## Built-In Search Partial

Add a complete client-side search interface to any page or layout with:

```html
<%= partial: search %>
```

Swifty supplies the accessible form, ranked search client, keyboard navigation,
base-path-aware index URL, and self-hosted JavaScript. Set `search_results_limit`
to control the maximum number of matches and `search_content_limit` to bound the
normalized page text stored per index entry. A local `partials/search.html` or
`partials/search.md` overrides the built-in markup when you need a custom UI.

Set `search: false` in root configuration to disable both the index and built-in
interface.

## Why Use Partials?

- **Stay DRY**: Write once, use everywhere
- **Easy updates**: Change the partial, update every page
- **Cleaner pages**: Keep your Markdown focused on content
- **Flexible styling**: Different link formats for different sections

Think of partials as your site's building blocks. Mix and match them to create consistent, maintainable pages.
