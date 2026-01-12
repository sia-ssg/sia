import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validate plugin structure
 */
export function validatePlugin(plugin, pluginPath) {
  if (!plugin) {
    throw new Error('Plugin is null or undefined');
  }
  
  if (!plugin.name || typeof plugin.name !== 'string') {
    throw new Error('Plugin must have a "name" property (string)');
  }
  
  if (!plugin.version || typeof plugin.version !== 'string') {
    throw new Error('Plugin must have a "version" property (string)');
  }
  
  // Validate hooks if present
  if (plugin.hooks && typeof plugin.hooks !== 'object') {
    throw new Error('Plugin "hooks" must be an object');
  }
  
  // Validate configSchema if present
  if (plugin.configSchema && typeof plugin.configSchema !== 'object') {
    throw new Error('Plugin "configSchema" must be an object');
  }
  
  // Validate dependencies if present
  if (plugin.dependencies && !Array.isArray(plugin.dependencies)) {
    throw new Error('Plugin "dependencies" must be an array');
  }
  
  return true;
}

/**
 * Load a plugin from a file path
 */
export async function loadPlugin(pluginPath, config) {
  try {
    // Support both .js and .mjs files
    // Add cache busting query parameter to ensure fresh reloads during dev
    // This prevents Node.js from using cached versions of plugins during hot reload
    const cacheBuster = `?t=${Date.now()}`;
    let module;
    
    // Normalize path to use file:// protocol for consistent cache busting
    // All plugin paths from discovery are absolute, so we can safely use file://
    const normalizedPath = pluginPath.startsWith('file://') 
      ? pluginPath 
      : pluginPath.startsWith('/') || /^[A-Za-z]:/.test(pluginPath) // Unix absolute or Windows drive
        ? `file://${pluginPath}`
        : pluginPath; // Relative path (shouldn't happen, but handle it)
    
    // Import with cache busting to ensure fresh reloads during dev
    module = await import(`${normalizedPath}${cacheBuster}`);
    
    // Support both default export and named export
    const plugin = module.default || module;
    
    if (!plugin) {
      throw new Error('Plugin file does not export a plugin object');
    }
    
    // Validate plugin structure
    validatePlugin(plugin, pluginPath);
    
    // Add metadata
    plugin._path = pluginPath;
    plugin._loaded = true;
    
    return plugin;
  } catch (err) {
    throw new Error(`Failed to load plugin from ${pluginPath}: ${err.message}`);
  }
}

/**
 * Discover local plugins from _plugins directory
 */
export function discoverLocalPlugins(rootDir) {
  const pluginsDir = join(rootDir, '_plugins');
  const plugins = [];
  
  if (!existsSync(pluginsDir)) {
    return plugins;
  }
  
  try {
    const items = readdirSync(pluginsDir);
    console.log(`🔍 Scanning _plugins directory: found ${items.length} item(s)`);
    
    for (const item of items) {
      const itemPath = join(pluginsDir, item);
      const stat = statSync(itemPath);
      
      // Check extension case-insensitively
      const lowerItem = item.toLowerCase();
      const isJsFile = lowerItem.endsWith('.js') || lowerItem.endsWith('.mjs');
      
      // Debug: log what we found
      if (stat.isFile()) {
        console.log(`  📄 Found file: ${item} (${isJsFile ? 'plugin candidate' : 'skipped - not .js/.mjs'})`);
      } else if (stat.isDirectory()) {
        console.log(`  📁 Found directory: ${item} (skipped - plugins must be files)`);
      }
      
      // Only process .js and .mjs files (case-insensitive)
      if (stat.isFile() && isJsFile) {
        plugins.push({
          type: 'local',
          path: itemPath,
          name: item.replace(/\.(js|mjs)$/i, '') // Case-insensitive replacement
        });
        console.log(`  ✓ Added plugin: ${item}`);
      }
    }
  } catch (err) {
    console.warn(`⚠️  Error reading _plugins directory: ${err.message}`);
  }
  
  return plugins;
}

/**
 * Discover npm plugins from node_modules
 */
export function discoverNpmPlugins(rootDir) {
  const nodeModulesDir = join(rootDir, 'node_modules');
  const plugins = [];
  
  if (!existsSync(nodeModulesDir)) {
    return plugins;
  }
  
  try {
    const packages = readdirSync(nodeModulesDir);
    
    for (const pkg of packages) {
      const pkgPath = join(nodeModulesDir, pkg);
      
      // Handle scoped packages (e.g., @sia-ssg/sia-plugin-lightbox)
      if (pkg.startsWith('@')) {
        const scopedDir = pkgPath;
        if (statSync(scopedDir).isDirectory()) {
          try {
            const scopedPackages = readdirSync(scopedDir);
            for (const scopedPkg of scopedPackages) {
              const scopedPkgPath = join(scopedDir, scopedPkg);
              const pkgJsonPath = join(scopedPkgPath, 'package.json');
              
              if (existsSync(pkgJsonPath)) {
                try {
                  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
                  const packageName = pkgJson.name;
                  
                  // Check if package name matches sia-plugin-* pattern
                  if (packageName && (packageName.startsWith('sia-plugin-') || packageName.includes('/sia-plugin-'))) {
                    const mainFile = pkgJson.main || 'index.js';
                    const pluginPath = join(scopedPkgPath, mainFile);
                    
                    if (existsSync(pluginPath)) {
                      plugins.push({
                        type: 'npm',
                        path: pluginPath,
                        name: packageName,
                        packageName: packageName,
                        version: pkgJson.version
                      });
                    }
                  }
                } catch (err) {
                  console.warn(`⚠️  Error reading package.json for ${pkg}/${scopedPkg}: ${err.message}`);
                }
              }
            }
          } catch (err) {
            console.warn(`⚠️  Error reading scoped package directory ${pkg}: ${err.message}`);
          }
        }
      } else if (pkg.startsWith('sia-plugin-')) {
        // Handle non-scoped packages (existing behavior)
        const pkgJsonPath = join(pkgPath, 'package.json');
        
        if (existsSync(pkgJsonPath)) {
          try {
            const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
            const mainFile = pkgJson.main || 'index.js';
            const pluginPath = join(pkgPath, mainFile);
            
            if (existsSync(pluginPath)) {
              plugins.push({
                type: 'npm',
                path: pluginPath,
                name: pkg,
                packageName: pkg,
                version: pkgJson.version
              });
            }
          } catch (err) {
            console.warn(`⚠️  Error reading package.json for ${pkg}: ${err.message}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️  Error reading node_modules: ${err.message}`);
  }
  
  return plugins;
}

/**
 * Resolve plugin dependencies and order
 */
export function orderPlugins(plugins, config) {
  // If explicit order is provided in config, use it
  const explicitOrder = config.plugins?.order;
  if (explicitOrder && Array.isArray(explicitOrder)) {
    const ordered = [];
    const pluginMap = new Map(plugins.map(p => [p.name, p]));
    const added = new Set();
    
    // Add plugins in explicit order
    for (const name of explicitOrder) {
      const plugin = pluginMap.get(name);
      if (plugin) {
        ordered.push(plugin);
        added.add(name);
      }
    }
    
    // Add remaining plugins
    for (const plugin of plugins) {
      if (!added.has(plugin.name)) {
        ordered.push(plugin);
      }
    }
    
    return ordered;
  }
  
  // Otherwise, resolve dependencies
  const pluginMap = new Map(plugins.map(p => [p.name, p]));
  const ordered = [];
  const added = new Set();
  const visiting = new Set();
  
  function visit(plugin) {
    if (added.has(plugin.name)) {
      return;
    }
    
    if (visiting.has(plugin.name)) {
      console.warn(`⚠️  Circular dependency detected involving plugin: ${plugin.name}`);
      return;
    }
    
    visiting.add(plugin.name);
    
    // Visit dependencies first
    if (plugin.dependencies && Array.isArray(plugin.dependencies)) {
      for (const depName of plugin.dependencies) {
        const dep = pluginMap.get(depName);
        if (dep) {
          visit(dep);
        } else {
          console.warn(`⚠️  Plugin ${plugin.name} depends on ${depName}, but it's not found`);
        }
      }
    }
    
    visiting.delete(plugin.name);
    ordered.push(plugin);
    added.add(plugin.name);
  }
  
  // Visit all plugins
  for (const plugin of plugins) {
    visit(plugin);
  }
  
  return ordered;
}

/**
 * Discover and load all plugins
 */
export async function discoverPlugins(config) {
  // Check if plugins are enabled
  if (config.plugins?.enabled === false) {
    return [];
  }
  
  const rootDir = config.rootDir || process.cwd();
  const discovered = [];
  
  // Discover local plugins
  const localPlugins = discoverLocalPlugins(rootDir);
  discovered.push(...localPlugins);
  
  // Discover npm plugins
  const npmPlugins = discoverNpmPlugins(rootDir);
  discovered.push(...npmPlugins);
  
  // Filter by explicit plugin list if provided
  const explicitPlugins = config.plugins?.plugins;
  if (explicitPlugins && Array.isArray(explicitPlugins) && explicitPlugins.length > 0) {
    console.log(`🔍 Filtering plugins: only loading ${explicitPlugins.join(', ')}`);
    const explicitSet = new Set(explicitPlugins);
    const filtered = discovered.filter(p => explicitSet.has(p.name));
    const filteredOut = discovered.filter(p => !explicitSet.has(p.name));
    if (filteredOut.length > 0) {
      console.log(`  ⚠️  Filtered out ${filteredOut.length} plugin(s): ${filteredOut.map(p => p.name).join(', ')}`);
    }
    return filtered;
  }
  
  return discovered;
}

/**
 * Load all discovered plugins
 */
export async function loadPlugins(config) {
  // Check if plugins are disabled
  if (config.plugins?.enabled === false) {
    console.log('🔌 Plugins are disabled in config');
    return [];
  }
  
  const rootDir = config.rootDir || process.cwd();
  const discovered = await discoverPlugins(config);
  
  if (discovered.length === 0) {
    // Log that we checked but found nothing (helps with debugging)
    const pluginsDir = join(rootDir, '_plugins');
    const hasPluginsDir = existsSync(pluginsDir);
    if (hasPluginsDir) {
      console.log('🔌 No plugins discovered (directory exists but no valid plugins found)');
    } else {
      console.log('🔌 No plugins directory found, skipping plugin discovery');
    }
    return [];
  }
  
  console.log(`🔌 Found ${discovered.length} plugin(s)`);
  
  const loaded = [];
  const errors = [];
  
  for (const pluginInfo of discovered) {
    try {
      const plugin = await loadPlugin(pluginInfo.path, config);
      plugin._type = pluginInfo.type;
      plugin._packageName = pluginInfo.packageName;
      loaded.push(plugin);
      console.log(`  ✓ Loaded ${plugin.name}@${plugin.version} (${pluginInfo.type})`);
    } catch (err) {
      errors.push({ name: pluginInfo.name, error: err.message });
      console.warn(`  ✗ Failed to load ${pluginInfo.name}: ${err.message}`);
    }
  }
  
  if (errors.length > 0 && config.plugins?.strictMode) {
    throw new Error(`Plugin loading failed in strict mode. ${errors.length} plugin(s) failed to load.`);
  }
  
  // Order plugins
  const ordered = orderPlugins(loaded, config);
  
  return ordered;
}

export default {
  discoverPlugins,
  loadPlugins,
  loadPlugin,
  validatePlugin,
  discoverLocalPlugins,
  discoverNpmPlugins,
  orderPlugins
};

