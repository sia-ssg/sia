import prompts from 'prompts';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Ensure a directory exists
 */
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Normalize plugin name (lowercase, hyphenated)
 */
function normalizePluginName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Generate local plugin template
 */
function getLocalPluginTemplate(pluginName, displayName) {
  return `/**
 * ${displayName} Plugin
 * 
 * This is a local plugin for your Sia site.
 * Local plugins are loaded from the _plugins/ directory.
 */

export default {
  name: '${pluginName}',
  version: '1.0.0',
  
  // Optional: Define configuration schema
  // configSchema: {
  //   enabled: { type: 'boolean', default: true },
  //   outputPath: { type: 'string', default: 'output.json' }
  // },
  
  // Optional: List plugin dependencies
  // dependencies: ['other-plugin-name'],
  
  hooks: {
    // Example: Hook that runs after the build completes
    afterBuild: async (siteData, config, api) => {
      const pluginConfig = config.plugins?.config?.['${pluginName}'] || {};
      
      // Your plugin logic here
      api.log('Plugin executed successfully', 'info');
      
      // Example: Generate a file
      // const outputPath = api.joinPath(config.outputDir, 'custom-output.json');
      // api.writeFile(outputPath, JSON.stringify({ data: 'example' }, null, 2));
    },
    
    // Other available hooks:
    // beforeBuild: (config, api) => { ... },
    // beforeMarkdown: (markdown, context) => { ... },
    // afterMarkdown: (html, context) => { ... },
    // addTemplateFilter: (env, config) => { ... },
    // beforeRender: (siteData, config, api) => { ... }
  }
};
`;
}

/**
 * Generate package.json for npm plugin
 */
function getNpmPluginPackageJson(pluginName, displayName, author) {
  return {
    name: `sia-plugin-${pluginName}`,
    version: '1.0.0',
    description: `${displayName} plugin for Sia static site generator`,
    main: 'index.js',
    type: 'module',
    keywords: [
      'sia',
      'sia-plugin',
      'static-site-generator',
      'plugin'
    ],
    author: author,
    license: 'MIT',
    repository: {
      type: 'git',
      url: ''
    },
    engines: {
      node: '>=18.0.0'
    },
    peerDependencies: {
      '@sia-ssg/sia': '>=3.0.0'
    }
  };
}

/**
 * Generate index.js for npm plugin
 */
function getNpmPluginIndexJs(pluginName, displayName) {
  return `/**
 * ${displayName} Plugin for Sia
 * 
 * This plugin extends Sia's functionality.
 * 
 * Available hooks:
 * - beforeBuild: Runs before the build starts
 * - afterBuild: Runs after the build completes
 * - beforeMarkdown: Transform markdown before parsing
 * - afterMarkdown: Transform HTML after markdown parsing
 * - addTemplateFilter: Add custom Nunjucks filters
 * - beforeRender: Modify site data before rendering
 */

export default {
  name: 'sia-plugin-${pluginName}',
  version: '1.0.0',
  
  // Optional: Define configuration schema
  configSchema: {
    enabled: { type: 'boolean', default: true },
    outputPath: { type: 'string', default: 'output.json' }
  },
  
  // Optional: List plugin dependencies
  // dependencies: ['sia-plugin-other'],
  
  hooks: {
    /**
     * Runs after the build completes
     */
    afterBuild: async (siteData, config, api) => {
      const pluginConfig = config.plugins?.config?.['sia-plugin-${pluginName}'] || {};
      
      // Skip if disabled
      if (pluginConfig.enabled === false) {
        return;
      }
      
      // Your plugin logic here
      api.log('Plugin executed successfully', 'info');
      
      // Example: Generate a file
      // const outputPath = api.joinPath(
      //   config.outputDir,
      //   pluginConfig.outputPath || 'output.json'
      // );
      // api.writeFile(outputPath, JSON.stringify({ data: 'example' }, null, 2));
    }
    
    // Other available hooks:
    // beforeBuild: (config, api) => {
    //   // Runs before build starts
    // },
    // beforeMarkdown: (markdown, context) => {
    //   // Transform markdown before parsing
    //   return markdown;
    // },
    // afterMarkdown: (html, context) => {
    //   // Transform HTML after markdown parsing
    //   return html;
    // },
    // addTemplateFilter: (env, config) => {
    //   // Add custom Nunjucks filters
    //   env.addFilter('customFilter', (value) => {
    //     return value;
    //   });
    // },
    // beforeRender: (siteData, config, api) => {
    //   // Modify site data before rendering
    //   return siteData;
    // }
  }
};
`;
}

/**
 * Generate README.md for npm plugin
 */
function getNpmPluginReadme(pluginName, displayName, author) {
  return `# ${displayName}

A plugin for [Sia](https://github.com/sia-ssg/sia) static site generator.

## Installation

\`\`\`bash
npm install sia-plugin-${pluginName}
\`\`\`

## Usage

Add the plugin to your site's \`_config.yml\`:

\`\`\`yaml
plugins:
  enabled: true
  config:
    sia-plugin-${pluginName}:
      enabled: true
      outputPath: output.json
\`\`\`

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | boolean | true | Enable or disable the plugin |
| outputPath | string | output.json | Path for generated output |

## Features

- [ ] Add your plugin features here

## Development

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd sia-plugin-${pluginName}

# Install dependencies
npm install

# Test the plugin
npm test
\`\`\`

## License

MIT

## Author

${author}
`;
}

/**
 * Create a local plugin
 */
export async function createLocalPlugin(pluginName, options = {}) {
  const normalizedName = normalizePluginName(pluginName);
  const rootDir = process.cwd();
  const pluginsDir = join(rootDir, '_plugins');
  const pluginFile = join(pluginsDir, `${normalizedName}.js`);
  
  console.log(`\n🔌 Creating local plugin: ${normalizedName}\n`);
  
  // Check if plugin file already exists
  if (existsSync(pluginFile)) {
    if (!options.quick) {
      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: `Plugin file "${normalizedName}.js" already exists. Overwrite?`,
        initial: false
      });
      
      if (!proceed) {
        console.log('\n❌ Cancelled.\n');
        return;
      }
    } else {
      console.log(`⚠️  Plugin file "${normalizedName}.js" already exists. Overwriting...\n`);
    }
  }
  
  // Get plugin details
  let displayName;
  if (options.quick) {
    displayName = normalizedName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } else {
    const answer = await prompts({
      type: 'text',
      name: 'displayName',
      message: 'Plugin display name:',
      initial: normalizedName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    });
    
    if (!answer.displayName) {
      console.log('\n❌ Cancelled.\n');
      return;
    }
    
    displayName = answer.displayName;
  }
  
  // Ensure _plugins directory exists
  ensureDir(pluginsDir);
  
  // Create plugin file
  writeFileSync(
    pluginFile,
    getLocalPluginTemplate(normalizedName, displayName),
    'utf-8'
  );
  
  console.log(`  ✓ Created ${pluginFile}`);
  console.log('\n✨ Local plugin created successfully!\n');
  console.log('Next steps:\n');
  console.log(`  # Edit ${pluginFile} to implement your plugin logic`);
  console.log('  # Run `sia build` to test your plugin\n');
}

/**
 * Create an npm package plugin
 */
export async function createNpmPlugin(pluginName, options = {}) {
  const normalizedName = normalizePluginName(pluginName);
  const packageName = `sia-plugin-${normalizedName}`;
  const targetDir = resolve(process.cwd(), packageName);
  
  console.log(`\n🔌 Creating npm plugin package: ${packageName}\n`);
  
  // Check if directory exists
  if (existsSync(targetDir)) {
    if (!options.quick) {
      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: `Directory "${packageName}" already exists. Continue anyway?`,
        initial: false
      });
      
      if (!proceed) {
        console.log('\n❌ Cancelled.\n');
        return;
      }
    } else {
      console.log(`⚠️  Directory "${packageName}" already exists. Continuing...\n`);
    }
  }
  
  // Get plugin details
  let answers;
  
  if (options.quick) {
    answers = {
      displayName: normalizedName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      author: 'Anonymous'
    };
  } else {
    answers = await prompts([
      {
        type: 'text',
        name: 'displayName',
        message: 'Plugin display name:',
        initial: normalizedName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      },
      {
        type: 'text',
        name: 'author',
        message: 'Author name:',
        initial: 'Anonymous'
      }
    ]);
  }
  
  if (!answers.displayName) {
    console.log('\n❌ Cancelled.\n');
    return;
  }
  
  console.log('\n📁 Creating plugin structure...\n');
  
  // Create directory
  ensureDir(targetDir);
  
  // Create package.json
  writeFileSync(
    join(targetDir, 'package.json'),
    JSON.stringify(getNpmPluginPackageJson(normalizedName, answers.displayName, answers.author), null, 2),
    'utf-8'
  );
  console.log('  ✓ package.json');
  
  // Create index.js
  writeFileSync(
    join(targetDir, 'index.js'),
    getNpmPluginIndexJs(normalizedName, answers.displayName),
    'utf-8'
  );
  console.log('  ✓ index.js');
  
  // Create README.md
  writeFileSync(
    join(targetDir, 'README.md'),
    getNpmPluginReadme(normalizedName, answers.displayName, answers.author),
    'utf-8'
  );
  console.log('  ✓ README.md');
  
  // Create LICENSE file
  const licenseText = `MIT License

Copyright (c) ${new Date().getFullYear()} ${answers.author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  writeFileSync(join(targetDir, 'LICENSE'), licenseText, 'utf-8');
  console.log('  ✓ LICENSE');
  
  // Success message
  console.log('\n✨ Plugin package created successfully!\n');
  console.log('Next steps:\n');
  console.log(`  cd ${packageName}`);
  console.log('  # Edit index.js to implement your plugin logic');
  console.log('  # Update README.md with plugin documentation');
  console.log('  npm publish  # When ready to share\n');
  console.log('To use this plugin in a Sia site:\n');
  console.log(`  npm install ${packageName}`);
  console.log(`  # Then add it to plugins.config in _config.yml\n`);
}

/**
 * Plugin command handler for CLI
 */
export async function pluginCommand(pluginName, options = {}) {
  if (!pluginName) {
    console.error('❌ Please provide a plugin name: sia plugin <name>');
    process.exit(1);
  }
  
  try {
    let pluginType = options.type;
    
    // If type not specified, prompt user
    if (!pluginType) {
      const answer = await prompts({
        type: 'select',
        name: 'type',
        message: 'What type of plugin would you like to create?',
        choices: [
          { title: 'Local plugin', description: 'Creates a plugin file in _plugins/ directory', value: 'local' },
          { title: 'NPM package plugin', description: 'Creates a full npm package (sia-plugin-*)', value: 'npm' }
        ],
        initial: 0
      });
      
      if (!answer.type) {
        console.log('\n❌ Cancelled.\n');
        return;
      }
      
      pluginType = answer.type;
    }
    
    // Validate type
    if (pluginType !== 'local' && pluginType !== 'npm') {
      console.error(`❌ Invalid plugin type: ${pluginType}. Must be "local" or "npm"`);
      process.exit(1);
    }
    
    // Create the appropriate plugin type
    if (pluginType === 'local') {
      await createLocalPlugin(pluginName, options);
    } else {
      await createNpmPlugin(pluginName, options);
    }
  } catch (err) {
    console.error('❌ Failed to create plugin:', err.message);
    process.exit(1);
  }
}

export default { createLocalPlugin, createNpmPlugin, pluginCommand };

