---
title: About Swifty
number: 29
tags:
  - swifty
  - about
---

Swifty is the next generation of static site generator!

It makes it really simple to create a full website that loads pages almost instantly.

## Quick Start

#### 1. Install Swifty:

```bash
npm install @daz4126/swifty
```

#### 2. Start a new project:

```bash
npx swifty "my_swifty_site"
cd my_swifty_site
```

#### 3. Add some more pages to the 'pages' folder (just write them in Markdown).

#### 4. Start the development server:

```bash
npx swifty start
```

Visit [localhost:3000](http://localhost:3000/) to see your site in action. The development server includes live reload - your browser will automatically refresh when you make changes.

#### 5. Build for production:

```bash
npx swifty build
```

This creates a clean build in the `dist/` folder ready for deployment (without any development scripts).

#### 6. Deploy:

If you have a remote git repository set up with a deploy pipeline (using a service such as Render or Netlify) then this will build and deploy the site automatically:

```bash
npx swifty deploy
```

#### 7. [Learn More](/docs) about all the other features, including layouts, partials and front-matter configuration.
