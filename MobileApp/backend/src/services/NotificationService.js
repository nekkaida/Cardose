// Notification and Alert Service
const WhatsAppService = require('./WhatsAppService');
const EmailService = require('./EmailService');

class NotificationService {
  constructor(db, logger = null) {
    this.db = db;
    this.log = logger || { info: console.log, error: console.error, warn: console.warn };
    this.whatsappService = new WhatsAppService();
    this.emailService = new EmailService();
    this.scheduledJobs = new Map();
  }

  /**
   * Send notification via preferred channel
   */
  async sendNotification(customer, subject, message, channels = ['email']) {
    const results = {
      sent: [],
      failed: []
    };

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            if (customer.email) {
              await this.emailService.sendEmail(customer.email, subject, message);
              results.sent.push({ channel: 'email', recipient: customer.email });
            }
            break;

          case 'whatsapp':
            if (customer.phone) {
              await this.whatsappService.sendTextMessage(customer.phone, message);
              results.sent.push({ channel: 'whatsapp', recipient: customer.phone });
            }
            break;

          default:
            results.failed.push({ channel, error: 'Unsupported channel' });
        }
      } catch (error) {
        results.failed.push({ channel, error: error.message });
      }
    }

    return results;
  }

  /**
   * Check and send overdue invoice reminders
   */
  async checkOverdueInvoices() {
    try {
      const overdueInvoices = await this.db.all(`
        SELECT i.*, c.name as customer_name, c.email, c.phone, c.preferred_contact
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.status = 'unpaid'
        AND DATE(i.due_date) < DATE('now')
      `);

      const results = [];

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)
        );

        // Send reminder via WhatsApp
        if (invoice.phone) {
          try {
            await this.whatsappService.sendPaymentReminder(
              { name: invoice.customer_name, phone: invoice.phone },
              invoice,
              daysOverdue
            );
            results.push({ invoice_id: invoice.id, status: 'sent', channel: 'whatsapp' });
          } catch (error) {
            results.push({ invoice_id: invoice.id, status: 'failed', channel: 'whatsapp', error: error.message });
          }
        }

        // Send reminder via Email
        if (invoice.email) {
          try {
            await this.emailService.sendPaymentReminderEmail(
              { name: invoice.customer_name, email: invoice.email },
              invoice,
              daysOverdue
            );
            results.push({ invoice_id: invoice.id, status: 'sent', channel: 'email' });
          } catch (error) {
            results.push({ invoice_id: invoice.id, status: 'failed', channel: 'email', error: error.message });
          }
        }
      }

      return {
        success: true,
        checked: overdueInvoices.length,
        results
      };
    } catch (error) {
      throw new Error(`Failed to check overdue invoices: ${error.message}`);
    }
  }

  /**
   * Check and alert low stock items
   */
  async checkLowStock() {
    try {
      const lowStockItems = await this.db.all(`
        SELECT * FROM inventory_materials
        WHERE current_stock <= reorder_level
        AND current_stock > 0
        ORDER BY current_stock ASC
      `);

      if (lowStockItems.length === 0) {
        return { success: true, alerts: 0, items: [] };
      }

      // Get admin/manager users
      const admins = await this.db.all(`
        SELECT email FROM users
        WHERE role IN ('owner', 'manager')
        AND is_active = 1
        AND email IS NOT NULL
      `);

      const itemsList = lowStockItems.map(item =>
        `- ${item.material_name}: ${item.current_stock} ${item.unit} (Reorder level: ${item.reorder_level})`
      ).join('\n');

      const subject = `Low Stock Alert - ${lowStockItems.length} items`;
      const message = `
Low Stock Alert

The following items are running low:

${itemsList}

Please reorder soon to avoid stockouts.

Premium Gift Box System
      `.trim();

      const results = [];

      for (const admin of admins) {
        try {
          await this.emailService.sendEmail(admin.email, subject, message.replace(/\n/g, '<br>'));
          results.push({ recipient: admin.email, status: 'sent' });
        } catch (error) {
          results.push({ recipient: admin.email, status: 'failed', error: error.message });
        }
      }

      return {
        success: true,
        alerts: lowStockItems.length,
        items: lowStockItems,
        notifications: results
      };
    } catch (error) {
      throw new Error(`Failed to check low stock: ${error.message}`);
    }
  }

  /**
   * Check orders nearing deadline
   */
  async checkOrderDeadlines() {
    try {
      const upcomingDeadlines = await this.db.all(`
        SELECT o.*, c.name as customer_name, c.email, c.phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.status NOT IN ('completed', 'cancelled', 'delivered')
        AND o.estimated_completion IS NOT NULL
        AND DATE(o.estimated_completion) BETWEEN DATE('now') AND DATE('now', '+3 days')
      `);

      const results = [];

      for (const order of upcomingDeadlines) {
        const daysUntil = Math.ceil(
          (new Date(order.estimated_completion) - new Date()) / (1000 * 60 * 60 * 24)
        );

        // Send notification to customer
        const message = `
Halo ${order.customer_name},

Pesanan Anda #${order.order_number} akan selesai dalam ${daysUntil} hari.

Estimasi penyelesaian: ${new Date(order.estimated_completion).toLocaleDateString('id-ID')}

Terima kasih,
Premium Gift Box
        `.trim();

        if (order.phone) {
          try {
            await this.whatsappService.sendTextMessage(order.phone, message);
            results.push({ order_id: order.id, status: 'sent', channel: 'whatsapp' });
          } catch (error) {
            results.push({ order_id: order.id, status: 'failed', channel: 'whatsapp', error: error.message });
          }
        }
      }

      return {
        success: true,
        checked: upcomingDeadlines.length,
        results
      };
    } catch (error) {
      throw new Error(`Failed to check order deadlines: ${error.message}`);
    }
  }

  /**
   * Check quality control failures
   */
  async checkQualityIssues() {
    try {
      const failedQC = await this.db.all(`
        SELECT qc.*, o.order_number, c.name as customer_name
        FROM quality_checks qc
        JOIN orders o ON qc.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        WHERE qc.status = 'failed'
        AND DATE(qc.checked_at) = DATE('now')
      `);

      if (failedQC.length === 0) {
        return { success: true, issues: 0 };
      }

      // Notify managers
      const managers = await this.db.all(`
        SELECT email FROM users
        WHERE role IN ('owner', 'manager')
        AND is_active = 1
        AND email IS NOT NULL
      `);

      const issuesList = failedQC.map(qc =>
        `- Order #${qc.order_number}: ${qc.notes || 'Quality check failed'}`
      ).join('\n');

      const subject = `Quality Control Issues - ${failedQC.length} orders`;
      const message = `
Quality Control Alert

The following orders failed QC today:

${issuesList}

Please review and take action.

Premium Gift Box System
      `.trim();

      const results = [];

      for (const manager of managers) {
        try {
          await this.emailService.sendEmail(manager.email, subject, message.replace(/\n/g, '<br>'));
          results.push({ recipient: manager.email, status: 'sent' });
        } catch (error) {
          results.push({ recipient: manager.email, status: 'failed', error: error.message });
        }
      }

      return {
        success: true,
        issues: failedQC.length,
        notifications: results
      };
    } catch (error) {
      throw new Error(`Failed to check quality issues: ${error.message}`);
    }
  }

  /**
   * Daily digest notification
   */
  async sendDailyDigest() {
    try {
      // Get daily statistics
      const stats = await this.db.get(`
        SELECT
          (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = DATE('now')) as new_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'completed' AND DATE(updated_at) = DATE('now')) as completed_orders,
          (SELECT COUNT(*) FROM invoices WHERE status = 'paid' AND DATE(updated_at) = DATE('now')) as paid_invoices,
          (SELECT SUM(total_amount) FROM invoices WHERE status = 'paid' AND DATE(updated_at) = DATE('now')) as revenue_today,
          (SELECT COUNT(*) FROM orders WHERE status NOT IN ('completed', 'cancelled', 'delivered')) as active_orders,
          (SELECT COUNT(*) FROM invoices WHERE status = 'unpaid') as unpaid_invoices
      `);

      // Get managers
      const managers = await this.db.all(`
        SELECT email, full_name FROM users
        WHERE role IN ('owner', 'manager')
        AND is_active = 1
        AND email IS NOT NULL
      `);

      const subject = `Daily Business Summary - ${new Date().toLocaleDateString('id-ID')}`;

      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(amount || 0);
      };

      const message = `
<h2>Daily Business Summary</h2>
<p>Summary for ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

<h3>Today's Activity</h3>
<ul>
  <li>New Orders: ${stats.new_orders}</li>
  <li>Completed Orders: ${stats.completed_orders}</li>
  <li>Payments Received: ${stats.paid_invoices}</li>
  <li>Revenue Today: ${formatCurrency(stats.revenue_today)}</li>
</ul>

<h3>Current Status</h3>
<ul>
  <li>Active Orders: ${stats.active_orders}</li>
  <li>Unpaid Invoices: ${stats.unpaid_invoices}</li>
</ul>

<p>Premium Gift Box System</p>
      `;

      const results = [];

      for (const manager of managers) {
        try {
          await this.emailService.sendEmail(manager.email, subject, message);
          results.push({ recipient: manager.email, status: 'sent' });
        } catch (error) {
          results.push({ recipient: manager.email, status: 'failed', error: error.message });
        }
      }

      return {
        success: true,
        stats,
        notifications: results
      };
    } catch (error) {
      throw new Error(`Failed to send daily digest: ${error.message}`);
    }
  }

  /**
   * Start automated checks (called from server startup)
   */
  startAutomatedChecks() {
    // Check overdue invoices every 6 hours
    const overdueInterval = setInterval(async () => {
      try {
        await this.checkOverdueInvoices();
        this.log.info('Overdue invoice check completed');
      } catch (error) {
        this.log.error('Overdue invoice check failed: %s', error.message);
      }
    }, 6 * 60 * 60 * 1000);

    // Check low stock daily at 9 AM
    const lowStockInterval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        try {
          await this.checkLowStock();
          this.log.info('Low stock check completed');
        } catch (error) {
          this.log.error('Low stock check failed: %s', error.message);
        }
      }
    }, 60 * 1000); // Check every minute

    // Send daily digest at 6 PM
    const digestInterval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 18 && now.getMinutes() === 0) {
        try {
          await this.sendDailyDigest();
          this.log.info('Daily digest sent');
        } catch (error) {
          this.log.error('Daily digest failed: %s', error.message);
        }
      }
    }, 60 * 1000); // Check every minute

    this.scheduledJobs.set('overdue', overdueInterval);
    this.scheduledJobs.set('lowstock', lowStockInterval);
    this.scheduledJobs.set('digest', digestInterval);

    this.log.info('Automated notifications enabled');
  }

  /**
   * Stop automated checks
   */
  stopAutomatedChecks() {
    for (const [name, interval] of this.scheduledJobs.entries()) {
      clearInterval(interval);
    }
    this.scheduledJobs.clear();
    this.log.info('Automated notifications disabled');
  }
}

module.exports = NotificationService;
