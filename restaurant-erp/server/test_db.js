const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;

const UserSchema = new mongoose.Schema({
  username: String,
  password: { type: String, select: true },
  role: String,
  isActive: Boolean
}, { collection: 'users' });

const User = mongoose.model('UserTest', UserSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    console.log('❌ Admin user NOT found in the database!');
    const allUsers = await User.find({});
    console.log('All usernames in database:', allUsers.map(u => u.username));
  } else {
    console.log('✅ Found admin user:', admin.username);
    console.log('Is Active:', admin.isActive);
    console.log('Hashed Password:', admin.password);

    const isMatch = await bcrypt.compare('Admin@123', admin.password);
    console.log('Does "Admin@123" match hashed password?', isMatch ? '✅ YES' : '❌ NO');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
