const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoPath = 'c:\\Users\\HP\\OneDrive\\Attachments\\OneDrive\\[...]'; // path.join
const searchPath = path.join(__dirname, '..'); // Root directory where .git is

try {
  console.log('Running git ls-files on client/public/menu...');
  const files = execSync('git ls-files restaurant-erp/client/public/menu', { cwd: searchPath, encoding: 'utf8' });
  console.log('Tracked files in public/menu:\n', files);
  fs.writeFileSync(path.join(__dirname, 'git_tracked_files.txt'), files);
} catch (err) {
  console.error('Error running git command:', err.message);
}
