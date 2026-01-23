import assert from "assert";
import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
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
    await fsExtra.ensureDir(path.join(testDir, "layouts"));
    await fsExtra.ensureDir(path.join(testDir, "partials"));
    await fsExtra.ensureDir(path.join(testDir, "css"));
    await fsExtra.ensureDir(path.join(testDir, "js"));

    // Create template.html with sitename and nav
    await fs.writeFile(
      path.join(testDir, "template.html"),
      `<!DOCTYPE html>
<html>
<head>
  <title>{{ title }} | {{ sitename }}</title>
</head>
<body>
  <header>
    <h1>{{ sitename }}</h1>
    <nav>{{ nav_links }}</nav>
  </header>
  <nav class="breadcrumbs">{{ breadcrumbs }}</nav>
  {{ content }}
  <footer>{{ partial: footer }}</footer>
</body>
</html>`
    );

    // Create default layout
    await fs.writeFile(
      path.join(testDir, "layouts", "default.html"),
      `<main class="default-layout">{{ content }}</main>`
    );

    // Create blog layout
    await fs.writeFile(
      path.join(testDir, "layouts", "blog.html"),
      `<article class="blog-post">
  <div class="meta">Published: {{ date }}</div>
  <div class="tags">{{ links_to_tags }}</div>
  {{ content }}
</article>`
    );

    // Create index page
    await fs.writeFile(
      path.join(testDir, "pages", "index.md"),
      `---
title: Home Page
layout: default
---
# Welcome to {{ sitename }}

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

This page has a custom variable: {{ custom_var }}

## Features

- Feature one
- Feature two
- Feature three`
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

    // Create blog index
    await fs.writeFile(
      path.join(testDir, "pages", "blog", "index.md"),
      `---
title: Blog
layout: default
---
# Blog Posts

{{ links_to_children }}`
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

{{ links_to_children }}`
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

Then use the {{ sitename }} variable in your templates.`
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
<title>{{ title }}</title>
<p>{{ sitename }}</p>
\`\`\`

Inline code: \`{{ variable }}\` should also be protected.

Regular text {{ title }} should be replaced.`
    );

    // Create footer partial
    await fs.writeFile(
      path.join(testDir, "partials", "footer.md"),
      `Built with {{ sitename }} - A Static Site Generator`
    );

    // Create nav partial for custom nav styling
    await fs.writeFile(
      path.join(testDir, "partials", "nav.md"),
      `- [Home](/)
- [About](/about)
- [Blog](/blog)`
    );

    // Create CSS file
    await fs.writeFile(
      path.join(testDir, "css", "style.css"),
      `body { font-family: sans-serif; }
.blog-post { max-width: 800px; }`
    );

    // Create JS file
    await fs.writeFile(
      path.join(testDir, "js", "main.js"),
      `console.log("Swifty site loaded");`
    );

    // Create config with RSS feeds
    await fs.writeFile(
      path.join(testDir, "config.yaml"),
      `sitename: Test Site
default_layout_name: default
author: Test Author
site_url: https://example.com
rss_feeds:
  - blog
  - folder: docs
    title: Documentation Updates
    description: Latest documentation changes`
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
      assert.ok(content.includes("font-family: sans-serif"));
    });

    it("should inject CSS link in template", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(/href="\/css\/style\.css\?v=\d+"/.test(content), "should have CSS link tag with cache-busting query string");
    });

    it("should inject JS script in template", async () => {
      const content = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
      assert.ok(/src="\/js\/main\.js\?v=\d+"/.test(content), "should have JS script tag with cache-busting query string");
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
  });

  describe("Code Block Protection", () => {
    it("should not replace placeholders inside fenced code blocks", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "templates", "index.html"), "utf-8");
      // The {{ title }} inside the code block should remain as-is
      assert.ok(
        content.includes("{{ title }}") || content.includes("&#123;&#123; title &#125;&#125;"),
        "should preserve placeholder syntax in code blocks"
      );
    });

    it("should not replace placeholders inside inline code", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "templates", "index.html"), "utf-8");
      assert.ok(
        content.includes("{{ variable }}") || content.includes("&#123;&#123; variable &#125;&#125;"),
        "should preserve placeholder in inline code"
      );
    });

    it("should still replace placeholders in regular text", async () => {
      const content = await fs.readFile(path.join(distDir, "docs", "templates", "index.html"), "utf-8");
      // "Regular text {{ title }}" should become "Regular text Template Guide"
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
});
