// Quality checks routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function qualityChecksRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get all quality checks
  fastify.get('/', async (request, reply) => {
    try {
      const { order_id, status, limit = 100, page = 1 } = request.query;

      let query = `
        SELECT qc.*, o.order_number, u.full_name as checked_by_name
        FROM quality_checks qc
        LEFT JOIN orders o ON qc.order_id = o.id
        LEFT JOIN users u ON qc.checked_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (order_id) {
        query += ' AND qc.order_id = ?';
        params.push(order_id);
      }
      if (status) {
        query += ' AND qc.overall_status = ?';
        params.push(status);
      }

      query += ' ORDER BY qc.checked_at DESC';

      // Get total count
      const countQuery = query.replace(/SELECT qc\.\*, o\.order_number, u\.full_name as checked_by_name/, 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const checks = db.db.prepare(query).all(...params);

      // Parse checklist items JSON
      const checksWithParsedItems = checks.map(check => ({
        ...check,
        checklist_items: check.checklist_items ? JSON.parse(check.checklist_items) : []
      }));

      return {
        success: true,
        checks: checksWithParsedItems,
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

  // Get quality check by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const check = db.db.prepare(`
        SELECT qc.*, o.order_number, u.full_name as checked_by_name
        FROM quality_checks qc
        LEFT JOIN orders o ON qc.order_id = o.id
        LEFT JOIN users u ON qc.checked_by = u.id
        WHERE qc.id = ?
      `).get(id);

      if (!check) {
        reply.code(404);
        return { success: false, error: 'Quality check not found' };
      }

      return {
        success: true,
        check: {
          ...check,
          checklist_items: check.checklist_items ? JSON.parse(check.checklist_items) : []
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Create quality check
  fastify.post('/', async (request, reply) => {
    try {
      const { order_id, checklist_items, overall_status, notes, checked_by } = request.body;

      if (!order_id || !checklist_items) {
        reply.code(400);
        return { success: false, error: 'Order ID and checklist items are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO quality_checks (id, order_id, checklist_items, overall_status, notes, checked_by, checked_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(id, order_id, JSON.stringify(checklist_items), overall_status || 'pending', notes, checked_by);

      // If passed, update order status to completed
      if (overall_status === 'passed') {
        db.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', order_id);
      }

      const check = db.db.prepare('SELECT * FROM quality_checks WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Quality check recorded successfully',
        checkId: id,
        check: {
          ...check,
          checklist_items: JSON.parse(check.checklist_items)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Update quality check
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { checklist_items, overall_status, notes } = request.body;

      const existing = db.db.prepare('SELECT * FROM quality_checks WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Quality check not found' };
      }

      const fields = [];
      const values = [];

      if (checklist_items) { fields.push('checklist_items = ?'); values.push(JSON.stringify(checklist_items)); }
      if (overall_status) { fields.push('overall_status = ?'); values.push(overall_status); }
      if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }

      if (fields.length === 0) {
        return { success: true, message: 'No changes made' };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.db.prepare(`UPDATE quality_checks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return { success: true, message: 'Quality check updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

module.exports = qualityChecksRoutes;
