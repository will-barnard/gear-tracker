# Database Migrations

This folder contains database migration scripts that are automatically run when the backend container starts.

## How It Works

1. **Automatic Execution**: When the Docker container starts, `docker-entrypoint.sh` runs all migrations via `run-migrations.js`
2. **Idempotent**: Each migration checks if it needs to run and safely skips if already applied
3. **Ordered**: Migrations run in the order specified in `run-migrations.js`

## Creating a New Migration

### 1. Create a Migration File

Create a new file in this directory (e.g., `migrate-add-new-feature.js`):

```javascript
/**
 * Migration: Description of what this migration does
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

async function migrate(sequelizeInstance) {
  // Use provided instance or create new one for standalone execution
  const sequelize = sequelizeInstance || new Sequelize(
    process.env.DB_NAME || 'geartracker',
    process.env.DB_USER || 'geartracker',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );

  try {
    console.log('Starting migration...');
    
    // Check if migration is needed
    const [result] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='your_table' AND column_name='your_column';
    `);
    
    if (result.length === 0) {
      console.log('Applying migration...');
      await sequelize.query(`
        ALTER TABLE your_table ADD COLUMN your_column VARCHAR(255);
      `);
      console.log('✓ Migration completed');
    } else {
      console.log('✓ Migration already applied, skipping');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Only close if we created our own instance
    if (!sequelizeInstance) {
      await sequelize.close();
    }
  }
}

// Allow running standalone (for manual execution)
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
```

### 2. Register the Migration

Add your migration file to the `migrations` array in `run-migrations.js`:

```javascript
const migrations = [
  'migrate-additional-costs-type.js',
  'migrate-item-status-for-sale.js',
  'migrate-add-new-feature.js', // <- Add here
];
```

### 3. Deploy

When you run `./deploy.sh`, the new migration will automatically run when the container starts.

## Testing Migrations Locally

You can test a migration manually before deploying:

```bash
# Test a specific migration
node backend/src/migrations/migrate-your-migration.js

# Test all migrations
node backend/src/migrations/run-migrations.js
```

## Best Practices

1. **Always make migrations idempotent**: Check if changes are needed before applying
2. **Use transactions** for complex migrations to ensure atomicity
3. **Test locally first** before deploying to production
4. **Never modify existing migrations**: Create a new migration instead
5. **Add migrations to the end** of the migrations array to maintain order
6. **Include rollback instructions** in comments if manual rollback is needed

## Troubleshooting

### Migration fails on startup

The container will continue to start even if a migration fails. Check the container logs:

```bash
docker-compose logs backend
```

### Need to rollback a migration

Currently, rollbacks are manual. Check the migration file for instructions on how to reverse the changes.

### Database connection timeout

If migrations fail due to database not being ready, the entrypoint script waits up to 30 seconds. If your database takes longer to start, increase the timeout in `docker-entrypoint.sh`.

## Existing Migrations

1. **migrate-additional-costs-type.js**: Adds income/expense type to additional costs
2. **migrate-item-status-for-sale.js**: Adds 'for_sale' status to items enum
3. **migrate-add-is-listed-online.js**: Adds is_listed_online boolean field to items
