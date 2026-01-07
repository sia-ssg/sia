import prompts from 'prompts';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadConfig } from './config.js';
import { slugify, expandDatePath } from './content.js';

/**
 * Get current date in YYYY-MM-DD format
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current ISO date string
 */
function getISODate() {
  return new Date().toISOString();
}

/**
 * Parse tags string into array
 */
function parseTags(tagsInput) {
  if (!tagsInput || tagsInput.trim() === '') {
    return [];
  }
  return tagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Format tags for YAML
 */
function formatTags(tags) {
  if (!tags || tags.length === 0) {
    return '[]';
  }
  return `[${tags.join(', ')}]`;
}

/**
 * Create a new post
 */
function createPost(config, options) {
  const slug = slugify(options.title);
  const date = getDateString();
  const folderName = `${date}-${slug}`;
  const now = new Date();
  const pathTemplate = config.collections.posts?.path || 'posts';
  const expandedPath = expandDatePath(pathTemplate, now);
  const postsDir = join(config.inputDir, expandedPath);
  const postFolder = join(postsDir, folderName);
  const filePath = join(postFolder, 'index.md');
  
  // Ensure directories exist
  if (!existsSync(postsDir)) {
    mkdirSync(postsDir, { recursive: true });
  }
  if (!existsSync(postFolder)) {
    mkdirSync(postFolder, { recursive: true });
  }
  
  let frontMatter = `---
title: "${options.title}"
date: ${getISODate()}
tags: ${formatTags(options.tags)}`;

  if (options.excerpt) {
    frontMatter += `\nexcerpt: "${options.excerpt}"`;
  }

  if (options.draft) {
    frontMatter += `\ndraft: true`;
  }

  frontMatter += `\n---

${options.content || 'Write your post content here...'}
`;
  
  writeFileSync(filePath, frontMatter, 'utf-8');
  return filePath;
}

/**
 * Create a new page
 */
function createPage(config, options) {
  const slug = slugify(options.title);
  const folderName = slug;
  const pagesDir = join(config.inputDir, config.collections.pages?.path || 'pages');
  const pageFolder = join(pagesDir, folderName);
  const filePath = join(pageFolder, 'index.md');
  
  // Ensure directories exist
  if (!existsSync(pagesDir)) {
    mkdirSync(pagesDir, { recursive: true });
  }
  if (!existsSync(pageFolder)) {
    mkdirSync(pageFolder, { recursive: true });
  }
  
  let frontMatter = `---
title: "${options.title}"
layout: page`;

  if (options.permalink) {
    frontMatter += `\npermalink: ${options.permalink}`;
  }

  frontMatter += `\n---

${options.content || 'Write your page content here...'}
`;
  
  writeFileSync(filePath, frontMatter, 'utf-8');
  return filePath;
}

/**
 * Create a new note (short post)
 */
function createNote(config, options) {
  const slug = options.title ? slugify(options.title) : 'note';
  const date = getDateString();
  const timestamp = Date.now();
  const folderName = `${date}-${slug}-${timestamp}`;
  const now = new Date();
  const pathTemplate = config.collections.notes?.path || 'notes';
  const expandedPath = expandDatePath(pathTemplate, now);
  const notesDir = join(config.inputDir, expandedPath);
  const noteFolder = join(notesDir, folderName);
  const filePath = join(noteFolder, 'index.md');
  
  // Ensure directories exist
  if (!existsSync(notesDir)) {
    mkdirSync(notesDir, { recursive: true });
  }
  if (!existsSync(noteFolder)) {
    mkdirSync(noteFolder, { recursive: true });
  }
  
  const content = `---
date: ${getISODate()}
tags: ${formatTags(options.tags)}
---

${options.content || options.title || 'Write your note here...'}
`;
  
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Prompt for post options
 */
async function promptForPost(initialTitle) {
  const answers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Post title:',
      initial: initialTitle || '',
      validate: value => value.length > 0 ? true : 'Title is required'
    },
    {
      type: 'text',
      name: 'tags',
      message: 'Tags (comma-separated):',
      initial: ''
    },
    {
      type: 'text',
      name: 'excerpt',
      message: 'Excerpt (optional):',
      initial: ''
    },
    {
      type: 'confirm',
      name: 'draft',
      message: 'Save as draft?',
      initial: true
    }
  ]);

  if (!answers.title) {
    return null;
  }

  return {
    title: answers.title,
    tags: parseTags(answers.tags),
    excerpt: answers.excerpt || null,
    draft: answers.draft
  };
}

/**
 * Prompt for page options
 */
async function promptForPage(initialTitle) {
  const answers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Page title:',
      initial: initialTitle || '',
      validate: value => value.length > 0 ? true : 'Title is required'
    },
    {
      type: 'text',
      name: 'permalink',
      message: 'Custom permalink (optional, e.g., /about/):',
      initial: ''
    }
  ]);

  if (!answers.title) {
    return null;
  }

  return {
    title: answers.title,
    permalink: answers.permalink || null
  };
}

/**
 * Prompt for note options
 */
async function promptForNote(initialContent) {
  const answers = await prompts([
    {
      type: 'text',
      name: 'content',
      message: 'Note content:',
      initial: initialContent || '',
      validate: value => value.length > 0 ? true : 'Content is required'
    },
    {
      type: 'text',
      name: 'tags',
      message: 'Tags (comma-separated):',
      initial: ''
    }
  ]);

  if (!answers.content) {
    return null;
  }

  return {
    title: answers.content.substring(0, 50),
    content: answers.content,
    tags: parseTags(answers.tags)
  };
}

/**
 * Prompt for content type
 */
async function promptForType() {
  const answer = await prompts({
    type: 'select',
    name: 'type',
    message: 'What would you like to create?',
    choices: [
      { title: 'Post', description: 'A blog post with title, date, and tags', value: 'post' },
      { title: 'Page', description: 'A static page (e.g., About, Contact)', value: 'page' },
      { title: 'Note', description: 'A short note or quick thought', value: 'note' }
    ],
    initial: 0
  });

  return answer.type;
}

/**
 * New command handler for CLI
 */
export async function newCommand(type, title, cmdOptions = {}) {
  const config = loadConfig(process.cwd());
  
  // Quick mode - skip prompts if type and title provided
  const quickMode = cmdOptions.quick || false;
  
  // If quick mode with all required args, skip prompts
  if (quickMode && type && title) {
    let filePath;
    const tags = cmdOptions.tags ? parseTags(cmdOptions.tags) : [];
    
    switch (type.toLowerCase()) {
      case 'post':
        filePath = createPost(config, {
          title,
          tags,
          draft: cmdOptions.draft !== false,
          excerpt: null
        });
        console.log(`\n✨ Created new post: ${filePath}`);
        if (cmdOptions.draft !== false) {
          console.log('   📋 Saved as draft - remove "draft: true" when ready to publish.');
        }
        break;
        
      case 'page':
        filePath = createPage(config, { title, permalink: null });
        console.log(`\n✨ Created new page: ${filePath}`);
        break;
        
      case 'note':
        filePath = createNote(config, { title, content: title, tags });
        console.log(`\n✨ Created new note: ${filePath}`);
        break;
        
      default:
        console.error(`\n❌ Unknown content type: ${type}`);
        console.log('   Available types: post, page, note\n');
        process.exit(1);
    }
    console.log('');
    return;
  }

  console.log('\n📝 Create new content\n');

  // If no type provided, prompt for it
  let contentType = type;
  if (!contentType) {
    contentType = await promptForType();
    if (!contentType) {
      console.log('\n❌ Cancelled.\n');
      return;
    }
  }

  let filePath;
  let options;

  switch (contentType.toLowerCase()) {
    case 'post':
      options = await promptForPost(title);
      if (!options) {
        console.log('\n❌ Cancelled.\n');
        return;
      }
      // Apply command line options if provided
      if (cmdOptions.tags) {
        options.tags = [...options.tags, ...parseTags(cmdOptions.tags)];
      }
      if (cmdOptions.draft !== undefined) {
        options.draft = cmdOptions.draft;
      }
      filePath = createPost(config, options);
      console.log(`\n✨ Created new post: ${filePath}`);
      if (options.draft) {
        console.log('   📋 Saved as draft - remove "draft: true" when ready to publish.');
      }
      break;
      
    case 'page':
      options = await promptForPage(title);
      if (!options) {
        console.log('\n❌ Cancelled.\n');
        return;
      }
      filePath = createPage(config, options);
      console.log(`\n✨ Created new page: ${filePath}`);
      break;
      
    case 'note':
      options = await promptForNote(title);
      if (!options) {
        console.log('\n❌ Cancelled.\n');
        return;
      }
      // Apply command line options if provided
      if (cmdOptions.tags) {
        options.tags = [...(options.tags || []), ...parseTags(cmdOptions.tags)];
      }
      filePath = createNote(config, options);
      console.log(`\n✨ Created new note: ${filePath}`);
      break;
      
    default:
      console.error(`\n❌ Unknown content type: ${contentType}`);
      console.log('   Available types: post, page, note\n');
      process.exit(1);
  }

  console.log('');
}

export default { newCommand };
