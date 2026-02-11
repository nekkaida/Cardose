// Database migration service - tracks and applies schema changes
const fs = require('fs');
const path = require('path');

class MigrationService {
  constructor(db) {
    this.db = db;
    this.migrationsDir = path.join(__dirname, '../database/migrations');
    this.ensureMigrationsTable();
  }

  ensureMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  getAppliedMigrations() {
    return this.db.prepare('SELECT name FROM schema_migrations ORDER BY id').all()
      .map(row => row.name);
  }

  getPendingMigrations() {
    const applied = new Set(this.getAppliedMigrations());

    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    return fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort()
      .filter(f => !applied.has(f));
  }

  runAll() {
    const pending = this.getPendingMigrations();

    if (pending.length === 0) {
      return { applied: 0, migrations: [] };
    }

    const results = [];

    for (const filename of pending) {
      const filepath = path.join(this.migrationsDir, filename);
      const migration = require(filepath);

      try {
        this.db.exec('BEGIN');
        migration.up(this.db);
        this.db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(filename);
        this.db.exec('COMMIT');
        results.push({ name: filename, status: 'applied' });
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${error.message}`);
      }
    }

    return { applied: results.length, migrations: results };
  }

  getStatus() {
    const applied = this.getAppliedMigrations();
    const pending = this.getPendingMigrations();

    return {
      applied: applied.length,
      pending: pending.length,
      appliedMigrations: applied,
      pendingMigrations: pending
    };
  }
}

module.exports = MigrationService;
