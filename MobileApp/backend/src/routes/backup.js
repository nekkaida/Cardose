// Backup and restore routes
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Whitelist of valid table names to prevent SQL injection
const ALLOWED_TABLES = new Set([
  'users',
  'customers',
  'orders',
  'order_items',
  'invoices',
  'payments',
  'inventory_materials',
  'inventory_movements',
  'production_tasks',
  'production_stages',
  'quality_checks',
  'financial_transactions',
  'communication_messages',
  'communication_logs',
  'files',
  'templates',
  'notifications',
  'webhooks',
  'webhook_logs',
  'settings',
  'audit_logs',
  'backups',
  'sync_devices',
  'sync_logs',
  'sync_conflicts',
  'purchase_orders',
  'purchase_order_items',
]);

async function backupRoutes(fastify, options) {
  const db = fastify.db;
  const backupDir = path.join(__dirname, '../../backups');

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // List all backups (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith('.db') || f.endsWith('.sql'))
        .map((filename) => {
          const filepath = path.join(backupDir, filename);
          const stats = fs.statSync(filepath);
          return {
            filename,
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            created: stats.birthtime,
            modified: stats.mtime,
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      return {
        success: true,
        backups: files,
        count: files.length,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create backup (requires authentication)
  fastify.post(
    '/create',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          properties: {
            description: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { description } = request.body;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.db`;
        const filepath = path.join(backupDir, filename);

        // Get the source database path
        const sourceDbPath = db.db.name;

        // Copy the database file
        fs.copyFileSync(sourceDbPath, filepath);

        // Log the backup
        const backupId = uuidv4();
        db.db
          .prepare(
            `
        INSERT INTO backups (id, filename, filepath, description, size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
          )
          .run(
            backupId,
            filename,
            filepath,
            description || 'Manual backup',
            fs.statSync(filepath).size
          );

        return {
          success: true,
          message: 'Backup created successfully',
          backup: {
            id: backupId,
            filename,
            filepath,
            sizeMB: (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2),
          },
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get backup stats (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith('.db') || f.endsWith('.sql'));

      let totalSize = 0;
      files.forEach((f) => {
        totalSize += fs.statSync(path.join(backupDir, f)).size;
      });

      // Get latest backup from database
      const latestBackup = db.db
        .prepare(
          `
        SELECT * FROM backups ORDER BY created_at DESC LIMIT 1
      `
        )
        .get();

      return {
        success: true,
        stats: {
          totalBackups: files.length,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          backupDirectory: backupDir,
          latestBackup: latestBackup
            ? {
                filename: latestBackup.filename,
                created: latestBackup.created_at,
              }
            : null,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Delete backup (requires authentication, owner only)
  fastify.delete(
    '/:filename',
    { preHandler: [fastify.authenticate, fastify.authorize(['owner'])] },
    async (request, reply) => {
      try {
        const { filename } = request.params;

        // Prevent path traversal
        const sanitized = path.basename(filename);
        if (sanitized !== filename || filename.includes('..')) {
          return reply.status(400).send({ error: 'Invalid filename' });
        }

        const filepath = path.join(backupDir, filename);

        if (!fs.existsSync(filepath)) {
          reply.code(404);
          return { success: false, error: 'Backup file not found' };
        }

        fs.unlinkSync(filepath);

        // Remove from database
        db.db.prepare('DELETE FROM backups WHERE filename = ?').run(filename);

        return {
          success: true,
          message: 'Backup deleted successfully',
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Export to SQL (requires authentication)
  fastify.post(
    '/export-sql',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `export_${timestamp}.sql`;
        const filepath = path.join(backupDir, filename);

        // Get all tables
        const tables = db.db
          .prepare(
            `
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `
          )
          .all();

        let sql = '-- Database export\n';
        sql += `-- Created: ${new Date().toISOString()}\n\n`;

        for (const table of tables) {
          // Skip tables not in whitelist to prevent SQL injection
          if (!ALLOWED_TABLES.has(table.name)) {
            continue;
          }

          // Get table schema using parameterized lookup
          const schema = db.db
            .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`)
            .get(table.name);
          sql += `-- Table: ${table.name}\n`;
          sql += `${schema.sql};\n\n`;

          // Get table data (table.name validated against whitelist above)
          const rows = db.db.prepare(`SELECT * FROM "${table.name}"`).all();
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = Object.values(row).map((v) => {
              if (v === null) return 'NULL';
              if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
              return v;
            });
            sql += `INSERT INTO "${table.name}" (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          sql += '\n';
        }

        fs.writeFileSync(filepath, sql);

        return {
          success: true,
          message: 'Database exported to SQL',
          export: {
            filename,
            filepath,
            sizeMB: (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2),
          },
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Cleanup old backups (keep last N) (requires authentication)
  fastify.post(
    '/cleanup',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          properties: {
            keep: { type: 'integer', minimum: 1, maximum: 100, default: 5 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { keep = 5 } = request.body;

        const files = fs
          .readdirSync(backupDir)
          .filter((f) => f.endsWith('.db'))
          .map((filename) => ({
            filename,
            created: fs.statSync(path.join(backupDir, filename)).birthtime,
          }))
          .sort((a, b) => new Date(b.created) - new Date(a.created));

        const toDelete = files.slice(parseInt(keep));
        let deletedCount = 0;

        for (const file of toDelete) {
          fs.unlinkSync(path.join(backupDir, file.filename));
          db.db.prepare('DELETE FROM backups WHERE filename = ?').run(file.filename);
          deletedCount++;
        }

        return {
          success: true,
          message: `Cleaned up ${deletedCount} old backups`,
          deletedCount,
          remaining: files.length - deletedCount,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );
}

module.exports = backupRoutes;
