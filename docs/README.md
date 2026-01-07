# Sia Documentation

Welcome to the Sia documentation. Sia is a simple, powerful static site generator built with JavaScript, featuring markdown content, Nunjucks templates, and multiple themes.

## Documentation

| Guide | Description |
|-------|-------------|
| [Template Reference](template-reference.md) | Nunjucks variables, filters, and template syntax |
| [Markdown Guide](markdown-guide.md) | Markdown syntax and all supported plugins |
| [Front Matter Reference](front-matter.md) | YAML front matter options for posts, pages, and notes |
| [Creating Themes](creating-themes.md) | How to create and customize themes |
| [Plugin System](plugins.md) | Extend Sia with plugins - hooks, API, and configuration |
| [Creating Plugins](creating-plugins.md) | Guide to creating local and npm package plugins |

## Quick Links

### Getting Started

```bash
# Install Sia globally
npm install -g @terrymooreii/sia

# Create a new site
sia init my-blog

# Start development server
cd my-blog
npm run dev
```

### Creating Content

```bash
# Create a new blog post
npx sia new post "My Post Title"

# Create a new page
npx sia new page "About Me"

# Create a short note
npx sia new note "Quick thought"
```

### Building for Production

```bash
npm run build
```

## Features Overview

- **Enhanced Markdown** - Syntax highlighting, emoji support, footnotes, alert boxes, auto-linkify, and more
- **Nunjucks Templates** - Flexible templating with includes, layouts, and custom filters
- **Multiple Content Types** - Blog posts, static pages, and notes (tweet-like short posts)
- **Tags & Categories** - Organize content with tags and auto-generated tag pages
- **Pagination** - Built-in pagination for listing pages
- **Image Support** - Automatic image copying and organization
- **Static Assets** - Support for favicons, fonts, and other static files
- **Live Reload** - Development server with hot reloading
- **Multiple Themes** - Built-in themes (main, minimal, developer, magazine) with light/dark mode
- **Custom Theme Packages** - Create and share themes as npm packages (`sia-theme-*`)
- **Plugin System** - Extend functionality with local or npm plugins (`sia-plugin-*`)
- **RSS Feed** - Automatic RSS feed generation
- **SEO Ready** - Open Graph and Twitter Card meta tags included

## Project Structure

```
my-site/
├── _config.yml          # Site configuration
├── src/
│   ├── posts/           # Blog posts (markdown)
│   │   ├── 2024-12-17-my-post/    # Flat structure (default)
│   │   │   ├── index.md
│   │   │   └── (assets can go here)
│   │   └── 2024/                   # Or date-organized (if path: posts/:year/:month)
│   │       └── 12/
│   │           └── 2024-12-17-my-post/
│   │               ├── index.md
│   │               └── (assets can go here)
│   ├── pages/           # Static pages
│   │   └── about/
│   │       ├── index.md
│   │       └── (assets can go here)
│   ├── notes/           # Short notes/tweets
│   │   ├── 2024-12-17-note-1234567890/  # Flat structure (default)
│   │   │   ├── index.md
│   │   │   └── (assets can go here)
│   │   └── 2024/                    # Or date-organized (if path: notes/:year)
│   │       └── 2024-12-17-note-1234567890/
│   │           ├── index.md
│   │           └── (assets can go here)
│   └── images/          # Images
├── assets/              # Static assets (optional)
├── static/              # Static assets (optional)
├── public/              # Static assets (optional)
├── favicon.ico          # Site favicon (optional)
├── _layouts/            # Custom layouts (optional)
├── _includes/           # Custom includes (optional)
├── _plugins/            # Local plugins (optional)
│   └── my-plugin.js
├── styles/              # Custom CSS (optional)
└── dist/                # Generated output
```

Each post, page, and note is created as a folder containing an `index.md` file. This allows you to organize assets (images, PDFs, etc.) alongside your content in the same folder.

**Note:** You can organize posts and notes by date using date variables in the `path` configuration (e.g., `posts/:year/:month`). See [Date Variables in Paths](#date-variables-in-paths) for details.

## Configuration

Edit `_config.yml` to customize your site:

### Date Variables in Paths

You can organize posts and notes by date using date variables in the `path` property:

```yaml
collections:
  posts:
    path: posts/:year/:month    # Organizes posts by year and month
    # New posts will be created in: posts/2024/01/2024-01-15-slug/
  
  notes:
    path: notes/:year            # Organizes notes by year only
    # New notes will be created in: notes/2024/2024-01-15-note-1234567890/
```

**Supported date variables:**
- `:year` - 4-digit year (e.g., `2024`)
- `:month` - 2-digit month (e.g., `01`, `12`)
- `:day` - 2-digit day (e.g., `01`, `31`)

**Examples:**
- `posts/:year/:month` → `posts/2024/01/`
- `posts/:year` → `posts/2024/`
- `notes/:year/:month/:day` → `notes/2024/01/15/`

When loading collections, Sia automatically searches recursively through all date-organized directories, so existing content will be found regardless of the path structure.

```yaml
site:
  title: "My Blog"
  description: "A personal blog"
  url: "https://example.com"
  author: "Your Name"

theme:
  name: main  # Built-in: main, minimal, developer, magazine
              # Or use external: my-theme (loads sia-theme-my-theme)

input: src
output: dist

collections:
  posts:
    path: posts              # Or use date variables: posts/:year/:month
    layout: post
    permalink: /blog/:slug/
    sortBy: date
    sortOrder: desc
  pages:
    path: pages
    layout: page
    permalink: /:slug/
  notes:
    path: notes              # Or use date variables: notes/:year
    layout: note
    permalink: /notes/:slug/

pagination:
  size: 10

server:
  port: 3000
  showDrafts: false

assets:
  css: []  # Custom CSS files (paths relative to root)
  js: []   # Custom JavaScript files (paths relative to root)

plugins:
  enabled: true          # Master switch for plugins
  strictMode: false      # Fail build on plugin errors
  order: []              # Explicit plugin execution order (optional)
  config: {}             # Plugin-specific configuration
```

## Custom CSS and JavaScript

You can inject custom CSS and JavaScript files into your theme by defining them in `_config.yml`:

```yaml
assets:
  css:
    - custom/styles.css
    - vendor/library.css
  js:
    - custom/script.js
    - vendor/analytics.js
```

Files are specified as paths relative to your project root. During build, CSS files are copied to `dist/styles/` and JavaScript files to `dist/scripts/`, preserving directory structure. Custom CSS is injected after theme styles (allowing overrides), and JavaScript is injected before the closing `</body>` tag.

**Example:**
```yaml
assets:
  css:
    - assets/custom.css
    - vendor/prism.css
  js:
    - assets/analytics.js
    - vendor/prism.js
```

This will:
- Copy `assets/custom.css` → `dist/styles/assets/custom.css`
- Copy `vendor/prism.css` → `dist/styles/vendor/prism.css`
- Copy `assets/analytics.js` → `dist/scripts/assets/analytics.js`
- Copy `vendor/prism.js` → `dist/scripts/vendor/prism.js`

And inject them into all pages automatically.

## Plugin System

Sia includes a powerful plugin system that allows you to extend functionality at key points in the build lifecycle. Plugins can:

- Transform content during parsing
- Generate additional files (search indexes, sitemaps, etc.)
- Add custom Marked extensions for markdown processing
- Register custom Nunjucks template filters and functions
- Modify site data before rendering
- Perform post-build tasks

### Using Plugins

Plugins can be local (in `_plugins/` directory) or npm packages (with `sia-plugin-*` naming):

```bash
# Install an npm plugin
npm install sia-plugin-search

# Or create a local plugin in _plugins/my-plugin.js
```

Configure plugins in `_config.yml`:

```yaml
plugins:
  enabled: true
  config:
    sia-plugin-search:
      outputPath: search-index.json
```

See the [Plugin System documentation](plugins.md) for complete details and the [Creating Plugins guide](creating-plugins.md) for examples.

## Static Assets

Sia automatically copies static assets during the build process. You can place static files in any of these locations:

- **`assets/`** - Place files in `assets/` at the project root
- **`static/`** - Place files in `static/` at the project root
- **`public/`** - Place files in `public/` at the project root
- **Root directory** - Place `favicon.ico` directly in the project root

All files from these directories will be copied to the `dist/` folder during build, preserving their directory structure.

### Supported File Types

Static assets include:
- **Favicons** - `.ico` files (favicon.ico can be in root or asset directories)
- **Fonts** - `.woff`, `.woff2`, `.ttf`, `.eot`
- **Documents** - `.pdf`, `.txt`, `.json`, `.xml`
- **Scripts** - `.js` files
- **Stylesheets** - `.css` files (though custom CSS is better placed in `styles/`)
- **Images** - All image formats (though images are better placed in `src/images/`)

### Example Structure

```
my-site/
├── assets/
│   ├── favicon.ico
│   ├── robots.txt
│   ├── manifest.json
│   └── fonts/
│       └── custom-font.woff2
├── static/
│   └── documents/
│       └── resume.pdf
└── favicon.ico  # Also supported in root
```

During build, these will be copied to:
```
dist/
├── assets/
│   ├── favicon.ico
│   ├── robots.txt
│   ├── manifest.json
│   └── fonts/
│       └── custom-font.woff2
├── static/
│   └── documents/
│       └── resume.pdf
└── favicon.ico
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `sia init [directory]` | Create a new site |
| `sia dev` | Start development server with live reload |
| `sia build` | Build for production |
| `sia new post "Title"` | Create a new blog post |
| `sia new page "Title"` | Create a new page |
| `sia new note "Content"` | Create a new note |
| `sia theme <name>` | Create a new theme package |
| `sia migrate` | Migrate standalone .md files to folder structure |

## License

MIT
