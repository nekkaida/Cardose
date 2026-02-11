// MigrationService unit tests
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// We need to require the service fresh for each test to avoid cached module state
let MigrationService;

describe('MigrationService', () => {
  let db;
  let tempDir;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create a temp directory for test migration files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-test-'));

    // Fresh require to avoid any cached state
    jest.resetModules();
    MigrationService = require('../../src/services/MigrationService');
  });

  afterEach(() => {
    // Close database
    if (db && db.open) {
      db.close();
    }

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==================== SCHEMA MIGRATIONS TABLE ====================
  describe('constructor / ensureMigrationsTable', () => {
    test('should create schema_migrations table on construction', () => {
      const service = new MigrationService(db);

      // Verify the table exists
      const tableInfo = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
      ).get();

      expect(tableInfo).toBeDefined();
      expect(tableInfo.name).toBe('schema_migrations');
    });

    test('schema_migrations table should have correct columns', () => {
      const service = new MigrationService(db);

      const columns = db.prepare('PRAGMA table_info(schema_migrations)').all();
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('applied_at');
    });

    test('should not fail if schema_migrations table already exists', () => {
      // Create the table first
      db.exec(`
        CREATE TABLE schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // This should not throw
      expect(() => new MigrationService(db)).not.toThrow();
    });

    test('should preserve existing data when called multiple times', () => {
      const service1 = new MigrationService(db);

      // Insert a migration record manually
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_test.js');

      // Create another instance (calls ensureMigrationsTable again)
      const service2 = new MigrationService(db);

      // The previously inserted record should still exist
      const rows = db.prepare('SELECT name FROM schema_migrations').all();
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('001_test.js');
    });
  });

  // ==================== GET APPLIED MIGRATIONS ====================
  describe('getAppliedMigrations', () => {
    test('should return empty array when no migrations have been applied', () => {
      const service = new MigrationService(db);
      const applied = service.getAppliedMigrations();

      expect(applied).toEqual([]);
    });

    test('should return names of applied migrations in order', () => {
      const service = new MigrationService(db);

      // Insert migrations in a specific order
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_first.js');
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('002_second.js');
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('003_third.js');

      const applied = service.getAppliedMigrations();

      expect(applied).toEqual(['001_first.js', '002_second.js', '003_third.js']);
    });

    test('should return only name strings, not full row objects', () => {
      const service = new MigrationService(db);

      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_test.js');

      const applied = service.getAppliedMigrations();

      expect(typeof applied[0]).toBe('string');
      expect(applied[0]).toBe('001_test.js');
    });
  });

  // ==================== GET PENDING MIGRATIONS ====================
  describe('getPendingMigrations', () => {
    test('should return empty array when migrations directory does not exist', () => {
      const service = new MigrationService(db);

      // Override migrationsDir to a non-existent path
      service.migrationsDir = path.join(tempDir, 'non-existent-dir');

      const pending = service.getPendingMigrations();
      expect(pending).toEqual([]);
    });

    test('should return all migration files when none have been applied', () => {
      const service = new MigrationService(db);

      // Create migration files in temp dir
      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '001_first.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '002_second.js'), 'module.exports = { up() {} };');

      service.migrationsDir = migrationsSubDir;

      const pending = service.getPendingMigrations();
      expect(pending).toEqual(['001_first.js', '002_second.js']);
    });

    test('should exclude already applied migrations', () => {
      const service = new MigrationService(db);

      // Create migration files in temp dir
      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '001_first.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '002_second.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '003_third.js'), 'module.exports = { up() {} };');

      // Mark first migration as applied
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_first.js');

      service.migrationsDir = migrationsSubDir;

      const pending = service.getPendingMigrations();
      expect(pending).toEqual(['002_second.js', '003_third.js']);
    });

    test('should only include .js files', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '001_first.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, 'README.md'), '# Migrations');
      fs.writeFileSync(path.join(migrationsSubDir, '002_second.sql'), 'SELECT 1;');

      service.migrationsDir = migrationsSubDir;

      const pending = service.getPendingMigrations();
      expect(pending).toEqual(['001_first.js']);
    });

    test('should return migrations sorted alphabetically', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '003_third.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '001_first.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '002_second.js'), 'module.exports = { up() {} };');

      service.migrationsDir = migrationsSubDir;

      const pending = service.getPendingMigrations();
      expect(pending).toEqual(['001_first.js', '002_second.js', '003_third.js']);
    });

    test('should return empty array when all migrations are applied', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '001_first.js'), 'module.exports = { up() {} };');

      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_first.js');

      service.migrationsDir = migrationsSubDir;

      const pending = service.getPendingMigrations();
      expect(pending).toEqual([]);
    });
  });

  // ==================== RUN ALL MIGRATIONS ====================
  describe('runAll', () => {
    test('should return zero applied when no pending migrations', () => {
      const service = new MigrationService(db);

      // Point to empty migrations directory
      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      service.migrationsDir = migrationsSubDir;

      const result = service.runAll();

      expect(result.applied).toBe(0);
      expect(result.migrations).toEqual([]);
    });

    test('should apply pending migrations and record them', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);

      // Create a migration file that creates a test table
      const migrationCode = `
        module.exports = {
          up(db) {
            db.exec('CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT)');
          }
        };
      `;
      fs.writeFileSync(path.join(migrationsSubDir, '001_create_test_table.js'), migrationCode);

      service.migrationsDir = migrationsSubDir;

      const result = service.runAll();

      expect(result.applied).toBe(1);
      expect(result.migrations).toHaveLength(1);
      expect(result.migrations[0]).toEqual({
        name: '001_create_test_table.js',
        status: 'applied'
      });

      // Verify the table was actually created
      const tableInfo = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'"
      ).get();
      expect(tableInfo).toBeDefined();

      // Verify the migration was recorded in schema_migrations
      const applied = service.getAppliedMigrations();
      expect(applied).toContain('001_create_test_table.js');
    });

    test('should apply multiple migrations in sorted order', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);

      // Create two migration files
      fs.writeFileSync(path.join(migrationsSubDir, '001_create_table_a.js'), `
        module.exports = {
          up(db) {
            db.exec('CREATE TABLE table_a (id INTEGER PRIMARY KEY)');
          }
        };
      `);

      fs.writeFileSync(path.join(migrationsSubDir, '002_create_table_b.js'), `
        module.exports = {
          up(db) {
            db.exec('CREATE TABLE table_b (id INTEGER PRIMARY KEY, a_id INTEGER REFERENCES table_a(id))');
          }
        };
      `);

      service.migrationsDir = migrationsSubDir;

      const result = service.runAll();

      expect(result.applied).toBe(2);
      expect(result.migrations[0].name).toBe('001_create_table_a.js');
      expect(result.migrations[1].name).toBe('002_create_table_b.js');

      // Both tables should exist
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('table_a', 'table_b') ORDER BY name"
      ).all();
      expect(tables).toHaveLength(2);
    });

    test('should skip already-applied migrations', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);

      // Create two migration files
      fs.writeFileSync(path.join(migrationsSubDir, '001_already_done.js'), `
        module.exports = {
          up(db) {
            db.exec('CREATE TABLE already_done (id INTEGER PRIMARY KEY)');
          }
        };
      `);

      fs.writeFileSync(path.join(migrationsSubDir, '002_still_pending.js'), `
        module.exports = {
          up(db) {
            db.exec('CREATE TABLE still_pending (id INTEGER PRIMARY KEY)');
          }
        };
      `);

      // Mark the first one as already applied
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_already_done.js');

      service.migrationsDir = migrationsSubDir;

      const result = service.runAll();

      // Only the second migration should have been applied
      expect(result.applied).toBe(1);
      expect(result.migrations).toHaveLength(1);
      expect(result.migrations[0].name).toBe('002_still_pending.js');

      // The already_done table should NOT exist (migration was skipped, not run)
      const alreadyDoneTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='already_done'"
      ).get();
      expect(alreadyDoneTable).toBeUndefined();

      // The still_pending table SHOULD exist
      const stillPendingTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='still_pending'"
      ).get();
      expect(stillPendingTable).toBeDefined();
    });

    test('should rollback on migration failure', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);

      // Create a migration that will fail
      fs.writeFileSync(path.join(migrationsSubDir, '001_will_fail.js'), `
        module.exports = {
          up(db) {
            // This will fail because the table doesn't exist to ALTER
            db.exec('ALTER TABLE nonexistent_table ADD COLUMN foo TEXT');
          }
        };
      `);

      service.migrationsDir = migrationsSubDir;

      // Should throw with descriptive error
      expect(() => service.runAll()).toThrow('Migration 001_will_fail.js failed');

      // The failed migration should NOT be recorded
      const applied = service.getAppliedMigrations();
      expect(applied).not.toContain('001_will_fail.js');
      expect(applied).toHaveLength(0);
    });

    test('should rollback only the failed migration, keeping previous successful ones', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);

      // First migration succeeds
      fs.writeFileSync(path.join(migrationsSubDir, '001_good.js'), `
        module.exports = {
          up(db) {
            db.exec('CREATE TABLE good_table (id INTEGER PRIMARY KEY)');
          }
        };
      `);

      // Second migration fails
      fs.writeFileSync(path.join(migrationsSubDir, '002_bad.js'), `
        module.exports = {
          up(db) {
            db.exec('INVALID SQL STATEMENT HERE');
          }
        };
      `);

      service.migrationsDir = migrationsSubDir;

      expect(() => service.runAll()).toThrow('Migration 002_bad.js failed');

      // The first successful migration should be recorded
      const applied = service.getAppliedMigrations();
      expect(applied).toContain('001_good.js');
      expect(applied).not.toContain('002_bad.js');

      // The good_table should exist
      const goodTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='good_table'"
      ).get();
      expect(goodTable).toBeDefined();
    });

    test('should not re-apply migrations on second runAll call', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);

      // Migration that uses INSERT - running it twice would cause duplicate records
      fs.writeFileSync(path.join(migrationsSubDir, '001_insert_data.js'), `
        module.exports = {
          up(db) {
            db.exec('CREATE TABLE config (id INTEGER PRIMARY KEY, key TEXT UNIQUE, value TEXT)');
            db.exec("INSERT INTO config (key, value) VALUES ('version', '1.0')");
          }
        };
      `);

      service.migrationsDir = migrationsSubDir;

      // First run
      const result1 = service.runAll();
      expect(result1.applied).toBe(1);

      // Second run - should skip everything
      const result2 = service.runAll();
      expect(result2.applied).toBe(0);
      expect(result2.migrations).toEqual([]);

      // Should still have only one row in config
      const rows = db.prepare('SELECT * FROM config').all();
      expect(rows).toHaveLength(1);
    });
  });

  // ==================== GET STATUS ====================
  describe('getStatus', () => {
    test('should return correct status with no migrations at all', () => {
      const service = new MigrationService(db);

      // Point to empty directory
      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      service.migrationsDir = migrationsSubDir;

      const status = service.getStatus();

      expect(status.applied).toBe(0);
      expect(status.pending).toBe(0);
      expect(status.appliedMigrations).toEqual([]);
      expect(status.pendingMigrations).toEqual([]);
    });

    test('should return correct status with pending migrations', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '001_pending.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '002_pending.js'), 'module.exports = { up() {} };');

      service.migrationsDir = migrationsSubDir;

      const status = service.getStatus();

      expect(status.applied).toBe(0);
      expect(status.pending).toBe(2);
      expect(status.appliedMigrations).toEqual([]);
      expect(status.pendingMigrations).toEqual(['001_pending.js', '002_pending.js']);
    });

    test('should return correct status with mixed applied and pending', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '001_done.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '002_pending.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '003_pending.js'), 'module.exports = { up() {} };');

      // Mark the first as applied
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_done.js');

      service.migrationsDir = migrationsSubDir;

      const status = service.getStatus();

      expect(status.applied).toBe(1);
      expect(status.pending).toBe(2);
      expect(status.appliedMigrations).toEqual(['001_done.js']);
      expect(status.pendingMigrations).toEqual(['002_pending.js', '003_pending.js']);
    });

    test('should return correct status when all migrations are applied', () => {
      const service = new MigrationService(db);

      const migrationsSubDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsSubDir);
      fs.writeFileSync(path.join(migrationsSubDir, '001_done.js'), 'module.exports = { up() {} };');
      fs.writeFileSync(path.join(migrationsSubDir, '002_done.js'), 'module.exports = { up() {} };');

      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('001_done.js');
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('002_done.js');

      service.migrationsDir = migrationsSubDir;

      const status = service.getStatus();

      expect(status.applied).toBe(2);
      expect(status.pending).toBe(0);
      expect(status.appliedMigrations).toEqual(['001_done.js', '002_done.js']);
      expect(status.pendingMigrations).toEqual([]);
    });

    test('should handle non-existent migrations directory gracefully', () => {
      const service = new MigrationService(db);
      service.migrationsDir = path.join(tempDir, 'does-not-exist');

      const status = service.getStatus();

      expect(status.applied).toBe(0);
      expect(status.pending).toBe(0);
      expect(status.pendingMigrations).toEqual([]);
    });
  });
});
