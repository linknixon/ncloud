import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('./server/database/persistentStore.json');

try {
  if (fs.existsSync(dbPath)) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let updated = 0;
    
    if (data.users && Array.isArray(data.users)) {
      data.users.forEach(user => {
        if (user.role === 'customer') {
          if (user.position !== 'Customer' || user.title !== 'Customer') {
            user.position = 'Customer';
            user.title = 'Customer';
            updated++;
          }
        }
      });
    }
    
    if (updated > 0) {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Successfully updated ${updated} existing customer accounts with the correct position/title defaults.`);
    } else {
      console.log('All customer accounts already have the correct position/title defaults. No updates needed.');
    }
  } else {
    console.log('Could not find persistentStore.json at ' + dbPath);
  }
} catch (err) {
  console.error('Error updating database:', err);
}
