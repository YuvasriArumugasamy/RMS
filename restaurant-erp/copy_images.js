const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src', 'assets');
const destDir = path.join(__dirname, 'client', 'public', 'menu');

const filesToCopy = [
  { src: 'Screenshot 2026-07-10 120208.png', dest: 'dal.png' },
  { src: 'Grilled paneer with chutney and veggies copy.png', dest: 'chicken-wings.png' },
  { src: 'Screenshot 2026-07-10 115627.png', dest: 'fresh-lime-soda.png' },
  { src: 'Screenshot 2026-07-10 115644.png', dest: 'mint-mojito.png' },
  { src: 'ChatGPT Image Jul 10, 2026, 12_52_51 PM.png', dest: 'classic-belgian-waffle.png' }
];

console.log('🏁 Starting image copy process...');

filesToCopy.forEach(f => {
  const srcPath = path.join(srcDir, f.src);
  const destPath = path.join(destDir, f.dest);
  try {
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied: ${f.src} -> ${f.dest}`);
    } else {
      console.warn(`⚠️ Source file not found: ${srcPath}`);
    }
  } catch (err) {
    console.error(`❌ Failed to copy ${f.src}:`, err.message);
  }
});

console.log('🎉 Done copying images!');
