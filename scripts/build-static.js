const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../app/api');
const tempApiDir = path.join(__dirname, '../app/_api_temp');

let renamed = false;

try {
  if (fs.existsSync(apiDir)) {
    console.log('Temporarily renaming app/api to app/_api_temp for static export...');
    fs.renameSync(apiDir, tempApiDir);
    renamed = true;
  }

  console.log('Running Next.js static build...');
  execSync('npx cross-env BUILD_STATIC=1 next build', { 
    stdio: 'inherit',
    env: { ...process.env, BUILD_STATIC: '1' }
  });
  console.log('Next.js static build completed successfully!');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
} finally {
  if (renamed && fs.existsSync(tempApiDir)) {
    console.log('Restoring app/_api_temp to app/api...');
    fs.renameSync(tempApiDir, apiDir);
    console.log('Restored app/api successfully!');
  }
}
