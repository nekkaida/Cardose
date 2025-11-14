// Communication routes for WhatsApp, Email, SMS
const WhatsAppService = require('../services/WhatsAppService');

async function communicationRoutes(fastify, options) {
  const db = fastify.db;
  const whatsappService = new WhatsAppService();

  // ============= WhatsApp Routes =============

  /**
   * Send WhatsApp text message
   */
  fastify.post('/whatsapp/send', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { to, message } = request.body;

      if (!to || !message) {
        return reply.status(400).send({ error: 'Phone number and message are required' });
      }

      const result = await whatsappService.sendTextMessage(to, message);

      // Log message to database
      await db.run(
        `INSERT INTO communication_logs (type, recipient, message, status, sent_at, metadata)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        ['whatsapp', to, message, 'sent', JSON.stringify(result)]
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        result
      };
    } catch (error) {
      fastify.log.error(error);

      // Log failed message
      try {
        await db.run(
          `INSERT INTO communication_logs (type, recipient, message, status, sent_at, error_message)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          ['whatsapp', request.body.to, request.body.message, 'failed', error.message]
        );
      } catch (dbError) {
        fastify.log.error('Failed to log communication error:', dbError);
      }

      return reply.status(500).send({ error: 'Failed to send WhatsApp message', details: error.message });
    }
  });

  /**
   * Send WhatsApp order notification
   */
  fastify.post('/whatsapp/notify/order', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId } = request.body;

      if (!orderId) {
        return reply.status(400).send({ error: 'Order ID is required' });
      }

      // Get order details
      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // Get customer details
      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [order.customer_id]);
      if (!customer || !customer.phone) {
        return reply.status(400).send({ error: 'Customer phone number not found' });
      }

      const result = await whatsappService.sendOrderNotification(customer, order);

      // Log notification
      await db.run(
        `INSERT INTO communication_logs (type, recipient, message, status, sent_at, reference_type, reference_id, metadata)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        ['whatsapp', customer.phone, 'Order Notification', 'sent', 'order', orderId, JSON.stringify(result)]
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send order notification', details: error.message });
    }
  });

  /**
   * Send WhatsApp invoice notification
   */
  fastify.post('/whatsapp/notify/invoice', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { invoiceId } = request.body;

      if (!invoiceId) {
        return reply.status(400).send({ error: 'Invoice ID is required' });
      }

      // Get invoice details
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      if (!invoice) {
        return reply.status(404).send({ error: 'Invoice not found' });
      }

      // Get customer details
      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [invoice.customer_id]);
      if (!customer || !customer.phone) {
        return reply.status(400).send({ error: 'Customer phone number not found' });
      }

      const result = await whatsappService.sendInvoiceNotification(customer, invoice);

      // Log notification
      await db.run(
        `INSERT INTO communication_logs (type, recipient, message, status, sent_at, reference_type, reference_id, metadata)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        ['whatsapp', customer.phone, 'Invoice Notification', 'sent', 'invoice', invoiceId, JSON.stringify(result)]
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send invoice notification', details: error.message });
    }
  });

  /**
   * Send production update
   */
  fastify.post('/whatsapp/notify/production', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId, stage } = request.body;

      if (!orderId || !stage) {
        return reply.status(400).send({ error: 'Order ID and stage are required' });
      }

      // Get order details
      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // Get customer details
      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [order.customer_id]);
      if (!customer || !customer.phone) {
        return reply.status(400).send({ error: 'Customer phone number not found' });
      }

      const result = await whatsappService.sendProductionUpdate(customer, order, stage);

      // Log notification
      await db.run(
        `INSERT INTO communication_logs (type, recipient, message, status, sent_at, reference_type, reference_id, metadata)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        ['whatsapp', customer.phone, `Production Update: ${stage}`, 'sent', 'order', orderId, JSON.stringify(result)]
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send production update', details: error.message });
    }
  });

  /**
   * Send payment reminder
   */
  fastify.post('/whatsapp/notify/payment-reminder', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { invoiceId } = request.body;

      if (!invoiceId) {
        return reply.status(400).send({ error: 'Invoice ID is required' });
      }

      // Get invoice details
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      if (!invoice) {
        return reply.status(404).send({ error: 'Invoice not found' });
      }

      // Get customer details
      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [invoice.customer_id]);
      if (!customer || !customer.phone) {
        return reply.status(400).send({ error: 'Customer phone number not found' });
      }

      // Calculate days overdue
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      const result = await whatsappService.sendPaymentReminder(customer, invoice, daysOverdue);

      // Log notification
      await db.run(
        `INSERT INTO communication_logs (type, recipient, message, status, sent_at, reference_type, reference_id, metadata)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        ['whatsapp', customer.phone, 'Payment Reminder', 'sent', 'invoice', invoiceId, JSON.stringify(result)]
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        daysOverdue
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send payment reminder', details: error.message });
    }
  });

  /**
   * Send bulk messages
   */
  fastify.post('/whatsapp/bulk-send', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { customerIds, message } = request.body;

      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        return reply.status(400).send({ error: 'Customer IDs array is required' });
      }

      if (!message) {
        return reply.status(400).send({ error: 'Message is required' });
      }

      // Get customers
      const placeholders = customerIds.map(() => '?').join(',');
      const customers = await db.all(
        `SELECT id, name, phone FROM customers WHERE id IN (${placeholders}) AND phone IS NOT NULL`,
        customerIds
      );

      if (customers.length === 0) {
        return reply.status(400).send({ error: 'No customers with phone numbers found' });
      }

      // Send bulk messages
      const result = await whatsappService.sendBulkMessages(customers, message);

      // Log bulk send
      await db.run(
        `INSERT INTO communication_logs (type, recipient, message, status, sent_at, metadata)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        ['whatsapp', 'bulk', message, 'sent', JSON.stringify({
          totalRecipients: result.total,
          successful: result.successful,
          failed: result.failed
        })]
      );

      return {
        success: true,
        result
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send bulk messages', details: error.message });
    }
  });

  /**
   * Get communication logs
   */
  fastify.get('/logs', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const {
        type,
        status,
        referenceType,
        referenceId,
        limit = 50,
        offset = 0
      } = request.query;

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

      query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const logs = await db.all(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM communication_logs WHERE 1=1';
      const countParams = params.slice(0, -2); // Remove limit and offset

      if (type) countQuery += ' AND type = ?';
      if (status) countQuery += ' AND status = ?';
      if (referenceType) countQuery += ' AND reference_type = ?';
      if (referenceId) countQuery += ' AND reference_id = ?';

      const { total } = await db.get(countQuery, countParams);

      return {
        success: true,
        logs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch communication logs' });
    }
  });

  /**
   * WhatsApp webhook verification (GET)
   */
  fastify.get('/whatsapp/webhook', async (request, reply) => {
    try {
      const mode = request.query['hub.mode'];
      const token = request.query['hub.verify_token'];
      const challenge = request.query['hub.challenge'];

      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'premium-gift-box-webhook-token';

      if (mode === 'subscribe' && token === verifyToken) {
        return reply.send(challenge);
      } else {
        return reply.status(403).send('Forbidden');
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Webhook verification failed' });
    }
  });

  /**
   * WhatsApp webhook receiver (POST)
   */
  fastify.post('/whatsapp/webhook', async (request, reply) => {
    try {
      const webhookData = request.body;

      // Process webhook
      const result = await whatsappService.processWebhook(webhookData);

      if (result.processed) {
        // Log incoming message
        await db.run(
          `INSERT INTO communication_logs (type, recipient, message, status, sent_at, metadata)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          ['whatsapp', result.from, result.messageText || '', 'received', JSON.stringify(result)]
        );
      }

      return reply.status(200).send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });
}

module.exports = communicationRoutes;
