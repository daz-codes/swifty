---
tags:
  - swifty
  - docs
  - config
position: 7
summary: Using partials to reuse content
---

Partials are reusable snippets stored in partials/ and can be included in pages using {{ include partial_name }}.

Example partials/footer.md:

```
---

© 2025 Made With Swifty. All rights reserved.
```

Including a partial in a page:

```
{{ include footer }}
``