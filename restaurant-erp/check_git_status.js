const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoPath = 'c:\\Users\\HP\\OneDrive\\Attachments\\OneDrive\\Desktop\\RMS';

try {
  console.log('Running git status...');
  const status = execSync('git status', { cwd: repoPath, encoding: 'utf8' });
  console.log('Git Status:\n', status);
  fs.writeFileSync(path.join(__dirname, 'git_status_output.txt'), status);
  
  console.log('Running git status --ignored...');
  const ignored = execSync('git status --ignored', { cwd: repoPath, encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, 'git_ignored_output.txt'), ignored);
  console.log('Successfully wrote git status and ignored files to output files.');
} catch (err) {
  console.error('Error running git commands:', err.message);
}
