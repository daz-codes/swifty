---
title: Build a Brochure Site
tags:
  - swifty
  - docs
  - tutorial
position: 8
summary: Step-by-step guide to building a complete site.
---

Let's build a website from scratch! We'll create a brochure site for a fictional bakery called **Sweet Crumbs**. By the end, you'll have used every major Swifty feature.

## What We're Building

A small business site with:
- Homepage with hero section
- About page
- Menu section with subpages for different categories
- Contact page
- Consistent header/footer across all pages
- Custom styling

Ready? Let's bake!

---

## Step 1: Project Setup

First, create a new folder and set up Swifty:

```bash
mkdir sweet-crumbs
cd sweet-crumbs
npm init -y
npm install @daz4126/swifty
npx swifty init
```

You now have a starter structure. Let's clear it out and start fresh. Delete the contents of `pages/` (keep the folder) and we'll build our own.

---

## Step 2: The Template

Open `template.html` and replace it with our site skeleton:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }} | {{ sitename }}</title>
</head>
<body>
  <header class="site-header">
    <nav class="container">
      <a href="/" class="logo">{{ sitename }}</a>
      <div class="nav-links">
        {{ nav_links }}
      </div>
    </nav>
  </header>

  <main>
    {{ content }}
  </main>

  <footer class="site-footer">
    {{ partial: footer }}
  </footer>
</body>
</html>
```

Notice we're using `{{ partial: footer }}` - we'll create that partial soon.

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
turbo: false
```

We've added custom properties (`tagline`, `address`) that we can use anywhere on the site.

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
    <h1>{{ sitename }}</h1>
    <p class="tagline">{{ tagline }}</p>
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

We're using `layout: false` because the homepage has a custom structure. Notice how we use config values like `{{ sitename }}` and `{{ tagline }}`.

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

Find us at **{{ address }}**. We're open Tuesday through Sunday, 7am to 6pm.

Pop in for a coffee and a pastry - we'd love to meet you!
```

This page will automatically use `layouts/default.html` (which we'll create next).

---

## Step 6: Create the Default Layout

Create `layouts/default.html`:

```html
<article class="page container">
  <nav class="breadcrumbs">
    {{ breadcrumbs }}
  </nav>

  <div class="page-content">
    {{ content }}
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

{{ links_to_children }}

*Prices may vary. Some items are seasonal or made to order.*
```

The `{{ links_to_children }}` variable automatically lists all pages in this folder!

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

## Step 8: Menu Layout

Let's give menu pages their own look. Create `layouts/menu.html`:

```html
<article class="menu-page container">
  <nav class="breadcrumbs">
    {{ breadcrumbs }}
  </nav>

  <div class="menu-content">
    {{ content }}
  </div>

  <aside class="menu-sidebar">
    <h4>Menu Categories</h4>
    {{ links_to_siblings }}
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

## Visit Our Bakery

**{{ address }}**

**Hours:**
- Tuesday - Friday: 7am - 6pm
- Saturday: 8am - 5pm
- Sunday: 8am - 2pm
- Monday: Closed

## Order Ahead

For custom cake orders or large catering requests, please call us at **(555) 123-4567** or email **hello@sweetcrumbs.com**.

We recommend ordering custom cakes at least 3 days in advance, and catering orders at least 1 week ahead.

## Find Us

We're located in the heart of downtown Tastyville, just two blocks from the central square. Street parking is available, and we're a 5-minute walk from the Tastyville Metro station.
```

---

## Step 10: Create the Footer Partial

Create `partials/footer.md`:

```markdown
<div class="container footer-content">
  <p><strong>{{ sitename }}</strong></p>
  <p>{{ address }}</p>
  <p>&copy; 2025 {{ sitename }}. Baked with love.</p>
</div>
```

This appears on every page thanks to `{{ partial: footer }}` in our template.

---

## Step 11: Navigation Partial

Let's customize how nav links look. Create `partials/nav.md`:

```html
<a href="{{ url }}" class="nav-link">{{ title }}</a>
```

Swifty uses this partial when generating `{{ nav_links }}`.

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

Try editing a file - the browser refreshes automatically. Make some CSS tweaks and watch them appear instantly.

---

## Step 14: Build for Production

Happy with your site? Build the production version:

```bash
npx swifty build
```

Your optimized site is now in the `dist/` folder, ready to deploy anywhere that hosts static files - Netlify, Vercel, GitHub Pages, or your own server.

---

## Bonus: Add an RSS Feed

Want customers to subscribe to your bakery's updates? Let's add an RSS feed! First, create a news section.

Create `pages/news/spring-menu.md`:

```markdown
---
title: Spring Menu Now Available!
---

We're excited to announce our new spring menu featuring fresh strawberry tarts, lavender shortbread, and our famous lemon drizzle cake. Stop by and taste the season!
```

Create `pages/news/holiday-hours.md`:

```markdown
---
title: Holiday Hours Update
---

We'll be closed on Easter Sunday but open extended hours the rest of the holiday weekend. Pre-orders for Easter treats are now open!
```

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

---

## What We Covered

Congratulations! You just built a complete website using:

- **Template** - The site-wide HTML wrapper
- **Config** - Site settings and custom variables
- **Pages** - Markdown content with front matter
- **Layouts** - Different wrappers for different sections
- **Partials** - Reusable content snippets
- **Auto-generated links** - Navigation, breadcrumbs, child/sibling links
- **Convention over configuration** - Layouts matching folder names
- **CSS** - Automatically injected stylesheets
- **RSS feeds** - Auto-generated feeds for content sections
- **Development server** - Live reload for fast iteration
- **Production build** - Clean output for deployment

Not bad for a few files and zero configuration!

---

## Next Steps

Now that you've got the basics, try:

- Adding images to `images/` and referencing them in pages
- Creating more complex layouts with sidebars or grids
- Using tags to categorize content
- Enabling Turbo for SPA-like transitions
- Adding JavaScript for interactive features

Most importantly: build something real! Swifty gets out of your way so you can focus on content. Happy building!
