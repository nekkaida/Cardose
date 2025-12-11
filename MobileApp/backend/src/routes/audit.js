// Audit logging routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function auditRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get audit logs (requires authentication)
  fastify.get('/logs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { user_id, action, entity_type, entity_id, startDate, endDate, limit = 100, page = 1 } = request.query;

      let query = `
        SELECT al.*, u.full_name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (user_id) {
        query += ' AND al.user_id = ?';
        params.push(user_id);
      }
      if (action) {
        query += ' AND al.action = ?';
        params.push(action);
      }
      if (entity_type) {
        query += ' AND al.entity_type = ?';
        params.push(entity_type);
      }
      if (entity_id) {
        query += ' AND al.entity_id = ?';
        params.push(entity_id);
      }
      if (startDate) {
        query += ' AND DATE(al.created_at) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND DATE(al.created_at) <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY al.created_at DESC';

      // Get total count
      const countQuery = query.replace(/SELECT al\.\*, u\.full_name as user_name/, 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const logs = db.db.prepare(query).all(...params);

      // Parse details JSON
      const logsWithParsedDetails = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }));

      return {
        success: true,
        logs: logsWithParsedDetails,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get audit stats (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      let dateFilter = '';
      const params = [];
      if (startDate) {
        dateFilter += ' AND DATE(created_at) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += ' AND DATE(created_at) <= ?';
        params.push(endDate);
      }

      // Total logs
      const totalLogs = db.db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE 1=1 ${dateFilter}`).get(...params);

      // By action
      const byAction = db.db.prepare(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE 1=1 ${dateFilter}
        GROUP BY action
        ORDER BY count DESC
      `).all(...params);

      // By entity type
      const byEntityType = db.db.prepare(`
        SELECT entity_type, COUNT(*) as count
        FROM audit_logs
        WHERE 1=1 ${dateFilter}
        GROUP BY entity_type
        ORDER BY count DESC
      `).all(...params);

      // By user
      const byUser = db.db.prepare(`
        SELECT al.user_id, u.full_name, COUNT(*) as count
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1 ${dateFilter}
        GROUP BY al.user_id
        ORDER BY count DESC
        LIMIT 10
      `).all(...params);

      // Recent activity (last 24 hours)
      const recentActivity = db.db.prepare(`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= datetime('now', '-24 hours')
      `).get();

      return {
        success: true,
        stats: {
          total: totalLogs?.count || 0,
          recentActivity: recentActivity?.count || 0,
          byAction,
          byEntityType,
          byUser
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Log action (requires authentication)
  fastify.post('/log', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { user_id, action, entity_type, entity_id, details, ip_address } = request.body;

      if (!action) {
        reply.code(400);
        return { success: false, error: 'Action is required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(id, user_id, action, entity_type, entity_id, details ? JSON.stringify(details) : null, ip_address);

      return {
        success: true,
        message: 'Action logged successfully',
        logId: id
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Export audit logs (requires authentication)
  fastify.get('/export', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { format = 'json', startDate, endDate, action, entity_type } = request.query;

      let query = `
        SELECT al.*, u.full_name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (startDate) {
        query += ' AND DATE(al.created_at) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND DATE(al.created_at) <= ?';
        params.push(endDate);
      }
      if (action) {
        query += ' AND al.action = ?';
        params.push(action);
      }
      if (entity_type) {
        query += ' AND al.entity_type = ?';
        params.push(entity_type);
      }

      query += ' ORDER BY al.created_at DESC';

      const logs = db.db.prepare(query).all(...params);

      if (format === 'csv') {
        const headers = ['ID', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'Created At'];
        const rows = logs.map(log => [
          log.id,
          log.user_name || log.user_id || '',
          log.action,
          log.entity_type || '',
          log.entity_id || '',
          log.details || '',
          log.ip_address || '',
          log.created_at
        ]);

        const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
        return csv;
      }

      return {
        success: true,
        logs: logs.map(log => ({
          ...log,
          details: log.details ? JSON.parse(log.details) : null
        })),
        count: logs.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Cleanup old audit logs (requires authentication)
  fastify.delete('/cleanup', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { days_to_keep = 90 } = request.query;

      const result = db.db.prepare(`
        DELETE FROM audit_logs
        WHERE DATE(created_at) < DATE('now', '-' || ? || ' days')
      `).run(parseInt(days_to_keep));

      return {
        success: true,
        message: `Deleted ${result.changes} old audit logs`,
        deleted: result.changes
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

module.exports = auditRoutes;
