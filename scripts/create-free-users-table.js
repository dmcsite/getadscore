const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    let value = valueParts.join('=').trim();
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key.trim()] = value;
  }
});

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(dbUrl);

async function run() {
  console.log('Creating free_users table...');

  await sql`
    CREATE TABLE IF NOT EXISTS free_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      used_free_at TIMESTAMP,
      subscribed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('Table created');

  await sql`CREATE INDEX IF NOT EXISTS idx_free_users_email ON free_users(email)`;
  console.log('Index created');

  console.log('Done!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
