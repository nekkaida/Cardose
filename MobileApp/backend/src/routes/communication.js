// Communication routes for WhatsApp, Email, SMS
const CommunicationService = require('../services/CommunicationService');

async function communicationRoutes(fastify, options) {
  const commService = new CommunicationService(fastify.db);

  // ============= WhatsApp Routes =============

  /**
   * Send WhatsApp text message
   */
  fastify.post(
    '/whatsapp/send',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['to', 'message'],
          properties: {
            to: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { to, message } = request.body;

        if (!to || !message) {
          return reply.status(400).send({ error: 'Phone number and message are required' });
        }

        const result = await commService.sendWhatsAppMessage(to, message);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to send WhatsApp message' });
      }
    }
  );

  /**
   * Send WhatsApp order notification
   */
  fastify.post(
    '/whatsapp/notify/order',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { orderId } = request.body;

        if (!orderId) {
          return reply.status(400).send({ error: 'Order ID is required' });
        }

        const result = await commService.sendWhatsAppOrderNotification(orderId);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send order notification' });
      }
    }
  );

  /**
   * Send WhatsApp invoice notification
   */
  fastify.post(
    '/whatsapp/notify/invoice',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['invoiceId'],
          properties: {
            invoiceId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { invoiceId } = request.body;

        if (!invoiceId) {
          return reply.status(400).send({ error: 'Invoice ID is required' });
        }

        const result = await commService.sendWhatsAppInvoiceNotification(invoiceId);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send invoice notification' });
      }
    }
  );

  /**
   * Send production update
   */
  fastify.post(
    '/whatsapp/notify/production',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['orderId', 'stage'],
          properties: {
            orderId: { type: 'string' },
            stage: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { orderId, stage } = request.body;

        if (!orderId || !stage) {
          return reply.status(400).send({ error: 'Order ID and stage are required' });
        }

        const result = await commService.sendWhatsAppProductionUpdate(orderId, stage);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send production update' });
      }
    }
  );

  /**
   * Send payment reminder
   */
  fastify.post(
    '/whatsapp/notify/payment-reminder',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['invoiceId'],
          properties: {
            invoiceId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { invoiceId } = request.body;

        if (!invoiceId) {
          return reply.status(400).send({ error: 'Invoice ID is required' });
        }

        const result = await commService.sendWhatsAppPaymentReminder(invoiceId);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send payment reminder' });
      }
    }
  );

  /**
   * Send bulk messages
   */
  fastify.post(
    '/whatsapp/bulk-send',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['customerIds', 'message'],
          properties: {
            customerIds: { type: 'array', maxItems: 100 },
            message: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { customerIds, message } = request.body;

        if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
          return reply.status(400).send({ error: 'Customer IDs array is required' });
        }

        if (!message) {
          return reply.status(400).send({ error: 'Message is required' });
        }

        if (customerIds.length > 100) {
          return reply.status(400).send({ error: 'Maximum 100 recipients allowed per bulk send' });
        }

        const result = await commService.sendWhatsAppBulk(customerIds, message);
        return { success: true, result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send bulk messages' });
      }
    }
  );

  /**
   * Get communication logs
   */
  fastify.get(
    '/logs',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { type, status, referenceType, referenceId, limit = 50, offset = 0 } = request.query;
        const result = await commService.getLogs({
          type,
          status,
          referenceType,
          referenceId,
          limit,
          offset,
        });
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch communication logs' });
      }
    }
  );

  /**
   * WhatsApp webhook verification (GET)
   */
  fastify.get('/whatsapp/webhook', async (request, reply) => {
    try {
      const mode = request.query['hub.mode'];
      const token = request.query['hub.verify_token'];
      const challenge = request.query['hub.challenge'];

      const { verified, challenge: verifiedChallenge } = commService.verifyWebhook(
        mode,
        token,
        challenge
      );

      if (verified) {
        return reply.send(verifiedChallenge);
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
      await commService.processWebhook(request.body);
      return reply.status(200).send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  // ============= Email Routes =============

  /**
   * Send email
   */
  fastify.post(
    '/email/send',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['to', 'subject', 'html'],
          properties: {
            to: { type: 'string' },
            subject: { type: 'string' },
            html: { type: 'string' },
            text: { type: 'string' },
            attachments: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { to, subject, html, text, attachments } = request.body;

        if (!to || !subject || !html) {
          return reply
            .status(400)
            .send({ error: 'Recipient, subject, and HTML content are required' });
        }

        const result = await commService.sendEmail(to, subject, html, text, attachments);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to send email' });
      }
    }
  );

  /**
   * Send order confirmation email
   */
  fastify.post(
    '/email/notify/order',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { orderId } = request.body;

        if (!orderId) {
          return reply.status(400).send({ error: 'Order ID is required' });
        }

        const result = await commService.sendEmailOrderNotification(orderId);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send order confirmation email' });
      }
    }
  );

  /**
   * Send invoice email
   */
  fastify.post(
    '/email/notify/invoice',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['invoiceId'],
          properties: {
            invoiceId: { type: 'string' },
            attachPdf: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { invoiceId, attachPdf } = request.body;

        if (!invoiceId) {
          return reply.status(400).send({ error: 'Invoice ID is required' });
        }

        const result = await commService.sendEmailInvoiceNotification(invoiceId, attachPdf);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send invoice email' });
      }
    }
  );

  /**
   * Send production update email
   */
  fastify.post(
    '/email/notify/production',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['orderId', 'stage'],
          properties: {
            orderId: { type: 'string' },
            stage: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { orderId, stage } = request.body;

        if (!orderId || !stage) {
          return reply.status(400).send({ error: 'Order ID and stage are required' });
        }

        const result = await commService.sendEmailProductionUpdate(orderId, stage);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send production update email' });
      }
    }
  );

  /**
   * Send payment reminder email
   */
  fastify.post(
    '/email/notify/payment-reminder',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['invoiceId'],
          properties: {
            invoiceId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { invoiceId } = request.body;

        if (!invoiceId) {
          return reply.status(400).send({ error: 'Invoice ID is required' });
        }

        const result = await commService.sendEmailPaymentReminder(invoiceId);
        return { success: true, ...result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply
          .status(status)
          .send({ error: error.message || 'Failed to send payment reminder email' });
      }
    }
  );

  /**
   * Send bulk emails
   */
  fastify.post(
    '/email/bulk-send',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['customerIds', 'subject', 'html'],
          properties: {
            customerIds: { type: 'array', maxItems: 100 },
            subject: { type: 'string' },
            html: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { customerIds, subject, html } = request.body;

        if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
          return reply.status(400).send({ error: 'Customer IDs array is required' });
        }

        if (!subject || !html) {
          return reply.status(400).send({ error: 'Subject and HTML content are required' });
        }

        if (customerIds.length > 100) {
          return reply.status(400).send({ error: 'Maximum 100 recipients allowed per bulk send' });
        }

        const result = await commService.sendEmailBulk(customerIds, subject, html);
        return { success: true, result };
      } catch (error) {
        fastify.log.error(error);
        const status = error.statusCode || 500;
        return reply.status(status).send({ error: error.message || 'Failed to send bulk emails' });
      }
    }
  );
}

module.exports = communicationRoutes;
