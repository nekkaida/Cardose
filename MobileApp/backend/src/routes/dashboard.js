// Dashboard routes - Using DatabaseService
const DatabaseService = require('../services/DatabaseService');

async function dashboardRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get dashboard stats
  fastify.get('/stats', async (request, reply) => {
    try {
      // Orders stats
      const orderStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as production,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(total_amount) as total_value
        FROM orders
      `).get();

      // Customers stats
      const customerStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN loyalty_status = 'vip' THEN 1 ELSE 0 END) as vip,
          SUM(total_spent) as total_spent
        FROM customers
      `).get();

      // Invoices stats
      const invoiceStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid,
          SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_value,
          SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN total_amount ELSE 0 END) as unpaid_value
        FROM invoices
      `).get();

      // Inventory stats
      const inventoryStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN current_stock <= reorder_level THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(current_stock * unit_cost) as total_value
        FROM inventory_materials
      `).get();

      // Production tasks stats
      const taskStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = DATE('now') THEN 1 ELSE 0 END) as completed_today
        FROM production_tasks
      `).get();

      return {
        success: true,
        stats: {
          orders: {
            total: orderStats.total || 0,
            pending: orderStats.pending || 0,
            designing: orderStats.designing || 0,
            production: orderStats.production || 0,
            completed: orderStats.completed || 0,
            totalValue: orderStats.total_value || 0
          },
          customers: {
            total: customerStats.total || 0,
            vip: customerStats.vip || 0,
            totalSpent: customerStats.total_spent || 0
          },
          invoices: {
            total: invoiceStats.total || 0,
            unpaid: invoiceStats.unpaid || 0,
            overdue: invoiceStats.overdue || 0,
            paidValue: invoiceStats.paid_value || 0,
            unpaidValue: invoiceStats.unpaid_value || 0
          },
          inventory: {
            total: inventoryStats.total || 0,
            lowStock: inventoryStats.low_stock || 0,
            outOfStock: inventoryStats.out_of_stock || 0,
            totalValue: inventoryStats.total_value || 0
          },
          tasks: {
            total: taskStats.total || 0,
            pending: taskStats.pending || 0,
            inProgress: taskStats.in_progress || 0,
            completedToday: taskStats.completed_today || 0
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get recent orders
  fastify.get('/recent-orders', async (request, reply) => {
    try {
      const { limit = 10 } = request.query;

      const orders = db.db.prepare(`
        SELECT o.*, c.name as customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
        LIMIT ?
      `).all(parseInt(limit));

      return {
        success: true,
        orders
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get dashboard overview
  fastify.get('/overview', async (request, reply) => {
    try {
      // Revenue this month
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      const monthlyRevenue = db.db.prepare(`
        SELECT SUM(amount) as total
        FROM financial_transactions
        WHERE type = 'income'
        AND DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
      `).get(monthStart, monthEnd);

      // Orders this month
      const monthlyOrders = db.db.prepare(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
      `).get(monthStart, monthEnd);

      // New customers this month
      const newCustomers = db.db.prepare(`
        SELECT COUNT(*) as count
        FROM customers
        WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
      `).get(monthStart, monthEnd);

      // Overdue invoices
      const overdueInvoices = db.db.prepare(`
        SELECT COUNT(*) as count, SUM(total_amount) as total
        FROM invoices
        WHERE status = 'overdue'
        OR (status = 'unpaid' AND due_date < DATE('now'))
      `).get();

      // Urgent orders
      const urgentOrders = db.db.prepare(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE priority = 'urgent'
        AND status NOT IN ('completed', 'cancelled')
      `).get();

      // Low stock alerts
      const lowStockAlerts = db.db.prepare(`
        SELECT COUNT(*) as count
        FROM inventory_materials
        WHERE current_stock <= reorder_level
      `).get();

      // Today's activity
      const todayOrders = db.db.prepare(`SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE('now')`).get();
      const todayCompleted = db.db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'completed' AND DATE(updated_at) = DATE('now')`).get();
      const todayInvoices = db.db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE DATE(issue_date) = DATE('now')`).get();

      return {
        success: true,
        overview: {
          revenue: {
            monthly: monthlyRevenue?.total || 0,
            monthName: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
          },
          orders: {
            monthly: monthlyOrders?.count || 0,
            urgent: urgentOrders?.count || 0
          },
          customers: {
            newThisMonth: newCustomers?.count || 0
          },
          alerts: {
            overdueInvoices: overdueInvoices?.count || 0,
            overdueAmount: overdueInvoices?.total || 0,
            lowStock: lowStockAlerts?.count || 0
          },
          today: {
            newOrders: todayOrders?.count || 0,
            completedOrders: todayCompleted?.count || 0,
            newInvoices: todayInvoices?.count || 0
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get sales trend
  fastify.get('/sales-trend', async (request, reply) => {
    try {
      const { days = 30 } = request.query;

      const trend = [];
      const now = new Date();

      for (let i = parseInt(days) - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayData = db.db.prepare(`
          SELECT
            COUNT(*) as orders,
            SUM(amount) as revenue
          FROM financial_transactions
          WHERE type = 'income'
          AND DATE(payment_date) = ?
        `).get(dateStr);

        trend.push({
          date: dateStr,
          orders: dayData?.orders || 0,
          revenue: dayData?.revenue || 0
        });
      }

      return {
        success: true,
        trend
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get product mix
  fastify.get('/product-mix', async (request, reply) => {
    try {
      const productMix = db.db.prepare(`
        SELECT
          box_type,
          COUNT(*) as count,
          SUM(total_amount) as value
        FROM orders
        WHERE box_type IS NOT NULL
        GROUP BY box_type
        ORDER BY count DESC
      `).all();

      return {
        success: true,
        productMix
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get top customers
  fastify.get('/top-customers', async (request, reply) => {
    try {
      const { limit = 10 } = request.query;

      const customers = db.db.prepare(`
        SELECT id, name, business_type, total_orders, total_spent, loyalty_status
        FROM customers
        ORDER BY total_spent DESC
        LIMIT ?
      `).all(parseInt(limit));

      return {
        success: true,
        customers
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

module.exports = dashboardRoutes;
