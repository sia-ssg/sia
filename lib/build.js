import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { buildSiteData, paginate, getPaginationUrls } from './collections.js';
import { createTemplateEngine, renderTemplate } from './templates.js';
import { copyImages, copyDefaultStyles, copyStaticAssets, copyCustomAssets, copyContentAssets, writeFile, ensureDir } from './assets.js';
import { resolveTheme } from './theme-resolver.js';
import { loadPlugins } from './plugins.js';
import { initializeHooks, registerPluginHooks, executeHook } from './hooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Clean the output directory
 */
function cleanOutput(config) {
  if (existsSync(config.outputDir)) {
    rmSync(config.outputDir, { recursive: true, force: true });
  }
  mkdirSync(config.outputDir, { recursive: true });
  console.log('🧹 Cleaned output directory');
}

/**
 * Render and write a single content item
 */
function renderContentItem(env, item, siteData) {
  const templateName = `${item.layout}.njk`;
  
  const html = renderTemplate(env, templateName, {
    ...siteData,
    page: item,
    content: item.content,
    title: item.title
  });
  
  writeFile(item.outputPath, html);
  
  // Copy assets from content folder to output directory
  const contentFolder = dirname(item.filePath);
  const outputDir = dirname(item.outputPath);
  return copyContentAssets(contentFolder, outputDir);
}

/**
 * Render paginated listing pages
 */
function renderPaginatedPages(env, siteData, baseUrl, outputBase, templateName, extraData = {}) {
  const { paginatedCollections } = siteData;
  const basePath = siteData.config.site.basePath || '';
  
  // Get all posts for the main blog listing
  const posts = siteData.collections.posts || [];
  const pages = paginate(posts, siteData.config.pagination.size);
  
  for (const page of pages) {
    const pagination = getPaginationUrls(baseUrl, page, basePath);
    
    const html = renderTemplate(env, templateName, {
      ...siteData,
      pagination,
      posts: page.items,
      ...extraData
    });
    
    const outputPath = page.pageNumber === 1
      ? join(outputBase, 'index.html')
      : join(outputBase, 'page', String(page.pageNumber), 'index.html');
    
    writeFile(outputPath, html);
  }
  
  return pages.length;
}

/**
 * Render tag pages
 */
function renderTagPages(env, siteData) {
  const { tags, allTags, config } = siteData;
  const basePath = config.site.basePath || '';
  
  // Render main tags listing page
  const tagsHtml = renderTemplate(env, 'tags.njk', {
    ...siteData,
    title: 'Tags'
  });
  writeFile(join(config.outputDir, 'tags', 'index.html'), tagsHtml);
  
  // Render individual tag pages with pagination
  for (const [, tagData] of Object.entries(tags)) {
    const tagPages = paginate(tagData.items, config.pagination.size);
    const baseUrl = `/tags/${tagData.slug}/`;
    
    for (const page of tagPages) {
      const pagination = getPaginationUrls(baseUrl, page, basePath);
      
      const html = renderTemplate(env, 'tag.njk', {
        ...siteData,
        tag: tagData,
        pagination,
        posts: page.items,
        title: `Tagged: ${tagData.name}`
      });
      
      const outputPath = page.pageNumber === 1
        ? join(config.outputDir, 'tags', tagData.slug, 'index.html')
        : join(config.outputDir, 'tags', tagData.slug, 'page', String(page.pageNumber), 'index.html');
      
      writeFile(outputPath, html);
    }
  }
  
  console.log(`🏷️  Generated ${Object.keys(tags).length} tag pages`);
}

/**
 * Render the homepage
 */
function renderHomepage(env, siteData) {
  const html = renderTemplate(env, 'index.njk', {
    ...siteData,
    title: siteData.site.title
  });
  
  writeFile(join(siteData.config.outputDir, 'index.html'), html);
  console.log('🏠 Generated homepage');
}

/**
 * Render the blog listing with pagination
 */
function renderBlogListing(env, siteData) {
  const { config } = siteData;
  const blogDir = join(config.outputDir, 'blog');
  
  const pageCount = renderPaginatedPages(
    env,
    siteData,
    '/blog/',
    blogDir,
    'blog.njk'
  );
  
  console.log(`📝 Generated ${pageCount} blog listing pages`);
}

/**
 * Render notes listing
 */
function renderNotesListing(env, siteData) {
  const { config, collections } = siteData;
  const notes = collections.notes || [];
  const basePath = config.site.basePath || '';
  
  if (notes.length === 0) return;
  
  const notesDir = join(config.outputDir, 'notes');
  const pages = paginate(notes, config.pagination.size);
  
  for (const page of pages) {
    const pagination = getPaginationUrls('/notes/', page, basePath);
    
    const html = renderTemplate(env, 'notes.njk', {
      ...siteData,
      pagination,
      notes: page.items,
      title: 'Notes'
    });
    
    const outputPath = page.pageNumber === 1
      ? join(notesDir, 'index.html')
      : join(notesDir, 'page', String(page.pageNumber), 'index.html');
    
    writeFile(outputPath, html);
  }
  
  console.log(`📋 Generated ${pages.length} notes listing pages`);
}

/**
 * Generate RSS feed
 */
function renderRSSFeed(env, siteData) {
  const { config, collections } = siteData;
  const posts = collections.posts || [];
  
  const rss = renderTemplate(env, 'feed.njk', {
    ...siteData,
    posts,
    buildDate: new Date().toUTCString()
  });
  
  writeFile(join(config.outputDir, 'feed.xml'), rss);
  console.log('📡 Generated RSS feed');
}

/**
 * Create plugin API object for hooks
 */
function createPluginAPI(config) {
  return {
    config,
    writeFile: (path, content) => {
      writeFile(path, content);
    },
    readFile: (path) => {
      return readFileSync(path, 'utf-8');
    },
    joinPath: (...paths) => {
      return join(...paths);
    },
    log: (message, level = 'info') => {
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} ${message}`);
    }
  };
}

/**
 * Main build function
 */
export async function build(options = {}) {
  const startTime = Date.now();
  
  console.log('\n⚡ Sia - Building site...\n');
  
  // Load configuration
  const config = loadConfig(options.rootDir || process.cwd());
  
  // Initialize plugin system
  initializeHooks();
  
  // Load plugins
  let plugins = [];
  try {
    console.log('🔌 Loading plugins...');
    plugins = await loadPlugins(config);
    
    // Register plugin hooks
    if (plugins.length > 0) {
      registerPluginHooks(plugins);
    }
  } catch (err) {
    if (config.plugins?.strictMode) {
      throw err;
    }
    console.warn(`⚠️  Plugin loading error: ${err.message}`);
  }
  
  // Execute afterConfigLoad hook
  const pluginAPI = createPluginAPI(config);
  await executeHook('afterConfigLoad', config, pluginAPI);
  
  // Execute beforeBuild hook
  await executeHook('beforeBuild', config, pluginAPI);
  
  // Only show drafts in dev mode if explicitly enabled in config
  // For production builds, always disable showDrafts
  if (!options.devMode) {
    if (config.server) {
      config.server.showDrafts = false;
    }
  }
  // If devMode is true, use the config value (which defaults to false)
  
  // Clean output directory if requested
  if (options.clean !== false) {
    cleanOutput(config);
  }
  
  // Resolve theme once for both templates and assets
  const themeName = config.theme?.name || 'main';
  const resolvedTheme = resolveTheme(themeName, config.rootDir);
  
  // Build site data (collections, tags, etc.)
  const siteData = await buildSiteData(config, pluginAPI);
  
  // Execute afterContentLoad hook
  await executeHook('afterContentLoad', siteData, config, pluginAPI);
  
  // Execute beforeSiteData hook (allows modification of siteData)
  await executeHook('beforeSiteData', siteData, config, pluginAPI);
  
  // Copy custom assets and add to siteData
  const customAssets = copyCustomAssets(config);
  siteData.customAssets = customAssets;
  
  // Create template engine with resolved theme
  const env = await createTemplateEngine(config, resolvedTheme);
  
  // Execute beforeRender hook
  await executeHook('beforeRender', siteData, config, pluginAPI);
  
  // Render all content items
  let itemCount = 0;
  let totalContentAssets = 0;
  
  for (const [collectionName, items] of Object.entries(siteData.collections)) {
    for (const item of items) {
      const assetsCopied = renderContentItem(env, item, siteData);
      totalContentAssets += assetsCopied;
      itemCount++;
    }
  }
  
  console.log(`📄 Generated ${itemCount} content pages`);
  
  if (totalContentAssets > 0) {
    console.log(`📦 Copied ${totalContentAssets} asset(s) from content folders`);
  }
  
  // Render listing pages
  renderHomepage(env, siteData);
  renderBlogListing(env, siteData);
  renderNotesListing(env, siteData);
  renderTagPages(env, siteData);
  
  // Generate RSS feed
  renderRSSFeed(env, siteData);
  
  // Execute afterRender hook
  await executeHook('afterRender', siteData, config, pluginAPI);
  
  // Copy assets
  copyImages(config);
  copyDefaultStyles(config, resolvedTheme);
  // Custom assets already copied above and added to siteData
  copyStaticAssets(config);
  
  // Execute afterBuild hook
  await executeHook('afterBuild', siteData, config, pluginAPI);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Build complete in ${duration}s`);
  console.log(`📁 Output: ${config.outputDir}\n`);
  
  return { config, siteData, plugins };
}

/**
 * Build command handler for CLI
 */
export async function buildCommand(options) {
  try {
    await build({
      clean: options.clean !== false,
      rootDir: process.cwd()
    });
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
}

export default { build, buildCommand };

