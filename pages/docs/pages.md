---
tags:
  - swifty
  - docs
  - pages
position: 5
summary: Create pages with Markdown and front matter.
---

Pages are where your content lives. Write them in Markdown, drop them in the `pages/` folder, and Swifty turns them into beautiful HTML. Simple as that.

## Your First Page

Create a Markdown file in `pages/`:

**pages/hello.md**
```markdown
---
title: Hello World
---

# Welcome!

This is my first Swifty page. *Exciting times.*
```

Build your site and visit `/hello` - your page is live!

## Front Matter

That stuff between the `---` lines at the top? That's front matter. It's YAML that defines metadata about your page:

```markdown
---
title: My Awesome Post
layout: blog
tags:
  - tutorial
  - swifty
position: 1
author: Your Name
anything_you_want: totally works
---
```

### Built-in Properties

| Property | What it does |
|----------|--------------|
| `title` | Page title (also used in navigation) |
| `layout` | Which layout to use (see [Layouts](/docs/layouts)) |
| `tags` | List of tags for categorization |
| `position` | Sort order in navigation (lower = first) |
| `draft` | Set to `true` to hide page in production builds |
| `date` | Page date; future dates hide the page until that date |

### Custom Properties

Here's the fun part: add *any* property you like and use it in your content:

```markdown
---
title: Product Page
price: $29.99
rating: 5 stars
---

# {{ title }}

**Price:** {{ price }}
**Rating:** {{ rating }}
```

Your custom properties become template variables. Neat, right?

## URLs Follow Folders

Your folder structure *is* your URL structure:

```
pages/
├── index.md          → /
├── about.md          → /about
├── blog/
│   ├── index.md      → /blog
│   ├── first-post.md → /blog/first-post
│   └── second-post.md→ /blog/second-post
└── docs/
    └── getting-started.md → /docs/getting-started
```

No config files, no route definitions. Just folders and files.

## Convention Over Configuration

This is a concept borrowed from [Ruby on Rails](https://rubyonrails.org). Swifty makes smart assumptions so you don't have to configure everything:

- Pages in `blog/` automatically use `layouts/blog.html` (if it exists)
- Pages in `docs/` automatically use `layouts/docs.html` (if it exists)
- Navigation is generated from your folder structure
- Tags create their own pages automatically

You *can* override these defaults, but you often won't need to.

## Draft Pages

Working on something that's not ready for prime time? Mark it as a draft:

```markdown
---
title: My Work In Progress
draft: true
---
```

Draft pages:
- **Show** during development (`swifty start`)
- **Hidden** in production builds (`swifty build`)

This means drafts won't appear in navigation, tag pages, or RSS feeds when you deploy. Perfect for previewing work before publishing.

## Scheduled Pages

Want to publish a page at a future date? Just set the date in front matter:

```markdown
---
title: Coming Soon
date: 2025-06-15
---
```

Pages with a future date:
- **Show** during development (`swifty start`)
- **Hidden** in production builds until the date arrives

This lets you write content ahead of time and have it automatically appear when you next build after the scheduled date.

## Auto-Generated Goodness

Every page automatically gets some handy variables:

| Variable | What you get |
|----------|--------------|
| `{{ breadcrumbs }}` | Breadcrumb navigation links |
| `{{ nav_links }}` | Top-level navigation links |
| `{{ links_to_children }}` | Links to child pages (for folder index pages) |
| `{{ links_to_siblings }}` | Links to sibling pages |
| `{{ links_to_tags }}` | Links to this page's tags |
| `{{ date }}` | Formatted last-modified date |
| `{{ created_at }}` | Formatted creation date |
| `{{ updated_at }}` | Formatted update date |

Just drop these into your layouts or pages wherever you need them.
