// Audit logs routes (alias for /api/audit-logs endpoint) - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function auditLogsRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get audit logs (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
}

module.exports = auditLogsRoutes;
