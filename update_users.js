const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'server/database/persistentStore.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let updated = 0;
data.users.forEach(u => {
  if (!u.role || u.role === '') {
    u.role = 'customer';
    u.position = 'Customer';
    u.title = 'Customer';
    updated++;
  } else if (u.role === 'customer') {
    if (u.position !== 'Customer') { u.position = 'Customer'; updated++; }
    if (u.title !== 'Customer') { u.title = 'Customer'; updated++; }
  }
});

if (updated > 0) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  console.log(`Updated ${updated} user fields to match their roles.`);
} else {
  console.log('All existing users already perfectly match their role settings.');
}
