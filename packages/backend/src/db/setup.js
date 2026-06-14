/**
 * Database setup script — creates tables and indexes from schema.sql
 * Run: npm run db:setup -w crm-backend
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env.example') });
// Override with local .env if it exists
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env'), override: true });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔧 Running schema.sql...');
    await pool.query(schema);
    console.log('✅ Database schema created successfully');
  } catch (err) {
    console.error('❌ Schema setup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
