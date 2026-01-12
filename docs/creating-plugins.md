# Creating Plugins

This guide explains how to create plugins for Sia, both as local plugins in your project and as npm packages that can be shared with others.

## Quick Start: Using the Scaffold Command

The easiest way to create a new plugin is using the `sia plugin` command:

```bash
# Interactive mode - prompts for plugin type
sia plugin my-plugin

# Quick mode - create a local plugin
sia plugin my-plugin --type local --quick

# Quick mode - create an npm package plugin
sia plugin my-plugin --type npm --quick
```

This command will:
- **Local plugins**: Create a plugin file in `_plugins/` with a basic structure and example hooks
- **NPM package plugins**: Create a full package structure (`sia-plugin-*`) with `package.json`, `index.js`, `README.md`, and `LICENSE`

After scaffolding, edit the generated files to implement your plugin logic.

## Plugin Types

Sia supports two types of plugins:

1. **Local plugins**: JavaScript files in your project's `_plugins/` directory
2. **NPM package plugins**: Published npm packages with the `sia-plugin-*` naming convention

## Local Plugins

Local plugins are perfect for project-specific functionality that you don't need to share.

### Creating a Local Plugin

You can use the scaffold command (`sia plugin <name> --type local`) or create one manually:

1. Create a `_plugins/` directory in your project root (if it doesn't exist)
2. Create a JavaScript file (`.js` or `.mjs`) in that directory
3. Export a plugin object

**Example: `_plugins/search-index.js`**

```javascript
export default {
  name: 'search-index',
  version: '1.0.0',
  hooks: {
    afterBuild: async (siteData, config, api) => {
      // Generate search index
      const searchData = {
        pages: siteData.collections.pages.map(item => ({
          title: item.title,
          url: item.url,
          excerpt: item.excerpt,
          tags: item.tags
        })),
        posts: siteData.collections.posts.map(item => ({
          title: item.title,
          url: item.url,
          date: item.date.toISOString(),
          excerpt: item.excerpt,
          tags: item.tags
        })),
        notes: siteData.collections.notes.map(item => ({
          title: item.title,
          url: item.url,
          date: item.date.toISOString(),
          excerpt: item.excerpt
        }))
      };
      
      // Write search index file
      const outputPath = api.joinPath(config.outputDir, 'search-index.json');
      api.writeFile(outputPath, JSON.stringify(searchData, null, 2));
      api.log('Generated search index', 'info');
    }
  }
};
```

### Local Plugin with Configuration

You can access plugin-specific configuration from `config.plugins.config`:

```javascript
export default {
  name: 'search-index',
  version: '1.0.0',
  configSchema: {
    outputPath: { type: 'string', default: 'search-index.json' },
    includeContent: { type: 'boolean', default: false }
  },
  hooks: {
    afterBuild: async (siteData, config, api) => {
      const pluginConfig = config.plugins?.config?.['search-index'] || {};
      const outputPath = pluginConfig.outputPath || 'search-index.json';
      const includeContent = pluginConfig.includeContent || false;
      
      const searchData = {
        pages: siteData.collections.pages.map(item => ({
          title: item.title,
          url: item.url,
          excerpt: item.excerpt,
          ...(includeContent && { content: item.content })
        })),
        // ... posts, notes
      };
      
      api.writeFile(
        api.joinPath(config.outputDir, outputPath),
        JSON.stringify(searchData, null, 2)
      );
    }
  }
};
```

Configure in `_config.yml`:

```yaml
plugins:
  config:
    search-index:
      outputPath: search-index.json
      includeContent: false
```

## NPM Package Plugins

NPM package plugins can be shared with the community and installed via npm.

### Creating an NPM Package Plugin

You can use the scaffold command (`sia plugin <name> --type npm`) to generate a complete package structure, or create one manually:

1. Create a new npm package with name starting with `sia-plugin-`
2. Set up the package structure
3. Export the plugin object

### Package Structure

```
sia-plugin-example/
├── package.json
├── index.js
├── README.md
└── LICENSE
```

### package.json

```json
{
  "name": "sia-plugin-example",
  "version": "1.0.0",
  "description": "Example Sia plugin",
  "main": "index.js",
  "type": "module",
  "keywords": [
    "sia",
    "sia-plugin",
    "static-site-generator"
  ],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "peerDependencies": {
    "@terrymooreii/sia": "^2.0.0"
  }
}
```

### index.js

```javascript
export default {
  name: 'sia-plugin-example',
  version: '1.0.0',
  configSchema: {
    enabled: { type: 'boolean', default: true },
    outputFile: { type: 'string', default: 'example-output.json' }
  },
  hooks: {
    afterBuild: async (siteData, config, api) => {
      const pluginConfig = config.plugins?.config?.['sia-plugin-example'] || {};
      
      if (pluginConfig.enabled === false) {
        return;
      }
      
      const output = {
        buildDate: new Date().toISOString(),
        totalPages: siteData.collections.pages.length,
        totalPosts: siteData.collections.posts.length,
        totalNotes: siteData.collections.notes.length,
        totalTags: siteData.allTags.length
      };
      
      api.writeFile(
        api.joinPath(config.outputDir, pluginConfig.outputFile || 'example-output.json'),
        JSON.stringify(output, null, 2)
      );
      
      api.log(`Generated ${pluginConfig.outputFile}`, 'info');
    }
  }
};
```

### Installing and Using

Users install your plugin:

```bash
npm install sia-plugin-example
```

Then configure it in `_config.yml`:

```yaml
plugins:
  config:
    sia-plugin-example:
      enabled: true
      outputFile: stats.json
```

## Advanced Examples

### Content Transformation Plugin

Transform content during parsing:

```javascript
export default {
  name: 'content-transformer',
  version: '1.0.0',
  hooks: {
    beforeMarkdown: (markdown, context) => {
      // Replace custom syntax
      return markdown.replace(/\[TOC\]/g, '<!-- Table of Contents -->');
    },
    afterMarkdown: (html, context) => {
      // Inject custom HTML
      return html.replace(
        '<!-- Table of Contents -->',
        '<nav class="toc">...</nav>'
      );
    }
  }
};
```

### Custom Template Filter Plugin

Add custom Nunjucks filters:

```javascript
export default {
  name: 'custom-filters',
  version: '1.0.0',
  hooks: {
    addTemplateFilter: (env, config) => {
      // Add a filter to format numbers
      env.addFilter('formatNumber', (num) => {
        return new Intl.NumberFormat().format(num);
      });
      
      // Add a filter to truncate text
      env.addFilter('truncate', (str, length = 50) => {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
      });
    }
  }
};
```

Use in templates:

```nunjucks
{{ post.wordCount | formatNumber }}
{{ post.excerpt | truncate(100) }}
```

### Custom Marked Extension Plugin

Add custom markdown syntax:

```javascript
import { addMarkedExtension } from '@terrymooreii/sia';

export default {
  name: 'custom-markdown',
  version: '1.0.0',
  hooks: {
    beforeBuild: (config, api) => {
      addMarkedExtension({
        renderer: {
          // Custom blockquote renderer
          blockquote(quote) {
            return `<blockquote class="custom-quote">${quote}</blockquote>`;
          }
        }
      });
    }
  }
};
```

### Sitemap Generator Plugin

Generate a sitemap.xml:

```javascript
export default {
  name: 'sitemap-generator',
  version: '1.0.0',
  hooks: {
    afterBuild: async (siteData, config, api) => {
      const siteUrl = config.site.url.replace(/\/$/, '');
      const basePath = config.site.basePath || '';
      
      const urls = [];
      
      // Add homepage
      urls.push({
        loc: `${siteUrl}${basePath}/`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '1.0'
      });
      
      // Add all content items
      for (const [collectionName, items] of Object.entries(siteData.collections)) {
        for (const item of items) {
          urls.push({
            loc: `${siteUrl}${item.url}`,
            lastmod: item.date.toISOString().split('T')[0],
            changefreq: 'monthly',
            priority: collectionName === 'pages' ? '0.8' : '0.6'
          });
        }
      }
      
      // Generate XML
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
      
      api.writeFile(
        api.joinPath(config.outputDir, 'sitemap.xml'),
        sitemap
      );
      
      api.log('Generated sitemap.xml', 'info');
    }
  }
};
```

### Plugin with Dependencies

Plugins can depend on other plugins:

```javascript
export default {
  name: 'enhanced-search',
  version: '1.0.0',
  dependencies: ['search-index'], // Requires search-index plugin
  hooks: {
    afterBuild: async (siteData, config, api) => {
      // This plugin enhances the search index created by search-index plugin
      // It runs after search-index because of the dependency
    }
  }
};
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
hooks: {
  afterBuild: async (siteData, config, api) => {
    try {
      // Plugin logic
    } catch (err) {
      api.log(`Plugin error: ${err.message}`, 'error');
      // Don't throw - let the build continue
    }
  }
}
```

### 2. Configuration Validation

Validate plugin configuration:

```javascript
hooks: {
  beforeBuild: (config, api) => {
    const pluginConfig = config.plugins?.config?.['my-plugin'] || {};
    
    if (pluginConfig.requiredOption === undefined) {
      throw new Error('my-plugin: requiredOption is required');
    }
  }
}
```

### 3. Async Operations

Use async/await for asynchronous operations:

```javascript
hooks: {
  afterBuild: async (siteData, config, api) => {
    const data = await fetchExternalData();
    // Process data
  }
}
```

### 4. Logging

Use the API's logging function:

```javascript
api.log('Processing complete', 'info');
api.log('Warning: something unusual', 'warn');
api.log('Error occurred', 'error');
```

### 5. Documentation

Document your plugin:

- Explain what it does
- List configuration options
- Provide usage examples
- Include version compatibility

### 6. Testing

Test your plugin:

1. Create a test Sia site
2. Add your plugin
3. Run `sia build`
4. Verify the output

### 7. Version Compatibility

Specify Sia version requirements in your plugin's README:

```markdown
## Requirements

- Sia >= 2.0.0
- Node.js >= 18.0.0
```

## Publishing NPM Plugins

1. **Prepare your package:**
   - Write a clear README
   - Add a LICENSE file
   - Test thoroughly

2. **Publish to npm:**
   ```bash
   npm login
   npm publish
   ```

3. **Tag your releases:**
   ```bash
   git tag v1.0.0
   git push --tags
   ```

4. **Update documentation:**
   - Add to Sia's plugin list (if applicable)
   - Share on social media/forums

## Troubleshooting

### Plugin Not Loading

- Check that the plugin file is in `_plugins/` or installed via npm
- Verify the plugin exports a default object with `name` and `version`
- Check console output for error messages

### Hook Not Executing

- Verify the hook name is correct
- Check that the hook function is properly defined
- Ensure the plugin is enabled (`plugins.enabled: true`)

### Configuration Not Working

- Verify configuration is in `config.plugins.config[pluginName]`
- Check that plugin name matches exactly (case-sensitive)
- Validate configuration structure matches `configSchema`

### Build Failing

- Set `plugins.strictMode: false` to see detailed error messages
- Check plugin dependencies are installed
- Verify Node.js version compatibility

## Resources

- [Plugin System Documentation](./plugins.md) - Complete hook reference
- [Sia GitHub Repository](https://github.com/terrymooreii/sia) - Source code and issues
- [Marked Documentation](https://marked.js.org/) - For custom markdown extensions
- [Nunjucks Documentation](https://mozilla.github.io/nunjucks/) - For custom template filters/functions

