require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const fs = require('fs-extra');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5ZHRym2sLhAa@ep-jolly-brook-ayoikfrx-pooler.c-5.us-east-2.aws.neon.tech/bbff-auction?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const DB_FILE = path.join(__dirname, 'db.json');

async function migrate() {
  console.log('Connecting to PostgreSQL database...');
  
  // Create app_state table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Table app_state ensured.');

  if (await fs.pathExists(DB_FILE)) {
    const data = await fs.readJson(DB_FILE);
    console.log(`Reading from db.json (${data.players?.length || 0} players, ${data.teams?.length || 0} teams, ${data.auctionLog?.length || 0} logs)...`);
    
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
      [JSON.stringify(data)]
    );
    console.log('✅ Successfully migrated db.json into PostgreSQL!');
  } else {
    console.log('No db.json found to migrate.');
  }

  // Verify migration
  const res = await pool.query('SELECT data, updated_at FROM app_state WHERE id = 1');
  if (res.rows.length > 0) {
    const row = res.rows[0];
    const dbData = row.data;
    console.log(`Verification: Database contains ${dbData.players?.length || 0} players, ${dbData.teams?.length || 0} teams, ${dbData.auctionLog?.length || 0} logs. Last updated: ${row.updated_at}`);
  }

  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
