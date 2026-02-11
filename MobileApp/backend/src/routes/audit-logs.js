// Audit logs routes (alias for /api/audit-logs endpoint)
const { v4: uuidv4 } = require('uuid');
const { parsePagination } = require('../utils/pagination');

async function auditLogsRoutes(fastify, options) {
  const db = fastify.db;

  // Get audit logs (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { user_id, action, entity_type, entity_id, startDate, endDate } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

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
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

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
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

module.exports = auditLogsRoutes;
