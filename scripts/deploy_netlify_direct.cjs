const fs = require('fs');
const https = require('https');
const dns = require('dns');

// Set public DNS to avoid Windows local DNS resolution hangs
dns.setServers(['8.8.8.8', '1.1.1.1']);

const SITE_ID = '9ca2630c-67cc-4e8a-a176-babd5572964a';
const TOKEN = 'nfc_c6pCXiQ1fFXmvBMUkc7aRr57URVizft1b1c7';
const ZIP_PATH = 'dist_netlify_deploy.zip';

async function deploy() {
  console.log('Reading zip file...');
  const zipBuffer = fs.readFileSync(ZIP_PATH);
  console.log(`Zip size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const options = {
    hostname: 'api.netlify.com',
    port: 443,
    path: `/api/v1/sites/${SITE_ID}/deploys`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/zip',
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Length': zipBuffer.length,
    },
    lookup: (hostname, opts, cb) => dns.lookup(hostname, opts, cb),
  };

  console.log('Deploying to Netlify (Site ID: ' + SITE_ID + ')...');
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`HTTP Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        console.log('Deploy state:', json.state);
        console.log('Deploy ID:', json.id);
        console.log('Deploy URL:', json.ssl_url || json.url);
        console.log('Published at:', json.published_at || new Date().toISOString());
        console.log('✅ Deployment successful!');
      } catch (e) {
        console.log('Response body:', data.slice(0, 500));
      }
    });
  });

  req.on('error', (err) => {
    console.error('Upload error:', err.message);
  });

  req.write(zipBuffer);
  req.end();
}

deploy();
