import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('./server/database/persistentStore.json');

try {
  if (fs.existsSync(dbPath)) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let updated = false;

    // 1. Fix the customer role matrix in persistentStore.json
    if (data.roles && Array.isArray(data.roles)) {
      const custRole = data.roles.find(r => r.code === 'customer');
      if (custRole && custRole.permissions) {
        for (const mod in custRole.permissions) {
          custRole.permissions[mod] = {
            create: false,
            read: false,
            update: false,
            delete: false,
            approve: false,
            share: false
          };
        }
        updated = true;
      }
    }

    // 2. Wipe custom overrides for all users who are customers
    if (data.users && Array.isArray(data.users)) {
      data.users.forEach(u => {
        if (u.role === 'customer' && u.custom_permissions) {
          u.custom_permissions = null;
          updated = true;
        }
      });
    }

    if (updated) {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      console.log('Successfully locked down customer role permissions in the database.');
    } else {
      console.log('Customer role permissions are already securely locked down.');
    }
  } else {
    console.log('Could not find persistentStore.json at ' + dbPath);
  }
} catch (err) {
  console.error('Error updating database:', err);
}
