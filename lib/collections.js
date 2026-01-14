import { loadAllCollections } from './content.js';
import { executeHook } from './hooks.js';

/**
 * Build tag collections from all content
 */
export function buildTagCollections(collections) {
  const tags = {};
  
  // Iterate through all collections and gather tags
  for (const [collectionName, items] of Object.entries(collections)) {
    for (const item of items) {
      if (item.tags && Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          const normalizedTag = tag.toLowerCase().trim();
          
          if (!tags[normalizedTag]) {
            tags[normalizedTag] = {
              name: tag,
              slug: normalizedTag.replace(/\s+/g, '-'),
              items: [],
              count: 0
            };
          }
          
          tags[normalizedTag].items.push({
            ...item,
            collection: collectionName
          });
          tags[normalizedTag].count++;
        }
      }
    }
  }
  
  // Sort items within each tag by date (newest first)
  for (const tag of Object.values(tags)) {
    tag.items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  
  return tags;
}

/**
 * Get all unique tags sorted by count
 */
export function getAllTags(tagCollections) {
  return Object.values(tagCollections)
    .sort((a, b) => b.count - a.count);
}

/**
 * Paginate an array of items
 */
export function paginate(items, pageSize = 10) {
  const pages = [];
  const totalPages = Math.ceil(items.length / pageSize);
  
  for (let i = 0; i < totalPages; i++) {
    const start = i * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);
    
    pages.push({
      items: pageItems,
      pageNumber: i + 1,
      totalPages,
      totalItems: items.length,
      isFirst: i === 0,
      isLast: i === totalPages - 1,
      previousPage: i > 0 ? i : null,
      nextPage: i < totalPages - 1 ? i + 2 : null,
      startIndex: start,
      endIndex: Math.min(end, items.length)
    });
  }
  
  return pages;
}

/**
 * Generate pagination URLs
 * @param {string} baseUrl - The base URL path (without basePath)
 * @param {object} pagination - Pagination object
 * @param {string} basePath - Optional basePath for subpath hosting
 */
export function getPaginationUrls(baseUrl, pagination, basePath = '') {
  const prefixedBaseUrl = basePath + baseUrl;
  return {
    ...pagination,
    url: pagination.pageNumber === 1 
      ? prefixedBaseUrl 
      : `${prefixedBaseUrl}page/${pagination.pageNumber}/`,
    previousUrl: pagination.previousPage 
      ? (pagination.previousPage === 1 ? prefixedBaseUrl : `${prefixedBaseUrl}page/${pagination.previousPage}/`)
      : null,
    nextUrl: pagination.nextPage 
      ? `${prefixedBaseUrl}page/${pagination.nextPage}/`
      : null
  };
}

/**
 * Build the complete site data structure
 */
export async function buildSiteData(config, api = null) {
  // Load all content collections
  const collections = await loadAllCollections(config, api);
  
  // Build tag collections
  const tagCollections = buildTagCollections(collections);
  const allTags = getAllTags(tagCollections);
  
  console.log(`🏷️  Found ${allTags.length} unique tags`);
  
  // Execute afterTagCollections hook
  await executeHook('afterTagCollections', tagCollections, { config, collections });
  
  // Create paginated collections for listings
  const paginatedCollections = {};
  
  for (const [name, items] of Object.entries(collections)) {
    paginatedCollections[name] = paginate(items, config.pagination.size);
  }
  
  // Create paginated tag pages
  const paginatedTags = {};
  
  for (const [tagSlug, tagData] of Object.entries(tagCollections)) {
    paginatedTags[tagSlug] = paginate(tagData.items, config.pagination.size).map(page => ({
      ...page,
      tag: tagData
    }));
  }
  
  const siteData = {
    config,
    site: config.site,
    collections,
    paginatedCollections,
    tags: tagCollections,
    allTags,
    paginatedTags
  };
  
  return siteData;
}

/**
 * Get recent items across all collections
 */
export function getRecentItems(collections, limit = 10) {
  const allItems = [];
  
  for (const items of Object.values(collections)) {
    allItems.push(...items);
  }
  
  return allItems
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

/**
 * Get related items based on shared tags
 */
export function getRelatedItems(item, collections, limit = 5) {
  const related = [];
  const itemTags = new Set(item.tags.map(t => t.toLowerCase()));
  
  for (const items of Object.values(collections)) {
    for (const candidate of items) {
      if (candidate.slug === item.slug) continue;
      
      const candidateTags = new Set(candidate.tags.map(t => t.toLowerCase()));
      const sharedTags = [...itemTags].filter(t => candidateTags.has(t));
      
      if (sharedTags.length > 0) {
        related.push({
          ...candidate,
          sharedTags: sharedTags.length
        });
      }
    }
  }
  
  return related
    .sort((a, b) => b.sharedTags - a.sharedTags)
    .slice(0, limit);
}

export default {
  buildTagCollections,
  getAllTags,
  paginate,
  getPaginationUrls,
  buildSiteData,
  getRecentItems,
  getRelatedItems
};

