# Front Matter Reference

Front matter is YAML metadata at the beginning of your markdown files. It defines properties like title, date, tags, and more.

## Table of Contents

- [Basic Syntax](#basic-syntax)
- [Common Fields](#common-fields)
- [Posts](#posts)
- [Pages](#pages)
- [Notes](#notes)
- [Permalink Variables](#permalink-variables)
- [Date from Filename](#date-from-filename)
- [Draft Content](#draft-content)
- [Examples](#examples)

---

## Basic Syntax

Front matter is enclosed between triple dashes at the very beginning of the file:

```yaml
---
title: "My Post Title"
date: 2024-12-17
tags: [javascript, tutorial]
---

Your markdown content starts here...
```

**Important:** The front matter must be the first thing in the file with no whitespace before it.

---

## Common Fields

These fields work across all content types (posts, pages, notes):

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `title` | string | Content title | None (required for posts/pages) |
| `date` | date | Publication date | From filename or current date |
| `tags` | array/string | Tags for categorization | `[]` |
| `layout` | string | Template layout to use | From collection config |
| `permalink` | string | Custom URL path | From collection config |
| `draft` | boolean | Exclude from production builds | `false` |
| `excerpt` | string | Custom excerpt text | Auto-generated from content |
| `slug` | string | URL slug | From filename |
| `image` | string | Featured/social image path | None |
| `author` | string | Author name | `site.author` |
| `description` | string | Meta description | `excerpt` |

### Field Details

#### `title`

The display title for the content:

```yaml
title: "Getting Started with JavaScript"
title: 'Single quotes work too'
title: Plain text without quotes
```

#### `date`

Publication date in various formats:

```yaml
date: 2024-12-17
date: 2024-12-17T14:30:00
date: "December 17, 2024"
```

#### `tags`

Tags can be an array or comma-separated string:

```yaml
# Array format (recommended)
tags: [javascript, tutorial, beginner]

# YAML list format
tags:
  - javascript
  - tutorial
  - beginner

# Comma-separated string
tags: javascript, tutorial, beginner
```

#### `layout`

Override the default layout for this content:

```yaml
layout: post      # Uses post.njk
layout: page      # Uses page.njk
layout: custom    # Uses custom.njk (if you've created it)
```

#### `permalink`

Custom URL for this content:

```yaml
permalink: /custom-url/
permalink: /blog/2024/my-post/
permalink: /about-me/
```

#### `excerpt`

Custom excerpt text (otherwise auto-generated from first paragraph):

```yaml
excerpt: "A brief description of this post that appears in listings."
```

#### `slug`

Override the URL slug (otherwise derived from filename):

```yaml
slug: my-custom-slug
```

#### `image`

Featured image for social sharing (Open Graph, Twitter Cards):

```yaml
image: /images/featured.jpg
image: /images/posts/my-post-hero.png
```

#### `author`

Override the site's default author:

```yaml
author: "Jane Doe"
```

#### `description`

Custom meta description (otherwise uses excerpt):

```yaml
description: "Learn how to build modern web applications with this comprehensive guide."
```

---

## Posts

Blog posts are stored in `src/posts/` (or your configured path).

### Default Configuration

```yaml
# From _config.yml
collections:
  posts:
    path: posts              # Or use date variables: posts/:year/:month
    layout: post
    permalink: /blog/:slug/
    sortBy: date
    sortOrder: desc
```

**Date Variables in Paths:**

You can organize posts by date using date variables in the `path` property:

```yaml
collections:
  posts:
    path: posts/:year/:month    # Creates: posts/2024/01/2024-01-15-slug/
    # Or
    path: posts/:year            # Creates: posts/2024/2024-01-15-slug/
```

**Supported variables:**
- `:year` - 4-digit year (e.g., `2024`)
- `:month` - 2-digit month (e.g., `01`, `12`)
- `:day` - 2-digit day (e.g., `01`, `31`)

When you create a new post, it will be automatically placed in the correct date-organized directory based on the current date.

### Typical Post Front Matter

```yaml
---
title: "How to Build a REST API"
date: 2024-12-17
tags: [api, nodejs, tutorial]
excerpt: "Learn how to build a RESTful API using Node.js and Express."
image: /images/posts/rest-api.jpg
---
```

### Post-Specific Considerations

- Posts are sorted by date (newest first by default)
- Posts appear in the blog listing, RSS feed, and tag pages
- The `title` field is typically required for posts
- Default permalink: `/blog/:slug/`

### Full Post Example

```yaml
---
title: "Complete Guide to CSS Grid"
date: 2024-12-17
tags: [css, layout, tutorial]
author: "Jane Doe"
excerpt: "Master CSS Grid with this comprehensive tutorial covering all the fundamentals."
image: /images/css-grid-cover.jpg
draft: false
permalink: /blog/css-grid-guide/
---

Your post content here...
```

---

## Pages

Static pages are stored in `src/pages/` (or your configured path).

### Default Configuration

```yaml
# From _config.yml
collections:
  pages:
    path: pages
    layout: page
    permalink: /:slug/
```

### Typical Page Front Matter

```yaml
---
title: "About Me"
description: "Learn more about who I am and what I do."
---
```

### Page-Specific Considerations

- Pages use the `page` layout by default
- Pages don't have dates by default (though you can add one)
- Default permalink: `/:slug/` (e.g., `/about/`)
- Pages appear in the navigation (first 3 by default in most themes)

### Full Page Example

```yaml
---
title: "Contact"
description: "Get in touch with me for inquiries or collaboration."
layout: page
permalink: /contact/
---

## Contact Me

You can reach me at...
```

---

## Notes

Notes are short-form content stored in `src/notes/` (or your configured path). They're similar to tweets or status updates.

### Default Configuration

```yaml
# From _config.yml
collections:
  notes:
    path: notes              # Or use date variables: notes/:year
    layout: note
    permalink: /notes/:slug/
    sortBy: date
    sortOrder: desc
```

**Date Variables in Paths:**

You can organize notes by date using date variables in the `path` property:

```yaml
collections:
  notes:
    path: notes/:year         # Creates: notes/2024/2024-01-15-note-1234567890/
    # Or
    path: notes/:year/:month  # Creates: notes/2024/01/2024-01-15-note-1234567890/
```

**Supported variables:**
- `:year` - 4-digit year (e.g., `2024`)
- `:month` - 2-digit month (e.g., `01`, `12`)
- `:day` - 2-digit day (e.g., `01`, `31`)

When you create a new note, it will be automatically placed in the correct date-organized directory based on the current date.

### Typical Note Front Matter

Notes often have minimal front matter since they're short-form:

```yaml
---
date: 2024-12-17T14:30:00
tags: [thought, coding]
---

Just discovered a neat CSS trick! :sparkles:
```

### Note-Specific Considerations

- Notes typically don't have titles
- The first paragraph or excerpt is used as the identifier in listings
- Notes are sorted by date (newest first)
- Default permalink: `/notes/:slug/`
- Great for quick thoughts, links, or updates

### Full Note Example

```yaml
---
date: 2024-12-17T09:15:00
tags: [programming, tip]
---

TIL: You can use `console.table()` to display arrays and objects in a nice table format in the browser console. Super useful for debugging! :bulb:
```

---

## Permalink Variables

Permalinks support these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `:slug` | URL slug from filename or front matter | `my-post` |
| `:year` | 4-digit year from date | `2024` |
| `:month` | 2-digit month from date | `12` |
| `:day` | 2-digit day from date | `17` |

### Permalink Examples

```yaml
# Default blog permalink
permalink: /blog/:slug/
# Result: /blog/my-post/

# Date-based permalink
permalink: /blog/:year/:month/:slug/
# Result: /blog/2024/12/my-post/

# Full date permalink
permalink: /:year/:month/:day/:slug/
# Result: /2024/12/17/my-post/

# Custom static permalink
permalink: /articles/javascript-guide/
# Result: /articles/javascript-guide/
```

### Setting Permalinks

Permalinks can be set at three levels:

1. **In `_config.yml`** - Default for all items in a collection
2. **In front matter** - Override for a specific item

```yaml
# _config.yml - collection default
collections:
  posts:
    permalink: /blog/:year/:slug/
```

```yaml
# Individual post front matter - override
---
title: "Special Post"
permalink: /featured/special-post/
---
```

---

## Date from Filename

Sia can extract dates from filenames (or folder names when using `index.md`) using this pattern:

```
YYYY-MM-DD-slug.md
```

or for folder-based content:

```
YYYY-MM-DD-slug/index.md
```

### Examples

| Filename/Folder | Extracted Date | Extracted Slug |
|-----------------|----------------|----------------|
| `2024-12-17-my-post/index.md` | December 17, 2024 | `my-post` |
| `2024-01-05-new-year/index.md` | January 5, 2024 | `new-year` |
| `about/index.md` | Current date | `about` |
| `2024-12-17-my-post.md` | December 17, 2024 | `my-post` (backward compatible) |
| `about.md` | Current date | `about` (backward compatible) |

### Priority

Date resolution follows this priority:

1. `date` in front matter (highest priority)
2. Date extracted from filename
3. Current date (fallback)

Slug resolution:

1. `slug` in front matter (highest priority)
2. Slug extracted from filename or folder name (after date prefix if present)
3. Slugified filename or folder name

---

## Draft Content

Mark content as a draft to exclude it from production builds:

```yaml
---
title: "Work in Progress"
draft: true
---
```

### Draft Behavior

| Environment | `draft: true` | `draft: false` (or omitted) |
|-------------|---------------|------------------------------|
| `sia dev` with `showDrafts: false` | Hidden | Visible |
| `sia dev` with `showDrafts: true` | Visible | Visible |
| `sia build` (production) | Hidden | Visible |

### Enabling Draft Preview

In `_config.yml`:

```yaml
server:
  showDrafts: true
```

When drafts are shown, they display with a "Draft" badge in most themes.

---

## Examples

### Complete Blog Post

```yaml
---
title: "Building a Modern Web Application"
date: 2024-12-17
tags: [javascript, react, tutorial]
author: "John Smith"
excerpt: "A comprehensive guide to building modern web applications with React and TypeScript."
image: /images/posts/modern-web-app.jpg
description: "Learn how to build scalable, maintainable web applications using modern tools and practices."
draft: false
---

## Introduction

Welcome to this comprehensive guide...
```

### Minimal Blog Post

```yaml
---
title: "Quick Tip: CSS Variables"
tags: [css, tips]
---

Here's a quick tip about CSS variables...
```

### Static Page

```yaml
---
title: "About"
description: "Learn about me and my work."
---

## About Me

I'm a software developer...
```

### Note/Tweet

```yaml
---
date: 2024-12-17T10:30:00
tags: [announcement]
---

Just launched my new blog! Check it out at https://example.com :tada:
```

### Post with Custom Permalink

```yaml
---
title: "JavaScript Fundamentals"
date: 2024-12-17
tags: [javascript, fundamentals]
permalink: /learn/javascript/fundamentals/
---

Let's learn JavaScript from the ground up...
```

---

## YAML Tips

### Strings

```yaml
# All of these are valid
title: My Title
title: "My Title"
title: 'My Title'

# Use quotes for special characters
title: "My Title: A Subtitle"
title: "What's New?"
```

### Arrays

```yaml
# Inline format
tags: [one, two, three]

# Block format
tags:
  - one
  - two
  - three
```

### Multi-line Text

```yaml
# Literal block (preserves newlines)
excerpt: |
  This is a multi-line
  excerpt that preserves
  line breaks.

# Folded block (joins lines)
excerpt: >
  This is a long description
  that will be joined into
  a single line.
```

### Dates

```yaml
# Date only
date: 2024-12-17

# Date and time
date: 2024-12-17T14:30:00

# With timezone
date: 2024-12-17T14:30:00-05:00
```
