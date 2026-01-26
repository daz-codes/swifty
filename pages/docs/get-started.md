---
tags:
  - swifty
  - docs
position: 1
summary: Install and set up Swifty in seconds.
---

Ready to build something awesome? Let's get you up and running with Swifty in no time!

## Installation

First, grab Swifty from npm:

```bash
npm install @daz4126/swifty
```

## Create Your First Site

Swifty comes with a handy command that sets up a fresh project with all the folders you need:

```bash
npx swifty my-site
```

This creates a `my-site/` folder with a starter structure including example pages, layouts, and styles to play with. Replace `my-site` with whatever you want to call your project. Think of it as your creative sandbox.

## Start Developing

Fire up the development server and watch your site come to life:

```bash
npx swifty start
```

Head over to [localhost:3000](http://localhost:3000) and boom - you've got a website! The dev server includes **live reload**, so every time you save a file, your browser refreshes automatically. No more manual refreshing like it's 2005.

## Build for Production

When you're ready to ship your masterpiece to the world:

```bash
npx swifty build
```

This creates a squeaky-clean `dist/` folder with optimized HTML, CSS, JS, and images - no development scripts, no cruft. Just pure, fast static files ready for deployment.

## Quick Deploy

If your site is in a git repo, you can build and deploy in one command:

```bash
npx swifty deploy "Updated content"
```

This runs the build, then `git add`, `git commit` with your message, and `git push`. Perfect for quick updates.

## That's It!

Seriously, that's all you need to get going. Swifty handles the boring stuff so you can focus on creating great content. Check out the rest of the docs to discover layouts, partials, and all the other goodies.
