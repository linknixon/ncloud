import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDataPath = path.join(__dirname, 'database', 'seedData.json');
let cachedSeedData = null;

try {
  if (fs.existsSync(seedDataPath)) {
    cachedSeedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
  }
} catch (err) {
  console.error("Failed to load seedData.json:", err.message);
}

// Create MySQL Connection Pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nova_website',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

let isMysqlOffline = false;

// Helper wrapper for DB queries with graceful fallback if MySQL server is not running locally
export async function query(sql, params = []) {
  if (isMysqlOffline) {
    return { success: false, error: 'MySQL known offline', isFallback: true };
  }

  try {
    const [rows] = await pool.execute(sql, params);
    return { success: true, data: rows, isFallback: false };
  } catch (error) {
    console.warn(`[MySQL Note] Local MySQL offline or query error (${error.code}). Serving structured memory provider.`);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      isMysqlOffline = true;
      // Optionally reset the flag after a minute to check if it comes back up
      setTimeout(() => { isMysqlOffline = false; }, 60000);
    }
    return { success: false, error: error.message, isFallback: true };
  }
}

export function getSeedData() {
  return cachedSeedData;
}
