import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();
const localBin = join(cwd, 'node_modules', '@quasar', 'app-vite', 'bin', 'quasar.js');
const packageJson = join(cwd, 'package.json');

function fail(message) {
  console.error(`\nBobQuest web check failed: ${message}\n`);
  process.exit(1);
}

if (!existsSync(packageJson)) {
  fail('run this command from apps/web or through the root workspace scripts.');
}

if (!existsSync(localBin)) {
  fail('local @quasar/app-vite is missing. Run: pnpm install. Refusing to use a global Quasar CLI.');
}

const pkg = JSON.parse(readFileSync(packageJson, 'utf8'));
if (!pkg.devDependencies || !pkg.devDependencies['@quasar/app-vite']) {
  fail('apps/web/package.json must declare @quasar/app-vite as a devDependency.');
}

console.log('PASS local Quasar app-vite CLI is available');
