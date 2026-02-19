// Advanced reporting routes

async function reportRoutes(fastify, options) {
  const db = fastify.db;

  // Sales report (requires authentication)
  fastify.get('/sales', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          groupBy: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = request.query;

      // Default to last 30 days if no dates provided
      const now = new Date();
      const end = endDate || now.toISOString().split('T')[0];
      const start = startDate || new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];

      // Get sales data
      const sales = db.db.prepare(`
        SELECT
          DATE(i.paid_date) as date,
          COUNT(*) as invoice_count,
          SUM(i.total_amount) as revenue,
          SUM(i.ppn_amount) as tax_collected
        FROM invoices i
        WHERE i.status = 'paid'
        AND DATE(i.paid_date) >= ?
        AND DATE(i.paid_date) <= ?
        GROUP BY DATE(i.paid_date)
        ORDER BY date ASC
      `).all(start, end);

      // Get summary
      const summary = db.db.prepare(`
        SELECT
          COUNT(*) as total_invoices,
          SUM(total_amount) as total_revenue,
          SUM(ppn_amount) as total_tax,
          AVG(total_amount) as average_invoice
        FROM invoices
        WHERE status = 'paid'
        AND DATE(paid_date) >= ?
        AND DATE(paid_date) <= ?
      `).get(start, end);

      // Get top customers
      const topCustomers = db.db.prepare(`
        SELECT c.name, SUM(i.total_amount) as revenue, COUNT(i.id) as invoice_count
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.status = 'paid'
        AND DATE(i.paid_date) >= ?
        AND DATE(i.paid_date) <= ?
        GROUP BY c.id
        ORDER BY revenue DESC
        LIMIT 10
      `).all(start, end);

      return {
        success: true,
        report: {
          period: { start, end },
          sales,
          summary: {
            totalInvoices: summary?.total_invoices || 0,
            totalRevenue: summary?.total_revenue || 0,
            totalTax: summary?.total_tax || 0,
            averageInvoice: summary?.average_invoice || 0
          },
          topCustomers
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Inventory report (requires authentication)
  fastify.get('/inventory', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      // Get inventory summary
      const summary = db.db.prepare(`
        SELECT
          COUNT(*) as total_items,
          SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_stock,
          SUM(current_stock * unit_cost) as total_value
        FROM inventory_materials
      `).get();

      // Get by category
      const byCategory = db.db.prepare(`
        SELECT
          category,
          COUNT(*) as item_count,
          SUM(current_stock) as total_stock,
          SUM(current_stock * unit_cost) as total_value
        FROM inventory_materials
        GROUP BY category
        ORDER BY total_value DESC
      `).all();

      // Get low stock items
      const lowStockItems = db.db.prepare(`
        SELECT name, sku, category, current_stock, reorder_level, unit
        FROM inventory_materials
        WHERE current_stock <= reorder_level
        ORDER BY current_stock ASC
        LIMIT 20
      `).all();

      // Get recent movements
      const recentMovements = db.db.prepare(`
        SELECT im.*, m.name as item_name
        FROM inventory_movements im
        LEFT JOIN inventory_materials m ON im.item_id = m.id
        ORDER BY im.created_at DESC
        LIMIT 20
      `).all();

      return {
        success: true,
        report: {
          summary: {
            totalItems: summary?.total_items || 0,
            outOfStock: summary?.out_of_stock || 0,
            lowStock: summary?.low_stock || 0,
            totalValue: summary?.total_value || 0
          },
          byCategory,
          lowStockItems,
          recentMovements
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Production report (requires authentication)
  fastify.get('/production', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      // Default to last 30 days if no dates provided
      const now = new Date();
      const end = endDate || now.toISOString().split('T')[0];
      const start = startDate || new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];

      // Get orders by status
      const ordersByStatus = db.db.prepare(`
        SELECT
          status,
          COUNT(*) as count,
          SUM(total_amount) as value
        FROM orders
        WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
        GROUP BY status
      `).all(start, end);

      // Get completion rate
      const completionStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM orders
        WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
      `).get(start, end);

      // Get tasks stats
      const taskStats = db.db.prepare(`
        SELECT
          status,
          COUNT(*) as count
        FROM production_tasks
        WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
        GROUP BY status
      `).all(start, end);

      // Get quality check stats
      const qualityStats = db.db.prepare(`
        SELECT
          overall_status,
          COUNT(*) as count
        FROM quality_checks
        WHERE DATE(checked_at) >= ?
        AND DATE(checked_at) <= ?
        GROUP BY overall_status
      `).all(start, end);

      const completionRate = completionStats?.total > 0
        ? ((completionStats.completed / completionStats.total) * 100).toFixed(2)
        : 0;

      return {
        success: true,
        report: {
          period: { start, end },
          ordersByStatus,
          completionRate,
          taskStats,
          qualityStats
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Customer report (requires authentication)
  fastify.get('/customers', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      // Get customer summary
      const summary = db.db.prepare(`
        SELECT
          COUNT(*) as total_customers,
          SUM(CASE WHEN loyalty_status = 'vip' THEN 1 ELSE 0 END) as vip_customers,
          SUM(total_spent) as total_revenue,
          AVG(total_spent) as average_spent
        FROM customers
      `).get();

      // Get by business type
      const byBusinessType = db.db.prepare(`
        SELECT
          business_type,
          COUNT(*) as count,
          SUM(total_spent) as total_spent,
          AVG(total_orders) as avg_orders
        FROM customers
        GROUP BY business_type
        ORDER BY total_spent DESC
      `).all();

      // Get by loyalty status
      const byLoyaltyStatus = db.db.prepare(`
        SELECT
          loyalty_status,
          COUNT(*) as count,
          SUM(total_spent) as total_spent
        FROM customers
        GROUP BY loyalty_status
      `).all();

      // Get top customers
      const topCustomers = db.db.prepare(`
        SELECT name, business_type, loyalty_status, total_orders, total_spent
        FROM customers
        ORDER BY total_spent DESC
        LIMIT 10
      `).all();

      // Get new customers (this month)
      const newCustomers = db.db.prepare(`
        SELECT COUNT(*) as count
        FROM customers
        WHERE DATE(created_at) >= DATE('now', 'start of month')
      `).get();

      return {
        success: true,
        report: {
          summary: {
            totalCustomers: summary?.total_customers || 0,
            vipCustomers: summary?.vip_customers || 0,
            totalRevenue: summary?.total_revenue || 0,
            averageSpent: summary?.average_spent || 0,
            newThisMonth: newCustomers?.count || 0
          },
          byBusinessType,
          byLoyaltyStatus,
          topCustomers
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Financial report (requires authentication)
  fastify.get('/financial', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      const now = new Date();
      const end = endDate || now.toISOString().split('T')[0];
      const start = startDate || new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];

      // Get income/expense summary
      const transactions = db.db.prepare(`
        SELECT
          type,
          SUM(amount) as total,
          COUNT(*) as count
        FROM financial_transactions
        WHERE DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
        GROUP BY type
      `).all(start, end);

      const income = transactions.find(t => t.type === 'income');
      const expense = transactions.find(t => t.type === 'expense');

      // Get by category
      const byCategory = db.db.prepare(`
        SELECT
          category,
          type,
          SUM(amount) as total,
          COUNT(*) as count
        FROM financial_transactions
        WHERE DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
        GROUP BY category, type
        ORDER BY total DESC
      `).all(start, end);

      // Get invoice stats
      const invoiceStats = db.db.prepare(`
        SELECT
          status,
          COUNT(*) as count,
          SUM(total_amount) as value
        FROM invoices
        WHERE DATE(issue_date) >= ?
        AND DATE(issue_date) <= ?
        GROUP BY status
      `).all(start, end);

      return {
        success: true,
        report: {
          period: { start, end },
          summary: {
            totalIncome: income?.total || 0,
            totalExpense: expense?.total || 0,
            netIncome: (income?.total || 0) - (expense?.total || 0),
            incomeCount: income?.count || 0,
            expenseCount: expense?.count || 0
          },
          byCategory,
          invoiceStats
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

module.exports = reportRoutes;
