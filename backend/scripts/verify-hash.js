const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf-8'));
const map = new Map(data);
const admin = map.get('admin-0000-0000-0000-000000000001');

console.log('Hash in file:', admin.passwordHash);
bcrypt.compare('Admin@1234', admin.passwordHash).then(ok => {
  console.log('Password "Admin@1234" matches:', ok);
});
