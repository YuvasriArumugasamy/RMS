const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'client', 'src', 'assets', 'image.png');
const destFavicon = path.join(__dirname, 'client', 'public', 'favicon.png');
const destIcon = path.join(__dirname, 'client', 'public', 'icon.png');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, destFavicon);
  fs.copyFileSync(src, destIcon);
  console.log('Chef icon copied to public/favicon.png & icon.png successfully!');
} else {
  console.error('Source image.png not found at:', src);
}
