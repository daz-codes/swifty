---
tags:
  - swifty
  - docs
  - structure
position: 3
summary: How to organize your Swifty project.
---

Swifty loves a tidy project. Here's how to organize your files so everything just works.

## The Standard Structure

```
your-site/
├── pages/           # Your content lives here
│   ├── index.md     # Homepage
│   ├── about.md     # → /about
│   └── blog/        # A section
│       ├── index.md # → /blog
│       └── post.md  # → /blog/post
├── layouts/         # Page wrappers
│   ├── default.html # Fallback layout
│   └── blog.html    # Auto-used for /blog pages
├── partials/        # Reusable snippets
│   └── footer.md
├── css/             # Stylesheets (auto-injected)
│   └── styles.css
├── js/              # Scripts (auto-injected)
│   └── app.js
├── images/          # Images (auto-optimized)
│   └── hero.jpg
├── data/            # JSON/YAML data files
│   └── team.json
├── template.html    # The master wrapper
├── config.yaml      # Site configuration
└── dist/            # Built output (generated)
```

## What Each Folder Does

### pages/
This is where your content lives. Every `.md` file becomes a page. Subfolders become URL paths. It's that simple.

### layouts/
HTML templates that wrap your page content. Name them after folders for automatic matching - `blog.html` wraps pages in `pages/blog/`.

### partials/
Reusable content snippets. Include them anywhere with `<%= partial: name %>`. Great for footers, CTAs, author bios, and link formats.

### css/
Drop your stylesheets here. They're automatically added to every page, sorted alphabetically. Prefix with numbers to control load order.

### js/
Same deal as CSS. All JavaScript files are auto-injected into every page.

### images/
Your images go here. JPG, PNG, and JPEG files are automatically converted to WebP and resized for the web. SVGs and GIFs pass through unchanged.

### data/
Store JSON or YAML data files here. The filename becomes the variable name: `data/team.json` is accessible as `data.team` in your templates. Great for lists of team members, products, testimonials, or any structured data you want to loop over.

### dist/
The output folder. Don't edit files here - they get overwritten on every build. This is what you deploy.

## URLs Mirror Folders

Your folder structure *is* your site structure:

| File | URL |
|------|-----|
| `pages/index.md` | `/` |
| `pages/about.md` | `/about` |
| `pages/blog/index.md` | `/blog` |
| `pages/blog/hello.md` | `/blog/hello` |
| `pages/docs/getting-started.md` | `/docs/getting-started` |

No routing config needed. Just organize your files how you want your URLs.

## Files You Can Skip

All folders are optional. Start with just:

```
your-site/
├── pages/
│   └── index.md
└── template.html
```

Add the others as you need them. Swifty won't complain about missing folders.

## Custom Output Directory

By default, Swifty builds to `dist/`. Want it somewhere else?

```bash
npx swifty build --out public
```

Now your site builds to `public/` instead.
