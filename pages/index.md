---
layout: false
title: Super speedy static sites
summary: A small, convention-first static site generator with a polished publishing workflow.
---

<div class="home shell">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Convention-first static sites</p>
      <h1>Ship the site. Skip the <strong>sprawl.</strong></h1>
      <p>Swifty turns Markdown and a familiar folder structure into polished, searchable sites—with fast builds, smart navigation, and no browser-side dependency pile.</p>
      <div class="button-row">
        <a class="button" href="/docs/get-started">Get started</a>
        <a class="button secondary" href="/docs/tutorial">Build the tutorial site</a>
      </div>
    </div>
    <div class="hero-terminal" aria-label="Swifty quick start">
      <div class="terminal-bar">
        <span class="terminal-dot"></span><span class="terminal-dot"></span><span class="terminal-dot"></span>
        three commands to a live site
      </div>
      <pre><code><span class="prompt">$</span> npm install -g @daz4126/swifty
<span class="prompt">$</span> swifty new my-site
<span class="prompt">$</span> cd my-site && swifty start
<span class="success">✓ ready at localhost:3000</span></code></pre>
      <div class="quick-facts">
        <div class="quick-fact"><strong>Local</strong><span>search + themes</span></div>
        <div class="quick-fact"><strong>Native</strong><span>file watching</span></div>
        <div class="quick-fact"><strong>Clean</strong><span>static output</span></div>
      </div>
    </div>
  </section>

  <section aria-labelledby="features-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">Small core, useful defaults</p>
        <h2 id="features-title">The conveniences you want. None of the ceremony.</h2>
      </div>
      <p>Start with Markdown. Add layouts, data, feeds, discovery, and publishing controls only when the site needs them.</p>
    </div>
    <div class="feature-grid">
      <article class="feature-card">
        <span class="feature-label">pages/ → routes</span>
        <h3>Folders become a website</h3>
        <p>Pretty URLs, nested sections, layouts, tags, breadcrumbs, and previous/next links follow your content structure.</p>
        <a href="/docs/pages">Explore pages →</a>
      </article>
      <article class="feature-card">
        <span class="feature-label">search + collections</span>
        <h3>Discovery is built in</h3>
        <p>Ship bounded client-side search, related content, archives, recent-post lists, and custom navigation without a plugin.</p>
        <a href="/docs/configuration#client-side-search">Add search →</a>
      </article>
      <article class="feature-card">
        <span class="feature-label">anchors + toc</span>
        <h3>Documentation-ready</h3>
        <p>Stable heading IDs, nested tables of contents, syntax highlighting, and internal-anchor checks make deep docs dependable.</p>
        <a href="/docs/pages#heading-anchors-and-table-of-contents">Build docs →</a>
      </article>
      <article class="feature-card">
        <span class="feature-label">drafts + dates</span>
        <h3>Publish on your terms</h3>
        <p>Preview drafts and scheduled posts, generate RSS and sitemaps, and keep display dates deterministic across local and CI builds.</p>
        <a href="/docs/pages#draft-pages">Preview content →</a>
      </article>
      <article class="feature-card">
        <span class="feature-label">morpheus navigation</span>
        <h3>Fast feels instant</h3>
        <p>Intent prefetching and focused DOM morphing make same-origin navigation fluid while every route remains plain static HTML.</p>
        <a href="/docs/configuration#morph-navigation">Tune navigation →</a>
      </article>
      <article class="feature-card">
        <span class="feature-label">swifty check</span>
        <h3>Confidence before deploy</h3>
        <p>Catch duplicate routes, broken links and anchors, missing assets, malformed config, and invalid canonical URLs before shipping.</p>
        <a href="/docs/get-started#build-for-production">Check a build →</a>
      </article>
    </div>
  </section>

  <section class="local-first" aria-labelledby="local-title">
    <div>
      <p class="eyebrow">Made for the whole internet</p>
      <h2 id="local-title">Fast online. Fully useful offline.</h2>
      <p>Swifty’s generated search UI, Morpheus navigation client, Idiomorph runtime, and highlight.js themes are served from your own site. Air-gapped builds and privacy-conscious deployments work without special treatment.</p>
    </div>
    <ul class="local-points">
      <li>No CDN stylesheet requests</li>
      <li>No hosted search service</li>
      <li>No framework runtime required</li>
      <li>No polling unless you opt in</li>
    </ul>
  </section>

  <section aria-labelledby="docs-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">From the page collection</p>
        <h2 id="docs-title">Start with the essentials.</h2>
      </div>
      <p>This grid is rendered from Swifty’s immutable <code>collections.pages</code> template global.</p>
    </div>
<% const featuredDocs = collections.pages.filter((page) => page.url.startsWith("/docs/")).slice(0, 4); %>
<div class="doc-grid">
<% for (const page of featuredDocs) { %>
<article class="doc-card">
<h3><%= page.title %></h3>
<p><%= page.summary %></p>
<a href="<%= page.url %>">Read guide →</a>
</article>
<% } %>
</div>
  </section>
</div>
