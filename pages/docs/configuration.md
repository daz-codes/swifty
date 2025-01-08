Configuration is set using json or yaml files.

The configuration for the whole site is set by the config file in the pages directory.

The configuration for a particular directory can be set adding a config file to the root of that directory. This will apply to all the pages in that directory.

You can also set it on a per-page basis using front matter.

The config heirachy is 1) page config from front matter, 2) directory level config, 3) root config.

You can set the following:

* title (default is "My Swifty Site")
* author (default is "Taylor Swift")
* date (in the format "yyyy-mm-dd")
* summary
* tags

A typical yaml config file might look like this:

```
title: My Amazing Site
author: Daz
tags:
  blog
  amazing
  swifty
```

In JSON format it would look like this:

```
{
    "title": "My Amazing Site",
    "author": "Daz",
    "tags": ["blog","amazing","swifty"]
}

```

You can also set config variables, setting any value you want that can then be accessed inside pages.