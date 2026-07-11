const https = require('https');

const testUrl = 'https://rms-mocha.vercel.app/menu/cold-coffee.png?v=' + Date.now();
console.log('Fetching:', testUrl);

https.get(testUrl, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Length:', res.headers['content-length']);
  console.log('X-Vercel-Cache:', res.headers['x-vercel-cache']);
  console.log('All Headers:', JSON.stringify(res.headers, null, 2));
}).on('error', (e) => {
  console.error('Fetch failed:', e);
});
