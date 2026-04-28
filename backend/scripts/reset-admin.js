const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const STORE_FILE = path.join(__dirname, '..', 'src', 'auth', 'userStore.ts');

async function main() {
  // 1. Generate a fresh verified hash
  const hash = await bcrypt.hash('Admin@1234', 10);
  const ok = await bcrypt.compare('Admin@1234', hash);
  if (!ok) { console.error('Hash self-check failed!'); process.exit(1); }
  console.log('Hash verified:', hash);

  // 2. Write clean users.json (no admin — let the seed handle it)
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const entries = JSON.parse(raw).filter(([, u]) => u.role !== 'admin');
  fs.writeFileSync(USERS_FILE, JSON.stringify(entries, null, 2));
  console.log('Cleaned users.json');

  // 3. Patch userStore.ts with the verified hash
  let src = fs.readFileSync(STORE_FILE, 'utf-8');
  src = src.replace(
    /const passwordHash = '.*?';/,
    `const passwordHash = '${hash}';`
  );
  fs.writeFileSync(STORE_FILE, src);
  console.log('Patched userStore.ts with fresh hash');
  console.log('\nDone! Restart the backend. Login: admin@suuqii.et / Admin@1234');
}

main();
