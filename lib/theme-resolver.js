import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Built-in themes directory
const builtInThemesDir = join(__dirname, '..', 'themes');

/**
 * Resolve the path to a theme directory
 * 
 * Resolution order:
 * 1. Check built-in themes folder (sia's themes/)
 * 2. Check for npm package sia-theme-{name}
 * 3. Fall back to 'main' theme
 * 
 * @param {string} themeName - The theme name from config
 * @param {string} rootDir - The user's project root directory
 * @returns {{ themeDir: string, themeName: string, isExternal: boolean }}
 */
export function resolveTheme(themeName, rootDir = process.cwd()) {
  // 1. Check built-in themes folder (skip if themeName is a scoped package)
  if (!themeName.startsWith('@')) {
    const builtInThemeDir = join(builtInThemesDir, themeName);
    if (existsSync(builtInThemeDir)) {
      return {
        themeDir: builtInThemeDir,
        themeName,
        isExternal: false
      };
    }
  }

  // 2. Check for npm package
  // If themeName is already a scoped package (e.g., @sia-ssg/sia-theme-lightbox), use it as-is
  // Otherwise, construct as sia-theme-{name}
  const packageName = themeName.startsWith('@') 
    ? themeName 
    : `sia-theme-${themeName}`;
  
  const externalThemeDir = resolveExternalTheme(packageName, rootDir);
  
  if (externalThemeDir) {
    console.log(`🎨 Using external theme package: ${packageName}`);
    return {
      themeDir: externalThemeDir,
      themeName,
      isExternal: true
    };
  }

  // 3. Fall back to 'main' theme
  if (themeName !== 'main') {
    console.log(`⚠️  Theme "${themeName}" not found, falling back to "main" theme`);
  }
  
  return {
    themeDir: join(builtInThemesDir, 'main'),
    themeName: 'main',
    isExternal: false
  };
}

/**
 * Attempt to resolve an external theme package
 * 
 * @param {string} packageName - The npm package name (sia-theme-{name})
 * @param {string} rootDir - The user's project root directory
 * @returns {string|null} The theme directory path or null if not found
 */
function resolveExternalTheme(packageName, rootDir) {
  // First, check if the package is in the user's package.json
  const packageJsonPath = join(rootDir, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    // If no package.json, try node_modules directly (for scoped packages)
    return tryResolveFromNodeModules(packageName, rootDir);
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Check if the theme package is listed as a dependency
    if (!allDeps[packageName]) {
      // Even if not in package.json, try node_modules (might be hoisted or installed differently)
      return tryResolveFromNodeModules(packageName, rootDir);
    }

    // Try to resolve the package path
    // Use createRequire to resolve from the user's project directory
    const require = createRequire(join(rootDir, 'package.json'));
    
    try {
      // Try to resolve the package's main entry point
      const packageMainPath = require.resolve(packageName);
      const packageDir = dirname(packageMainPath);
      
      // The theme directory is typically the package root
      // Check if it has the expected theme structure
      if (isValidThemeDirectory(packageDir)) {
        return packageDir;
      }
      
      // Sometimes the main entry is in a subdirectory, try parent
      const parentDir = dirname(packageDir);
      if (isValidThemeDirectory(parentDir)) {
        return parentDir;
      }

      // Try node_modules directly
      return tryResolveFromNodeModules(packageName, rootDir);
    } catch (resolveErr) {
      // Package might not be installed yet or require.resolve failed
      // Try node_modules directly as fallback
      return tryResolveFromNodeModules(packageName, rootDir);
    }
  } catch (err) {
    // On any error, try node_modules directly
    return tryResolveFromNodeModules(packageName, rootDir);
  }
}

/**
 * Try to resolve a theme package directly from node_modules
 * Handles both scoped and non-scoped packages
 * 
 * @param {string} packageName - The npm package name
 * @param {string} rootDir - The user's project root directory
 * @returns {string|null} The theme directory path or null if not found
 */
function tryResolveFromNodeModules(packageName, rootDir) {
  const nodeModulesDir = join(rootDir, 'node_modules');
  
  if (!existsSync(nodeModulesDir)) {
    return null;
  }

  // Handle scoped packages (e.g., @sia-ssg/sia-theme-lightbox)
  if (packageName.startsWith('@')) {
    const [scope, scopedPackageName] = packageName.split('/');
    if (!scope || !scopedPackageName) {
      return null;
    }
    
    const scopedPath = join(nodeModulesDir, scope, scopedPackageName);
    if (existsSync(scopedPath) && isValidThemeDirectory(scopedPath)) {
      return scopedPath;
    }
  } else {
    // Handle non-scoped packages
    const packagePath = join(nodeModulesDir, packageName);
    if (existsSync(packagePath) && isValidThemeDirectory(packagePath)) {
      return packagePath;
    }
  }

  return null;
}

/**
 * Check if a directory has the expected theme structure
 * 
 * @param {string} dir - Directory to check
 * @returns {boolean}
 */
function isValidThemeDirectory(dir) {
  if (!existsSync(dir)) {
    return false;
  }

  // A valid theme must have at least layouts and pages directories
  const hasLayouts = existsSync(join(dir, 'layouts'));
  const hasPages = existsSync(join(dir, 'pages'));
  
  return hasLayouts && hasPages;
}

/**
 * Get the built-in themes directory path
 * 
 * @returns {string}
 */
export function getBuiltInThemesDir() {
  return builtInThemesDir;
}

/**
 * Get list of available built-in themes
 * 
 * @returns {string[]}
 */
export function getBuiltInThemes() {
  return readdirSync(builtInThemesDir)
    .filter(name => {
      if (name.startsWith('_')) return false; // Skip _shared
      const themePath = join(builtInThemesDir, name);
      return statSync(themePath).isDirectory();
    });
}

export default {
  resolveTheme,
  getBuiltInThemesDir,
  getBuiltInThemes
};

