import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const bookingDir = path.join(rootDir, 'apps', 'booking');
const dashboardDir = path.join(rootDir, 'apps', 'dashboard');
const sharedDir = path.join(rootDir, 'packages', 'shared');

console.log('🚀 Running Unified Booking & Admin Vercel Build...');

function run(cmd, cwd) {
  console.log(`\n▶ [${path.relative(rootDir, cwd) || '.'}] ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
}

// 1. Ensure packages/shared is built
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

// 2. Build apps/booking (Guest Website) with base '/'
console.log('\n🌐 Step 2: Building Guest Booking Website (apps/booking)...');
run('npx --yes vite build --base /', bookingDir);

// 3. Build apps/dashboard (Admin Console) with base '/admin/'
console.log('\n⚡ Step 3: Building Admin Console (apps/dashboard)...');
run('npx --yes vite build --base /admin/', dashboardDir);

// 4. Merge Admin Console into apps/booking/dist
console.log('\n📁 Step 4: Merging Admin Console into apps/booking/dist/admin...');
const bookingDist = path.join(bookingDir, 'dist');
const dashboardDist = path.join(dashboardDir, 'dist');
const targetAdminDir = path.join(bookingDist, 'admin');

if (!fs.existsSync(targetAdminDir)) {
  fs.mkdirSync(targetAdminDir, { recursive: true });
}

// Copy dashboard dist to booking dist /admin
fs.cpSync(dashboardDist, targetAdminDir, { recursive: true });

// Also create dist/admin.html for direct requests
if (fs.existsSync(path.join(dashboardDist, 'index.html'))) {
  fs.copyFileSync(
    path.join(dashboardDist, 'index.html'),
    path.join(bookingDist, 'admin.html')
  );
}

// Merge dashboard assets into booking/dist/assets as a fallback
const dashboardAssets = path.join(dashboardDist, 'assets');
const bookingAssets = path.join(bookingDist, 'assets');
if (fs.existsSync(dashboardAssets)) {
  if (!fs.existsSync(bookingAssets)) {
    fs.mkdirSync(bookingAssets, { recursive: true });
  }
  fs.cpSync(dashboardAssets, bookingAssets, { recursive: true });
}

// Ensure apps/booking/vercel.json is properly configured
const vercelConfig = {
  rewrites: [
    { source: '/admin/:path*', destination: '/admin/index.html' },
    { source: '/admin', destination: '/admin/index.html' },
    { source: '/:path*', destination: '/index.html' }
  ]
};
fs.writeFileSync(
  path.join(bookingDir, 'vercel.json'),
  JSON.stringify(vercelConfig, null, 2),
  'utf8'
);

console.log('\n✅ Unified Booking & Admin build complete!');
console.log(`  - Root / -> ${bookingDist}/index.html`);
console.log(`  - Admin /admin -> ${targetAdminDir}/index.html`);
console.log(`  - Assets merged into ${bookingAssets} and ${path.join(targetAdminDir, 'assets')}`);
