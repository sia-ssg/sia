# Plugin System

Sia includes a powerful plugin system that allows you to extend functionality at key points in the build lifecycle. Plugins can be created locally in your project or published as npm packages.

## Overview

Plugins are JavaScript modules that export a plugin object with hooks that execute at specific points during the build process. They can:

- Transform content before or after parsing
- Generate additional files (search indexes, sitemaps, etc.)
- Add custom Marked extensions for markdown processing
- Register custom Nunjucks template filters and functions
- Modify site data before rendering
- Perform post-build tasks

## Configuration

Plugins are configured in your `_config.yml` or `_config.json` file:

```yaml
plugins:
  enabled: true          # Master switch (default: true)
  strictMode: false      # Fail build on plugin errors (default: false)
  order:                 # Explicit plugin execution order (optional)
    - sia-search-plugin
    - sia-sitemap-plugin
  plugins: []            # Explicit list of plugins to load (optional, empty = all)
  config:                # Plugin-specific configuration
    sia-search-plugin:
      outputPath: search-index.json
      includeContent: false
```

### Configuration Options

- **enabled**: Set to `false` to disable all plugins
- **strictMode**: If `true`, the build will fail if any plugin has an error. If `false` (default), errors are logged but the build continues
- **order**: Array of plugin names specifying execution order. Plugins not in this list will execute after, in dependency order
- **plugins**: Array of plugin names to explicitly load. If empty or omitted, all discovered plugins are loaded
- **config**: Object containing plugin-specific configuration, keyed by plugin name

## Available Hooks

Hooks are functions that plugins can register to execute at specific points in the build process.

### Build Lifecycle Hooks

#### `beforeBuild(config, api)`
Executes before the build starts, after configuration is loaded.

**Parameters:**
- `config`: Site configuration object
- `api`: Plugin API object (see Plugin API section)

**Use cases:** Initialize plugin state, validate configuration, set up external services

#### `afterConfigLoad(config, api)`
Executes immediately after configuration is loaded, before any build steps.

**Parameters:**
- `config`: Site configuration object
- `api`: Plugin API object

**Use cases:** Modify configuration, validate plugin requirements

#### `afterContentLoad(siteData, config, api)`
Executes after all content collections are loaded and parsed.

**Parameters:**
- `siteData`: Complete site data object with collections, tags, etc.
- `config`: Site configuration object
- `api`: Plugin API object

**Use cases:** Analyze content, generate metadata, modify collections

#### `afterTagCollections(tags, context, api)`
Executes after tag collections are built.

**Parameters:**
- `tags`: Tag collections object
- `context`: Object with `config` and `collections`
- `api`: Plugin API object

**Use cases:** Modify tag data, generate tag statistics

#### `beforeSiteData(siteData, config, api)`
Executes before final siteData is created, allowing modification.

**Parameters:**
- `siteData`: Site data object (can be modified)
- `config`: Site configuration object
- `api`: Plugin API object

**Use cases:** Add custom data to siteData, modify collections

#### `beforeRender(siteData, config, api)`
Executes before templates are rendered.

**Parameters:**
- `siteData`: Site data object
- `config`: Site configuration object
- `api`: Plugin API object

**Use cases:** Prepare data for rendering, modify siteData for templates

#### `afterRender(siteData, config, api)`
Executes after all templates are rendered but before assets are copied.

**Parameters:**
- `siteData`: Site data object
- `config`: Site configuration object
- `api`: Plugin API object

**Use cases:** Post-process rendered HTML, generate additional files

#### `afterBuild(siteData, config, api)`
Executes after the build completes, including asset copying.

**Parameters:**
- `siteData`: Site data object
- `config`: Site configuration object
- `api`: Plugin API object

**Use cases:** Generate search indexes, create sitemaps, upload files, send notifications

### Content Processing Hooks

#### `beforeContentParse(rawContent, context)`
Executes before a markdown file is parsed. Can modify the raw content.

**Parameters:**
- `rawContent`: Raw file content (string)
- `context`: Object with `filePath`, `config`, and `api`

**Returns:** Modified content string (or original if unchanged)

**Use cases:** Pre-process markdown, inject content, transform syntax

#### `afterContentParse(item, context)`
Executes after a content item is parsed. Can modify the item.

**Parameters:**
- `item`: Parsed content item object
- `context`: Object with `filePath`, `config`, and `api`

**Returns:** Modified item object (or original if unchanged)

**Use cases:** Add custom metadata, transform content, modify front matter

#### `beforeMarkdown(markdown, context)`
Executes before markdown is converted to HTML. Can modify the markdown.

**Parameters:**
- `markdown`: Markdown content (string)
- `context`: Object with `filePath`, `frontMatter`, `config`, and `api`

**Returns:** Modified markdown string (or original if unchanged)

**Use cases:** Transform markdown syntax, inject content

#### `afterMarkdown(html, context)`
Executes after markdown is converted to HTML. Can modify the HTML.

**Parameters:**
- `html`: Generated HTML (string)
- `context`: Object with `filePath`, `frontMatter`, `config`, and `api`

**Returns:** Modified HTML string (or original if unchanged)

**Use cases:** Post-process HTML, inject scripts, modify structure

### Template Hooks

#### `addTemplateFilter(env, config)`
Allows plugins to register custom Nunjucks filters.

**Parameters:**
- `env`: Nunjucks environment object
- `config`: Site configuration object

**Use cases:** Add custom template filters for data transformation

**Example:**
```javascript
hooks: {
  addTemplateFilter: (env, config) => {
    env.addFilter('uppercase', (str) => str.toUpperCase());
  }
}
```

#### `addTemplateFunction(env, config)`
Allows plugins to register custom Nunjucks functions.

**Parameters:**
- `env`: Nunjucks environment object
- `config`: Site configuration object

**Use cases:** Add custom template functions for complex operations

**Example:**
```javascript
hooks: {
  addTemplateFunction: (env, config) => {
    env.addGlobal('getApiData', async (url) => {
      // Fetch and return data
    });
  }
}
```

### Marked Extension Hook

Plugins can add custom Marked extensions using the `addMarkedExtension` function from the plugin API or by using the `beforeBuild` hook to call it.

**Example:**
```javascript
import { addMarkedExtension } from '@terrymooreii/sia';

hooks: {
  beforeBuild: (config, api) => {
    addMarkedExtension({
      renderer: {
        // Custom renderer
      }
    });
  }
}
```

## Plugin API

The `api` object passed to hooks provides utilities for plugins:

### `api.config`
Full site configuration object (read-only recommended)

### `api.writeFile(path, content)`
Write a file to the output directory.

**Parameters:**
- `path`: File path relative to output directory
- `content`: File content (string)

### `api.readFile(path)`
Read a file from the filesystem.

**Parameters:**
- `path`: Absolute file path

**Returns:** File content (string)

### `api.joinPath(...paths)`
Join path segments (wrapper around Node.js `path.join`).

**Parameters:**
- `...paths`: Path segments

**Returns:** Joined path (string)

### `api.log(message, level)`
Log a message.

**Parameters:**
- `message`: Log message (string)
- `level`: Log level - `'info'`, `'warn'`, or `'error'` (default: `'info'`)

## Plugin Structure

A plugin must export an object with the following structure:

```javascript
export default {
  name: 'plugin-name',        // Required: Unique plugin identifier
  version: '1.0.0',            // Required: Plugin version
  dependencies: [],             // Optional: Array of plugin names this depends on
  configSchema: {},            // Optional: Configuration schema
  hooks: {                     // Optional: Hook functions
    afterBuild: async (siteData, config, api) => {
      // Plugin logic
    }
  }
};
```

### Required Fields

- **name**: Unique identifier for the plugin (string)
- **version**: Plugin version (string)

### Optional Fields

- **dependencies**: Array of plugin names that must load before this plugin
- **configSchema**: Object describing plugin configuration options (for documentation)
- **hooks**: Object mapping hook names to hook functions

## Plugin Discovery

Sia discovers plugins from two sources:

1. **Local plugins**: Files in the `_plugins/` directory (`.js` or `.mjs` files)
2. **NPM packages**: Packages in `node_modules` matching the pattern `sia-plugin-*`

Plugins are loaded in dependency order, or in the order specified in `config.plugins.order`.

## Error Handling

By default, plugin errors are logged but don't stop the build. Set `plugins.strictMode: true` in your config to fail the build on plugin errors.

Errors include:
- Plugin loading failures
- Hook execution errors
- Validation errors

Error messages include the plugin name and detailed error information.

## Examples

See [Creating Plugins](./creating-plugins.md) for detailed examples of creating local and npm package plugins.

