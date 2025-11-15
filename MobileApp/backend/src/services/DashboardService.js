// Dashboard KPI and metrics service
class DashboardService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(period = 'month') {
    try {
      const dateRange = this.getDateRange(period);

      const [
        revenue,
        orders,
        customers,
        inventory,
        production,
        recentActivity
      ] = await Promise.all([
        this.getRevenueMetrics(dateRange),
        this.getOrderMetrics(dateRange),
        this.getCustomerMetrics(dateRange),
        this.getInventoryMetrics(),
        this.getProductionMetrics(dateRange),
        this.getRecentActivity(10)
      ]);

      return {
        success: true,
        period,
        dateRange,
        metrics: {
          revenue,
          orders,
          customers,
          inventory,
          production
        },
        recentActivity
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(dateRange) {
    const current = await this.db.get(`
      SELECT
        COUNT(*) as invoice_count,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as collected_revenue,
        SUM(CASE WHEN status = 'unpaid' THEN total_amount ELSE 0 END) as pending_revenue,
        AVG(total_amount) as average_invoice
      FROM invoices
      WHERE DATE(issue_date) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.current.start, dateRange.current.end]);

    const previous = await this.db.get(`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as collected_revenue
      FROM invoices
      WHERE DATE(issue_date) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.previous.start, dateRange.previous.end]);

    const growth = previous.collected_revenue > 0
      ? ((current.collected_revenue - previous.collected_revenue) / previous.collected_revenue * 100).toFixed(2)
      : 0;

    return {
      ...current,
      growth_percentage: parseFloat(growth),
      previous_revenue: previous.collected_revenue || 0
    };
  }

  /**
   * Get order metrics
   */
  async getOrderMetrics(dateRange) {
    const current = await this.db.get(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('pending', 'designing', 'approved', 'production', 'quality_control') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(final_price) as average_order_value
      FROM orders
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.current.start, dateRange.current.end]);

    const previous = await this.db.get(`
      SELECT COUNT(*) as total_orders
      FROM orders
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.previous.start, dateRange.previous.end]);

    const growth = previous.total_orders > 0
      ? ((current.total_orders - previous.total_orders) / previous.total_orders * 100).toFixed(2)
      : 0;

    const completionRate = current.total_orders > 0
      ? (current.completed / current.total_orders * 100).toFixed(2)
      : 0;

    return {
      ...current,
      growth_percentage: parseFloat(growth),
      completion_rate: parseFloat(completionRate),
      previous_orders: previous.total_orders || 0
    };
  }

  /**
   * Get customer metrics
   */
  async getCustomerMetrics(dateRange) {
    const newCustomers = await this.db.get(`
      SELECT COUNT(*) as count
      FROM customers
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.current.start, dateRange.current.end]);

    const activeCustomers = await this.db.get(`
      SELECT COUNT(DISTINCT customer_id) as count
      FROM orders
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.current.start, dateRange.current.end]);

    const totalCustomers = await this.db.get(`
      SELECT COUNT(*) as count
      FROM customers
    `);

    const topCustomers = await this.db.all(`
      SELECT
        c.id,
        c.name,
        c.company_name,
        COUNT(o.id) as order_count,
        SUM(o.final_price) as total_spent
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE DATE(o.created_at) BETWEEN DATE(?) AND DATE(?)
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5
    `, [dateRange.current.start, dateRange.current.end]);

    return {
      new_customers: newCustomers.count || 0,
      active_customers: activeCustomers.count || 0,
      total_customers: totalCustomers.count || 0,
      top_customers: topCustomers
    };
  }

  /**
   * Get inventory metrics
   */
  async getInventoryMetrics() {
    const stats = await this.db.get(`
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_stock,
        SUM(current_stock * unit_cost) as total_value
      FROM inventory_materials
    `);

    const criticalItems = await this.db.all(`
      SELECT material_name, current_stock, unit, reorder_level
      FROM inventory_materials
      WHERE current_stock <= reorder_level
      ORDER BY current_stock ASC
      LIMIT 5
    `);

    return {
      ...stats,
      critical_items: criticalItems,
      health_status: stats.out_of_stock === 0 && stats.low_stock <= 3 ? 'good' : stats.out_of_stock > 0 ? 'critical' : 'warning'
    };
  }

  /**
   * Get production metrics
   */
  async getProductionMetrics(dateRange) {
    const tasks = await this.db.get(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM production_tasks
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.current.start, dateRange.current.end]);

    const onTime = await this.db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN actual_completion <= estimated_completion THEN 1 ELSE 0 END) as on_time
      FROM orders
      WHERE status = 'completed'
      AND DATE(actual_completion) BETWEEN DATE(?) AND DATE(?)
      AND estimated_completion IS NOT NULL
    `, [dateRange.current.start, dateRange.current.end]);

    const onTimeRate = onTime.total > 0
      ? (onTime.on_time / onTime.total * 100).toFixed(2)
      : 0;

    const qualityStats = await this.db.get(`
      SELECT
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM quality_checks
      WHERE DATE(checked_at) BETWEEN DATE(?) AND DATE(?)
    `, [dateRange.current.start, dateRange.current.end]);

    const qualityPassRate = qualityStats.total_checks > 0
      ? (qualityStats.passed / qualityStats.total_checks * 100).toFixed(2)
      : 0;

    return {
      tasks,
      on_time_delivery_rate: parseFloat(onTimeRate),
      quality_pass_rate: parseFloat(qualityPassRate),
      quality_stats: qualityStats
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 10) {
    const activities = await this.db.all(`
      SELECT
        'order' as type,
        o.id,
        o.order_number as reference,
        o.status,
        c.name as customer_name,
        o.created_at as timestamp
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [limit]);

    return activities;
  }

  /**
   * Get sales trend data
   */
  async getSalesTrend(days = 30) {
    const trend = await this.db.all(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(final_price) as revenue
      FROM orders
      WHERE DATE(created_at) >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);

    return {
      success: true,
      days,
      data: trend
    };
  }

  /**
   * Get product mix data
   */
  async getProductMix(period = 'month') {
    const dateRange = this.getDateRange(period);

    const productMix = await this.db.all(`
      SELECT
        box_type,
        COUNT(*) as count,
        SUM(final_price) as revenue,
        AVG(final_price) as avg_price
      FROM orders
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND box_type IS NOT NULL
      GROUP BY box_type
      ORDER BY revenue DESC
    `, [dateRange.current.start, dateRange.current.end]);

    const customization = await this.db.all(`
      SELECT
        CASE
          WHEN custom_design = 1 THEN 'Custom Design'
          WHEN foil_stamping = 1 THEN 'Foil Stamping'
          WHEN embossing = 1 THEN 'Embossing'
          ELSE 'Standard'
        END as customization_type,
        COUNT(*) as count
      FROM orders
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      GROUP BY customization_type
      ORDER BY count DESC
    `, [dateRange.current.start, dateRange.current.end]);

    return {
      success: true,
      period,
      productMix,
      customization
    };
  }

  /**
   * Get date range based on period
   */
  getDateRange(period) {
    const now = new Date();
    const current = {
      end: now.toISOString().split('T')[0]
    };
    const previous = {};

    switch (period) {
      case 'week':
        current.start = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        previous.end = current.start;
        previous.start = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        break;

      case 'month':
        current.start = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        previous.end = current.start;
        previous.start = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        break;

      case 'quarter':
        current.start = new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0];
        previous.end = current.start;
        previous.start = new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0];
        break;

      case 'year':
        current.start = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
        previous.end = current.start;
        previous.start = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
        break;

      default:
        current.start = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        previous.end = current.start;
        previous.start = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
    }

    return { current, previous };
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }
}

module.exports = DashboardService;
