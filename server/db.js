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

// Determine MAMP defaults if running locally on macOS
const isMac = process.platform === 'darwin';
const isMampEnvironment = isMac && (fs.existsSync('/Applications/MAMP') || fs.existsSync('/Applications/MAMP/tmp/mysql'));

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = Number(process.env.DB_PORT) || (isMampEnvironment ? 8889 : 3306);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (isMampEnvironment ? 'root' : '');
const dbName = process.env.DB_NAME || 'nova_website';

// Create MySQL Connection Pool (supports MAMP localhost:8889 and standard MySQL)
export const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log(`[Database Config] Configured MySQL connection for ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

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
