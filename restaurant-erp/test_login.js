const axios = require('axios');

async function test() {
  try {
    console.log('Sending login request to http://localhost:5000/api/auth/login...');
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'Admin@123'
    });
    console.log('Success! Response status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error! Status:', err.response?.status);
    console.error('Message:', err.response?.data?.message || err.message);
    if (err.response?.data) {
      console.error('Full Error Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

test();
