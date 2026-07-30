---
title: Build a Brochure Site
tags:
  - swifty
  - docs
  - tutorial
position: 8
summary: Step-by-step guide to building a complete site.
---

Let's build a website from scratch! We'll create a brochure site for a fictional bakery called **Sweet Crumbs**. By the end, you'll have used the core Swifty workflow and its approachable publishing, discovery, and extension features.

## What We're Building

A small business site with:
- Homepage with hero section
- About page
- Menu section with subpages for different categories
- Contact page
- Consistent header/footer across all pages
- Custom styling
- Search, heading anchors, and a table of contents
- A collection-powered menu preview
- Draft and scheduled-content previews
- A small custom template helper
- Self-hosted syntax highlighting

Ready? Let's bake!

---

## Step 1: Project Setup

First, install Swifty and create a new site:

```bash
npm install -g @daz4126/swifty
swifty new sweet-crumbs
cd sweet-crumbs
```

This creates a `sweet-crumbs` folder with the starter structure. Let's clear it out and start fresh. Delete the contents of `pages/` (keep the folder) and we'll build our own.

The starter also includes a responsive stylesheet, default layout, and
`js/hello-swifty.js`. Keep or replace them as you work. Run `swifty --help` at
any point to see the available commands.

---

## Step 2: The Template

Open `template.html` and replace it with our site skeleton:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> | <%= sitename %></title>
  <%= og_tags %>
</head>
<body>
  <header class="site-header">
    <nav class="container">
      <a href="/" class="logo"><%= sitename %></a>
      <div class="nav-links">
        <%= nav_links %>
      </div>
    </nav>
  </header>

  <main>
    <%= content %>
  </main>

  <footer class="site-footer">
    <%= partial: footer %>
  </footer>
</body>
</html>
```

Notice we're using `<%= partial: footer %>` - we'll create that partial soon.

---

## Step 3: Configuration

Open `config.yaml` and set up our site:

```yaml
sitename: Sweet Crumbs Bakery
author: The Sweet Crumbs Team
tagline: Freshly baked happiness since 2020
address: 123 Baker Street, Tastyville

breadcrumb_separator: " > "
link_class: nav-link
morphing: true
prefetching: true
morph_target: main
navigation_cache_size: 20
navigation_cache_ttl: 15
search: true
search_content_limit: 5000
search_results_limit: 10
highlight_theme: monokai-sublime
watcher_use_polling: false
date_locale: en-GB
timezone: Europe/London
```

We've added custom properties (`tagline`, `address`) that we can use anywhere on
the site. Morphing and intent prefetching make navigation feel immediate while
keeping every route as ordinary static HTML. The bounded navigation and search
caches prevent those conveniences from growing without limit. Dates display
consistently in local development and deployment builds.

---

## Step 4: The Homepage

Create `pages/index.md`:

```markdown
---
layout: false
title: Home
---

<section class="hero">
  <div class="container">
    <h1><%= sitename %></h1>
    <p class="tagline"><%= tagline %></p>
    <a href="/menu" class="button">View Our Menu</a>
  </div>
</section>

<section class="intro container">

## Welcome to Sweet Crumbs!

We're a family-run bakery crafting delicious treats with love and the finest ingredients. From flaky croissants to decadent cakes, everything is baked fresh daily.

</section>

<section class="features">
  <div class="container">
    <div class="feature">
      <h3>Fresh Daily</h3>
      <p>Everything baked from scratch each morning.</p>
    </div>
    <div class="feature">
      <h3>Local Ingredients</h3>
      <p>We source from local farms whenever possible.</p>
    </div>
    <div class="feature">
      <h3>Made with Love</h3>
      <p>Family recipes passed down through generations.</p>
    </div>
  </div>
</section>
```

We're using `layout: false` because the homepage has a custom structure. Notice how we use config values like `<%= sitename %>` and `<%= tagline %>`.

---

## Step 5: The About Page

Create `pages/about.md`:

```markdown
---
title: About Us
---

# Our Story

Sweet Crumbs started in 2020 when Maria and Tom decided to turn their passion for baking into something the whole neighbourhood could enjoy.

What began as weekend farmers' market stalls quickly grew into our cozy shop on Baker Street. Today, we're proud to serve hundreds of happy customers every week.

## Our Promise

Every item in our display case is:

- **Baked fresh** that morning
- **Made from scratch** using traditional methods
- **Crafted with care** by our small team

We never use preservatives or artificial flavours. Just real ingredients, real skill, and real love.

## Visit Us

Find us at **<%= address %>**. We're open Tuesday through Sunday, 7am to 6pm.

Pop in for a coffee and a pastry - we'd love to meet you!
```

This page will automatically use `layouts/default.html` (which we'll create next).

---

## Step 6: Create the Default Layout

Create `layouts/default.html`:

```html
<article class="page container">
  <nav class="breadcrumbs">
    <%= breadcrumbs %>
  </nav>

  <div class="page-content">
    <%= content %>
  </div>
</article>
```

Simple! This wraps our content pages with breadcrumb navigation.

---

## Step 7: The Menu Section

Now for something more interesting - a section with subpages.

Create `pages/menu/index.md`:

```markdown
---
title: Our Menu
---

# What's Baking?

We offer a delicious range of freshly baked goods. Browse our categories below to see what's available.

<%= links_to_children %>

*Prices may vary. Some items are seasonal or made to order.*
```

The `<%= links_to_children %>` variable automatically lists all pages in this folder!

Now create some menu category pages:

**pages/menu/breads.md**
```markdown
---
title: Artisan Breads
position: 1
---

# Fresh Breads

Our breads are made with long fermentation times for better flavour and texture.

| Item | Price |
|------|-------|
| Sourdough Loaf | $8 |
| Baguette | $4 |
| Ciabatta | $5 |
| Whole Wheat | $7 |
| Olive Focaccia | $9 |

All breads are best enjoyed on the day of purchase, but can be frozen for up to a month.
```

**pages/menu/pastries.md**
```markdown
---
title: Pastries
position: 2
---

# Sweet Pastries

Flaky, buttery, and utterly irresistible.

| Item | Price |
|------|-------|
| Butter Croissant | $4 |
| Pain au Chocolat | $5 |
| Almond Croissant | $6 |
| Danish (various) | $5 |
| Cinnamon Roll | $5 |

*Croissants are best enjoyed warm - ask us to heat one up!*
```

**pages/menu/cakes.md**
```markdown
---
title: Cakes & Treats
position: 3
---

# Cakes & Sweet Treats

For celebrations or just because.

| Item | Price |
|------|-------|
| Slice of Cake | $6 |
| Whole Cake (8") | $45 |
| Brownies | $4 |
| Cookies (each) | $3 |
| Macarons (box of 6) | $18 |

**Custom cakes available!** Order at least 3 days in advance. Ask at the counter for details.
```

---

## Step 7b: Customize Menu Links with a Partial

By default, `<%= links_to_children %>` outputs a simple list of links. But what if you want richer previews with descriptions? Create a partial that matches the folder name!

Create `partials/menu.md`:

```html
<div class="menu-card">
  <h3><a href="<%= url %>"><%= title %></a></h3>
  <% if (summary) { %>
    <p><%= summary %></p>
  <% } %>
</div>
```

**The magic:** When Swifty generates the index page for any folder, it looks for a partial with the same name as the folder. Since this partial is named `menu.md`, it automatically applies to the `pages/menu/` folder. Each child page is rendered through this template.

Now let's add summaries to our menu pages. Update the front matter:

**pages/menu/breads.md**
```yaml
---
title: Artisan Breads
position: 1
summary: Sourdough, baguettes, focaccia and more - baked fresh every morning.
---
```

**pages/menu/pastries.md**
```yaml
---
title: Pastries
position: 2
summary: Flaky croissants, pain au chocolat, and sweet Danish treats.
---
```

**pages/menu/cakes.md**
```yaml
---
title: Cakes & Treats
position: 3
summary: Celebration cakes, brownies, cookies, and French macarons.
---
```

Now instead of plain links, your menu index shows styled cards with descriptions!

This pattern works for any folder - create `partials/news.md` to customize how news items appear, `partials/blog.md` for blog posts, etc. If no matching partial exists, Swifty falls back to the default `links` partial or simple HTML links.

---

## Step 8: Menu Layout

Let's give menu pages their own look. Create `layouts/menu.html`:

```html
<article class="menu-page container">
  <nav class="breadcrumbs">
    <%= breadcrumbs %>
  </nav>

  <div class="menu-content">
    <%= content %>
  </div>

  <aside class="menu-sidebar">
    <h4>Menu Categories</h4>
    <%= links_to_siblings %>
  </aside>
</article>
```

Because this layout is named `menu.html`, it automatically applies to all pages inside `pages/menu/`. The sidebar shows links to sibling pages so visitors can easily browse between categories.

---

## Step 9: Contact Page

Create `pages/contact.md`:

```markdown
---
title: Contact Us
---

# Get in Touch

We'd love to hear from you!

## Send Us a Message

<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" class="contact-form">
  <label>
    Your Name
    <input type="text" name="name" required>
  </label>
  <label>
    Your Email
    <input type="email" name="email" required>
  </label>
  <label>
    Message
    <textarea name="message" rows="5" required></textarea>
  </label>
  <button type="submit">Send Message</button>
</form>

## Visit Our Bakery

**<%= address %>**

**Hours:**
- Tuesday - Friday: 7am - 6pm
- Saturday: 8am - 5pm
- Sunday: 8am - 2pm
- Monday: Closed

## Order Ahead

For custom cake orders or large catering requests, please call us at **(555) 123-4567** or email **hello@sweetcrumbs.com**.

We recommend ordering custom cakes at least 3 days in advance, and catering orders at least 1 week ahead.
```

### Adding a Contact Form

Since Swifty generates static sites, you'll need a third-party service to handle form submissions. [Formspree](https://formspree.io) is a popular choice - just sign up, create a form, and replace `YOUR_FORM_ID` with your actual form ID. The free tier includes 50 submissions per month, which is plenty for most small sites.

Other options include:
- **Netlify Forms** - If you deploy to Netlify, just add the `netlify` attribute to your form tag
- **Web3Forms** - Free tier with 250 submissions/month
- **Basin**, **Getform**, **FormKeep** - Various pricing options

You can also skip forms entirely and use a simple `mailto:` link instead:

```markdown
[Email us](mailto:hello@sweetcrumbs.com?subject=Website%20Inquiry)
```

---

## Step 10: Create the Footer Partial

Create `partials/footer.md`:

```markdown
<div class="container footer-content">
  <p><strong><%= sitename %></strong></p>
  <p><%= address %></p>
  <p>&copy; <%= sitename %>. Baked with love.</p>
</div>
```

This appears on every page thanks to `<%= partial: footer %>` in our template.

---

## Step 11: Navigation Partial

Let's customize how nav links look. Create `partials/nav.md`:

```html
<a href="<%= url %>" class="nav-link"><%= title %></a>
```

Swifty uses this partial when generating `<%= nav_links %>`.

### Controlling Navigation

By default, top-level pages (direct children of `pages/`) appear in the main navigation, while nested pages don't. You can override this with front matter.

**Hide a top-level page from nav:**

Say we want a "Terms & Conditions" page that shouldn't clutter the main menu. Create `pages/terms.md`:

```markdown
---
title: Terms & Conditions
nav: false
---

# Terms & Conditions

Standard legal stuff here...
```

The page exists at `/terms/` but won't appear in `<%= nav_links %>`.

**Add a nested page to nav:**

Want your News section in the main menu? Update `pages/news/index.md`:

```markdown
---
title: News
nav: true
---
```

Now the News link appears alongside About, Menu, and Contact in the main navigation.

---

## Step 12: Add Some Style

Create `css/styles.css`:

```css
/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.site-header {
  background: #8B4513;
  padding: 15px 0;
}

.site-header nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: white;
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

/* Hero */
.hero {
  background: linear-gradient(rgba(139, 69, 19, 0.8), rgba(139, 69, 19, 0.8));
  color: white;
  text-align: center;
  padding: 100px 20px;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 10px;
}

.tagline {
  font-size: 1.3rem;
  margin-bottom: 30px;
  opacity: 0.9;
}

.button {
  display: inline-block;
  background: white;
  color: #8B4513;
  padding: 12px 30px;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
}

.button:hover {
  background: #f5f5f5;
}

/* Content Sections */
.intro, .features {
  padding: 60px 20px;
}

.features {
  background: #f9f5f0;
}

.features .container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature {
  text-align: center;
}

.feature h3 {
  color: #8B4513;
  margin-bottom: 10px;
}

/* Pages */
.page, .menu-page {
  padding: 40px 0;
}

.breadcrumbs {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 30px;
}

.page-content h1, .menu-content h1 {
  color: #8B4513;
  margin-bottom: 20px;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f9f5f0;
}

/* Menu Layout */
.menu-page {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 40px;
}

.menu-sidebar {
  background: #f9f5f0;
  padding: 20px;
  border-radius: 8px;
  height: fit-content;
}

.menu-sidebar h4 {
  margin-bottom: 15px;
  color: #8B4513;
}

.menu-sidebar a {
  display: block;
  padding: 8px 0;
  color: #333;
  text-decoration: none;
}

.menu-sidebar a:hover {
  color: #8B4513;
}

/* Menu Cards (from folder partial) */
.menu-card {
  background: #f9f5f0;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.menu-card h3 {
  margin: 0 0 10px;
}

.menu-card h3 a {
  color: #8B4513;
  text-decoration: none;
}

.menu-card h3 a:hover {
  text-decoration: underline;
}

.menu-card p {
  margin: 0;
  color: #666;
}

/* Footer */
.site-footer {
  background: #333;
  color: white;
  padding: 40px 0;
  margin-top: 60px;
}

.footer-content {
  text-align: center;
}

.footer-content p {
  margin: 5px 0;
}

/* Contact Form */
.contact-form label {
  display: block;
  margin-bottom: 15px;
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 10px;
  margin-top: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.contact-form button {
  background: #8B4513;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
}

.contact-form button:hover {
  background: #6d3610;
}

/* Responsive */
@media (max-width: 768px) {
  .menu-page {
    grid-template-columns: 1fr;
  }

  .hero h1 {
    font-size: 2rem;
  }
}
```

---

## Step 13: Fire It Up!

Start the development server:

```bash
npx swifty start
```

Visit [localhost:3000](http://localhost:3000) and explore your bakery site!

Try editing a file - the browser refreshes automatically. Safe body-only page
edits rebuild that page and derived indexes incrementally; metadata, layout, and
structural changes fall back to a full build. Make some CSS tweaks and watch them
appear instantly.

Swifty uses native filesystem events by default, which is efficient on normal
local disks. If saves are missed on a cloud-synced folder, network mount, or
container volume, change this setting and restart the server:

```yaml
watcher_use_polling: true
watcher_interval: 500
```

---

## Step 14: Add Heading Links and a Table of Contents

Every Markdown heading already receives a stable ID. For example, the **Our
Promise** heading on the About page can be linked directly:

```markdown
[Read our promise](/about#our-promise)
```

Expose those headings as a table of contents by updating
`layouts/default.html`:

```html
<article class="page container">
  <nav class="breadcrumbs"><%= breadcrumbs %></nav>

  <aside class="page-toc" aria-label="On this page">
    <%= toc %>
  </aside>

  <div class="page-content">
    <%= content %>
  </div>
</article>
```

`<%= toc %>` renders a nested list linked to the generated heading IDs. Pages
without headings simply receive an empty value. Add a little styling:

```css
.page-toc {
  margin-bottom: 30px;
  padding: 18px;
  border-radius: 8px;
  background: #f9f5f0;
}

.page-toc ul {
  margin: 0;
  padding-left: 20px;
}
```

---

## Step 15: Add Self-Hosted Search

Create `pages/search.md`:

```markdown
---
title: Search
nav: true
summary: Search the Sweet Crumbs website.
---

# Find Something Delicious

<%= partial: search %>
```

Swifty generates `/search.json` and supplies the form and search client. The
JavaScript and index are hosted with your site; no search service or CDN is
needed. The `search_content_limit: 5000` setting from Step 3 keeps each indexed
page body bounded while titles, summaries, tags, and URLs stay complete.

Add basic form styling:

```css
.swifty-search input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.swifty-search__results {
  display: grid;
  gap: 12px;
  padding: 0;
  list-style: none;
}
```

---

## Step 16: Build a Menu Preview from the Page Collection

Templates receive an immutable collection of authored pages. Add this block near
the bottom of `pages/index.md`:

```html
<section class="container">
<h2>Explore the Menu</h2>
<div class="collection-grid">
<% const menuPages = collections.pages.filter((page) => page.url.startsWith("/menu/")); %>
<% for (const page of menuPages) { %>
<article class="menu-card">
<h3><a href="<%= page.url %>"><%= page.title %></a></h3>
<p><%= page.summary %></p>
</article>
<% } %>
</div>
</section>
```

Keep the loop and generated HTML at the start of their lines as shown. That
prevents Markdown from interpreting the repeated HTML as an indented code block.

Each item contains its title, URL, summary, tags, and display and ISO dates.
Generated tag/pagination routes, 404 pages, drafts, and scheduled pages are not
included in production collections. `pages` is a shorter alias for
`collections.pages`.

```css
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
```

---

## Step 17: Preview Draft and Scheduled Content

Create `pages/summer-preview.md`:

```markdown
---
title: Summer Menu Preview
draft: true
nav: false
---

# A First Look at Summer

We're testing peach pastries, berry tarts, and a new iced coffee menu.
```

Drafts and future-dated pages appear during `swifty start`. You can also create
a shareable preview build without enabling the watcher:

```bash
npx swifty build --drafts --out preview
```

Change `draft: true` to a future publication date when the page is ready to be
scheduled:

```yaml
date: 2099-06-15
```

A normal `swifty build` excludes both drafts and future pages. Scheduled pages
appear on the first production build after their publication time—Swifty does
not start deployment jobs, so configure a scheduled build with your host when
automatic publication matters.

---

## Step 18: Add a Small Template Extension

Layouts and partials cover most customization. For a reusable value or function,
create optional `swifty.config.js` in the project root:

```javascript
module.exports = {
  globals: {
    orderPhone: "01234 567890",
  },
  helpers: {
    uppercase(value) {
      return String(value).toUpperCase();
    },
  },
};
```

Use both values directly in a page, layout, or partial:

```html
<p><%= uppercase("Order ahead") %>: <%= orderPhone %></p>
```

Restart `swifty start` after changing `swifty.config.js`; it is loaded when the
process starts. Projects with `"type": "module"` use `export default { ... }`
instead. The same extension file can register Marked extensions, but that is an
advanced option covered in [Configuration](/docs/configuration#javascript-extension-hooks).

---

## Step 19: See Local Syntax Highlighting

Create `pages/developer-notes.md` to keep a small integration example out of the
main navigation:

````markdown
---
title: Developer Notes
nav: false
---

# Online Order Handoff

```javascript
const collectionMessage = (name, time) =>
  `${name}, your order will be ready at ${time}.`;
```
````

Only this page loads the configured `monokai-sublime` highlight.js theme. Swifty
copies and fingerprints that stylesheet locally; code-free pages do not load it.
Fenced code is also excluded from `reading_time`, so technical posts are not
inflated by long examples.

---

## Step 20: Check and Build for Production

Before building, validate routes, internal links and heading anchors, images,
layouts, partials, templates, and configuration:

```bash
npx swifty check
```

Then create the production version:

```bash
npx swifty build
```

Your optimized site is now in the `dist/` folder, ready to deploy anywhere that hosts static files - Netlify, Vercel, GitHub Pages, or your own server.

### Quick Deploy with Git

If your site is in a git repo, you can build and deploy in one command:

```bash
npx swifty deploy "Updated menu prices"
```

This runs `swifty build`, stages only the generated `dist/` folder, commits it, and pushes it. Other working-tree changes are not included.

---

## Bonus: Add a News Section with Reading Time

Let's add a news/blog section that shows reading time and previous/next navigation.

Create `pages/news/spring-menu.md`:

```markdown
---
title: Spring Menu Now Available!
description: Announcing our new spring menu with seasonal treats.
tags: [news, seasonal]
---

We're excited to announce our new spring menu featuring fresh strawberry tarts, lavender shortbread, and our famous lemon drizzle cake. Stop by and taste the season!

Our pastry chef Maria has been working on these recipes all winter, testing and perfecting each one. The strawberry tarts use locally-sourced berries from Sunny Farm just down the road.
```

Create `pages/news/holiday-hours.md`:

```markdown
---
title: Holiday Hours Update
description: Our hours for the upcoming holiday weekend.
tags: [news, seasonal]
---

We'll be closed on Easter Sunday but open extended hours the rest of the holiday weekend. Pre-orders for Easter treats are now open!
```

Now create a layout for news posts. Create `layouts/news.html`:

```html
<article class="news-post container">
  <nav class="breadcrumbs"><%= breadcrumbs %></nav>

  <header class="post-header">
    <h1><%= title %></h1>
    <div class="post-meta">
      <span class="date"><%= date %></span>
      <span class="reading-time"><%= reading_time %></span>
    </div>
  </header>

  <div class="post-content">
    <%= content %>
  </div>

  <div class="tags"><%= links_to_tags %></div>
  <aside class="related-pages"><%= related_pages %></aside>

  <nav class="post-nav">
    <div class="prev"><%= prev_page %></div>
    <div class="next"><%= next_page %></div>
  </nav>
</article>
```

The `<%= reading_time %>` shows something like "2 min read", and `<%= prev_page %>` / `<%= next_page %>` automatically link to sibling posts. Shared tags power `<%= related_pages %>`, while the authored `description` becomes the page summary.

Now update your `config.yaml` to enable RSS:

```yaml
sitename: Sweet Crumbs Bakery
site_url: https://sweetcrumbs.com
author: The Sweet Crumbs Team
tagline: Freshly baked happiness since 2020
address: 123 Baker Street, Tastyville

rss_feeds:
  - folder: news
    title: Sweet Crumbs News
    description: Updates from your favorite bakery
```

Rebuild and you'll find `/news/rss.xml` in your dist folder - a valid RSS feed that customers can subscribe to in their favorite feed reader!

You can add feeds for any folder. Running a recipe blog section? Just add `- blog` to the `rss_feeds` list.

When the section grows, opt into pagination with
`pages/news/config.yaml`:

```yaml
page_count: 5
```

Swifty then keeps `/news` as page one and generates `/news/page/2` as needed.
RSS still contains the configured number of newest posts rather than only the
current HTML page.

---

## Bonus: Use Data Files for Team Members

Instead of creating a page for each team member, you can store structured data in the `data/` folder and loop through it in your templates.

Create `data/team.json`:

```json
[
  {
    "name": "Maria Santos",
    "role": "Head Baker",
    "bio": "Maria learned to bake from her grandmother in Portugal and brings 20 years of experience to every loaf."
  },
  {
    "name": "Tom Chen",
    "role": "Pastry Chef",
    "bio": "Tom trained at Le Cordon Bleu and specializes in French pastries and custom cakes."
  },
  {
    "name": "Sophie Williams",
    "role": "Front of House",
    "bio": "Sophie keeps everything running smoothly and knows all our regulars by name."
  }
]
```

Now create `pages/team.md`:

```markdown
---
title: Meet Our Team
---

# The People Behind the Counter

<div class="team-grid">
<% for (const member of data.team) { %>
  <div class="team-member">
    <h3><%= member.name %></h3>
    <p class="role"><%= member.role %></p>
    <p><%= member.bio %></p>
  </div>
<% } %>
</div>
```

The `data.team` variable automatically loads from `data/team.json`. You can use JSON or YAML files - the filename becomes the variable name.

This is great for:
- Team members
- Testimonials
- Product catalogs
- Any structured data you want to display without creating individual pages

---

## What We Covered

Congratulations! You just built a complete website using:

- **Template** - The site-wide HTML wrapper
- **Config** - Site settings and custom variables
- **Pages** - Markdown content with front matter
- **Layouts** - Different wrappers for different sections
- **Partials** - Reusable content snippets
- **Folder-matching partials** - Partials named after folders customize index pages
- **Auto-generated links** - Navigation, breadcrumbs, child/sibling links
- **Navigation control** - Opt pages in or out of the main nav with front matter
- **Convention over configuration** - Layouts and partials matching folder names
- **CSS** - Automatically injected stylesheets
- **RSS feeds** - Auto-generated feeds for content sections
- **Data files** - JSON/YAML data for structured content
- **Reading time** - Auto-calculated for blog posts
- **Previous/next links** - Auto-generated navigation between posts
- **Open Graph tags** - Social sharing meta tags
- **Heading anchors and TOC** - Stable deep links and generated page outlines
- **Self-hosted search** - A bounded local index and accessible search partial
- **Page collections** - Custom lists built from authored metadata
- **Draft previews and scheduling** - Development and `--drafts` workflows
- **Extension hooks** - Small Eta globals/helpers without a plugin system
- **Local syntax highlighting** - Fingerprinted themes loaded only when needed
- **Site validation** - Route, link, asset, template, and config checks
- **Related pages and summaries** - Tag-ranked discovery and useful excerpts
- **Pagination** - Explicit per-section page sizing
- **Development server** - Live reload for fast iteration
- **Production build** - Clean output for deployment

Not bad for a small set of files and one readable configuration file!

---

## Next Steps

Now that you've got the basics, try:

- Adding images to `images/` and referencing them in pages
- Creating more complex layouts with sidebars or grids
- Using tags to categorize content
- Tuning morph navigation for SPA-like transitions
- Adding optimized local images and responsive `srcset` output
- Deploying below a domain path with `base_path`
- Customizing the search partial or related-page partial
- Trying a different bundled `highlight_theme`

Most importantly: build something real! Swifty gets out of your way so you can focus on content. Happy building!
