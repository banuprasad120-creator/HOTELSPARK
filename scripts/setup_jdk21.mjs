import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const TARGET_DIR = 'C:\\Users\\banup\\.jdks\\temurin-21';
const ZIP_PATH = 'C:\\Users\\banup\\.jdks\\temurin-21.zip';
const URL = 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jdk_x64_windows_hotspot_21.0.13_9.zip';

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    function get(u) {
      https.get(u, { headers: { 'User-Agent': 'Node' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed with status ${res.statusCode}`));
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        let lastReport = 0;
        const file = fs.createWriteStream(dest);
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          const now = Date.now();
          if (now - lastReport > 2000) {
            lastReport = now;
            console.log(`Downloading Temurin JDK 21: ${(downloaded / 1024 / 1024).toFixed(1)} MB / ${(total / 1024 / 1024).toFixed(1)} MB...`);
          }
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            console.log('Download complete!');
            resolve();
          });
        });
      }).on('error', reject);
    }
    get(url);
  });
}

async function main() {
  if (fs.existsSync(path.join(TARGET_DIR, 'bin', 'javac.exe'))) {
    console.log('JDK 21 already exists at', TARGET_DIR);
    return;
  }
  console.log('Starting JDK 21 download...');
  await download(URL, ZIP_PATH);

  console.log('Extracting JDK 21...');
  const tempExtract = 'C:\\Users\\banup\\.jdks\\temp_extract_21';
  if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });
  fs.mkdirSync(tempExtract, { recursive: true });

  execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${tempExtract}' -Force"`, { stdio: 'inherit' });

  const innerFolders = fs.readdirSync(tempExtract);
  const inner = path.join(tempExtract, innerFolders[0]);
  if (fs.existsSync(TARGET_DIR)) fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  fs.renameSync(inner, TARGET_DIR);

  fs.rmSync(tempExtract, { recursive: true, force: true });
  fs.rmSync(ZIP_PATH, { force: true });

  console.log('JDK 21 installed successfully at', TARGET_DIR);
  const testOutput = execSync(`"${path.join(TARGET_DIR, 'bin', 'java.exe')}" -version 2>&1`).toString();
  console.log(testOutput);
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
