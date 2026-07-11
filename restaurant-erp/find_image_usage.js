const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'client', 'src', 'pages', 'CustomerMenu.jsx'),
  path.join(__dirname, 'client', 'src', 'pages', 'OrderManagement.jsx'),
  path.join(__dirname, 'client', 'src', 'pages', 'MenuManagement.jsx')
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`\n📌 File: ${path.basename(f)}`);
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('MenuItemImage')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
