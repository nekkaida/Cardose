// Communication business logic service - extracted from communication routes
const WhatsAppService = require('./WhatsAppService');
const EmailService = require('./EmailService');

class CommunicationService {
  constructor(db) {
    this.db = db;
    this.whatsappService = new WhatsAppService();
    this.emailService = new EmailService();
  }

  // ============= Common Helpers =============

  /**
   * Resolve a customer from an entity (order or invoice).
   * Returns { entity, customer } or throws a typed error.
   */
  async _resolveCustomer(entityId, entityType, contactField = 'phone') {
    const table = entityType === 'order' ? 'orders' : 'invoices';

    const entity = await this.db.get(`SELECT * FROM ${table} WHERE id = ?`, [entityId]);
    if (!entity) {
      const err = new Error(`${entityType === 'order' ? 'Order' : 'Invoice'} not found`);
      err.statusCode = 404;
      throw err;
    }

    const customer = await this.db.get('SELECT * FROM customers WHERE id = ?', [
      entity.customer_id,
    ]);

    if (!customer || !customer[contactField]) {
      const label = contactField === 'phone' ? 'phone number' : 'email';
      const err = new Error(`Customer ${label} not found`);
      err.statusCode = 400;
      throw err;
    }

    return { entity, customer };
  }

  /**
   * Log a communication event to the database.
   */
  async _logCommunication({
    type,
    recipient,
    message,
    status,
    referenceType = null,
    referenceId = null,
    metadata = null,
    errorMessage = null,
  }) {
    const columns = ['type', 'recipient', 'message', 'status', 'sent_at'];
    const placeholders = ['?', '?', '?', '?', 'CURRENT_TIMESTAMP'];
    const params = [type, recipient, message, status];

    if (referenceType) {
      columns.push('reference_type');
      placeholders.push('?');
      params.push(referenceType);
    }

    if (referenceId) {
      columns.push('reference_id');
      placeholders.push('?');
      params.push(referenceId);
    }

    if (metadata) {
      columns.push('metadata');
      placeholders.push('?');
      params.push(typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
    }

    if (errorMessage) {
      columns.push('error_message');
      placeholders.push('?');
      params.push(errorMessage);
    }

    await this.db.run(
      `INSERT INTO communication_logs (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      params
    );
  }

  /**
   * Calculate days overdue for an invoice.
   */
  _calculateDaysOverdue(invoice) {
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  }

  // ============= WhatsApp Methods =============

  /**
   * Send a direct WhatsApp text message and log it.
   */
  async sendWhatsAppMessage(to, message) {
    try {
      const result = await this.whatsappService.sendTextMessage(to, message);

      await this._logCommunication({
        type: 'whatsapp',
        recipient: to,
        message,
        status: 'sent',
        metadata: result,
      });

      return {
        messageId: result.messages?.[0]?.id,
        result,
      };
    } catch (error) {
      // Log the failed attempt
      try {
        await this._logCommunication({
          type: 'whatsapp',
          recipient: to,
          message,
          status: 'failed',
          errorMessage: error.message,
        });
      } catch (_dbError) {
        // Swallow DB logging error; the original error is re-thrown below
      }
      throw error;
    }
  }

  /**
   * Send WhatsApp order notification.
   */
  async sendWhatsAppOrderNotification(orderId) {
    const { entity: order, customer } = await this._resolveCustomer(orderId, 'order', 'phone');

    const result = await this.whatsappService.sendOrderNotification(customer, order);

    await this._logCommunication({
      type: 'whatsapp',
      recipient: customer.phone,
      message: 'Order Notification',
      status: 'sent',
      referenceType: 'order',
      referenceId: orderId,
      metadata: result,
    });

    return { messageId: result.messages?.[0]?.id };
  }

  /**
   * Send WhatsApp invoice notification.
   */
  async sendWhatsAppInvoiceNotification(invoiceId) {
    const { entity: invoice, customer } = await this._resolveCustomer(
      invoiceId,
      'invoice',
      'phone'
    );

    const result = await this.whatsappService.sendInvoiceNotification(customer, invoice);

    await this._logCommunication({
      type: 'whatsapp',
      recipient: customer.phone,
      message: 'Invoice Notification',
      status: 'sent',
      referenceType: 'invoice',
      referenceId: invoiceId,
      metadata: result,
    });

    return { messageId: result.messages?.[0]?.id };
  }

  /**
   * Send WhatsApp production update.
   */
  async sendWhatsAppProductionUpdate(orderId, stage) {
    const { entity: order, customer } = await this._resolveCustomer(orderId, 'order', 'phone');

    const result = await this.whatsappService.sendProductionUpdate(customer, order, stage);

    await this._logCommunication({
      type: 'whatsapp',
      recipient: customer.phone,
      message: `Production Update: ${stage}`,
      status: 'sent',
      referenceType: 'order',
      referenceId: orderId,
      metadata: result,
    });

    return { messageId: result.messages?.[0]?.id };
  }

  /**
   * Send WhatsApp payment reminder.
   */
  async sendWhatsAppPaymentReminder(invoiceId) {
    const { entity: invoice, customer } = await this._resolveCustomer(
      invoiceId,
      'invoice',
      'phone'
    );

    const daysOverdue = this._calculateDaysOverdue(invoice);
    const result = await this.whatsappService.sendPaymentReminder(customer, invoice, daysOverdue);

    await this._logCommunication({
      type: 'whatsapp',
      recipient: customer.phone,
      message: 'Payment Reminder',
      status: 'sent',
      referenceType: 'invoice',
      referenceId: invoiceId,
      metadata: result,
    });

    return { messageId: result.messages?.[0]?.id, daysOverdue };
  }

  /**
   * Send WhatsApp bulk messages.
   */
  async sendWhatsAppBulk(customerIds, message) {
    const placeholders = customerIds.map(() => '?').join(',');
    const customers = await this.db.all(
      `SELECT id, name, phone FROM customers WHERE id IN (${placeholders}) AND phone IS NOT NULL`,
      customerIds
    );

    if (customers.length === 0) {
      const err = new Error('No customers with phone numbers found');
      err.statusCode = 400;
      throw err;
    }

    const result = await this.whatsappService.sendBulkMessages(customers, message);

    await this._logCommunication({
      type: 'whatsapp',
      recipient: 'bulk',
      message,
      status: 'sent',
      metadata: {
        totalRecipients: result.total,
        successful: result.successful,
        failed: result.failed,
      },
    });

    return result;
  }

  // ============= Email Methods =============

  /**
   * Send a direct email and log it.
   */
  async sendEmail(to, subject, html, text, attachments) {
    try {
      const result = await this.emailService.sendEmail(to, subject, html, text, attachments);

      await this._logCommunication({
        type: 'email',
        recipient: to,
        message: subject,
        status: 'sent',
        metadata: { messageId: result.messageId },
      });

      return { messageId: result.messageId };
    } catch (error) {
      // Log the failed attempt
      try {
        await this._logCommunication({
          type: 'email',
          recipient: to,
          message: subject,
          status: 'failed',
          errorMessage: error.message,
        });
      } catch (_dbError) {
        // Swallow DB logging error; the original error is re-thrown below
      }
      throw error;
    }
  }

  /**
   * Send email order confirmation.
   */
  async sendEmailOrderNotification(orderId) {
    const { entity: order, customer } = await this._resolveCustomer(orderId, 'order', 'email');

    const result = await this.emailService.sendOrderConfirmation(customer, order);

    await this._logCommunication({
      type: 'email',
      recipient: customer.email,
      message: 'Order Confirmation',
      status: 'sent',
      referenceType: 'order',
      referenceId: orderId,
      metadata: { messageId: result.messageId },
    });

    return { messageId: result.messageId };
  }

  /**
   * Send email invoice notification, optionally attaching a PDF.
   */
  async sendEmailInvoiceNotification(invoiceId, attachPdf = false) {
    const { entity: invoice, customer } = await this._resolveCustomer(
      invoiceId,
      'invoice',
      'email'
    );

    let pdfPath = null;
    if (attachPdf) {
      const PDFService = require('./PDFService');
      const pdfService = new PDFService();

      let order = null;
      if (invoice.order_id) {
        order = await this.db.get('SELECT * FROM orders WHERE id = ?', [invoice.order_id]);
      }

      const { filepath } = await pdfService.generateInvoicePDF(invoice, customer, order);
      pdfPath = filepath;
    }

    const result = await this.emailService.sendInvoiceEmail(customer, invoice, pdfPath);

    await this._logCommunication({
      type: 'email',
      recipient: customer.email,
      message: 'Invoice Email',
      status: 'sent',
      referenceType: 'invoice',
      referenceId: invoiceId,
      metadata: { messageId: result.messageId },
    });

    return { messageId: result.messageId };
  }

  /**
   * Send email production update.
   */
  async sendEmailProductionUpdate(orderId, stage) {
    const { entity: order, customer } = await this._resolveCustomer(orderId, 'order', 'email');

    const result = await this.emailService.sendProductionUpdateEmail(customer, order, stage);

    await this._logCommunication({
      type: 'email',
      recipient: customer.email,
      message: `Production Update: ${stage}`,
      status: 'sent',
      referenceType: 'order',
      referenceId: orderId,
      metadata: { messageId: result.messageId },
    });

    return { messageId: result.messageId };
  }

  /**
   * Send email payment reminder.
   */
  async sendEmailPaymentReminder(invoiceId) {
    const { entity: invoice, customer } = await this._resolveCustomer(
      invoiceId,
      'invoice',
      'email'
    );

    const daysOverdue = this._calculateDaysOverdue(invoice);
    const result = await this.emailService.sendPaymentReminderEmail(customer, invoice, daysOverdue);

    await this._logCommunication({
      type: 'email',
      recipient: customer.email,
      message: 'Payment Reminder',
      status: 'sent',
      referenceType: 'invoice',
      referenceId: invoiceId,
      metadata: { messageId: result.messageId },
    });

    return { messageId: result.messageId, daysOverdue };
  }

  /**
   * Send bulk emails.
   */
  async sendEmailBulk(customerIds, subject, html) {
    const placeholders = customerIds.map(() => '?').join(',');
    const customers = await this.db.all(
      `SELECT id, name, email FROM customers WHERE id IN (${placeholders}) AND email IS NOT NULL`,
      customerIds
    );

    if (customers.length === 0) {
      const err = new Error('No customers with email addresses found');
      err.statusCode = 400;
      throw err;
    }

    const result = await this.emailService.sendBulkEmails(customers, subject, html);

    await this._logCommunication({
      type: 'email',
      recipient: 'bulk',
      message: subject,
      status: 'sent',
      metadata: {
        totalRecipients: result.total,
        successful: result.successful,
        failed: result.failed,
      },
    });

    return result;
  }

  // ============= Logs =============

  /**
   * Get communication logs with filtering and pagination.
   */
  async getLogs({ type, status, referenceType, referenceId, limit = 50, offset = 0 }) {
    let query = 'SELECT * FROM communication_logs WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (referenceType) {
      query += ' AND reference_type = ?';
      params.push(referenceType);
    }

    if (referenceId) {
      query += ' AND reference_id = ?';
      params.push(referenceId);
    }

    // Count query uses the same WHERE clause (before LIMIT/OFFSET)
    let countQuery = 'SELECT COUNT(*) as total FROM communication_logs WHERE 1=1';
    if (type) countQuery += ' AND type = ?';
    if (status) countQuery += ' AND status = ?';
    if (referenceType) countQuery += ' AND reference_type = ?';
    if (referenceId) countQuery += ' AND reference_id = ?';

    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';

    const logs = await this.db.all(query, [...params, parsedLimit, parsedOffset]);
    const { total } = await this.db.get(countQuery, params);

    return {
      logs,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        pages: Math.ceil(total / parsedLimit),
      },
    };
  }

  // ============= Webhooks =============

  /**
   * Verify WhatsApp webhook subscription challenge.
   */
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'premium-gift-box-webhook-token';

    if (mode === 'subscribe' && token === verifyToken) {
      return { verified: true, challenge };
    }

    return { verified: false };
  }

  /**
   * Process incoming WhatsApp webhook data and log it.
   */
  async processWebhook(webhookData) {
    const result = await this.whatsappService.processWebhook(webhookData);

    if (result.processed) {
      await this._logCommunication({
        type: 'whatsapp',
        recipient: result.from,
        message: result.messageText || '',
        status: 'received',
        metadata: result,
      });
    }

    return result;
  }
}

module.exports = CommunicationService;
