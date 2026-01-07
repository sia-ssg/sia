import { readdirSync, statSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { loadConfig } from './config.js';
import { getMarkdownFiles, getBasePath } from './content.js';

/**
 * Check if a file is already in folder-based structure
 */
function isAlreadyMigrated(filePath) {
  try {
    const name = basename(filePath, extname(filePath));
    const parentDir = dirname(filePath);
    // Check if file is index.md and parent is a directory (not the collection root)
    return name === 'index' && statSync(parentDir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file is a standalone .md file (needs migration)
 * Returns true if file is directly in collection directory (not in subdirectory)
 */
function needsMigration(filePath, collectionDir) {
  // Normalize paths for comparison
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedCollectionDir = collectionDir.replace(/\\/g, '/');
  
  // Get relative path from collection directory
  const relativePath = normalizedFilePath.replace(normalizedCollectionDir + '/', '');
  
  // If relative path contains no slashes, it's directly in collection dir
  // Also check it's not already index.md in a folder
  const isStandalone = !relativePath.includes('/');
  const isNotIndex = basename(filePath, extname(filePath)) !== 'index';
  
  return isStandalone && isNotIndex;
}

/**
 * Migrate a single file to folder structure
 */
function migrateFile(filePath, collectionDir, dryRun = false) {
  const fileName = basename(filePath);
  const nameWithoutExt = basename(filePath, extname(filePath));
  const newFolder = join(collectionDir, nameWithoutExt);
  const newFilePath = join(newFolder, 'index.md');
  
  // Skip if already migrated
  if (isAlreadyMigrated(filePath)) {
    return { status: 'skipped', reason: 'already_migrated', file: filePath };
  }
  
  // Skip if target folder already exists
  if (existsSync(newFolder)) {
    return { status: 'skipped', reason: 'folder_exists', file: filePath, folder: newFolder };
  }
  
  if (dryRun) {
    return { status: 'would_migrate', from: filePath, to: newFilePath };
  }
  
  try {
    // Create folder
    mkdirSync(newFolder, { recursive: true });
    
    // Move file to new location
    renameSync(filePath, newFilePath);
    
    return { status: 'migrated', from: filePath, to: newFilePath };
  } catch (error) {
    return { status: 'error', file: filePath, error: error.message };
  }
}

/**
 * Migrate all content files to folder structure
 */
export async function migrateContent(options = {}) {
  const {
    dryRun = false,
    rootDir = process.cwd()
  } = options;
  
  const config = loadConfig(rootDir);
  const collections = ['posts', 'pages', 'notes'];
  const results = {
    migrated: [],
    skipped: [],
    errors: []
  };
  
  console.log('\n🔄 Content Migration Tool\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  for (const collectionName of collections) {
    const collectionConfig = config.collections[collectionName];
    if (!collectionConfig) {
      continue;
    }
    
    // If path contains date variables, use base path for recursive searching
    const pathTemplate = collectionConfig.path;
    const basePath = getBasePath(pathTemplate);
    const collectionDir = join(config.inputDir, basePath);
    
    if (!existsSync(collectionDir)) {
      console.log(`⚠️  Collection directory not found: ${collectionDir}`);
      continue;
    }
    
    console.log(`📁 Processing ${collectionName} collection...`);
    
    // Get all markdown files in the collection directory
    const allFiles = getMarkdownFiles(collectionDir);
    
    // Filter to only standalone files (not already in folders)
    const filesToMigrate = allFiles.filter(filePath => {
      return needsMigration(filePath, collectionDir);
    });
    
    if (filesToMigrate.length === 0) {
      console.log(`   No files to migrate in ${collectionName} collection\n`);
      continue;
    }
    
    console.log(`   Found ${filesToMigrate.length} file(s) to migrate`);
    
    for (const filePath of filesToMigrate) {
      const result = migrateFile(filePath, collectionDir, dryRun);
      
      if (result.status === 'migrated' || result.status === 'would_migrate') {
        results.migrated.push(result);
        const folderName = basename(dirname(result.to));
        console.log(`   ✓ ${basename(filePath)} → ${folderName}/index.md`);
      } else if (result.status === 'skipped') {
        results.skipped.push(result);
        const reason = result.reason === 'already_migrated' 
          ? 'already in folder structure' 
          : 'target folder exists';
        console.log(`   ⊘ Skipped: ${basename(filePath)} (${reason})`);
      } else {
        results.errors.push(result);
        console.error(`   ✗ Error: ${basename(filePath)} - ${result.error}`);
      }
    }
    
    console.log('');
  }
  
  // Print summary
  console.log('='.repeat(50));
  console.log('Migration Summary:');
  console.log(`  ✓ Migrated: ${results.migrated.length}`);
  console.log(`  ⊘ Skipped: ${results.skipped.length}`);
  console.log(`  ✗ Errors: ${results.errors.length}`);
  console.log('='.repeat(50));
  
  if (dryRun) {
    console.log('\n⚠️  This was a dry run. No files were actually moved.');
    console.log('   Run without --dry-run to apply changes.\n');
  } else if (results.migrated.length > 0) {
    console.log('\n✨ Migration complete! Your content is now in folder-based structure.\n');
  }
  
  return results;
}

/**
 * Migration command handler for CLI
 */
export async function migrateCommand(options = {}) {
  await migrateContent({
    dryRun: options.dryRun === true,
    rootDir: process.cwd()
  });
}

export default { migrateContent, migrateCommand };

