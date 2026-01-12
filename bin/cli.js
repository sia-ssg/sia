#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

// Import commands
import { devCommand } from '../lib/server.js';
import { buildCommand } from '../lib/build.js';
import { newCommand } from '../lib/new.js';
import { initCommand } from '../lib/init.js';
import { themeCommand } from '../lib/theme.js';
import { migrateCommand } from '../lib/migrate.js';
import { pluginCommand } from '../lib/plugin.js';

program
  .name('sia')
  .description('A simple, powerful static site generator')
  .version(pkg.version);

program
  .command('init [directory]')
  .description('Create a new Sia site')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('-g, --github-actions', 'Add GitHub Actions workflow for GitHub Pages')
  .action(initCommand);

program
  .command('dev')
  .description('Start development server with live reload')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .action(devCommand);

program
  .command('build')
  .description('Build the site for production')
  .option('-c, --clean', 'Clean output directory before building', true)
  .action(buildCommand);

program
  .command('new [type] [title]')
  .description('Create new content (post, page, note)')
  .option('-q, --quick', 'Skip prompts and use defaults')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-d, --draft', 'Save as draft (posts only)')
  .action(newCommand);

program
  .command('theme <name>')
  .description('Create a new Sia theme package')
  .option('-q, --quick', 'Skip prompts and use defaults')
  .action(themeCommand);

program
  .command('plugin <name>')
  .description('Create a new Sia plugin')
  .option('-q, --quick', 'Skip prompts and use defaults')
  .option('-t, --type <type>', 'Plugin type: local or npm')
  .action(pluginCommand);

program
  .command('migrate')
  .description('Migrate standalone .md files to folder-based structure (folder/index.md)')
  .option('--dry-run', 'Preview changes without applying them', false)
  .action(migrateCommand);

program.parse();

