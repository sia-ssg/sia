import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, basename, extname, dirname } from 'path';
import matter from 'gray-matter';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { markedEmoji } from 'marked-emoji';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import footnote from 'marked-footnote';
import { markedSmartypants } from 'marked-smartypants';
import markedAlert from 'marked-alert';
import markedLinkifyIt from 'marked-linkify-it';
import hljs from 'highlight.js';
import { executeHook, executeHookWithResult, getHookRegistry } from './hooks.js';

/**
 * Default emoji map for shortcode support
 * Common emojis - extend as needed
 */
const emojis = {
  smile: '😄',
  grinning: '😀',
  joy: '😂',
  heart: '❤️',
  thumbsup: '👍',
  thumbsdown: '👎',
  clap: '👏',
  fire: '🔥',
  rocket: '🚀',
  star: '⭐',
  sparkles: '✨',
  check: '✅',
  x: '❌',
  warning: '⚠️',
  bulb: '💡',
  memo: '📝',
  book: '📖',
  link: '🔗',
  eyes: '👀',
  thinking: '🤔',
  wave: '👋',
  pray: '🙏',
  muscle: '💪',
  tada: '🎉',
  party: '🥳',
  coffee: '☕',
  bug: '🐛',
  wrench: '🔧',
  hammer: '🔨',
  gear: '⚙️',
  lock: '🔒',
  key: '🔑',
  zap: '⚡',
  bomb: '💣',
  gem: '💎',
  trophy: '🏆',
  medal: '🏅',
  crown: '👑',
  sun: '☀️',
  moon: '🌙',
  cloud: '☁️',
  rain: '🌧️',
  snow: '❄️',
  earth: '🌍',
  tree: '🌳',
  flower: '🌸',
  apple: '🍎',
  pizza: '🍕',
  beer: '🍺',
  wine: '🍷',
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
  fish: '🐟',
  whale: '🐳',
  snake: '🐍',
  turtle: '🐢',
  octopus: '🐙',
  crab: '🦀',
  shrimp: '🦐',
  100: '💯',
  '+1': '👍',
  '-1': '👎',
};

/**
 * Configure marked with syntax highlighting, emoji support, and enhanced markdown features
 */
let marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (err) {
          console.warn(`Highlight.js error for language "${lang}":`, err.message);
        }
      }
      // Auto-detect language if not specified
      try {
        return hljs.highlightAuto(code).value;
      } catch (err) {
        return code;
      }
    }
  }),
  markedEmoji({
    emojis,
    renderer: (token) => token.emoji
  }),
  gfmHeadingId(),
  footnote(),
  markedSmartypants(),
  markedAlert(),
  markedLinkifyIt()
);

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: false
});

/**
 * Add a Marked extension (for plugins)
 */
export function addMarkedExtension(extension) {
  marked.use(extension);
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - VIDEO_ID (if it's just an 11-character alphanumeric string)
 */
function extractYouTubeId(url) {
  if (!url) return null;
  
  // If it's just a video ID (11 characters, alphanumeric)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  // Match various YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Convert YouTube URLs in HTML to responsive embeds
 */
function embedYouTubeVideos(html) {
  if (!html) return html;
  
  // Pattern to match YouTube links in HTML
  // Matches: <a href="...youtube...">...</a>
  const linkPattern = /<a\s+[^>]*href=["']([^"']*youtube[^"']*)["'][^>]*>([^<]*)<\/a>/gi;
  
  return html.replace(linkPattern, (match, url, linkText) => {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      // Return responsive YouTube embed
      return `<div class="youtube-embed"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return match; // Return original if not a valid YouTube URL
  });
}

/**
 * Extract Giphy GIF ID from various URL formats
 * Supports:
 * - https://giphy.com/gifs/ID
 * - https://gph.is/g/ID
 * - https://giphy.com/embed/ID
 * - https://media.giphy.com/media/ID/giphy.gif (extracts ID)
 */
function extractGiphyId(url) {
  if (!url) return null;
  
  // Match Giphy URL patterns
  const patterns = [
    /giphy\.com\/gifs\/([a-zA-Z0-9]+)/,
    /giphy\.com\/embed\/([a-zA-Z0-9]+)/,
    /gph\.is\/g\/([a-zA-Z0-9]+)/,
    /media\.giphy\.com\/media\/([a-zA-Z0-9]+)\//
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Convert Giphy URLs in HTML to responsive embeds
 */
function embedGiphyGifs(html) {
  if (!html) return html;
  
  // Pattern to match Giphy links in HTML
  const linkPattern = /<a\s+[^>]*href=["']([^"']*giphy[^"']*)["'][^>]*>([^<]*)<\/a>/gi;
  
  return html.replace(linkPattern, (match, url, linkText) => {
    const gifId = extractGiphyId(url);
    if (gifId) {
      // Return responsive Giphy embed
      return `<div class="giphy-embed"><iframe src="https://giphy.com/embed/${gifId}" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div>`;
    }
    return match;
  });
}

// Override the link renderer to handle YouTube and Giphy URLs
marked.use({
  renderer: {
    link(href, s, text) {
      const videoId = extractYouTubeId(href);
      
      if (videoId) {
        // Return responsive YouTube embed instead of a link
        return `<div class="youtube-embed"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
      
      const gifId = extractGiphyId(href);
      
      if (gifId) {
        // Return responsive Giphy embed instead of a link
        return `<div class="giphy-embed"><iframe src="https://giphy.com/embed/${gifId}" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div>`;
      }
      
      // Use default link rendering for non-YouTube/Giphy links
      text = text || href;
      const title = text ? ` title="${text}"` : '';
      return `<a href="${href}"${title}>${text}</a>`;
    }
  }
});

/**
 * Safely truncate markdown text without breaking inline formatting
 * Avoids cutting in the middle of links, bold, italic, code, images, etc.
 */
function truncateMarkdownSafely(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find all inline markdown element ranges to avoid cutting inside them
  const inlinePatterns = [
    /!\[([^\]]*)\]\([^)]*\)/g,  // Images ![alt](url) - must come before links
    /\[([^\]]*)\]\([^)]*\)/g,   // Links [text](url)
    /\[([^\]]*)\]\[[^\]]*\]/g,  // Reference links [text][ref]
    /\*\*([^*]+)\*\*/g,         // Bold **text**
    /__([^_]+)__/g,             // Bold __text__
    /\*([^*\n]+)\*/g,           // Italic *text*
    /_([^_\n]+)_/g,             // Italic _text_
    /`([^`]+)`/g,               // Inline code `code`
    /~~([^~]+)~~/g,             // Strikethrough ~~text~~
  ];
  
  // Collect all ranges where inline elements exist
  const ranges = [];
  for (const pattern of inlinePatterns) {
    let match;
    // Reset lastIndex for each pattern
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  
  // Sort ranges by start position
  ranges.sort((a, b) => a.start - b.start);
  
  // Find the best truncation point
  let truncateAt = maxLength;
  
  // Check if our target position is inside any markdown element
  for (const range of ranges) {
    if (truncateAt > range.start && truncateAt < range.end) {
      // We're inside this element - decide whether to include it or exclude it
      if (range.end <= maxLength + 50) {
        // Include the whole element if it doesn't extend too far past our limit
        truncateAt = range.end;
      } else {
        // Otherwise, truncate before this element starts
        truncateAt = range.start;
      }
      break;
    }
  }
  
  // Try to break at a word boundary for cleaner excerpts
  if (truncateAt > 0) {
    const lastSpace = text.lastIndexOf(' ', truncateAt);
    // Only use word boundary if it's reasonably close to our target
    if (lastSpace > truncateAt - 30 && lastSpace > maxLength * 0.5) {
      truncateAt = lastSpace;
    }
  }
  
  return text.substring(0, truncateAt).trim() + '...';
}

/**
 * Expand date variables in a path template
 * Supports :year, :month, :day variables
 * @param {string} pathTemplate - Path template with date variables (e.g., "posts/:year/:month")
 * @param {Date} date - Date to use for expansion
 * @returns {string} Expanded path
 */
export function expandDatePath(pathTemplate, date) {
  if (!pathTemplate || typeof pathTemplate !== 'string') {
    return pathTemplate;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return pathTemplate
    .replace(/:year/g, year)
    .replace(/:month/g, month)
    .replace(/:day/g, day);
}

/**
 * Get base path from a path template (removes date variables for recursive searching)
 * @param {string} pathTemplate - Path template with date variables
 * @returns {string} Base path (everything before the first date variable)
 */
export function getBasePath(pathTemplate) {
  if (!pathTemplate || typeof pathTemplate !== 'string') {
    return pathTemplate;
  }
  
  // Find the first occurrence of a date variable (can be at start or after a slash)
  const firstVariable = pathTemplate.match(/:(\w+)/);
  if (!firstVariable) {
    // No date variables, return as-is
    return pathTemplate;
  }
  
  // Return everything before the first date variable
  return pathTemplate.substring(0, firstVariable.index);
}

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract slug from filename (removes date prefix if present)
 * If the file is index.md, extracts from parent directory name instead
 */
export function getSlugFromFilename(filename) {
  // Remove extension
  const name = basename(filename, extname(filename));
  
  // If file is index.md, extract from parent directory name
  if (name === 'index') {
    const parentDir = dirname(filename);
    const parentDirName = basename(parentDir);
    
    // Check for date prefix pattern: YYYY-MM-DD-slug
    const datePattern = /^\d{4}-\d{2}-\d{2}-(.+)$/;
    const match = parentDirName.match(datePattern);
    
    if (match) {
      return match[1];
    }
    
    return slugify(parentDirName);
  }
  
  // Check for date prefix pattern: YYYY-MM-DD-slug
  const datePattern = /^\d{4}-\d{2}-\d{2}-(.+)$/;
  const match = name.match(datePattern);
  
  if (match) {
    return match[1];
  }
  
  return slugify(name);
}

/**
 * Extract date from filename if present
 * If the file is index.md, extracts from parent directory name instead
 */
export function getDateFromFilename(filename) {
  const name = basename(filename, extname(filename));
  
  // If file is index.md, extract from parent directory name
  if (name === 'index') {
    const parentDir = dirname(filename);
    const parentDirName = basename(parentDir);
    const datePattern = /^(\d{4}-\d{2}-\d{2})/;
    const match = parentDirName.match(datePattern);
    
    if (match) {
      // Parse as local date, not UTC
      const [year, month, day] = match[1].split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    return null;
  }
  
  const datePattern = /^(\d{4}-\d{2}-\d{2})/;
  const match = name.match(datePattern);
  
  if (match) {
    // Parse as local date, not UTC
    const [year, month, day] = match[1].split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  return null;
}

/**
 * Convert relative image and link paths to absolute paths based on base URL
 * @param {string} html - HTML content with potential relative paths
 * @param {string} baseUrl - Base URL for the content item (e.g., '/blog/my-post/')
 * @returns {string} HTML with absolute paths
 */
function fixRelativePaths(html, baseUrl) {
  if (!html || !baseUrl) return html;
  
  // Normalize baseUrl to ensure it ends with a slash
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  
  // Helper function to convert relative path to absolute
  const makeAbsolute = (path) => {
    // Skip if it's already an absolute URL (http://, https://) or absolute path (/)
    if (/^(https?:|\/|#|mailto:)/.test(path)) {
      return path;
    }
    
    // Convert relative path to absolute path
    // Remove leading ./ if present
    const cleanPath = path.replace(/^\.\//, '');
    
    // Combine base URL with path
    return normalizedBaseUrl + cleanPath;
  };
  
  // Fix relative image paths
  html = html.replace(
    /<img\s+([^>]*?)(?:src\s*=\s*(["'])([^"']+)\2)([^>]*)>/gi,
    (match, beforeAttrs, quote, src, afterAttrs) => {
      const absolutePath = makeAbsolute(src);
      
      // Reconstruct the img tag with the absolute path
      const before = beforeAttrs ? beforeAttrs.trim() + ' ' : '';
      const after = afterAttrs ? ' ' + afterAttrs.trim() : '';
      return `<img ${before}src=${quote}${absolutePath}${quote}${after}>`;
    }
  );
  
  // Fix relative link paths (but skip anchor links and external URLs)
  html = html.replace(
    /<a\s+([^>]*?)(?:href\s*=\s*(["'])([^"']+)\2)([^>]*)>/gi,
    (match, beforeAttrs, quote, href, afterAttrs) => {
      const absolutePath = makeAbsolute(href);
      
      // Reconstruct the link tag with the absolute path
      const before = beforeAttrs ? beforeAttrs.trim() + ' ' : '';
      const after = afterAttrs ? ' ' + afterAttrs.trim() : '';
      return `<a ${before}href=${quote}${absolutePath}${quote}${after}>`;
    }
  );
  
  return html;
}

/**
 * Parse a markdown file with front matter
 */
export async function parseContent(filePath, options = {}) {
  const { config, api } = options;
  let content = readFileSync(filePath, 'utf-8');
  
  // Execute beforeParse hook
  const beforeParseContext = { filePath, config, api };
  content = await executeHookWithResult('beforeContentParse', content, beforeParseContext);
  
  const { data: frontMatter, content: markdown } = matter(content);
  
  // Execute beforeMarkdown hook
  let processedMarkdown = await executeHookWithResult('beforeMarkdown', markdown, { filePath, frontMatter, config, api });
  
  // Parse markdown to HTML
  let html = marked.parse(processedMarkdown);
  
  // Execute afterMarkdown hook
  html = await executeHookWithResult('afterMarkdown', html, { filePath, frontMatter, config, api });
  
  // Convert any remaining YouTube/Giphy links to embeds (handles autolinked URLs)
  html = embedYouTubeVideos(html);
  html = embedGiphyGifs(html);
  
  // Get slug from front matter or filename
  const slug = frontMatter.slug || getSlugFromFilename(filePath);
  
  // Get date from front matter or filename
  let date = frontMatter.date;
  if (date) {
    // If it's a date-only string (YYYY-MM-DD), parse as local date
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(date);
    }
  } else {
    date = getDateFromFilename(filePath) || new Date();
  }
  
  // Extract excerpt (first paragraph or custom excerpt)
  let excerpt = frontMatter.excerpt;
  if (!excerpt) {
    const firstParagraph = markdown.split('\n\n')[0];
    excerpt = firstParagraph.replace(/^#+\s+.+\n?/, '').trim();
    // Limit excerpt length using safe truncation that preserves markdown syntax
    if (excerpt.length > 200) {
      excerpt = truncateMarkdownSafely(excerpt, 200);
    }
  }
  
  // Create HTML version of excerpt for templates that need rendered output
  let excerptHtml = marked.parse(excerpt);
  // Clean up the HTML (remove wrapping <p> tags for inline use)
  excerptHtml = excerptHtml.replace(/^<p>/, '').replace(/<\/p>\n?$/, '');
  
  // Normalize tags to array
  let tags = frontMatter.tags || [];
  if (typeof tags === 'string') {
    tags = tags.split(',').map(t => t.trim());
  }
  
  const item = {
    ...frontMatter,
    slug,
    date,
    excerpt,
    excerptHtml,
    tags,
    content: html,
    rawContent: markdown,
    filePath,
    draft: frontMatter.draft || false
  };
  
  // Execute afterContentParse hook (allows modification of item)
  const afterParseContext = { filePath, config, api };
  const modifiedItem = await executeHookWithResult('afterContentParse', item, afterParseContext);
  
  return modifiedItem;
}

/**
 * Recursively get all markdown files in a directory
 */
export function getMarkdownFiles(dir) {
  const files = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (item.endsWith('.md') || item.endsWith('.markdown')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Load all content from a collection directory
 */
export async function loadCollection(config, collectionName, api = null) {
  const collectionConfig = config.collections[collectionName];
  
  if (!collectionConfig) {
    console.warn(`Collection "${collectionName}" not found in config`);
    return [];
  }
  
  // If path contains date variables, use base path for recursive searching
  // Otherwise use the path as-is
  const pathTemplate = collectionConfig.path;
  const basePath = getBasePath(pathTemplate);
  const collectionDir = join(config.inputDir, basePath);
  const files = getMarkdownFiles(collectionDir);
  
  const items = await Promise.all(
    files.map(async (filePath) => {
      try {
        const item = await parseContent(filePath, { config, api });
        
        // Add collection-specific metadata
        item.collection = collectionName;
        item.layout = item.layout || collectionConfig.layout;
        
        // Generate permalink
        let permalink = item.permalink || collectionConfig.permalink || '/:slug/';
        permalink = permalink
          .replace(':slug', item.slug)
          .replace(':year', item.date.getFullYear())
          .replace(':month', String(item.date.getMonth() + 1).padStart(2, '0'))
          .replace(':day', String(item.date.getDate()).padStart(2, '0'));
        
        // Prepend basePath for subpath hosting support
        const basePath = config.site.basePath || '';
        item.url = basePath + permalink;
        item.outputPath = join(config.outputDir, permalink, 'index.html');
        
        // Fix relative image and link paths in content and excerptHtml
        // This ensures images and links work on both individual pages and list pages
        item.content = fixRelativePaths(item.content, item.url);
        item.excerptHtml = fixRelativePaths(item.excerptHtml, item.url);
        
        return item;
      } catch (err) {
        console.error(`Error parsing ${filePath}:`, err.message);
        return null;
      }
    })
  );
  
  const filteredItems = items.filter(item => {
    if (item === null) return false;
    // Include drafts if showDrafts is enabled in server config
    if (item.draft && config.server?.showDrafts) {
      return true;
    }
    // Otherwise, exclude drafts
    return !item.draft;
  });
  
  // Sort items
  const sortBy = collectionConfig.sortBy || 'date';
  const sortOrder = collectionConfig.sortOrder || 'desc';
  
  filteredItems.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (aVal instanceof Date && bVal instanceof Date) {
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'desc' 
        ? bVal.localeCompare(aVal) 
        : aVal.localeCompare(bVal);
    }
    
    return 0;
  });
  
  return filteredItems;
}

/**
 * Load all collections defined in config
 */
export async function loadAllCollections(config, api = null) {
  const collections = {};
  
  for (const name of Object.keys(config.collections)) {
    collections[name] = await loadCollection(config, name, api);
    console.log(`📚 Loaded ${collections[name].length} items from "${name}" collection`);
  }
  
  return collections;
}

export default {
  parseContent,
  slugify,
  getSlugFromFilename,
  getDateFromFilename,
  getMarkdownFiles,
  loadCollection,
  loadAllCollections,
  addMarkedExtension,
  expandDatePath,
  getBasePath
};

