const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function search(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      search(p);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(p, 'utf8');
      if (content.includes('item.name') && content.includes('item.price')) {
        // Log the file and some context
        console.log(`\n📌 File: ${p}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('item.name') || line.includes('item.price')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

search(srcDir);
