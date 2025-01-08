Partials allow you to add small snippets of code into multiple pages.

They are perfect if you use the same chunk of code on multiple pages.

To include a partial, you need to add a markdown file to the 'partials folder'. Then just include it using the following syntax:

```
{{ partial: filename }}
```

You can even reference config variables inside a partial and it will display differently on different pages.