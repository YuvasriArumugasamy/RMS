const https = require('https');

https.get('https://rms-mocha.vercel.app/index.html', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:');
  for (const [key, val] of Object.entries(res.headers)) {
    console.log(`- ${key}: ${val}`);
  }
}).on('error', (e) => {
  console.error(e);
});
