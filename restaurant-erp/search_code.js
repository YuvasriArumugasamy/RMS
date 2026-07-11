const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\HP\\OneDrive\\Attachments\\[...]'; // Wait, let's use path.join
const searchDir = path.join(__dirname, 'client', 'src');

function searchFiles(dir, query) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchFiles(filePath, query);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css'))) {
      const content = fs.readFileSync(filePath, 'utf16le'); // Try UTF-16
      const contentUtf8 = fs.readFileSync(filePath, 'utf8');
      if (contentUtf8.includes(query) || content.includes(query)) {
        console.log(`Found "${query}" in ${filePath}`);
      }
    }
  });
}

console.log('Searching for "Cold Coffee" in client/src...');
searchFiles(searchDir, 'Cold Coffee');
console.log('Searching for "Fresh Lime Soda" in client/src...');
searchFiles(searchDir, 'Fresh Lime Soda');
console.log('Done!');
