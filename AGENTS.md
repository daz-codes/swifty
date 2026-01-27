# AGENTS.md

This file provides guidance for agentic coding agents working with the Swifty codebase.

## Build/Lint/Test Commands

```bash
npm test                        # Run all tests using Mocha
npm run test                    # Same as npm test
npx mocha test/swifty.test.js   # Run single test file
npx mocha --grep "test name"    # Run specific test by description
npm run build                   # Build static site to dist/
npm start                       # Build and serve at http://localhost:3000
npx swifty <sitename>           # Create new site in <sitename>/ folder
npx swifty start                # Development server with live reload
npx swifty build                # Build for production
npx swifty build --out dir      # Build to custom output directory
npx swifty deploy ["message"]   # Build, git add, commit, and push
```

## Code Style Guidelines

### Project Structure & Conventions
- **ES Modules**: Project uses `"type": "module"` - always use ES6 import/export syntax
- **async/await**: Extensive use of async/await for file operations and build pipeline
- **File Extensions**: All source files use `.js` extension even with modern syntax
- **Bin Entry**: CLI entry point is `src/cli.js` with shebang `#!/usr/bin/env node`

### Import Style
```javascript
// Node built-ins first
import fs from "fs/promises";
import path from "path";

// External packages next
import fsExtra from "fs-extra";
import yaml from "js-yaml";
import matter from "gray-matter";

// Internal imports last (use relative paths)
import { dirs, defaultConfig } from "./config.js";
import { replacePlaceholders } from "./partials.js";
```

### Error Handling
- Use try/catch blocks for file operations that might fail
- Return early with `null` or empty values in helper functions
- Use descriptive error messages with context
- Example pattern from `getValidStats()`:
```javascript
const getValidStats = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory() || path.extname(filePath) === ".md") {
      return stats;
    }
    return null;
  } catch (err) {
    return null;
  }
};
```

### Function Naming & Structure
- Use descriptive function names: `calculateReadingTime()`, `generatePages()`
- Helper functions often start with verbs: `getValidStats()`, `ensureAndCopy()`
- Constants use SCREAMING_SNAKE_CASE: `baseDir`, `dirs`, `defaultConfig`
- Cache variables use descriptive names: `partialCache`, `tagsMap`, `pageIndex`

### Variable & Object Patterns
- Destructure imports and object properties frequently
- Use `const` by default, `let` only when reassignment is needed
- Map objects for caching: `new Map()` for performance
- Set objects for uniqueness checks: `new Set()`

### File Path Handling
- Always use `path.join()` for cross-platform compatibility
- Use `path.extname()` and `path.basename()` for file operations
- Forward slashes for URLs (normalize with path utilities)
- File operations use `fs/promises` exclusively

### Code Organization
- Core modules in `src/`: cli.js, build.js, pages.js, config.js, layout.js, partials.js, assets.js
- Each module exports specific functions and constants
- Build pipeline: `copyAssets → optimizeImages → generatePages → addLinks → createPages → generateRssFeeds`

### Template & Processing Patterns
- Use Eta templating engine with EJS-compatible syntax
- Protect code blocks from template variable replacement
- Markdown processing with `marked` and syntax highlighting
- Front matter parsing with `gray-matter`

### Testing Patterns
- Tests use Mocha with `assert` module
- Fixture-based testing with setup/teardown
- Test files should follow `test/swifty.test.js` pattern
- Use `describe()` blocks to group related tests
- Async test functions with `await` for build operations

### CLI & Environment
- CLI commands handled in `src/cli.js` with switch statement
- Environment variables for mode: `process.env.SWIFTY_WATCH`, `process.env.OUT_DIR`
- Use `spawn()` for subprocess management
- Handle reserved commands: `["build", "start", "watch", "deploy"]`

### Performance Considerations
- Use `Promise.all()` for parallel file operations
- Implement caching for templates and partials (Map objects)
- Batch file operations where possible
- Use `fs-extra` for enhanced file system operations

### Data Processing
- YAML config support with `js-yaml`
- JSON data files from `data/` directory
- RSS feed generation with proper XML structure
- Image optimization with Sharp library

### Git & Deployment
- Git operations use `execSync()` for simplicity
- Deploy command handles build, add, commit, push sequence
- Clean output directories before building in tests

### Configuration Options

The following configuration options can be set in `config.yaml` with sensible defaults:

```yaml
# Reading time calculation
words_per_minute: 200  # Default reading speed for reading time

# Image optimization settings  
max_image_width: 800   # Maximum width for resized images
image_quality: 80      # WebP quality (1-100)

# LiveReload and watcher settings
livereload_port: 35729 # LiveReload server port
watcher_delay: 100      # Delay in milliseconds before triggering rebuild
watcher_interval: 500   # Polling interval in milliseconds for file watching

# Pagination
default_page_count: 2   # Default items per page for paginated folders

# Existing options
default_layout_name: default
turbo: false
```

## Key Implementation Notes

- Always normalize URLs with forward slashes
- Cache busting uses file modification times: `Math.floor(stats.mtimeMs)`
- Word count calculation strips HTML and markdown
- Reading time uses configurable `words_per_minute` (default: 200)
- Support for both `.yaml` and `.yml` config extensions
- Date parsing supports DD/MM/YYYY and ISO formats
- Pagination only applies to folders with explicit `page_count` setting