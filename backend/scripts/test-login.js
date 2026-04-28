const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const entries = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
const map = new Map(entries);

const admin = map.get('admin-0000-0000-0000-000000000001');
console.log('Admin user found:', !!admin);
console.log('Email field:', admin?.email);
console.log('Hash:', admin?.passwordHash);

bcrypt.compare('Admin@1234', admin.passwordHash).then(ok => {
  console.log('Password match:', ok);
});
