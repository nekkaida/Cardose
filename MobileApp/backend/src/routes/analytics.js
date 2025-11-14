// Analytics and reporting routes for Premium Gift Box backend
const { v4: uuidv4 } = require('uuid');

async function analyticsRoutes(fastify, options) {
  const db = fastify.db;

  // Get dashboard overview statistics
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { period = 'month' } = request.query;

      // Calculate date range based on period
      let dateFilter = '';
      switch (period) {
        case 'week':
          dateFilter = "DATE(created_at) >= DATE('now', '-7 days')";
          break;
        case 'month':
          dateFilter = "DATE(created_at) >= DATE('now', '-30 days')";
          break;
        case 'quarter':
          dateFilter = "DATE(created_at) >= DATE('now', '-90 days')";
          break;
        case 'year':
          dateFilter = "DATE(created_at) >= DATE('now', '-365 days')";
          break;
        default:
          dateFilter = "DATE(created_at) >= DATE('now', '-30 days')";
      }

      // Revenue statistics
      const revenueStats = await db.get(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value,
          SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue,
          SUM(CASE WHEN status = 'unpaid' THEN total_amount ELSE 0 END) as pending_revenue
        FROM invoices
        WHERE ${dateFilter}
      `);

      // Order statistics
      const orderStats = await db.get(`
        SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status IN ('pending', 'designing', 'approved', 'production', 'quality_control') THEN 1 ELSE 0 END) as active_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          AVG(total_price) as average_order_value
        FROM orders
        WHERE ${dateFilter}
      `);

      // Customer statistics
      const customerStats = await db.get(`
        SELECT
          COUNT(*) as total_customers,
          SUM(CASE WHEN loyalty_status = 'vip' THEN 1 ELSE 0 END) as vip_customers,
          SUM(CASE WHEN loyalty_status = 'regular' THEN 1 ELSE 0 END) as regular_customers,
          SUM(CASE WHEN loyalty_status = 'new' THEN 1 ELSE 0 END) as new_customers
        FROM customers
        WHERE ${dateFilter}
      `);

      // Inventory statistics
      const inventoryStats = await db.get(`
        SELECT
          COUNT(*) as total_materials,
          SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_stock,
          SUM(current_stock * unit_cost) as total_inventory_value
        FROM inventory_materials
      `);

      // Production statistics
      const productionStats = await db.get(`
        SELECT
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as in_production,
          SUM(CASE WHEN status = 'quality_control' THEN 1 ELSE 0 END) as quality_control,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_orders
        FROM orders
        WHERE status IN ('designing', 'approved', 'production', 'quality_control')
      `);

      return {
        period,
        revenue: {
          total_revenue: revenueStats.total_revenue || 0,
          paid_revenue: revenueStats.paid_revenue || 0,
          pending_revenue: revenueStats.pending_revenue || 0,
          average_order_value: revenueStats.average_order_value || 0,
          invoice_count: revenueStats.total_orders || 0
        },
        orders: {
          total_orders: orderStats.total_orders || 0,
          completed_orders: orderStats.completed_orders || 0,
          active_orders: orderStats.active_orders || 0,
          cancelled_orders: orderStats.cancelled_orders || 0,
          average_value: orderStats.average_order_value || 0,
          completion_rate: orderStats.total_orders > 0
            ? ((orderStats.completed_orders / orderStats.total_orders) * 100).toFixed(2)
            : 0
        },
        customers: {
          total_customers: customerStats.total_customers || 0,
          vip_customers: customerStats.vip_customers || 0,
          regular_customers: customerStats.regular_customers || 0,
          new_customers: customerStats.new_customers || 0
        },
        inventory: {
          total_materials: inventoryStats.total_materials || 0,
          out_of_stock: inventoryStats.out_of_stock || 0,
          low_stock: inventoryStats.low_stock || 0,
          total_value: inventoryStats.total_inventory_value || 0
        },
        production: {
          designing: productionStats.designing || 0,
          in_production: productionStats.in_production || 0,
          quality_control: productionStats.quality_control || 0,
          urgent_orders: productionStats.urgent_orders || 0
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch dashboard analytics' });
    }
  });

  // Get revenue trend data
  fastify.get('/revenue-trend', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { months = 12 } = request.query;

      const trend = await db.all(`
        SELECT
          strftime('%Y-%m', issue_date) as month,
          COUNT(*) as invoice_count,
          SUM(total_amount) as revenue,
          SUM(ppn_amount) as tax_collected,
          AVG(total_amount) as average_value
        FROM invoices
        WHERE DATE(issue_date) >= DATE('now', '-${months} months')
        GROUP BY strftime('%Y-%m', issue_date)
        ORDER BY month ASC
      `);

      return { trend };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch revenue trend' });
    }
  });

  // Get customer analytics
  fastify.get('/customers', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Top customers by revenue
      const topCustomers = await db.all(`
        SELECT
          c.id,
          c.name,
          c.business_type,
          c.loyalty_status,
          COUNT(DISTINCT o.id) as order_count,
          SUM(o.total_price) as total_revenue,
          AVG(o.total_price) as average_order_value,
          MAX(o.created_at) as last_order_date
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE o.status != 'cancelled'
        GROUP BY c.id
        ORDER BY total_revenue DESC
        LIMIT 10
      `);

      // Customer acquisition trend
      const acquisitionTrend = await db.all(`
        SELECT
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as new_customers
        FROM customers
        WHERE DATE(created_at) >= DATE('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
      `);

      // Customer by business type
      const byBusinessType = await db.all(`
        SELECT
          business_type,
          COUNT(*) as count,
          SUM((SELECT COUNT(*) FROM orders WHERE customer_id = customers.id)) as total_orders
        FROM customers
        GROUP BY business_type
        ORDER BY count DESC
      `);

      return {
        top_customers: topCustomers,
        acquisition_trend: acquisitionTrend,
        by_business_type: byBusinessType
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch customer analytics' });
    }
  });

  // Get product analytics
  fastify.get('/products', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Orders by box type
      const byBoxType = await db.all(`
        SELECT
          box_type,
          COUNT(*) as order_count,
          SUM(total_price) as total_revenue,
          AVG(total_price) as average_price
        FROM orders
        WHERE box_type IS NOT NULL AND status != 'cancelled'
        GROUP BY box_type
        ORDER BY order_count DESC
      `);

      // Average dimensions
      const avgDimensions = await db.get(`
        SELECT
          AVG(width) as avg_width,
          AVG(height) as avg_height,
          AVG(depth) as avg_depth
        FROM orders
        WHERE width IS NOT NULL AND height IS NOT NULL AND depth IS NOT NULL
      `);

      return {
        by_box_type: byBoxType,
        average_dimensions: avgDimensions
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch product analytics' });
    }
  });

  // Get production performance analytics
  fastify.get('/production-performance', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Average production time by stage
      const stagePerformance = await db.all(`
        SELECT
          stage,
          COUNT(*) as stage_count,
          AVG(julianday(COALESCE(end_date, CURRENT_TIMESTAMP)) - julianday(start_date)) as avg_duration_days
        FROM order_stages
        WHERE start_date IS NOT NULL
        GROUP BY stage
        ORDER BY avg_duration_days DESC
      `);

      // On-time delivery rate
      const deliveryPerformance = await db.get(`
        SELECT
          COUNT(*) as total_completed,
          SUM(CASE WHEN DATE(actual_completion) <= DATE(estimated_completion) THEN 1 ELSE 0 END) as on_time_deliveries,
          (SUM(CASE WHEN DATE(actual_completion) <= DATE(estimated_completion) THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as on_time_rate
        FROM orders
        WHERE status = 'completed' AND actual_completion IS NOT NULL AND estimated_completion IS NOT NULL
      `);

      // Quality control pass rate
      const qualityPerformance = await db.get(`
        SELECT
          COUNT(*) as total_checks,
          SUM(CASE WHEN overall_status = 'passed' THEN 1 ELSE 0 END) as passed_checks,
          SUM(CASE WHEN overall_status = 'failed' THEN 1 ELSE 0 END) as failed_checks,
          SUM(CASE WHEN overall_status = 'needs_review' THEN 1 ELSE 0 END) as needs_review,
          (SUM(CASE WHEN overall_status = 'passed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as pass_rate
        FROM quality_checks
      `);

      // Task completion statistics
      const taskPerformance = await db.get(`
        SELECT
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tasks,
          AVG(CASE WHEN completed_at IS NOT NULL AND due_date IS NOT NULL
              THEN julianday(completed_at) - julianday(due_date)
              ELSE NULL END) as avg_delay_days
        FROM production_tasks
      `);

      return {
        stage_performance: stagePerformance,
        delivery_performance: {
          total_completed: deliveryPerformance.total_completed || 0,
          on_time_deliveries: deliveryPerformance.on_time_deliveries || 0,
          on_time_rate: parseFloat(deliveryPerformance.on_time_rate || 0).toFixed(2)
        },
        quality_performance: {
          total_checks: qualityPerformance.total_checks || 0,
          passed_checks: qualityPerformance.passed_checks || 0,
          failed_checks: qualityPerformance.failed_checks || 0,
          needs_review: qualityPerformance.needs_review || 0,
          pass_rate: parseFloat(qualityPerformance.pass_rate || 0).toFixed(2)
        },
        task_performance: {
          total_tasks: taskPerformance.total_tasks || 0,
          completed_tasks: taskPerformance.completed_tasks || 0,
          cancelled_tasks: taskPerformance.cancelled_tasks || 0,
          avg_delay_days: parseFloat(taskPerformance.avg_delay_days || 0).toFixed(2)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch production performance' });
    }
  });

  // Get inventory analytics
  fastify.get('/inventory-analytics', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Inventory turnover by material
      const turnover = await db.all(`
        SELECT
          im.id,
          im.name,
          im.category,
          im.current_stock,
          im.unit_cost,
          (im.current_stock * im.unit_cost) as stock_value,
          COALESCE(SUM(CASE WHEN mov.type = 'usage' THEN mov.quantity ELSE 0 END), 0) as total_usage,
          COALESCE(SUM(CASE WHEN mov.type = 'purchase' THEN mov.quantity ELSE 0 END), 0) as total_purchases
        FROM inventory_materials im
        LEFT JOIN inventory_movements mov ON im.id = mov.item_id
          AND mov.item_type = 'material'
          AND DATE(mov.created_at) >= DATE('now', '-90 days')
        GROUP BY im.id
        ORDER BY stock_value DESC
        LIMIT 20
      `);

      // Stock alerts summary
      const alerts = await db.get(`
        SELECT
          COUNT(*) as total_materials,
          SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN current_stock > reorder_level THEN 1 ELSE 0 END) as adequate_stock
        FROM inventory_materials
      `);

      // Movement trends (last 30 days)
      const movementTrends = await db.all(`
        SELECT
          DATE(created_at) as date,
          type,
          COUNT(*) as movement_count,
          SUM(quantity) as total_quantity,
          SUM(total_cost) as total_cost
        FROM inventory_movements
        WHERE DATE(created_at) >= DATE('now', '-30 days')
        GROUP BY DATE(created_at), type
        ORDER BY date ASC
      `);

      return {
        top_materials: turnover,
        stock_alerts: alerts,
        movement_trends: movementTrends
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch inventory analytics' });
    }
  });
}

module.exports = analyticsRoutes;
