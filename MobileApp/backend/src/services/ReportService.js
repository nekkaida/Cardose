// Advanced Reporting Service
const PDFService = require('./PDFService');
const ExcelService = require('./ExcelService');

class ReportService {
  constructor(db) {
    this.db = db;
    this.pdfService = new PDFService();
    this.excelService = new ExcelService();
  }

  /**
   * Generate customer report
   */
  async generateCustomerReport(startDate, endDate, format = 'json') {
    try {
      const customers = await this.db.all(
        `
        SELECT
          c.*,
          COUNT(DISTINCT o.id) as total_orders,
          SUM(o.final_price) as total_spent,
          COUNT(DISTINCT i.id) as total_invoices,
          SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) as total_paid,
          MAX(o.created_at) as last_order_date
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
          AND DATE(o.created_at) BETWEEN DATE(?) AND DATE(?)
        LEFT JOIN invoices i ON c.id = i.customer_id
          AND DATE(i.created_at) BETWEEN DATE(?) AND DATE(?)
        GROUP BY c.id
        ORDER BY total_spent DESC
      `,
        [startDate, endDate, startDate, endDate]
      );

      const summary = {
        total_customers: customers.length,
        active_customers: customers.filter((c) => c.total_orders > 0).length,
        new_customers: customers.filter((c) => c.created_at >= startDate && c.created_at <= endDate)
          .length,
        total_revenue: customers.reduce((sum, c) => sum + (c.total_paid || 0), 0),
        average_order_value:
          customers.length > 0
            ? customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) /
              customers.filter((c) => c.total_orders > 0).length
            : 0,
      };

      return {
        success: true,
        period: { startDate, endDate },
        summary,
        customers: format === 'json' ? customers : null,
        format,
      };
    } catch (error) {
      throw new Error(`Failed to generate customer report: ${error.message}`);
    }
  }

  /**
   * Generate sales report
   */
  async generateSalesReport(startDate, endDate, groupBy = 'day') {
    try {
      let dateFormat;
      switch (groupBy) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          dateFormat = '%Y-W%W';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        default:
          dateFormat = '%Y-%m-%d';
      }

      const salesData = await this.db.all(
        `
        SELECT
          strftime(?, created_at) as period,
          COUNT(*) as order_count,
          SUM(final_price) as total_sales,
          AVG(final_price) as average_order_value,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
        FROM orders
        WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
        GROUP BY period
        ORDER BY period ASC
      `,
        [dateFormat, startDate, endDate]
      );

      const summary = {
        total_orders: salesData.reduce((sum, d) => sum + d.order_count, 0),
        total_sales: salesData.reduce((sum, d) => sum + (d.total_sales || 0), 0),
        completed_orders: salesData.reduce((sum, d) => sum + d.completed_orders, 0),
        cancelled_orders: salesData.reduce((sum, d) => sum + d.cancelled_orders, 0),
        average_order_value:
          salesData.length > 0
            ? salesData.reduce((sum, d) => sum + (d.total_sales || 0), 0) /
              salesData.reduce((sum, d) => sum + d.order_count, 0)
            : 0,
      };

      return {
        success: true,
        period: { startDate, endDate },
        groupBy,
        summary,
        data: salesData,
      };
    } catch (error) {
      throw new Error(`Failed to generate sales report: ${error.message}`);
    }
  }

  /**
   * Generate product performance report
   */
  async generateProductReport(startDate, endDate) {
    try {
      const productData = await this.db.all(
        `
        SELECT
          box_type,
          COUNT(*) as order_count,
          SUM(final_price) as total_revenue,
          AVG(final_price) as average_price,
          AVG(width * height * depth) as average_volume
        FROM orders
        WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
        AND box_type IS NOT NULL
        GROUP BY box_type
        ORDER BY total_revenue DESC
      `,
        [startDate, endDate]
      );

      const customizationStats = await this.db.all(
        `
        SELECT
          custom_design,
          foil_stamping,
          embossing,
          COUNT(*) as order_count,
          AVG(final_price) as average_price
        FROM orders
        WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
        GROUP BY custom_design, foil_stamping, embossing
        ORDER BY order_count DESC
      `,
        [startDate, endDate]
      );

      return {
        success: true,
        period: { startDate, endDate },
        productTypes: productData,
        customizationStats,
      };
    } catch (error) {
      throw new Error(`Failed to generate product report: ${error.message}`);
    }
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport() {
    try {
      const materials = await this.db.all(`
        SELECT
          *,
          (current_stock * unit_cost) as total_value,
          CASE
            WHEN current_stock <= 0 THEN 'out_of_stock'
            WHEN current_stock <= reorder_level THEN 'low_stock'
            ELSE 'sufficient'
          END as stock_status
        FROM inventory_materials
        ORDER BY stock_status ASC, current_stock ASC
      `);

      const summary = {
        total_materials: materials.length,
        out_of_stock: materials.filter((m) => m.stock_status === 'out_of_stock').length,
        low_stock: materials.filter((m) => m.stock_status === 'low_stock').length,
        total_value: materials.reduce((sum, m) => sum + m.total_value, 0),
        needs_reorder: materials.filter((m) => m.stock_status !== 'sufficient').length,
      };

      return {
        success: true,
        summary,
        materials,
      };
    } catch (error) {
      throw new Error(`Failed to generate inventory report: ${error.message}`);
    }
  }

  /**
   * Generate production efficiency report
   */
  async generateProductionReport(startDate, endDate) {
    try {
      const productionTasks = await this.db.all(
        `
        SELECT
          stage,
          COUNT(*) as task_count,
          AVG(JULIANDAY(completed_at) - JULIANDAY(started_at)) as avg_duration_days,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
        FROM production_tasks
        WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
        GROUP BY stage
        ORDER BY stage ASC
      `,
        [startDate, endDate]
      );

      const qualityStats = await this.db.all(
        `
        SELECT
          status,
          COUNT(*) as check_count
        FROM quality_checks
        WHERE DATE(checked_at) BETWEEN DATE(?) AND DATE(?)
        GROUP BY status
      `,
        [startDate, endDate]
      );

      const onTimeDelivery = await this.db.get(
        `
        SELECT
          COUNT(*) as total_completed,
          SUM(CASE WHEN actual_completion <= estimated_completion THEN 1 ELSE 0 END) as on_time_count
        FROM orders
        WHERE status = 'completed'
        AND DATE(actual_completion) BETWEEN DATE(?) AND DATE(?)
        AND estimated_completion IS NOT NULL
      `,
        [startDate, endDate]
      );

      const onTimeRate =
        onTimeDelivery.total_completed > 0
          ? ((onTimeDelivery.on_time_count / onTimeDelivery.total_completed) * 100).toFixed(2)
          : 0;

      return {
        success: true,
        period: { startDate, endDate },
        productionStages: productionTasks,
        qualityStats,
        onTimeDelivery: {
          ...onTimeDelivery,
          on_time_rate: onTimeRate,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate production report: ${error.message}`);
    }
  }

  /**
   * Generate financial summary report
   */
  async generateFinancialReport(startDate, endDate) {
    try {
      const revenue = await this.db.get(
        `
        SELECT
          COUNT(*) as invoice_count,
          SUM(total_amount) as total_invoiced,
          SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_collected,
          SUM(CASE WHEN status = 'unpaid' THEN total_amount ELSE 0 END) as total_outstanding,
          SUM(ppn_amount) as total_tax_collected
        FROM invoices
        WHERE DATE(issue_date) BETWEEN DATE(?) AND DATE(?)
      `,
        [startDate, endDate]
      );

      const expenses = await this.db.get(
        `
        SELECT
          SUM(total_amount) as total_expenses
        FROM purchase_orders
        WHERE DATE(order_date) BETWEEN DATE(?) AND DATE(?)
        AND status != 'cancelled'
      `,
        [startDate, endDate]
      );

      const profitMargin =
        revenue.total_collected > 0
          ? (
              ((revenue.total_collected - (expenses.total_expenses || 0)) /
                revenue.total_collected) *
              100
            ).toFixed(2)
          : 0;

      const paymentMethods = await this.db.all(
        `
        SELECT
          payment_method,
          COUNT(*) as transaction_count,
          SUM(total_amount) as total_amount
        FROM invoices
        WHERE status = 'paid'
        AND DATE(issue_date) BETWEEN DATE(?) AND DATE(?)
        GROUP BY payment_method
      `,
        [startDate, endDate]
      );

      return {
        success: true,
        period: { startDate, endDate },
        revenue,
        expenses: expenses.total_expenses || 0,
        profit: revenue.total_collected - (expenses.total_expenses || 0),
        profitMargin,
        paymentMethods,
      };
    } catch (error) {
      throw new Error(`Failed to generate financial report: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive business report
   */
  async generateComprehensiveReport(startDate, endDate) {
    try {
      const [sales, customers, products, inventory, production, financial] = await Promise.all([
        this.generateSalesReport(startDate, endDate, 'day'),
        this.generateCustomerReport(startDate, endDate),
        this.generateProductReport(startDate, endDate),
        this.generateInventoryReport(),
        this.generateProductionReport(startDate, endDate),
        this.generateFinancialReport(startDate, endDate),
      ]);

      return {
        success: true,
        period: { startDate, endDate },
        generated_at: new Date().toISOString(),
        reports: {
          sales,
          customers,
          products,
          inventory,
          production,
          financial,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate comprehensive report: ${error.message}`);
    }
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

module.exports = ReportService;
