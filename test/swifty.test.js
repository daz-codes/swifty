import assert from "assert";
import { execFile } from "child_process";
import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDir = path.join(__dirname, "fixtures");
const distDir = path.join(testDir, "dist");
const execFileAsync = promisify(execFile);

describe("Swifty", function () {
  this.timeout(15000);

  before(async () => {
    // Clean up any previous test fixtures
    await fsExtra.remove(testDir);

    // Create test fixture directory structure
    await fsExtra.ensureDir(path.join(testDir, "pages", "blog"));
    await fsExtra.ensureDir(path.join(testDir, "pages", "docs"));
    await fsExtra.ensureDir(path.join(testDir, "pages", "posts"));
    await fsExtra.ensureDir(path.join(testDir, "layouts"));
    await fsExtra.ensureDir(path.join(testDir, "partials"));
    await fsExtra.ensureDir(path.join(testDir, "css"));
    await fsExtra.ensureDir(path.join(testDir, "js"));
    await fsExtra.ensureDir(path.join(testDir, "images"));
    await fsExtra.ensureDir(path.join(testDir, "data"));
    await fsExtra.ensureDir(path.join(testDir, "public", "downloads"));
    await fsExtra.ensureDir(path.join(testDir, "public", "images"));

    // Create template.html with sitename and nav
    await fs.writeFile(
      path.join(testDir, "template.html"),
      `<!DOCTYPE html>
<html>
<head>
  <title><%= title %> | <%= sitename %></title>
  <%= og_tags %>
</head>
<body>
  <header>
    <h1><%= sitename %></h1>
    <nav><%= nav_links %></nav>
  </header>
  <nav class="breadcrumbs"><%= breadcrumbs %></nav>
  <%= content %>
  <%= pagination %>
  <%= partial: htmlnav %>
  <footer><%= partial: footer %></footer>
</body>
</html>`
    );

    // Create default layout with word count, reading time, and prev/next nav
    await fs.writeFile(
      path.join(testDir, "layouts", "default.html"),
      `<main class="default-layout">
  <div class="reading-info"><%= word_count %> words · <%= reading_time %></div>
  <%= content %>
  <nav class="page-nav">
    <%= prev_page %>
    <%= next_page %>
  </nav>
</main>`
    );

    // Create blog layout with prev/next navigation
    await fs.writeFile(
      path.join(testDir, "layouts", "blog.html"),
      `<article class="blog-post">
  <div class="meta">Published: <%= date %></div>
  <div class="tags"><%= links_to_tags %></div>
  <%= content %>
  <aside class="related"><%= related_pages %></aside>
  <nav class="post-nav">
    <span class="prev"><%= prev_page %></span>
    <span class="next"><%= next_page %></span>
  </nav>
</article>`
    );

    // Create index page
    await fs.writeFile(
      path.join(testDir, "pages", "index.md"),
      `---
title: Home Page
layout: default
---
# Welcome to <%= sitename %>

This is the home page with a [link to about](/about).

<%= partial: search %>`
    );

    // Create about page
    await fs.writeFile(
      path.join(testDir, "pages", "about.md"),
      `---
title: About Us
layout: default
custom_var: Custom Value Here
---
# About

This page has a custom variable: <%= custom_var %>

## Features

- Feature one
- Feature two
- Feature three`
    );

    // Create page whose filename capitalization would be wrong without front matter title
    await fs.writeFile(
      path.join(testDir, "pages", "about-mi.md"),
      `---
title: About Me
layout: default
---
# About Me`
    );

    // Create contact page
    await fs.writeFile(
      path.join(testDir, "pages", "contact.md"),
      `---
title: Contact
layout: default
---
# Contact Us

Email us at **hello@example.com** or visit our *office*.`
    );

    await fs.writeFile(
      path.join(testDir, "pages", "toc.md"),
      `---
title: Contents Guide
layout: default
nav: false
---
# Contents Guide

<%= toc %>

## Features & Setup

[Jump back to this section](#features-setup).

### Child \`code\`

## Features & Setup

## Café & Tea`,
    );

    await fs.writeFile(
      path.join(testDir, "pages", "search-hidden.md"),
      `---
title: Hidden From Search
layout: default
nav: false
search: false
---
This content must not appear in the generated search index.`,
    );

    await fs.writeFile(
      path.join(testDir, "pages", "eta-literal.md"),
      `---
title: Eta Literal
layout: default
nav: false
search: false
---
Literal Eta value: <%= data.values.literal_eta %>`,
    );

    await fs.writeFile(
      path.join(testDir, "pages", "legacy.md"),
      `---
title: Legacy URL
layout: default
permalink: /company/about.html
---
# Custom Permalink`,
    );

    await fs.writeFile(
      path.join(testDir, "pages", "summary-marker.md"),
      `---
title: Summary Marker
nav: false
---
# Summary Marker

This paragraph is the deliberate excerpt.

<!--more-->

This text must not be part of the summary.`,
    );

    await fs.writeFile(
      path.join(testDir, "pages", "404.md"),
      `---
title: Page Not Found
layout: default
---
# Page Not Found

The page you requested does not exist.`
    );

    // Create blog index
    await fs.writeFile(
      path.join(testDir, "pages", "blog", "index.md"),
      `---
title: Blog
layout: default
---
# Blog Posts

<%= links_to_children %>`
    );

    // Create blog posts with tags
    await fs.writeFile(
      path.join(testDir, "pages", "blog", "first-post.md"),
      `---
title: First Blog Post
layout: blog
tags: [javascript, tutorial]
position: 1
date: 13/01/2024
---
# My First Post

This is my first blog post about **JavaScript**.`
    );

    await fs.writeFile(
      path.join(testDir, "pages", "blog", "second-post.md"),
      `---
title: Second Blog Post
layout: blog
tags: [javascript, advanced]
position: 2
date: 2024-02-20
---
# Another Post

This post covers advanced topics.`
    );

    await fs.writeFile(
      path.join(testDir, "pages", "tag-a.md"),
      `---
title: Canonical Tags One
nav: false
position: 90
tags: ["Web Dev", "Ruby", "C#", "C++", "Café", "東京"]
---
First page for canonical tag routing.`,
    );

    await fs.writeFile(
      path.join(testDir, "pages", "tag-b.md"),
      `---
title: Canonical Tags Two
nav: false
position: 91
tags: ["web   dev", "ruby"]
---
Second page for canonical tag routing.`,
    );

    // Create docs with nested structure
    await fs.writeFile(
      path.join(testDir, "pages", "docs", "index.md"),
      `---
title: Documentation
layout: default
---
# Documentation

<%= links_to_children %>`
    );

    await fs.writeFile(
      path.join(testDir, "pages", "docs", "getting-started.md"),
      `---
title: Getting Started
layout: default
position: 1
---
# Getting Started

Install with npm:

\`\`\`bash
npm install swifty
\`\`\`

Then use the <%= sitename %> variable in your templates.`
    );

    // Create page with code blocks to test placeholder protection
    await fs.writeFile(
      path.join(testDir, "pages", "docs", "templates.md"),
      `---
title: Template Guide
layout: default
position: 2
---
# Template Variables

Use placeholders like this:

\`\`\`html
<title><%= title %></title>
<p><%= sitename %></p>
\`\`\`

Inline code: \`<%= variable %>\` should also be protected.

Regular text <%= title %> should be replaced.

<%= partial: code-example %>`
    );

    // Create footer partial
    await fs.writeFile(
      path.join(testDir, "partials", "footer.md"),
      `Built with <%= sitename %> - A Static Site Generator`
    );

    // Create nav partial for custom nav styling
    await fs.writeFile(
      path.join(testDir, "partials", "nav.md"),
      `- [Home](/)
- [About](/about)
- [Blog](/blog)`
    );

    await fs.writeFile(
      path.join(testDir, "partials", "blog.html"),
      `<a class="blog-section-link" href="<%= url %>"><%= title %></a>`,
    );

    await fs.writeFile(
      path.join(testDir, "partials", "htmlnav.html"),
      `<nav class="raw-partial">
  <a href="/about">About</a>

  <button type="button">Menu</button>
</nav>`
    );

    await fs.writeFile(
      path.join(testDir, "partials", "code-example.html"),
      `<pre><code><img src="/images/photo.jpg"><%= title %></code></pre>`,
    );

    // Create CSS file
    await fs.writeFile(
      path.join(testDir, "css", "style.css"),
      `body { font-family: sans-serif; }
.blog-post { max-width: 800px; }
/* comment with "quoted : value" and url("/ignored.svg") */
.safe-minify {
  width: calc(100% + 10px);
  content: "foo : bar";
  background-image: url("data:image/svg+xml,<svg viewBox='0 0 10 10'><path d='M0 0 L10 10'/></svg>");
}`
    );

    // Create JS file
    await fs.writeFile(
      path.join(testDir, "js", "main.js"),
      `// This comment should be removed.
const message = "Swifty site loaded";
console.log(message);`
    );

    await fs.writeFile(
      path.join(testDir, "public", "downloads", "example.txt"),
      "public download",
    );

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    );
    await Promise.all([
      fs.writeFile(path.join(testDir, "images", "photo.png"), png),
      fs.writeFile(path.join(testDir, "images", "favicon.png"), png),
      fs.writeFile(path.join(testDir, "images", "featured.jpg"), png),
      fs.writeFile(path.join(testDir, "images", "default-og.png"), png),
      fs.writeFile(path.join(testDir, "public", "images", "favicon.png"), png),
    ]);
    await sharp({
      create: {
        width: 1200,
        height: 600,
        channels: 3,
        background: { r: 180, g: 40, b: 90 },
      },
    })
      .png()
      .toFile(path.join(testDir, "images", "hero.png"));

    // Create posts for pagination testing (5 posts, will paginate with 2 per page)
    for (let i = 1; i <= 5; i++) {
      await fs.writeFile(
        path.join(testDir, "pages", "posts", `post-${i}.md`),
        `---
title: Post Number ${i}
position: ${i}
---
Content for post ${i}.`
      );
    }

    // Create folder-level config for posts with pagination
    await fs.writeFile(
      path.join(testDir, "pages", "posts", "config.yaml"),
      `page_count: 2`
    );

    // Create data folder files
    await fs.writeFile(
      path.join(testDir, "data", "team.json"),
      JSON.stringify([
        { name: "Alice", role: "Developer" },
        { name: "Bob", role: "Designer" }
      ])
    );
    await fs.writeFile(
      path.join(testDir, "data", "values.json"),
      JSON.stringify({ literal_eta: "<%= title %>" }),
    );

    // Create a page that uses data folder
    await fs.writeFile(
      path.join(testDir, "pages", "team.md"),
      `---
title: Our Team
layout: default
---
# Team Members

<% for (const member of data.team) { %>
- <%= member.name %> (<%= member.role %>)
<% } %>`
    );

    // Create a page with description and image for OG tag testing
    await fs.writeFile(
      path.join(testDir, "pages", "featured.md"),
      `---
title: Featured Article
description: This is a featured article with full Open Graph metadata
image: /images/featured.jpg
tags:
  - featured
  - article
layout: default
---
# Featured Content

This page has OG meta tags.`
    );

    await fs.writeFile(
      path.join(testDir, "pages", "images.md"),
      `---
title: Image Rewrite
layout: default
---
# Image Rewrite

![Local image](/images/photo.png)

![Large image](/images/hero.png)

<img src="https://cdn.example.com/remote.jpg" alt="Remote image">
<link rel="icon" type="image/png" href="/images/favicon.png">
<a href="/images/photo.jpg">Download original</a>

The filename report.png should not be rewritten.`
    );

    // Create a longer article for word count and reading time testing
    await fs.writeFile(
      path.join(testDir, "pages", "long-article.md"),
      `---
title: Long Article
layout: default
---
# A Longer Article

${'This is a sample paragraph with multiple words to test word counting. '.repeat(20)}

## Another Section

${'Here is more content to increase the word count further. '.repeat(20)}`
    );


    // Create config with RSS feeds
    await fs.writeFile(
      path.join(testDir, "config.yaml"),
      `sitename: Test Site
default_layout_name: default
author: Test Author
site_url: https://example.com
date_locale: en-GB
timezone: UTC
default_og_image: /images/default-og.png
highlight_theme: github-dark
rss_feeds:
  - blog
  - folder: docs
    title: Documentation Updates
    description: Latest documentation changes
  - posts`
    );

    // Change to test directory and run build
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      const buildModule = await import("../src/build.js");
      await buildModule.default("dist");
    } finally {
      process.chdir(originalCwd);
    }
  });

  after(async () => {
    // Clean up test fixtures
    await fsExtra.remove(testDir);
  });

  describe("Build Output", () => {
    it("should create dist directory", async () => {
      const exists = await fsExtra.pathExists(distDir);
      assert.strictEqual(exists, true);
    });

    it("should create index.html at root", async () => {
      const exists = await fsExtra.pathExists(path.join(distDir, "index.html"));
      assert.strictEqual(exists, true);
    });

    it("should create nested page directories", async () => {
      const aboutExists = await fsExtra.pathExists(path.join(distDir, "about", "index.html"));
      const contactExists = await fsExtra.pathExists(path.join(distDir, "contact", "index.html"));
      assert.strictEqual(aboutExists, true, "about page should exist");
      assert.strictEqual(contactExists, true, "contact page should exist");
    });

    it("should emit root 404.md as 404.html", async () => {
      const root404Exists = await fsExtra.pathExists(path.join(distDir, "404.html"));
      const nested404Exists = await fsExtra.pathExists(path.join(distDir, "404", "index.html"));
      assert.strictEqual(root404Exists, true, "404.html should exist at the output root");
      assert.strictEqual(nested404Exists, false, "404.md should not emit as /404/index.html");
    });

    it("should minify generated HTML", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(!content.includes("\n  <header>"), "generated HTML should be compacted");
    });

    it("should preserve meaningful HTML whitespace and quoted values when minifying", async () => {
      const { minifyHtml } = await import("../src/minify.js");
      const content = await minifyHtml(
        '<p><span>Hello</span> <span title="two  spaces">world</span></p>',
      );

      assert.ok(content.includes("</span> <span"), "inline element spacing should remain");
      assert.ok(content.includes('title="two  spaces"'), "quoted attribute spacing should remain");
    });

    it("should remove stale output before a full build", async () => {
      const stalePath = path.join(distDir, "removed-page", "index.html");
      await fsExtra.ensureDir(path.dirname(stalePath));
      await fs.writeFile(stalePath, "stale");

      const originalCwd = process.cwd();
      process.chdir(testDir);
      try {
        const buildModule = await import("../src/build.js");
        await buildModule.default("dist");
      } finally {
        process.chdir(originalCwd);
      }

      assert.strictEqual(
        await fsExtra.pathExists(stalePath),
        false,
        "files not produced by the current build should be removed",
      );
    });

    it("should refuse to use a source directory as build output", async () => {
      const publicFile = path.join(testDir, "public", "downloads", "example.txt");
      const { prepareOutputDirectory } = await import("../src/build.js");

      await assert.rejects(
        () => prepareOutputDirectory(path.join(testDir, "public")),
        /unsafe output directory/,
      );
      assert.strictEqual(await fs.readFile(publicFile, "utf-8"), "public download");
    });

    it("should create blog directory structure", async () => {
      const blogIndex = await fsExtra.pathExists(path.join(distDir, "blog", "index.html"));
      const nestedBlogIndex = await fsExtra.pathExists(
        path.join(distDir, "blog", "index", "index.html"),
      );
      const firstPost = await fsExtra.pathExists(path.join(distDir, "blog", "first-post", "index.html"));
      const secondPost = await fsExtra.pathExists(path.join(distDir, "blog", "second-post", "index.html"));
      assert.strictEqual(blogIndex, true, "blog index should exist");
      assert.strictEqual(nestedBlogIndex, false, "folder index.md should not emit /blog/index");
      assert.strictEqual(firstPost, true, "first post should exist");
      assert.strictEqual(secondPost, true, "second post should exist");
    });

    it("should use folder index.md content and metadata for the folder URL", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "index.html"), "utf-8");

      assert.ok(
        content.includes('<h1 id="blog-posts">Blog Posts</h1>'),
        "folder index content should render with a heading anchor",
      );
      assert.ok(content.includes("<title>Blog | Test Site</title>"), "folder index title should render");
    });

    it("should create docs directory structure", async () => {
      const docsIndex = await fsExtra.pathExists(path.join(distDir, "docs", "index.html"));
      const gettingStarted = await fsExtra.pathExists(path.join(distDir, "docs", "getting-started", "index.html"));
      assert.strictEqual(docsIndex, true, "docs index should exist");
      assert.strictEqual(gettingStarted, true, "getting-started should exist");
    });

    it("should write custom permalink routes without an extra directory", async () => {
      const permalinkPath = path.join(distDir, "company", "about.html");
      const legacyPath = path.join(distDir, "legacy", "index.html");

      assert.strictEqual(await fsExtra.pathExists(permalinkPath), true);
      assert.strictEqual(await fsExtra.pathExists(legacyPath), false);
      assert.ok(
        (await fs.readFile(permalinkPath, "utf-8")).includes("Custom Permalink"),
      );
    });
  });

  describe("Assets", () => {
    it("should copy CSS files to dist", async () => {
      const cssExists = await fsExtra.pathExists(path.join(distDir, "css", "style.css"));
      assert.strictEqual(cssExists, true);
    });

    it("should copy JS files to dist", async () => {
      const jsExists = await fsExtra.pathExists(path.join(distDir, "js", "main.js"));
      assert.strictEqual(jsExists, true);
    });

    it("should copy the public directory verbatim", async () => {
      const content = await fs.readFile(
        path.join(distDir, "downloads", "example.txt"),
        "utf-8",
      );
      assert.strictEqual(content, "public download");
    });

    it("should preserve CSS content", async () => {
      const content = await fs.readFile(path.join(distDir, "css", "style.css"), "utf-8");
      assert.ok(content.includes("font-family:sans-serif"));
      assert.ok(!content.includes("\n"), "CSS should be minified");
      assert.ok(!content.includes("comment with"), "CSS comments should be removed");
    });

    it("should preserve CSS strings, url values, and calc operator spacing when minifying", async () => {
      const content = await fs.readFile(path.join(distDir, "css", "style.css"), "utf-8");
      assert.ok(content.includes("calc(100% + 10px)"), "calc + operator spacing should be preserved");
      assert.ok(content.includes('content:"foo : bar"'), "string content should not be rewritten");
      assert.ok(
        content.includes('url("data:image/svg+xml,<svg viewBox='),
        "data URI url() content should not be mangled",
      );
      assert.ok(content.includes("><path"), "SVG data URI child combinator-like content should be preserved");
    });

    it("should inject CSS link in template", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(/href="\/css\/style\.css\?v=\d+"/.test(content), "should have CSS link tag with cache-busting query string");
    });

    it("should inject JS script in template", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(/src="\/js\/main\.js\?v=\d+"/.test(content), "should have JS script tag with cache-busting query string");
    });

    it("should use Terser to remove JavaScript comments", async () => {
      const content = await fs.readFile(path.join(distDir, "js", "main.js"), "utf-8");
      assert.ok(!content.includes("This comment should be removed"));
      assert.ok(content.includes("console.log"));
    });

    it("should copy fingerprinted Swifty client and highlight theme assets", async () => {
      const files = await fs.readdir(path.join(distDir, "swifty"));
      const navigationExists = files.some((file) =>
        /^swifty-navigation\.[a-f0-9]{10}\.js$/.test(file),
      );
      const searchExists = files.some((file) =>
        /^swifty-search\.[a-f0-9]{10}\.js$/.test(file),
      );
      const highlightTheme = files.find((file) =>
        /^highlight-github-dark\.[a-f0-9]{10}\.css$/.test(file),
      );
      const morpheusExists = await fsExtra.pathExists(path.join(distDir, "swifty", "morpheus.js"));
      const idiomorphExists = await fsExtra.pathExists(path.join(distDir, "swifty", "idiomorph.esm.js"));
      const licenseExists = await fsExtra.pathExists(path.join(distDir, "swifty", "IDIOMORPH-LICENSE.txt"));
      const highlightLicenseExists = await fsExtra.pathExists(
        path.join(distDir, "swifty", "HIGHLIGHT-LICENSE.txt"),
      );
      assert.strictEqual(navigationExists, true, "fingerprinted swifty-navigation.js should exist");
      assert.strictEqual(searchExists, true, "fingerprinted swifty-search.js should exist");
      assert.ok(highlightTheme, "configured highlight.js theme should exist");
      assert.strictEqual(morpheusExists, true, "reusable morpheus.js core should exist");
      assert.strictEqual(idiomorphExists, true, "idiomorph.esm.js should exist");
      assert.strictEqual(licenseExists, true, "IDIOMORPH-LICENSE.txt should exist");
      assert.strictEqual(
        highlightLicenseExists,
        true,
        "HIGHLIGHT-LICENSE.txt should exist",
      );

      const navigationFile = files.find((file) =>
        /^swifty-navigation\.[a-f0-9]{10}\.js$/.test(file),
      );
      const navigationClient = await fs.readFile(
        path.join(distDir, "swifty", navigationFile),
        "utf-8",
      );
      const morpheusClient = await fs.readFile(
        path.join(distDir, "swifty", "morpheus.js"),
        "utf-8",
      );
      const highlightCss = await fs.readFile(
        path.join(distDir, "swifty", highlightTheme),
        "utf-8",
      );
      assert.ok(navigationClient.includes('from "./morpheus.js"'));
      assert.ok(morpheusClient.includes("export class Morpheus"));
      assert.ok(highlightCss.includes(".hljs"));
    });

    it("should inject Swifty navigation script with morphing settings", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(
        /src="\/swifty\/swifty-navigation\.[a-f0-9]{10}\.js"/.test(content),
        "should include fingerprinted Swifty navigation script",
      );
      assert.ok(content.includes("data-swifty-navigation"), "should mark navigation script for auto-start");
      assert.ok(content.includes('data-target="main"'), "should include default morph target");
      assert.ok(content.includes('data-prefetching="intent"'), "should enable intent prefetching by default");
    });

    it("should optimize local PNG images to WebP", async () => {
      const photoExists = await fsExtra.pathExists(path.join(distDir, "images", "photo.webp"));
      const faviconExists = await fsExtra.pathExists(path.join(distDir, "images", "favicon.webp"));
      assert.strictEqual(photoExists, true, "photo.webp should exist");
      assert.strictEqual(faviconExists, true, "favicon.webp should exist");
    });

    it("should generate responsive WebP image variants", async () => {
      const smallExists = await fsExtra.pathExists(path.join(distDir, "images", "hero-320.webp"));
      const mediumExists = await fsExtra.pathExists(path.join(distDir, "images", "hero-640.webp"));
      const defaultExists = await fsExtra.pathExists(path.join(distDir, "images", "hero.webp"));
      assert.strictEqual(smallExists, true, "hero-320.webp should exist");
      assert.strictEqual(mediumExists, true, "hero-640.webp should exist");
      assert.strictEqual(defaultExists, true, "hero.webp should exist");
    });

    it("should reuse the persistent image cache across clean full builds", async () => {
      const { getImageCacheDirectory } = await import("../src/assets.js");
      const cachePath = path.join(getImageCacheDirectory(), "hero.webp");
      const before = (await fs.stat(cachePath)).mtimeMs;
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const buildModule = await import("../src/build.js");
        await buildModule.default("dist");
      } finally {
        process.chdir(originalCwd);
      }

      const after = (await fs.stat(cachePath)).mtimeMs;
      assert.strictEqual(after, before, "cached image should not be reprocessed");
      assert.strictEqual(
        await fsExtra.pathExists(path.join(distDir, "images", "hero.webp")),
        true,
        "cached image should still be copied into clean output",
      );
    });

    it("should skip image optimization when WebP output is newer than the source", async () => {
      const { optimizeSingleImage } = await import("../src/assets.js");
      const sourcePath = path.join(testDir, "images", "photo.png");
      const optimizedPath = path.join(distDir, "images", "photo.webp");
      const future = new Date(Date.now() + 60_000);

      await fs.utimes(optimizedPath, future, future);
      const before = (await fs.stat(optimizedPath)).mtimeMs;
      await optimizeSingleImage(sourcePath, distDir);
      const after = (await fs.stat(optimizedPath)).mtimeMs;

      assert.strictEqual(after, before, "cached WebP should not be rewritten");
    });

    it("should clear stale responsive image map entries between image optimization runs", async () => {
      const {
        getImageCacheDirectory,
        getResponsiveImage,
        optimizeImages,
        optimizeSingleImage,
      } = await import("../src/assets.js");
      const sourcePath = path.join(testDir, "images", "stale.png");
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      );

      await fs.writeFile(sourcePath, png);
      await optimizeSingleImage(sourcePath, distDir);
      assert.ok(getResponsiveImage("/images/stale.png"), "newly optimized image should be registered");

      await fsExtra.remove(sourcePath);
      await optimizeImages(distDir);
      assert.strictEqual(getResponsiveImage("/images/stale.png"), null, "deleted image should not stay registered");
      assert.strictEqual(
        await fsExtra.pathExists(path.join(getImageCacheDirectory(), "stale.webp")),
        false,
        "deleted image should be removed from the persistent cache",
      );
    });
  });

  describe("Layouts", () => {
    it("should apply default layout", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(content.includes('class="default-layout"'), "should have default layout class");
    });

    it("should apply blog layout to blog posts", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "first-post", "index.html"), "utf-8");
      assert.ok(content.includes('class="blog-post"'), "should have blog layout class");
    });

    it("should include layout variables like date", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "first-post", "index.html"), "utf-8");
      assert.ok(content.includes("Published:"), "should have date label from layout");
    });
  });

  describe("Markdown Processing", () => {
    it("should convert headings", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(content.includes("<h1"), "should have h1 tag");
    });

    it("should generate stable unique heading anchors and a nested table of contents", async () => {
      const content = await fs.readFile(
        path.join(distDir, "toc", "index.html"),
        "utf-8",
      );

      assert.ok(content.includes('<h1 id="contents-guide">Contents Guide</h1>'));
      assert.ok(content.includes('<h2 id="features-setup">Features &amp; Setup</h2>'));
      assert.ok(content.includes('<h2 id="features-setup-1">Features &amp; Setup</h2>'));
      assert.ok(content.includes('<h2 id="café-tea">Café &amp; Tea</h2>'));
      assert.ok(content.includes('<nav class="swifty_toc" aria-label="Table of contents">'));
      assert.ok(content.includes('<a href="#features-setup">Features &amp; Setup</a>'));
      assert.ok(content.includes('<a href="#features-setup-1">Features &amp; Setup</a>'));
      assert.match(
        content,
        /href="#features-setup">Features &amp; Setup<\/a><ul>.*href="#child-code"/s,
      );
    });

    it("should convert bold text", async () => {
      const content = await fs.readFile(path.join(distDir, "contact", "index.html"), "utf-8");
      assert.ok(content.includes("<strong>") && content.includes("hello@example.com"), "should convert **text** to strong");
    });

    it("should convert italic text", async () => {
      const content = await fs.readFile(path.join(distDir, "contact", "index.html"), "utf-8");
      assert.ok(content.includes("<em>office</em>"), "should convert *text* to em");
    });

    it("should convert unordered lists", async () => {
      const content = await fs.readFile(path.join(distDir, "about", "index.html"), "utf-8");
      assert.ok(content.includes("<ul>"), "should have ul tag");
      assert.ok(content.includes("<li>"), "should have li tags");
    });

    it("should convert links", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(content.includes('href="/about"'), "should convert markdown links");
    });

    it("should convert fenced code blocks", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "getting-started", "index.html"), "utf-8");
      assert.ok(content.includes("<pre>") || content.includes("<code"), "should have code block");
      assert.ok(content.includes("npm install"), "should preserve code content");
    });

    it("should syntax-highlight fenced code blocks with highlight.js classes", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "getting-started", "index.html"), "utf-8");
      const plainContent = await fs.readFile(
        path.join(distDir, "contact", "index.html"),
        "utf-8",
      );
      assert.ok(
        /<code class="hljs language-bash">/.test(content),
        "code element should carry the hljs class so the highlight stylesheet applies",
      );
      assert.match(
        content,
        /href="\/swifty\/highlight-github-dark\.[a-f0-9]{10}\.css"/,
      );
      assert.ok(!content.includes("cdnjs.cloudflare.com"));
      assert.ok(!plainContent.includes("highlight-github-dark"));
      assert.ok(!plainContent.includes("cdnjs.cloudflare.com"));
    });
  });

  describe("Front Matter", () => {
    it("should treat non-delimiter dashes as Markdown content", async () => {
      const { parseFrontMatter } = await import("../src/frontmatter.js");
      const source = "--- not front matter\n\nPage content";

      assert.deepStrictEqual(parseFrontMatter(source), { data: {}, content: source });
    });

    it("should not render front matter in output", async () => {
      const content = await fs.readFile(path.join(distDir, "about", "index.html"), "utf-8");
      assert.ok(!content.includes("layout: default"), "front matter should not appear in output");
    });

    it("should use title from front matter", async () => {
      const content = await fs.readFile(path.join(distDir, "about", "index.html"), "utf-8");
      assert.ok(content.includes("<title>About Us"), "should use front matter title");
    });

    it("should support custom front matter variables", async () => {
      const content = await fs.readFile(path.join(distDir, "about", "index.html"), "utf-8");
      assert.ok(content.includes("Custom Value Here"), "should replace custom_var placeholder");
    });

    it("should not evaluate rendered data values as a second Eta template", async () => {
      const content = await fs.readFile(
        path.join(distDir, "eta-literal", "index.html"),
        "utf-8",
      );
      assert.ok(
        content.includes("Literal Eta value: &lt;%= title %&gt;") ||
          content.includes("Literal Eta value: <%= title %>"),
        "rendered page content should remain opaque during shell rendering",
      );
      assert.ok(!content.includes("Literal Eta value: Eta Literal"));
    });

    it("should preserve YAML calendar dates as strings", async () => {
      const { parseFrontMatter } = await import("../src/frontmatter.js");
      const parsed = parseFrontMatter(
        "---\ndefaults: &defaults\n  layout: blog\nsettings:\n  <<: *defaults\ndate: 2026-07-18\n---\nScheduled",
      );
      assert.strictEqual(parsed.data.date, "2026-07-18");
      assert.strictEqual(parsed.data.settings.layout, "blog");
    });
  });

  describe("Page Dates", () => {
    it("should prefer a tracked file's Git commit date over filesystem time", async () => {
      const siteDir = path.join(testDir, "git-date-site");
      const pagesDir = path.join(siteDir, "pages");
      const pagePath = path.join(pagesDir, "tracked.md");
      const commitDate = "2020-01-02T03:04:05Z";

      try {
        await fsExtra.ensureDir(pagesDir);
        await fs.writeFile(pagePath, "# Tracked page");
        await execFileAsync("git", ["init", "-q"], { cwd: siteDir });
        await execFileAsync("git", ["add", "pages/tracked.md"], { cwd: siteDir });
        await execFileAsync(
          "git",
          [
            "-c",
            "user.name=Swifty Tests",
            "-c",
            "user.email=tests@example.com",
            "commit",
            "-qm",
            "Add tracked page",
          ],
          {
            cwd: siteDir,
            env: {
              ...process.env,
              GIT_AUTHOR_DATE: commitDate,
              GIT_COMMITTER_DATE: commitDate,
            },
          },
        );
        await fs.utimes(pagePath, new Date("2026-07-01"), new Date("2026-07-01"));

        const { generatePages } = await import("../src/pages.js");
        const pages = await generatePages(pagesDir);
        assert.strictEqual(pages[0].date_iso, "2020-01-02T03:04:05.000Z");
        assert.strictEqual(
          pages[0].updated_at_iso,
          "2020-01-02T03:04:05.000Z",
        );
      } finally {
        await fsExtra.remove(siteDir);
      }
    });

    it("should fall back to mtime when a file has no Git history", async () => {
      const pagePath = path.join(testDir, "untracked-date.md");
      const fallbackDate = new Date("2022-04-05T06:07:08.000Z");
      const { clearGitDateCache, resolveFileDate } = await import("../src/dates.js");

      try {
        await fs.writeFile(pagePath, "Untracked");
        clearGitDateCache();
        const resolvedDate = await resolveFileDate(pagePath, fallbackDate);
        assert.strictEqual(resolvedDate.toISOString(), fallbackDate.toISOString());
      } finally {
        await fsExtra.remove(pagePath);
        clearGitDateCache();
      }
    });

    it("should resolve calendar dates at midnight in the configured timezone", async () => {
      const { parsePageDate } = await import("../src/dates.js");
      const summer = parsePageDate("2026-07-18", "Europe/London");
      const winter = parsePageDate("2026-01-18", "Europe/London");

      assert.strictEqual(summer.date.toISOString(), "2026-07-17T23:00:00.000Z");
      assert.strictEqual(winter.date.toISOString(), "2026-01-18T00:00:00.000Z");
      assert.strictEqual(summer.dateOnly, true);
    });

    it("should preserve exact offset-bearing ISO timestamps", async () => {
      const { parsePageDate } = await import("../src/dates.js");
      const parsed = parsePageDate("2026-07-18T08:30:00+02:00", "UTC");

      assert.strictEqual(parsed.date.toISOString(), "2026-07-18T06:30:00.000Z");
      assert.strictEqual(parsed.dateOnly, false);
      assert.strictEqual(parsePageDate("2026-07-18T08:30:00", "UTC"), null);
    });

    it("should format display dates with explicit locale and timezone", async () => {
      const { formatDisplayDate } = await import("../src/dates.js");
      const date = new Date("2024-02-20T00:00:00.000Z");
      const options = {
        timezone: "UTC",
        dateFormat: { year: "numeric", month: "2-digit", day: "2-digit" },
      };

      assert.strictEqual(
        formatDisplayDate(date, { ...options, date_locale: "en-GB" }),
        "20/02/2024",
      );
      assert.strictEqual(
        formatDisplayDate(date, { ...options, date_locale: "en-US" }),
        "02/20/2024",
      );
    });
  });

  describe("Config Variables", () => {
    it("should replace sitename in template", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(content.includes("Test Site"), "should have sitename from config");
    });

    it("should replace sitename in page content", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(content.includes("Welcome to Test Site"), "should replace sitename in content");
    });

    it("should reload root configuration without restarting the process", async () => {
      const configPath = path.join(testDir, "config.yaml");
      const originalConfig = await fs.readFile(configPath, "utf-8");
      const { defaultConfig, reloadConfig } = await import("../src/config.js");

      try {
        await fs.writeFile(
          configPath,
          originalConfig.replace("sitename: Test Site", "sitename: Reloaded Site"),
        );
        await reloadConfig();
        assert.strictEqual(defaultConfig.sitename, "Reloaded Site");
      } finally {
        await fs.writeFile(configPath, originalConfig);
        await reloadConfig();
      }
    });

    it("should apply base_path to public URLs without nesting output", async () => {
      const configPath = path.join(testDir, "config.yaml");
      const originalConfig = await fs.readFile(configPath, "utf-8");
      const { reloadConfig } = await import("../src/config.js");
      const buildModule = await import("../src/build.js");
      const originalCwd = process.cwd();

      try {
        await fs.writeFile(configPath, `${originalConfig}\nbase_path: /project\n`);
        await reloadConfig();
        process.chdir(testDir);
        await buildModule.default("dist");

        const home = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
        const codePage = await fs.readFile(
          path.join(distDir, "docs", "getting-started", "index.html"),
          "utf-8",
        );
        const imagePage = await fs.readFile(
          path.join(distDir, "images", "index.html"),
          "utf-8",
        );
        const sitemap = await fs.readFile(path.join(distDir, "sitemap.xml"), "utf-8");
        const robots = await fs.readFile(path.join(distDir, "robots.txt"), "utf-8");
        const tagIndex = await fs.readFile(
          path.join(distDir, "tags", "index.html"),
          "utf-8",
        );
        const search = JSON.parse(
          await fs.readFile(path.join(distDir, "search.json"), "utf-8"),
        );

        assert.ok(home.includes('href="/project/about"'));
        assert.ok(/href="\/project\/css\/style\.css\?v=\d+"/.test(home));
        assert.match(
          codePage,
          /href="\/project\/swifty\/highlight-github-dark\.[a-f0-9]{10}\.css"/,
        );
        assert.ok(imagePage.includes('src="/project/images/photo.webp"'));
        assert.ok(sitemap.includes("https://example.com/project/about"));
        assert.ok(robots.includes("https://example.com/project/sitemap.xml"));
        assert.ok(tagIndex.includes('href="/project/tags/web-dev"'));
        assert.ok(search.pages.some((page) => page.url === "/project/about"));
        assert.strictEqual(
          await fsExtra.pathExists(path.join(distDir, "project")),
          false,
          "base_path should not become an output directory",
        );
      } finally {
        process.chdir(originalCwd);
        await fs.writeFile(configPath, originalConfig);
        await reloadConfig();
        process.chdir(testDir);
        try {
          await buildModule.default("dist");
        } finally {
          process.chdir(originalCwd);
        }
      }
    });

    it("should not rewrite root-like URLs inside scripts or code blocks", async () => {
      const { applyBasePathToHtml } = await import("../src/urls.js");
      const content = applyBasePathToHtml(
        '<script>const example = \'href="/inside-script"\';</script><code>src="/inside-code"</code><a href="/page">Page</a>',
        "/project",
      );

      assert.ok(content.includes('href="/inside-script"'));
      assert.ok(content.includes('src="/inside-code"'));
      assert.ok(content.includes('href="/project/page"'));
    });

    it("should preserve data URIs while rewriting srcset candidates", async () => {
      const { applyBasePathToHtml } = await import("../src/urls.js");
      const dataUri = "data:image/svg+xml,%3Csvg%3E%3C/svg%3E";
      const content = applyBasePathToHtml(
        `<img srcset="${dataUri} 1x, /images/photo.webp 2x">`,
        "/project",
      );

      assert.ok(content.includes(`${dataUri} 1x`));
      assert.ok(content.includes("/project/images/photo.webp 2x"));
    });
  });

  describe("Partials", () => {
    it("should include footer partial", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(content.includes("Built with"), "should include footer partial content");
    });

    it("should replace variables within partials", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(
        content.includes("Built with Test Site"),
        "should replace sitename in partial"
      );
    });

    it("should render raw HTML partials without Markdown wrapping", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(content.includes('<nav class="raw-partial">'), "should include raw HTML partial");
      assert.ok(!content.includes('<p><nav class="raw-partial">'), "should not wrap raw HTML partial in paragraphs");
    });

    it("should preserve dollar replacement tokens in rendered partials", async () => {
      const partialPath = path.join(testDir, "partials", "replacement-tokens.html");
      const expected = "Before $& middle $` after $'";
      const { clearCache, replacePlaceholders } = await import("../src/partials.js");

      try {
        await fs.writeFile(partialPath, expected);
        clearCache();
        const content = await replacePlaceholders(
          "<%= partial: replacement-tokens %>",
          { url: "/replacement-test", meta: {} },
        );
        assert.strictEqual(content, expected);
      } finally {
        await fsExtra.remove(partialPath);
        clearCache();
      }
    });

    it("should reuse computed page data while keeping later metadata current", async () => {
      const { replacePlaceholders } = await import("../src/partials.js");
      const context = {};
      const page = {
        content: "one two three",
        meta: { dynamic_value: "before" },
        url: "/context",
      };

      const first = await replacePlaceholders(
        "<%= word_count %> <%= dynamic_value %>",
        page,
        context,
      );
      const computed = context.computed;
      page.meta.dynamic_value = "after";
      const second = await replacePlaceholders(
        "<%= word_count %> <%= dynamic_value %>",
        page,
        context,
      );

      assert.strictEqual(first, "3 before");
      assert.strictEqual(second, "3 after");
      assert.strictEqual(context.computed, computed);
    });
  });

  describe("Code Block Protection", () => {
    it("should not replace placeholders inside fenced code blocks", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "templates", "index.html"), "utf-8");
      // The <%= title %> inside the code block should remain as-is
      assert.ok(
        content.includes("&lt;%= title %&gt;") || content.includes("<%= title %>"),
        "should preserve placeholder syntax in code blocks"
      );
    });

    it("should not replace placeholders inside inline code", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "templates", "index.html"), "utf-8");
      assert.ok(
        content.includes("&lt;%= variable %&gt;") || content.includes("<%= variable %>"),
        "should preserve placeholder in inline code"
      );
    });

    it("should still replace placeholders in regular text", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "templates", "index.html"), "utf-8");
      // "Regular text <%= title %>" should become "Regular text Template Guide"
      assert.ok(
        content.includes("Regular text Template Guide"),
        "should replace placeholder in normal text"
      );
    });

    it("should protect image and Eta examples supplied by partials", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "templates", "index.html"), "utf-8");
      assert.ok(content.includes('/images/photo.jpg'));
      assert.ok(!content.includes('/images/photo.webp'));
      assert.ok(
        content.includes("&lt;%= title %&gt;") || content.includes("<%= title %>"),
        "partial code examples should remain literal",
      );
    });
  });

  describe("Tags", () => {
    it("should create tags index page", async () => {
      const exists = await fsExtra.pathExists(path.join(distDir, "tags", "index.html"));
      assert.strictEqual(exists, true, "tags index should exist");
    });

    it("should create individual tag pages", async () => {
      const jsTagExists = await fsExtra.pathExists(path.join(distDir, "tags", "javascript", "index.html"));
      const tutorialTagExists = await fsExtra.pathExists(path.join(distDir, "tags", "tutorial", "index.html"));
      assert.strictEqual(jsTagExists, true, "javascript tag page should exist");
      assert.strictEqual(tutorialTagExists, true, "tutorial tag page should exist");
    });

    it("should include tag links in blog posts", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "first-post", "index.html"), "utf-8");
      assert.ok(
        content.includes('href="/tags/javascript"'),
        "should have link to javascript tag"
      );
    });

    it("should merge case and whitespace variants into canonical tag pages", async () => {
      const webDev = await fs.readFile(
        path.join(distDir, "tags", "web-dev", "index.html"),
        "utf-8",
      );
      const ruby = await fs.readFile(
        path.join(distDir, "tags", "ruby", "index.html"),
        "utf-8",
      );

      assert.ok(webDev.includes("Canonical Tags One"));
      assert.ok(webDev.includes("Canonical Tags Two"));
      assert.ok(ruby.includes("Canonical Tags One"));
      assert.ok(ruby.includes("Canonical Tags Two"));
      assert.strictEqual(
        await fsExtra.pathExists(path.join(distDir, "tags", "Web Dev")),
        false,
      );
    });

    it("should create safe, collision-free routes for punctuation and Unicode tags", async () => {
      const content = await fs.readFile(
        path.join(distDir, "tags", "index.html"),
        "utf-8",
      );
      const collisionRoutes = [...content.matchAll(/href="(\/tags\/c-[a-f0-9]+)"/g)]
        .map((match) => match[1]);

      assert.strictEqual(new Set(collisionRoutes).size, 2, "C# and C++ need distinct routes");
      for (const route of collisionRoutes) {
        assert.strictEqual(
          await fsExtra.pathExists(
            path.join(distDir, route.replace(/^\/+/, ""), "index.html"),
          ),
          true,
        );
      }
      assert.ok(content.includes('href="/tags/cafe"'));
      assert.match(content, /href="\/tags\/tag-[a-f0-9]+"[^>]*>東京<\/a>/);
      assert.ok(!content.includes('/tags/C#'));
      assert.ok(!content.includes('/tags/C++'));
    });
  });

  describe("Summaries and Related Content", () => {
    it("should generate summaries from the first useful paragraph", async () => {
      const index = JSON.parse(
        await fs.readFile(path.join(distDir, "search.json"), "utf-8"),
      );
      const firstPost = index.pages.find(
        (page) => page.url === "/blog/first-post",
      );
      assert.strictEqual(
        firstPost.summary,
        "This is my first blog post about JavaScript.",
      );
    });

    it("should honor the summary marker", async () => {
      const index = JSON.parse(
        await fs.readFile(path.join(distDir, "search.json"), "utf-8"),
      );
      const page = index.pages.find((entry) => entry.url === "/summary-marker");
      assert.strictEqual(
        page.summary,
        "This paragraph is the deliberate excerpt.",
      );
      assert.ok(!page.summary.includes("must not"));
    });

    it("should render deterministic related pages from shared tags", async () => {
      const content = await fs.readFile(
        path.join(distDir, "blog", "first-post", "index.html"),
        "utf-8",
      );
      const related = content.match(
        /<aside class="related">([\s\S]*?)<\/aside>/,
      )?.[1];
      assert.ok(related);
      assert.ok(related.includes('href="/blog/second-post"'));
      assert.ok(!related.includes('href="/blog/first-post"'));
    });
  });

  describe("Navigation", () => {
    it("should generate breadcrumbs", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "first-post", "index.html"), "utf-8");
      assert.ok(content.includes("breadcrumbs"), "should have breadcrumbs container");
      assert.ok(content.includes('href="/"'), "breadcrumbs should include home link");
    });

    it("should use front matter titles in breadcrumbs", async () => {
      const content = await fs.readFile(path.join(distDir, "about-mi", "index.html"), "utf-8");
      assert.ok(content.includes(">About Me</a>"), "breadcrumb should use front matter title");
      assert.ok(!content.includes(">About Mi</a>"), "breadcrumb should not use capitalized filename");
    });

    it("should generate nav_links for top-level pages", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      // Nav links should include about, contact, blog, docs
      assert.ok(
        content.includes('href="/about"') || content.includes('href="/blog"'),
        "should have navigation links"
      );
    });

    it("should keep the global navigation index in root page order", async () => {
      const { generatePages, pageIndex } = await import("../src/pages.js");
      const pages = await generatePages(path.join(testDir, "pages"));
      assert.deepStrictEqual(
        pageIndex.filter((page) => page.nav).map((page) => page.url),
        pages.filter((page) => page.nav).map((page) => page.url),
      );
    });
  });

  describe("Page Ordering", () => {
    it("should sort positioned and dated pages transitively", async () => {
      const { comparePages } = await import("../src/pages.js");
      const page = (route, options = {}) => ({
        route,
        meta: options.position === undefined ? {} : { position: options.position },
        dateObj: options.date ? new Date(options.date) : undefined,
        createdAtObj: new Date(options.date || 0),
      });
      const pages = [
        page("/newest", { date: "2025-01-01" }),
        page("/position-two", { position: 2, date: "2026-01-01" }),
        page("/oldest", { date: "2020-01-01" }),
        page("/position-zero", { position: 0, date: "2019-01-01" }),
      ];

      pages.sort((a, b) => comparePages(a, b, "desc"));
      assert.deepStrictEqual(
        pages.map((item) => item.route),
        ["/position-zero", "/position-two", "/newest", "/oldest"],
      );
    });

    it("should use routes as stable tie-breakers", async () => {
      const { comparePages } = await import("../src/pages.js");
      const date = new Date("2024-01-01");
      const pages = [
        { route: "/b", meta: {}, createdAtObj: date },
        { route: "/a", meta: {}, createdAtObj: date },
      ];

      pages.sort((a, b) => comparePages(a, b));
      assert.deepStrictEqual(pages.map((page) => page.route), ["/a", "/b"]);
    });
  });

  describe("Child Links", () => {
    it("should generate links_to_children for blog index", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "index.html"), "utf-8");
      assert.ok(content.includes("First Blog Post") || content.includes("first-post"), "should list first post");
      assert.ok(content.includes("Second Blog Post") || content.includes("second-post"), "should list second post");
    });

    it("should generate links_to_children for docs index", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "index.html"), "utf-8");
      assert.ok(content.includes("Getting Started") || content.includes("getting-started"), "should list getting started");
    });

    it("should use the parent section partial for sibling link lists", async () => {
      const {
        addLinks,
        createLinkListCache,
        generatePages,
      } = await import("../src/pages.js");
      const pages = await generatePages(path.join(testDir, "pages"));
      const cache = createLinkListCache();
      await addLinks(pages, undefined, cache);
      const blog = pages.find((page) => page.filename === "blog");
      const firstPost = blog.pages.find((page) => page.filename === "first-post");

      assert.strictEqual(firstPost.parent.filename, "blog");
      assert.ok(firstPost.meta.links_to_siblings.includes('class="blog-section-link"'));
      assert.ok(firstPost.meta.links_to_self_and_siblings.includes('class="blog-section-link"'));
      assert.ok(cache.stats.listHits > 0, "addLinks should reuse complete page sets");
      assert.ok(cache.stats.itemHits > 0, "addLinks should reuse rendered page items");
    });

    it("should render each partial/page pair once across overlapping sibling lists", async () => {
      const {
        createLinkListCache,
        generateLinkList,
      } = await import("../src/pages.js");
      const pages = Array.from({ length: 250 }, (_, index) => ({
        filename: `post-${index}`,
        title: `Post ${index}`,
        url: `/posts/post-${index}`,
        meta: {},
      }));
      const cache = createLinkListCache();

      const allLinks = await generateLinkList("blog", pages, cache);
      const siblingLinks = await Promise.all(
        pages.map((page) =>
          generateLinkList(
            "blog",
            pages.filter((candidate) => candidate !== page),
            cache,
          ),
        ),
      );
      const repeatedAllLinks = await generateLinkList("blog", pages, cache);

      assert.strictEqual(repeatedAllLinks, allLinks);
      assert.ok(allLinks.includes('href="/posts/post-249"'));
      assert.ok(!siblingLinks[0].includes('href="/posts/post-0"'));
      assert.ok(siblingLinks[0].includes('href="/posts/post-249"'));
      assert.strictEqual(cache.stats.partialReads, 1);
      assert.strictEqual(cache.stats.itemRenders, pages.length);
      assert.strictEqual(cache.stats.listRenders, pages.length + 1);
      assert.ok(cache.stats.itemHits >= pages.length * (pages.length - 1));
      assert.ok(cache.stats.listHits >= 1);
    });
  });

  describe("RSS Feeds", () => {
    it("should generate RSS feed for blog folder", async () => {
      const rssPath = path.join(distDir, "blog", "rss.xml");
      const exists = await fsExtra.pathExists(rssPath);
      assert.strictEqual(exists, true, "blog/rss.xml should exist");
    });

    it("should generate RSS feed for docs folder", async () => {
      const rssPath = path.join(distDir, "docs", "rss.xml");
      const exists = await fsExtra.pathExists(rssPath);
      assert.strictEqual(exists, true, "docs/rss.xml should exist");
    });

    it("should have valid RSS XML structure", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(content.includes('<?xml version="1.0"'), "should have XML declaration");
      assert.ok(content.includes("<rss"), "should have rss element");
      assert.ok(content.includes("<channel>"), "should have channel element");
      assert.ok(content.includes("</channel>"), "should close channel element");
      assert.ok(content.includes("</rss>"), "should close rss element");
    });

    it("should include feed title and link", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(content.includes("<title>"), "should have title element");
      assert.ok(content.includes("<link>"), "should have link element");
      assert.ok(content.includes("https://example.com"), "should include site URL");
    });

    it("should include blog posts as items", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(content.includes("<item>"), "should have item elements");
      assert.ok(content.includes("First Blog Post"), "should include first post title");
      assert.ok(content.includes("Second Blog Post"), "should include second post title");
    });

    it("should include item URLs with site URL prefix", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(content.includes("https://example.com/blog/first-post"), "should have full URL for first post");
    });

    it("should include pubDate for items", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(content.includes("<pubDate>"), "should have pubDate elements");
      assert.ok(!content.includes("Invalid Date"), "should not contain invalid dates");
      assert.ok(
        content.includes("<pubDate>Tue, 20 Feb 2024 00:00:00 GMT</pubDate>"),
        "should use the machine-readable front matter date",
      );
    });

    it("should sort feed items using machine-readable dates", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(
        content.indexOf("Second Blog Post") < content.indexOf("First Blog Post"),
        "newer posts should appear first",
      );
      assert.ok(
        content.includes("<lastBuildDate>Tue, 20 Feb 2024 00:00:00 GMT</lastBuildDate>"),
        "lastBuildDate should use the newest feed item",
      );
    });

    it("should normalize rendered Markdown in item descriptions", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      const firstPost = content.match(
        /<title>First Blog Post<\/title>[\s\S]*?<description>(.*?)<\/description>/,
      )?.[1];

      assert.ok(firstPost.includes("My First Post"));
      assert.ok(firstPost.includes("JavaScript"));
      assert.ok(!firstPost.includes("#"));
      assert.ok(!firstPost.includes("**"));
    });

    it("should reject impossible calendar dates", async () => {
      const { parseDate } = await import("../src/pages.js");
      assert.strictEqual(parseDate("32/01/2024"), null);
      assert.strictEqual(parseDate("29/02/2023"), null);
      assert.strictEqual(parseDate(new Date("invalid")), null);
      assert.strictEqual(parseDate("29/02/2024").getDate(), 29);
    });

    it("should include guid for items", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(content.includes("<guid"), "should have guid elements");
    });

    it("should use custom title from config", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "rss.xml"), "utf-8");
      assert.ok(content.includes("Documentation Updates"), "should use custom title from config");
    });

    it("should use custom description from config", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "rss.xml"), "utf-8");
      assert.ok(content.includes("Latest documentation changes"), "should use custom description from config");
    });

    it("should include atom:link for feed self-reference", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "rss.xml"), "utf-8");
      assert.ok(content.includes("atom:link"), "should have atom:link for self-reference");
      assert.ok(content.includes('rel="self"'), "should have rel=self attribute");
    });
  });

  describe("SEO Files", () => {
    it("should generate sitemap.xml", async () => {
      const sitemapPath = path.join(distDir, "sitemap.xml");
      const exists = await fsExtra.pathExists(sitemapPath);
      assert.strictEqual(exists, true, "sitemap.xml should exist");
    });

    it("should include site URLs in sitemap.xml", async () => {
      const content = await fs.readFile(path.join(distDir, "sitemap.xml"), "utf-8");
      assert.ok(content.includes("<urlset"), "should have urlset element");
      assert.ok(content.includes("https://example.com/about"), "should include full page URL");
      assert.ok(content.includes("https://example.com/blog/first-post"), "should include nested page URL");
    });

    it("should generate robots.txt with sitemap reference", async () => {
      const content = await fs.readFile(path.join(distDir, "robots.txt"), "utf-8");
      assert.ok(content.includes("User-agent: *"), "should include default user agent");
      assert.ok(content.includes("Allow: /"), "should allow crawling by default");
      assert.ok(content.includes("Sitemap: https://example.com/sitemap.xml"), "should reference sitemap");
    });

    it("should not parse locale-formatted display dates for lastmod", async () => {
      const { generateSitemapXml } = await import("../src/sitemap.js");
      const sitemap = generateSitemapXml(
        [{ url: "/display-only", updated_at: "2024-01-02", meta: {} }],
        "https://example.com",
      );
      assert.ok(!sitemap.includes("<lastmod>"));
    });
  });

  describe("Search Index", () => {
    it("should generate a versioned JSON search index", async () => {
      const index = JSON.parse(
        await fs.readFile(path.join(distDir, "search.json"), "utf-8"),
      );

      assert.strictEqual(index.version, 1);
      assert.ok(Array.isArray(index.pages));
      assert.ok(index.pages.length > 0);
    });

    it("should ship a drop-in search partial and client", async () => {
      const home = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(home.includes("data-swifty-search"));
      assert.ok(home.includes('data-index-url="/search.json"'));
      assert.ok(
        /src="\/swifty\/swifty-search\.[a-f0-9]{10}\.js"/.test(home),
      );
      const files = await fs.readdir(path.join(distDir, "swifty"));
      const clientName = files.find((file) => /^swifty-search\..+\.js$/.test(file));
      const client = await fs.readFile(
        path.join(distDir, "swifty", clientName),
        "utf-8",
      );
      assert.ok(client.includes('textContent = page.title'));
      assert.ok(client.includes('"swifty:load"'));
    });

    it("should include normalized page content, summaries, and tags", async () => {
      const index = JSON.parse(
        await fs.readFile(path.join(distDir, "search.json"), "utf-8"),
      );
      const about = index.pages.find((page) => page.url === "/about");
      const featured = index.pages.find((page) => page.url === "/featured");

      assert.ok(about.content.includes("Feature one"));
      assert.ok(!about.content.includes("<"), "search text should not contain HTML tags");
      assert.strictEqual(
        featured.summary,
        "This is a featured article with full Open Graph metadata",
      );
      assert.deepStrictEqual(featured.tags, ["featured", "article"]);
    });

    it("should cap normalized entry content without truncating weighted metadata", async () => {
      const { createSearchEntry } = await import("../src/search.js");
      const summary = "An authored summary that remains independently searchable";
      const entry = await createSearchEntry({
        content: `Useful opening phrase ${"long content ".repeat(30)}trailing marker`,
        meta: {
          search_content_limit: 80,
          summary,
          tags: ["Long Form", "Reference"],
          title: "Complete Search Title",
        },
        title: "Complete Search Title",
        url: "/long-entry",
      });

      assert.ok(entry.content.length <= 80);
      assert.ok(entry.content.startsWith("Useful opening phrase"));
      assert.ok(!entry.content.includes("trailing marker"));
      assert.strictEqual(entry.title, "Complete Search Title");
      assert.strictEqual(entry.summary, summary);
      assert.deepStrictEqual(entry.tags, ["Long Form", "Reference"]);
    });

    it("should exclude generated, paginated, 404, and opted-out pages", async () => {
      const index = JSON.parse(
        await fs.readFile(path.join(distDir, "search.json"), "utf-8"),
      );
      const urls = index.pages.map((page) => page.url);

      assert.ok(urls.includes("/blog"), "authored folder index should be searchable");
      assert.ok(!urls.includes("/posts"), "automatic folder listing should be excluded");
      assert.ok(!urls.some((url) => url.startsWith("/posts/page/")));
      assert.ok(!urls.some((url) => url.startsWith("/tags")));
      assert.ok(!urls.includes("/404.html"));
      assert.ok(!urls.includes("/search-hidden"));
    });

    it("should support disabling search index generation", async () => {
      const outputDir = path.join(testDir, "search-disabled-output");
      const { defaultConfig } = await import("../src/config.js");
      const { generateSearchIndex } = await import("../src/search.js");
      const previous = defaultConfig.search;

      try {
        defaultConfig.search = false;
        assert.strictEqual(await generateSearchIndex([], outputDir), false);
        assert.strictEqual(
          await fsExtra.pathExists(path.join(outputDir, "search.json")),
          false,
        );
      } finally {
        defaultConfig.search = previous;
        await fsExtra.remove(outputDir);
      }
    });

    it("should reserve search.json from authored routes", async () => {
      const outputDir = path.join(testDir, "search-collision-output");
      const { generateSearchIndex } = await import("../src/search.js");

      try {
        await assert.rejects(
          () =>
            generateSearchIndex(
              [
                {
                  content: "Reserved",
                  filePath: path.join(testDir, "pages", "reserved.md"),
                  folder: false,
                  meta: {},
                  route: "/search.json",
                  title: "Reserved",
                  url: "/search.json",
                },
              ],
              outputDir,
            ),
          /reserved for the generated search index/,
        );
      } finally {
        await fsExtra.remove(outputDir);
      }
    });

    it("should replace a previously generated index", async () => {
      const outputDir = path.join(testDir, "search-repeat-output");
      const { generateSearchIndex } = await import("../src/search.js");

      try {
        await generateSearchIndex([], outputDir);
        await generateSearchIndex([], outputDir);
        const index = JSON.parse(
          await fs.readFile(path.join(outputDir, "search.json"), "utf-8"),
        );
        assert.deepStrictEqual(index.pages, []);
      } finally {
        await fsExtra.remove(outputDir);
      }
    });
  });

  describe("Pagination", () => {
    it("should create first page at folder index", async () => {
      const exists = await fsExtra.pathExists(path.join(distDir, "posts", "index.html"));
      assert.strictEqual(exists, true, "posts/index.html should exist");
    });

    it("should create pagination pages for page 2 and 3", async () => {
      const page2Exists = await fsExtra.pathExists(path.join(distDir, "posts", "page", "2", "index.html"));
      const page3Exists = await fsExtra.pathExists(path.join(distDir, "posts", "page", "3", "index.html"));
      assert.strictEqual(page2Exists, true, "posts/page/2/index.html should exist");
      assert.strictEqual(page3Exists, true, "posts/page/3/index.html should exist");
    });

    it("should limit first page to page_count items", async () => {
      const content = await fs.readFile(path.join(distDir, "posts", "index.html"), "utf-8");
      // With page_count: 2, first page should have posts 1 and 2 (check URLs)
      assert.ok(content.includes("/posts/post-1"), "should include post 1");
      assert.ok(content.includes("/posts/post-2"), "should include post 2");
      assert.ok(!content.includes("/posts/post-3"), "should not include post 3 on first page");
    });

    it("should show correct items on page 2", async () => {
      const content = await fs.readFile(path.join(distDir, "posts", "page", "2", "index.html"), "utf-8");
      assert.ok(content.includes("/posts/post-3"), "should include post 3");
      assert.ok(content.includes("/posts/post-4"), "should include post 4");
      assert.ok(!content.includes("/posts/post-1"), "should not include post 1 on page 2");
    });

    it("should show correct items on page 3", async () => {
      const content = await fs.readFile(path.join(distDir, "posts", "page", "3", "index.html"), "utf-8");
      assert.ok(content.includes("/posts/post-5"), "should include post 5");
      assert.ok(!content.includes("/posts/post-1"), "should not include post 1 on page 3");
    });

    it("should include pagination navigation on first page", async () => {
      const content = await fs.readFile(path.join(distDir, "posts", "index.html"), "utf-8");
      assert.ok(content.includes('class="swifty_pagination"'), "should have pagination nav");
      assert.ok(content.includes("/posts/page/2/"), "should link to page 2");
    });

    it("should include pagination navigation on page 2", async () => {
      const content = await fs.readFile(path.join(distDir, "posts", "page", "2", "index.html"), "utf-8");
      assert.ok(content.includes("/posts/"), "should link back to first page");
      assert.ok(content.includes("/posts/page/3/"), "should link to page 3");
    });

    it("should keep pagination disabled until page_count is explicitly set", async () => {
      const folderPath = path.join(testDir, "pages", "unpaginated");
      const { defaultConfig } = await import("../src/config.js");
      const { generatePages } = await import("../src/pages.js");

      try {
        await fsExtra.ensureDir(folderPath);
        await Promise.all(
          [1, 2, 3].map((number) =>
            fs.writeFile(
              path.join(folderPath, `page-${number}.md`),
              `---\ntitle: Unpaginated ${number}\n---\nPage ${number}`,
            ),
          ),
        );
        const pages = await generatePages(path.join(testDir, "pages"));
        const folder = pages.find((page) => page.filename === "unpaginated");

        assert.strictEqual(
          Object.prototype.hasOwnProperty.call(defaultConfig, "default_page_count"),
          false,
        );
        assert.strictEqual(folder.paginatedPages, undefined);
        assert.strictEqual(folder.pages.length, 3);
      } finally {
        await fsExtra.remove(folderPath);
      }
    });

    it("should include all posts in RSS feed despite pagination", async () => {
      const content = await fs.readFile(path.join(distDir, "posts", "rss.xml"), "utf-8");
      assert.ok(content.includes("Post Number 1"), "RSS should include post 1");
      assert.ok(content.includes("Post Number 3"), "RSS should include post 3");
      assert.ok(content.includes("Post Number 5"), "RSS should include post 5");
    });
  });

  describe("Data Folder", () => {
    it("should load data from JSON files", async () => {
      const content = await fs.readFile(path.join(distDir, "team", "index.html"), "utf-8");
      assert.ok(content.includes("Alice"), "should include team member Alice");
      assert.ok(content.includes("Developer"), "should include Alice's role");
    });

    it("should support loops over data", async () => {
      const content = await fs.readFile(path.join(distDir, "team", "index.html"), "utf-8");
      assert.ok(content.includes("Bob"), "should include team member Bob");
      assert.ok(content.includes("Designer"), "should include Bob's role");
    });
  });

  describe("Open Graph Tags", () => {
    it("should generate og:title meta tag", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('og:title'), "should have og:title");
      assert.ok(content.includes("Featured Article"), "should include page title");
    });

    it("should generate og:site_name meta tag", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('og:site_name'), "should have og:site_name");
      assert.ok(content.includes("Test Site"), "should include sitename");
    });

    it("should generate og:url with full URL", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('og:url'), "should have og:url");
      assert.ok(content.includes("https://example.com/featured"), "should have full URL");
    });

    it("should generate og:description from front matter", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('og:description'), "should have og:description");
      assert.ok(content.includes("featured article with full Open Graph"), "should include description");
    });

    it("should generate og:image from front matter", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('og:image'), "should have og:image");
      assert.ok(content.includes("/images/featured"), "should include image path");
    });

    it("should rewrite local og:image/twitter:image to WebP to match optimized output", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(
        /property="og:image" content="[^"]*\/images\/featured\.webp"/.test(content),
        "og:image should point to the optimized .webp file",
      );
      assert.ok(
        /name="twitter:image" content="[^"]*\/images\/featured\.webp"/.test(content),
        "twitter:image should point to the optimized .webp file",
      );
      assert.ok(
        !/content="[^"]*\/images\/featured\.(jpg|jpeg|png)"/.test(content),
        "should not reference the non-existent original image extension",
      );
    });

    it("should generate og:type as article for pages", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('og:type'), "should have og:type");
      assert.ok(content.includes('content="article"'), "should be article type");
    });

    it("should generate twitter:card meta tag", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('twitter:card'), "should have twitter:card");
      assert.ok(content.includes("summary_large_image"), "should be summary_large_image when image exists");
    });

    it("should use default_og_image when a page has no image", async () => {
      const content = await fs.readFile(path.join(distDir, "about", "index.html"), "utf-8");
      assert.ok(
        /property="og:image" content="https:\/\/example\.com\/images\/default-og\.webp"/.test(content),
        "og:image should use the fallback image",
      );
      assert.ok(
        /name="twitter:image" content="https:\/\/example\.com\/images\/default-og\.webp"/.test(content),
        "twitter:image should use the fallback image",
      );
    });

    it("should omit relative social images when site_url is unavailable", async () => {
      const { generateOgTags } = await import("../src/partials.js");
      const content = generateOgTags({
        meta: { image: "/images/featured.jpg", site_url: "" },
        url: "/featured",
      });

      assert.ok(!content.includes('property="og:image"'));
      assert.ok(!content.includes('name="twitter:image"'));
      assert.ok(content.includes('content="summary"'));
    });

    it("should resolve local social images with site_url and base_path", async () => {
      const { generateOgTags } = await import("../src/partials.js");
      const content = generateOgTags({
        meta: {
          image: "/images/featured.jpg",
          site_url: "https://example.com",
          base_path: "/project",
        },
        url: "/featured",
      });

      assert.ok(
        content.includes(
          'property="og:image" content="https://example.com/project/images/featured.webp"',
        ),
      );
    });

    it("should generate article:tag for each tag", async () => {
      const content = await fs.readFile(path.join(distDir, "featured", "index.html"), "utf-8");
      assert.ok(content.includes('article:tag'), "should have article:tag");
      assert.ok(content.includes("featured"), "should include featured tag");
      assert.ok(content.includes("article"), "should include article tag");
    });
  });

  describe("Image Reference Rewriting", () => {
    it("should rewrite local markdown image sources to WebP", async () => {
      const content = await fs.readFile(path.join(distDir, "images", "index.html"), "utf-8");
      assert.ok(content.includes('src="/images/photo.webp"'), "local image src should point to WebP");
    });

    it("should add srcset and sizes for responsive local images", async () => {
      const content = await fs.readFile(path.join(distDir, "images", "index.html"), "utf-8");
      assert.ok(content.includes('src="/images/hero.webp"'), "large image src should point to default WebP");
      assert.ok(
        /srcset="\/images\/hero-320\.webp 320w, \/images\/hero-640\.webp 640w, \/images\/hero\.webp 800w"/.test(content),
        "large image should include responsive WebP srcset",
      );
      assert.ok(content.includes('sizes="100vw"'), "large image should include default sizes");
    });

    it("should not rewrite external image URLs, favicon links, or prose", async () => {
      const content = await fs.readFile(path.join(distDir, "images", "index.html"), "utf-8");
      assert.ok(content.includes('src="https://cdn.example.com/remote.jpg"'), "external image URL should stay unchanged");
      assert.ok(content.includes('href="/images/favicon.png"'), "favicon href should stay unchanged");
      assert.ok(content.includes("report.png"), "prose filename should stay unchanged");
    });

    it("should rewrite local image download links to WebP", async () => {
      const content = await fs.readFile(path.join(distDir, "images", "index.html"), "utf-8");
      assert.ok(content.includes('href="/images/photo.webp"'), "local image anchor should point to WebP");
    });
  });

  describe("Word Count and Reading Time", () => {
    it("should calculate word_count for pages", async () => {
      const content = await fs.readFile(path.join(distDir, "long-article", "index.html"), "utf-8");
      // The long article has ~400+ words
      assert.ok(content.includes("words"), "should show word count");
      // Extract the word count number
      const match = content.match(/(\d+)\s*words/);
      assert.ok(match, "should have word count number");
      const wordCount = parseInt(match[1], 10);
      assert.ok(wordCount > 100, "should have significant word count");
    });

    it("should calculate reading_time for pages", async () => {
      const content = await fs.readFile(path.join(distDir, "long-article", "index.html"), "utf-8");
      assert.ok(content.includes("min read"), "should show reading time");
    });

    it("should show 1 min read for short content", async () => {
      const content = await fs.readFile(path.join(distDir, "about", "index.html"), "utf-8");
      // Short page should be 1 min read
      assert.ok(content.includes("min read"), "should show reading time");
    });
  });

  describe("Build Diagnostics", () => {
    it("should reject malformed configuration with its file path", async () => {
      const invalidDir = path.join(testDir, "invalid-config");
      const invalidPath = path.join(invalidDir, "config.yaml");
      const { loadConfig } = await import("../src/config.js");
      await fsExtra.ensureDir(invalidDir);
      await fs.writeFile(invalidPath, "base_path: [unterminated");

      await assert.rejects(() => loadConfig(invalidDir), /invalid-config.*config\.yaml/);
    });

    it("should reject malformed data instead of silently skipping it", async () => {
      const invalidPath = path.join(testDir, "data", "broken.json");
      const { clearDataCache, loadData } = await import("../src/data.js");

      try {
        await fs.writeFile(invalidPath, '{"broken":');
        clearDataCache();
        await assert.rejects(() => loadData(), /broken\.json/);
      } finally {
        await fsExtra.remove(invalidPath);
        clearDataCache();
      }
    });

    it("should reject malformed front matter with its source path", async () => {
      const invalidPath = path.join(testDir, "pages", "broken.md");
      const { generatePages } = await import("../src/pages.js");

      try {
        await fs.writeFile(invalidPath, "---\ntitle: [unterminated\n---\nBroken");
        await assert.rejects(
          () => generatePages(path.join(testDir, "pages")),
          /broken\.md/,
        );
      } finally {
        await fsExtra.remove(invalidPath);
      }
    });

    it("should reject invalid front matter dates with their source path", async () => {
      const invalidPath = path.join(testDir, "pages", "invalid-date.md");
      const { generatePages } = await import("../src/pages.js");

      try {
        await fs.writeFile(invalidPath, "---\ndate: 32/01/2024\n---\nBroken date");
        await assert.rejects(
          () => generatePages(path.join(testDir, "pages")),
          /Invalid date.*invalid-date\.md/,
        );
      } finally {
        await fsExtra.remove(invalidPath);
      }
    });

    it("should reject Eta errors and missing partials", async () => {
      const { replacePlaceholders } = await import("../src/partials.js");

      await assert.rejects(
        () => replacePlaceholders("<% if ( %>", { url: "/broken" }),
        /Unable to render \/broken/,
      );
      await assert.rejects(
        () => replacePlaceholders("<%= partial: missing %>", { url: "/broken" }),
        /Partial "missing" was not found/,
      );
    });
  });

  describe("Development Server", () => {
    it("should resolve pretty URLs and the generated 404 page", async () => {
      const { defaultConfig } = await import("../src/config.js");
      const { readResponseFile } = await import("../src/server.js");
      const previousBasePath = defaultConfig.base_path;
      defaultConfig.base_path = "/project";

      try {
        const pageResponse = await readResponseFile(
          path.resolve(distDir),
          "/project/about",
        );
        const missingResponse = await readResponseFile(
          path.resolve(distDir),
          "/project/missing",
        );

        assert.strictEqual(pageResponse.status, 200);
        assert.ok(pageResponse.body.toString().includes("About Us"));
        assert.strictEqual(missingResponse.status, 404);
        assert.ok(missingResponse.body.toString().includes("Page Not Found"));
      } finally {
        defaultConfig.base_path = previousBasePath;
      }
    });

    it("should resolve extensionless public files", async () => {
      const { readResponseFile } = await import("../src/server.js");
      const extensionlessPath = path.join(distDir, "security");
      await fs.writeFile(extensionlessPath, "contact@example.com");

      const response = await readResponseFile(path.resolve(distDir), "/security");

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.toString(), "contact@example.com");
    });
  });

  describe("Incremental Page Rebuilds", () => {
    it("should rebuild a body-only page and derived indexes without rebuilding other pages", async () => {
      const pagePath = path.join(testDir, "pages", "about.md");
      const outputPath = path.join(distDir, "about", "index.html");
      const homePath = path.join(distDir, "index.html");
      const originalSource = await fs.readFile(pagePath, "utf-8");
      const originalHome = await fs.readFile(homePath, "utf-8");
      const buildModule = await import("../src/build.js");

      try {
        await fs.writeFile(
          pagePath,
          `${originalSource}\n\nIncremental rebuild marker text.`,
        );
        const result = await buildModule.rebuildPage(pagePath, distDir);
        assert.strictEqual(result.rebuilt, true, result.reason);
        assert.ok(
          (await fs.readFile(outputPath, "utf-8")).includes(
            "Incremental rebuild marker text.",
          ),
        );
        assert.strictEqual(await fs.readFile(homePath, "utf-8"), originalHome);

        const index = JSON.parse(
          await fs.readFile(path.join(distDir, "search.json"), "utf-8"),
        );
        assert.ok(
          index.pages
            .find((page) => page.url === "/about")
            .content.includes("Incremental rebuild marker text"),
        );
      } finally {
        await fs.writeFile(pagePath, originalSource);
        await buildModule.default("dist");
      }
    });

    it("should require a full build when page metadata changes", async () => {
      const pagePath = path.join(testDir, "pages", "about.md");
      const originalSource = await fs.readFile(pagePath, "utf-8");
      const buildModule = await import("../src/build.js");

      try {
        await fs.writeFile(
          pagePath,
          originalSource.replace("title: About Us", "title: Changed Title"),
        );
        const result = await buildModule.rebuildPage(pagePath, distDir);
        assert.strictEqual(result.rebuilt, false);
        assert.strictEqual(result.requiresFullBuild, true);
        assert.match(result.reason, /metadata/);
      } finally {
        await fs.writeFile(pagePath, originalSource);
      }
    });
  });

  describe("Site Checker", () => {
    it("should pass a valid generated site without writing to dist", async () => {
      const { checkSite } = await import("../src/check.js");
      const before = await fs.readFile(path.join(distDir, "index.html"), "utf-8");

      const report = await checkSite();

      assert.strictEqual(
        report.ok,
        true,
        report.issues
          .map(
            (issue) =>
              `${issue.code}: ${issue.message} (${issue.source}: ${issue.reference})`,
          )
          .join("\n"),
      );
      assert.ok(report.counts.routes > 0);
      assert.strictEqual(
        await fs.readFile(path.join(distDir, "index.html"), "utf-8"),
        before,
        "check should not alter the configured output directory",
      );
    });

    it("should report duplicate routes", async () => {
      const duplicatePath = path.join(testDir, "pages", "duplicate.md");
      const { CHECK_CODES, checkSite } = await import("../src/check.js");

      try {
        await fs.writeFile(
          duplicatePath,
          `---\ntitle: Duplicate\nlayout: default\npermalink: /about\n---\nDuplicate`,
        );
        const report = await checkSite();
        const issue = report.issues.find(
          (candidate) => candidate.code === CHECK_CODES.DUPLICATE_ROUTE,
        );

        assert.ok(issue, "duplicate route should be reported");
        assert.ok(issue.message.includes("about/index.html"));
      } finally {
        await fsExtra.remove(duplicatePath);
      }
    });

    it("should report broken links, missing images, and invalid canonical URLs", async () => {
      const brokenPath = path.join(testDir, "pages", "check-links.md");
      const { CHECK_CODES, checkSite } = await import("../src/check.js");

      try {
        await fs.writeFile(
          brokenPath,
          `---\ntitle: Checker Links\nlayout: default\n---
# Checker Links

[Missing page](/does-not-exist)
[Missing anchor](/about#does-not-exist)
![Missing image](/images/does-not-exist.png)
<link rel="canonical" href="/relative-canonical">`,
        );
        const report = await checkSite();

        assert.ok(
          report.issues.some(
            (issue) =>
              issue.code === CHECK_CODES.BROKEN_LINK &&
              issue.reference === "/does-not-exist",
          ),
        );
        assert.ok(
          report.issues.some(
            (issue) =>
              issue.code === CHECK_CODES.BROKEN_LINK &&
              issue.reference === "/about#does-not-exist",
          ),
        );
        assert.ok(
          report.issues.some(
            (issue) =>
              issue.code === CHECK_CODES.MISSING_IMAGE &&
              issue.reference.includes("does-not-exist.webp"),
          ),
        );
        assert.ok(
          report.issues.some(
            (issue) => issue.code === CHECK_CODES.INVALID_CANONICAL,
          ),
        );
      } finally {
        await fsExtra.remove(brokenPath);
      }
    });

    it("should report missing partials and explicitly requested layouts", async () => {
      const brokenPath = path.join(testDir, "pages", "check-template.md");
      const { CHECK_CODES, checkSite } = await import("../src/check.js");

      try {
        await fs.writeFile(
          brokenPath,
          `---\ntitle: Checker Template\nlayout: absent-layout\n---\n<%= partial: absent-partial %>`,
        );
        const report = await checkSite();

        assert.ok(
          report.issues.some(
            (issue) => issue.code === CHECK_CODES.MISSING_LAYOUT,
          ),
        );
        assert.ok(
          report.issues.some(
            (issue) => issue.code === CHECK_CODES.MISSING_PARTIAL,
          ),
        );
      } finally {
        await fsExtra.remove(brokenPath);
      }
    });

    it("should report malformed nested configuration", async () => {
      const configDir = path.join(testDir, "pages", "check-config");
      const { CHECK_CODES, checkSite } = await import("../src/check.js");

      try {
        await fsExtra.ensureDir(configDir);
        await fs.writeFile(path.join(configDir, "config.yaml"), "page_count: -1");
        const report = await checkSite();

        assert.ok(
          report.issues.some(
            (issue) =>
              issue.code === CHECK_CODES.CONFIG &&
              issue.source.endsWith("check-config/config.yaml"),
          ),
        );
      } finally {
        await fsExtra.remove(configDir);
      }
    });

    it("should validate canonical URLs and bounded numeric configuration", async () => {
      const { canonicalUrlError } = await import("../src/check.js");
      const { validateConfig } = await import("../src/config.js");

      assert.strictEqual(canonicalUrlError("https://example.com/page"), null);
      assert.ok(canonicalUrlError("/relative"));
      assert.throws(() => validateConfig({ page_count: -1 }), /positive integer/);
      assert.throws(() => validateConfig({ image_quality: 101 }), /1 to 100/);
      assert.throws(() => validateConfig({ date_locale: "not_a_locale" }), /valid locale/);
      assert.throws(() => validateConfig({ timezone: "Moon/Base" }), /valid IANA timezone/);
      assert.throws(
        () => validateConfig({ watcher_use_polling: "yes" }),
        /must be a boolean/,
      );
      assert.throws(
        () => validateConfig({ highlight_theme: "../../outside" }),
        /bundled highlight\.js theme name/,
      );
      assert.throws(
        () => validateConfig({ highlight_theme: "does-not-exist" }),
        /not bundled with highlight\.js/,
      );
      assert.throws(
        () => validateConfig({ search_content_limit: 0 }),
        /positive integer/,
      );
      assert.throws(
        () => validateConfig({ rss_feeds: ["../outside"] }),
        /safe relative folder paths/,
      );
    });

    it("should use native watcher events by default and make polling opt-in", async () => {
      const { createLiveReloadOptions, createWatcherOptions } = await import(
        "../src/watcher.js"
      );

      assert.deepStrictEqual(
        createWatcherOptions({ watcher_delay: 100, watcher_interval: 750 }),
        {
          persistent: true,
          ignoreInitial: true,
          usePolling: false,
          awaitWriteFinish: {
            stabilityThreshold: 200,
            pollInterval: 100,
          },
        },
      );
      assert.strictEqual(
        createLiveReloadOptions({}).usePolling,
        false,
      );
      assert.strictEqual(
        createWatcherOptions({
          watcher_delay: 100,
          watcher_interval: 750,
          watcher_use_polling: true,
        }).interval,
        750,
      );
      assert.strictEqual(
        createLiveReloadOptions({ watcher_use_polling: true }).usePolling,
        true,
      );
    });

    it("should explain why local social images need site_url", async () => {
      const { CHECK_CODES, collectSocialImageIssues } = await import("../src/check.js");
      const { defaultConfig } = await import("../src/config.js");
      const previousSiteUrl = defaultConfig.site_url;
      const issues = [];

      try {
        delete defaultConfig.site_url;
        collectSocialImageIssues(
          [{ filePath: "/site/pages/social.md", url: "/social", meta: { image: "/images/share.png" } }],
          (issue) => issues.push(issue),
        );
      } finally {
        defaultConfig.site_url = previousSiteUrl;
      }

      assert.strictEqual(issues[0].code, CHECK_CODES.INVALID_SOCIAL_IMAGE);
      assert.match(issues[0].message, /requires an absolute site_url/);
    });
  });

  describe("Package API and Deployment", () => {
    it("should expose a working ESM package entry point", async () => {
      const swifty = await import("../src/index.js");

      assert.strictEqual(typeof swifty.default, "function");
      assert.strictEqual(swifty.default, swifty.build);
      assert.strictEqual(typeof swifty.reloadConfig, "function");
      assert.strictEqual(typeof swifty.checkSite, "function");
      assert.strictEqual(typeof swifty.generateSearchIndex, "function");
    });

    it("should stage only generated output and pass commit messages literally", async () => {
      const { commitAndPushOutput } = await import("../src/cli.js");
      const calls = [];
      const commitMessage = 'Release $(touch unsafe) "quoted"';
      const statuses = [0, 1];

      const deployed = commitAndPushOutput("dist", commitMessage, {
        execFile: (command, args) => calls.push({ command, args }),
        spawnFile: (command, args) => {
          calls.push({ command, args });
          return { status: statuses.shift() };
        },
      });

      assert.strictEqual(deployed, true);
      assert.deepStrictEqual(calls[0], {
        command: "git",
        args: ["diff", "--cached", "--quiet"],
      });
      assert.deepStrictEqual(calls[1], {
        command: "git",
        args: ["add", "--", "dist"],
      });
      assert.deepStrictEqual(calls[3], {
        command: "git",
        args: ["commit", "-m", commitMessage],
      });
      assert.deepStrictEqual(calls[4], { command: "git", args: ["push"] });
    });

    it("should not commit or push when generated output is unchanged", async () => {
      const { commitAndPushOutput } = await import("../src/cli.js");
      const calls = [];
      const statuses = [0, 0];

      const deployed = commitAndPushOutput("dist", "No changes", {
        execFile: (command, args) => calls.push({ command, args }),
        spawnFile: () => ({ status: statuses.shift() }),
      });

      assert.strictEqual(deployed, false);
      assert.deepStrictEqual(calls, [
        { command: "git", args: ["add", "--", "dist"] },
      ]);
    });

    it("should refuse to deploy when other changes are already staged", async () => {
      const { commitAndPushOutput } = await import("../src/cli.js");
      let addCalled = false;

      assert.throws(
        () =>
          commitAndPushOutput("dist", "Unsafe deploy", {
            execFile: () => {
              addCalled = true;
            },
            spawnFile: () => ({ status: 1 }),
          }),
        /unrelated changes are already staged/,
      );
      assert.strictEqual(addCalled, false, "output should not be staged after refusal");
    });
  });

  describe("Previous/Next Page Navigation", () => {
    it("should auto-generate next_page link for first sibling", async () => {
      // First post should have next link to second
      const content = await fs.readFile(path.join(distDir, "blog", "first-post", "index.html"), "utf-8");
      assert.ok(content.includes("/blog/second-post"), "first post should link to second post");
    });

    it("should auto-generate prev_page link for last sibling", async () => {
      // Second post (last) should have prev link to first
      const content = await fs.readFile(path.join(distDir, "blog", "second-post", "index.html"), "utf-8");
      assert.ok(content.includes("/blog/first-post"), "second post should link back to first");
    });

    it("should not have prev_page for first sibling", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "first-post", "index.html"), "utf-8");
      // The prev span should be empty (no link inside)
      assert.ok(content.includes('<span class="prev">') &&
                !content.match(/<span class="prev">[^<]*<a/), "first post should have empty prev");
    });

    it("should not have next_page for last sibling", async () => {
      const content = await fs.readFile(path.join(distDir, "blog", "second-post", "index.html"), "utf-8");
      // The next span should be empty (no link inside)
      assert.ok(content.includes('<span class="next">') &&
                !content.match(/<span class="next">[^<]*<a/), "last post should have empty next");
    });

    it("should exclude 404 pages from sibling and previous/next metadata", async () => {
      const { addLinks } = await import("../src/pages.js");
      const pages = [
        { title: "Alpha", name: "Alpha", url: "/alpha", filename: "alpha", folder: false, meta: {} },
        { title: "Page Not Found", name: "Page Not Found", url: "/404", filename: "404", folder: false, notFound: true, meta: {} },
        { title: "Beta", name: "Beta", url: "/beta", filename: "beta", folder: false, meta: {} },
      ];

      await addLinks(pages);

      assert.ok(pages[0].meta.next_page.includes("/beta"), "alpha should link to beta next");
      assert.ok(!pages[0].meta.next_page.includes("/404"), "alpha should not link to 404 next");
      assert.ok(pages[2].meta.prev_page.includes("/alpha"), "beta should link to alpha previous");
      assert.ok(!pages[2].meta.prev_page.includes("/404"), "beta should not link to 404 previous");
      assert.ok(!pages[0].meta.links_to_siblings.includes("/404"), "sibling links should not include 404");
      assert.strictEqual(pages[1].meta.prev_page, "", "404 page should not get a previous link");
      assert.strictEqual(pages[1].meta.next_page, "", "404 page should not get a next link");
    });
  });
});
