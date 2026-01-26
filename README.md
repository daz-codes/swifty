# Swifty ![swiftyy-logo-pink-s png](https://github.com/user-attachments/assets/22fde975-7e2d-48e3-a253-41ea464d27f4)

## Super Speedy Static Site Generator

Swifty uses convention over configuration to make it super simple to build blazingly fast static sites.

## Features

- **Markdown pages** with YAML front matter
- **Automatic image optimization** to WebP
- **Layouts and partials** for reusable templates
- **Auto-injected CSS/JS** from your css/ and js/ folders
- **Code syntax highlighting** via highlight.js
- **Tags and navigation** generated automatically
- **RSS feed generation** for blogs and content folders
- **Draft mode** for work-in-progress pages (visible in dev, hidden in production)
- **Scheduled publishing** via future dates in front matter
- **Contact forms** via third-party services (Formspree, Netlify Forms, etc.)
- **Pagination** for folders with many pages
- **Data files** - Load JSON/YAML data and use in templates
- **Open Graph tags** - Auto-generated social sharing meta tags
- **Word count & reading time** - Auto-calculated for blog posts
- **Previous/next navigation** - Auto-generated links between sibling pages
- **[Eta templating](https://eta.js.org/)** - Full JavaScript in templates with EJS syntax
- **Optional [Turbo](https://turbo.hotwired.dev/)** for SPA-like transitions

## Quickstart

```bash
npm install -g @daz4126/swifty
swifty my-site
cd my-site
npx swifty start
```

Then visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
your-site/
├── pages/          # Markdown content (folder structure = URLs)
├── layouts/        # HTML layout templates
├── partials/       # Reusable content snippets
├── data/           # JSON/YAML data files
├── css/            # Stylesheets (auto-injected)
├── js/             # JavaScript (auto-injected)
├── images/         # Images (auto-optimized to WebP)
├── template.html   # Base HTML template
└── config.yaml     # Site configuration
```

## Commands

```bash
npx swifty my-site          # Create new site in my-site/ folder
npx swifty build            # Build static site to dist/ (for production)
npx swifty start            # Build, watch, and serve at localhost:3000 (for development)
npx swifty build --out dir  # Build to custom output directory
npx swifty deploy "message" # Build, git add, commit, and push
```

### Development vs Production

- **`swifty start`** - For development. Includes live reload (auto-refreshes browser on file changes) and file watching with incremental builds for CSS/JS/images.
- **`swifty build`** - For production deployment. Produces clean output without any development scripts.
- **`swifty deploy "message"`** - Builds the site and commits/pushes to git in one command.

## Documentation

See the [full documentation](https://swifty-oo3v.onrender.com/docs) for details on configuration, layouts, partials, and more.
