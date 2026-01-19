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
- **Optional [Turbo](https://turbo.hotwired.dev/)** for SPA-like transitions

## Quickstart

```bash
npm install @daz4126/swifty
npx swifty init
npx swifty start
```

Then visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
your-site/
├── pages/          # Markdown content (folder structure = URLs)
├── layouts/        # HTML layout templates
├── partials/       # Reusable content snippets
├── css/            # Stylesheets (auto-injected)
├── js/             # JavaScript (auto-injected)
├── images/         # Images (auto-optimized to WebP)
├── template.html   # Base HTML template
└── config.yaml     # Site configuration
```

## Commands

```bash
npx swifty init             # Create new project structure
npx swifty build            # Build static site to dist/
npx swifty start            # Build, watch, and serve at localhost:3000
npx swifty build --out dir  # Build to custom output directory
```

## Documentation

See the [full documentation](https://daz4126.github.io/swifty/) for details on configuration, layouts, partials, and more.
