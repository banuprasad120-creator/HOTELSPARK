import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dashboardDir = path.join(rootDir, 'apps', 'dashboard');
const sharedDir = path.join(rootDir, 'packages', 'shared');

console.log('🚀 Running Standalone Dashboard Vercel Build...');

function run(cmd, cwd) {
  console.log(`\n▶ [${path.relative(rootDir, cwd) || '.'}] ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
}

// Ensure packages/shared is built
const sharedDist = path.join(sharedDir, 'dist', 'index.js');
if (!fs.existsSync(sharedDist)) {
  console.log('\n📦 Step 1: Building @telivityhaip/shared...');
  try {
    run('npx --yes tsup', sharedDir);
  } catch (err) {
    console.warn('tsup failed, trying pnpm build:', err.message);
    run('pnpm run build', sharedDir);
  }
} else {
  console.log('\n📦 Step 1: @telivityhaip/shared already built.');
}

// Build dashboard with base '/admin/'
console.log('\n⚡ Step 2: Building Admin Console...');
run('npx --yes vite build --base /admin/', dashboardDir);

// Generate physical /admin files for standard Vercel SPA routing
console.log('\n📁 Step 3: Preparing admin subdirectories...');
const distDir = path.join(dashboardDir, 'dist');
const adminDir = path.join(distDir, 'admin');

if (!fs.existsSync(adminDir)) {
  fs.mkdirSync(adminDir, { recursive: true });
}

const indexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(adminDir, 'index.html'));
  fs.copyFileSync(indexHtml, path.join(distDir, 'admin.html'));
}

const assetsDir = path.join(distDir, 'assets');
const adminAssetsDir = path.join(adminDir, 'assets');
if (fs.existsSync(assetsDir) && !fs.existsSync(adminAssetsDir)) {
  fs.cpSync(assetsDir, adminAssetsDir, { recursive: true });
}

console.log('\n✅ Standalone Dashboard build complete!');
