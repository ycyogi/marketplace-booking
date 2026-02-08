require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '../../.env' });

/** @type {import('node-pg-migrate').RunnerOption} */
module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  migrationsTable: 'schema_migrations',
  dir: 'migrations',
  direction: 'up',
  verbose: true,
  migrationsSchema: 'public',
};
