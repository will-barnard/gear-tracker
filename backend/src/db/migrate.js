// Applies backend/src/db/migrations/*.sql in filename order, once each,
// tracked in schema_migrations. Runs on every boot from server.js, after
// sequelize.sync() has created any tables that don't exist yet.
//
// Why not an init.sql in docker-entrypoint-initdb.d: Beachhead keeps postgres
// as a stateful service, so that script runs exactly once — when the volume
// is first created — and never again.
//
// Each file runs in its own transaction. A failure stops the boot: a backend
// running against a half-migrated schema is worse than one that won't start.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'migrations');

async function runMigrations(sequelize, { log = console.log } = {}) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const [rows] = await sequelize.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const files = fs.readdirSync(DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    log(`[migrate] applying ${file}`);
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(sql, { transaction });
      await sequelize.query('INSERT INTO schema_migrations (name) VALUES (:name)', {
        replacements: { name: file },
        transaction
      });
    });
  }
}

module.exports = { runMigrations };

// `node src/db/migrate.js` applies pending migrations without starting the API.
if (require.main === module) {
  require('dotenv').config();
  const { sequelize } = require('../models');
  runMigrations(sequelize)
    .then(() => sequelize.close())
    .catch((err) => {
      console.error('[migrate] failed:', err.message);
      process.exit(1);
    });
}
