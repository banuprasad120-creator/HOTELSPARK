import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distNetlify = path.join(rootDir, 'dist_netlify');
const BUILD_TIME = new Date().toISOString();

console.log(`🚀 Starting Hotel Spark Netlify Unified Build [${BUILD_TIME}]...`);

function run(cmd, cwd = rootDir) {
  console.log(`\n▶ Running: ${cmd} (in ${path.relative(rootDir, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } });
}

try {
  // 1. Build shared package
  console.log('\n📦 Step 1: Building @telivityhaip/shared...');
  const sharedDir = path.join(rootDir, 'packages', 'shared');
  run('npx tsup', sharedDir);

  // 2. Build guest website (apps/booking) with base '/'
  console.log('\n🌐 Step 2: Building Guest Booking Website...');
  const bookingDir = path.join(rootDir, 'apps', 'booking');
  run('npx vite build --base /', bookingDir);

  // 3. Build admin console (apps/dashboard) with base '/admin/'
  console.log('\n⚡ Step 3: Building Admin Console...');
  const dashboardDir = path.join(rootDir, 'apps', 'dashboard');
  run('npx vite build --base /admin/', dashboardDir);

  // 4. Prepare dist_netlify directory
  console.log('\n📁 Step 4: Preparing dist_netlify directory...');
  if (fs.existsSync(distNetlify)) {
    fs.rmSync(distNetlify, { recursive: true, force: true });
  }
  fs.mkdirSync(distNetlify, { recursive: true });

  // Copy apps/booking/dist to dist_netlify (root website)
  const bookingDist = path.join(bookingDir, 'dist');
  fs.cpSync(bookingDist, distNetlify, { recursive: true });

  // Also copy to dist_netlify/booking for legacy path compatibility
  const bookingSubdir = path.join(distNetlify, 'booking');
  fs.mkdirSync(bookingSubdir, { recursive: true });
  fs.cpSync(bookingDist, bookingSubdir, { recursive: true });

  // Copy apps/dashboard/dist to dist_netlify/admin (dedicated admin console)
  const adminSubdir = path.join(distNetlify, 'admin');
  const dashboardDist = path.join(dashboardDir, 'dist');
  fs.mkdirSync(adminSubdir, { recursive: true });
  fs.cpSync(dashboardDist, adminSubdir, { recursive: true });

  // 5. Create Netlify _redirects file
  const redirectsContent = `# Hotel Spark Netlify Redirects
/admin      /admin/index.html   200
/admin/*    /admin/index.html   200
/booking    /booking/index.html 200
/booking/*  /booking/index.html 200
/*          /index.html         200
`;

  fs.writeFileSync(path.join(distNetlify, '_redirects'), redirectsContent, 'utf8');

  console.log('\n✅ Netlify build completed successfully!');
  console.log('  - Root Website: / -> apps/booking');
  console.log('  - Admin Console: /admin -> apps/dashboard');
  console.log('  - Output folder: dist_netlify/');
} catch (error) {
  console.error('\n❌ Build failed with error:', error.message);
  process.exit(1);
}
