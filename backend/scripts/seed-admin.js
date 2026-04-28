const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

async function main() {
  const hash = await bcrypt.hash('Admin@1234', 10);

  // verify it works before writing
  const ok = await bcrypt.compare('Admin@1234', hash);
  if (!ok) { console.error('Hash verification failed!'); process.exit(1); }

  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const entries = JSON.parse(raw);

  // remove any existing admin entry
  const filtered = entries.filter(([, u]) => u.role !== 'admin');

  const adminEntry = [
    'admin-0000-0000-0000-000000000001',
    {
      id: 'admin-0000-0000-0000-000000000001',
      email: 'admin@suuqii.et',
      role: 'admin',
      passwordHash: hash,
      isActive: true,
      createdAt: '2026-04-07T00:00:00.000Z',
      updatedAt: '2026-04-07T00:00:00.000Z',
    },
  ];

  filtered.push(adminEntry);
  fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2));
  console.log('Admin seeded successfully.');
  console.log('Email:    admin@suuqii.et');
  console.log('Password: Admin@1234');
}

main();
