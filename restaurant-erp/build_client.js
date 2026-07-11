const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'client');

try {
  console.log('Running npm run build inside client directory...');
  const output = execSync('npm run build', { cwd: clientPath, encoding: 'utf8' });
  console.log('Build output:\n', output);
  fs.writeFileSync(path.join(__dirname, 'local_build_success.txt'), output);
} catch (err) {
  console.error('Build failed locally!');
  fs.writeFileSync(path.join(__dirname, 'local_build_failed.txt'), err.stdout + '\n' + err.stderr + '\n' + err.message);
  console.error(err.stdout);
  console.error(err.stderr);
}
