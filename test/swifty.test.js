import assert from "assert";
import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDir = path.join(__dirname, "fixtures");
const distDir = path.join(testDir, "dist");

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

This is the home page with a [link to about](/about).`
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
---
# Another Post

This post covers advanced topics.`
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

Regular text <%= title %> should be replaced.`
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
      path.join(testDir, "partials", "htmlnav.html"),
      `<nav class="raw-partial">
  <a href="/about">About</a>

  <button type="button">Menu</button>
</nav>`
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
      `console.log("Swifty site loaded");`
    );

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    );
    await Promise.all([
      fs.writeFile(path.join(testDir, "images", "photo.png"), png),
      fs.writeFile(path.join(testDir, "images", "favicon.png"), png),
      fs.writeFile(path.join(testDir, "images", "default-og.png"), png),
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
default_og_image: /images/default-og.png
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

    it("should create blog directory structure", async () => {
      const blogIndex = await fsExtra.pathExists(path.join(distDir, "blog", "index.html"));
      const firstPost = await fsExtra.pathExists(path.join(distDir, "blog", "first-post", "index.html"));
      const secondPost = await fsExtra.pathExists(path.join(distDir, "blog", "second-post", "index.html"));
      assert.strictEqual(blogIndex, true, "blog index should exist");
      assert.strictEqual(firstPost, true, "first post should exist");
      assert.strictEqual(secondPost, true, "second post should exist");
    });

    it("should create docs directory structure", async () => {
      const docsIndex = await fsExtra.pathExists(path.join(distDir, "docs", "index.html"));
      const gettingStarted = await fsExtra.pathExists(path.join(distDir, "docs", "getting-started", "index.html"));
      assert.strictEqual(docsIndex, true, "docs index should exist");
      assert.strictEqual(gettingStarted, true, "getting-started should exist");
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

    it("should copy Swifty navigation assets when morphing is enabled", async () => {
      const files = await fs.readdir(path.join(distDir, "swifty"));
      const navigationExists = files.some((file) =>
        /^swifty-navigation\.[a-f0-9]{10}\.js$/.test(file),
      );
      const idiomorphExists = await fsExtra.pathExists(path.join(distDir, "swifty", "idiomorph.esm.js"));
      const licenseExists = await fsExtra.pathExists(path.join(distDir, "swifty", "IDIOMORPH-LICENSE.txt"));
      assert.strictEqual(navigationExists, true, "fingerprinted swifty-navigation.js should exist");
      assert.strictEqual(idiomorphExists, true, "idiomorph.esm.js should exist");
      assert.strictEqual(licenseExists, true, "IDIOMORPH-LICENSE.txt should exist");
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
      const { getResponsiveImage, optimizeImages, optimizeSingleImage } = await import("../src/assets.js");
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
      assert.ok(
        /<code class="hljs language-bash">/.test(content),
        "code element should carry the hljs class so the highlight stylesheet applies",
      );
    });
  });

  describe("Front Matter", () => {
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
