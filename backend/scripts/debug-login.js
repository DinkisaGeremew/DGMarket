// Simulates exactly what the backend does at runtime
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Replicate loadMap
const file = path.join(__dirname, '..', 'data', 'users.json');
const raw = fs.readFileSync(file, 'utf-8');
const entries = JSON.parse(raw);
const users = new Map(entries);

console.log('Total users loaded:', users.size);

// Replicate findByEmail
const email = 'admin@suuqii.et';
let found;
for (const u of users.values()) {
  if (u.email?.toLowerCase() === email.toLowerCase()) { found = u; break; }
}

console.log('User found by email:', !!found);
if (found) {
  console.log('Role:', found.role);
  console.log('Has passwordHash:', !!found.passwordHash);
  bcrypt.compare('Admin@1234', found.passwordHash).then(ok => {
    console.log('Password valid:', ok);
  });
}
