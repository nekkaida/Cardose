// Webhook service for external integrations
const https = require('https');
const http = require('http');

class WebhookService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Register webhook
   */
  async registerWebhook(url, events, secret, userId) {
    try {
      const id = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await this.db.run(
        `INSERT INTO webhooks (id, url, events, secret, created_by, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
        [id, url, JSON.stringify(events), secret, userId]
      );

      return {
        success: true,
        webhookId: id,
        message: 'Webhook registered successfully'
      };
    } catch (error) {
      throw new Error(`Failed to register webhook: ${error.message}`);
    }
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(userId = null) {
    try {
      let query = 'SELECT * FROM webhooks';
      const params = [];

      if (userId) {
        query += ' WHERE created_by = ?';
        params.push(userId);
      }

      query += ' ORDER BY created_at DESC';

      const webhooks = await this.db.all(query, params);

      return webhooks.map(webhook => ({
        ...webhook,
        events: JSON.parse(webhook.events)
      }));
    } catch (error) {
      throw new Error(`Failed to get webhooks: ${error.message}`);
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, updates) {
    try {
      const fields = [];
      const values = [];

      if (updates.url) {
        fields.push('url = ?');
        values.push(updates.url);
      }

      if (updates.events) {
        fields.push('events = ?');
        values.push(JSON.stringify(updates.events));
      }

      if (updates.secret !== undefined) {
        fields.push('secret = ?');
        values.push(updates.secret);
      }

      if (updates.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.isActive ? 1 : 0);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(webhookId);

      await this.db.run(
        `UPDATE webhooks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      return {
        success: true,
        message: 'Webhook updated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to update webhook: ${error.message}`);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    try {
      await this.db.run('DELETE FROM webhooks WHERE id = ?', [webhookId]);

      return {
        success: true,
        message: 'Webhook deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(eventType, eventData) {
    try {
      const webhooks = await this.db.all(
        'SELECT * FROM webhooks WHERE is_active = 1'
      );

      const results = [];

      for (const webhook of webhooks) {
        const events = JSON.parse(webhook.events);

        if (events.includes(eventType) || events.includes('*')) {
          const result = await this.sendWebhook(webhook, eventType, eventData);
          results.push(result);
        }
      }

      return {
        success: true,
        triggered: results.length,
        results
      };
    } catch (error) {
      throw new Error(`Failed to trigger event: ${error.message}`);
    }
  }

  /**
   * Send webhook HTTP request
   */
  async sendWebhook(webhook, eventType, eventData) {
    return new Promise((resolve, reject) => {
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: eventData
      };

      const postData = JSON.stringify(payload);

      const url = new URL(webhook.url);
      const protocol = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-Webhook-Secret': webhook.secret,
          'X-Webhook-Event': eventType
        }
      };

      const startTime = Date.now();

      const req = protocol.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', async () => {
          const duration = Date.now() - startTime;

          const success = res.statusCode >= 200 && res.statusCode < 300;

          // Log webhook delivery
          await this.logWebhookDelivery(
            webhook.id,
            eventType,
            success,
            res.statusCode,
            duration,
            success ? null : responseData
          );

          resolve({
            webhookId: webhook.id,
            success,
            statusCode: res.statusCode,
            duration
          });
        });
      });

      req.on('error', async (error) => {
        const duration = Date.now() - startTime;

        await this.logWebhookDelivery(
          webhook.id,
          eventType,
          false,
          null,
          duration,
          error.message
        );

        resolve({
          webhookId: webhook.id,
          success: false,
          error: error.message,
          duration
        });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Log webhook delivery
   */
  async logWebhookDelivery(webhookId, eventType, success, statusCode, duration, error) {
    try {
      await this.db.run(
        `INSERT INTO webhook_logs (webhook_id, event_type, success, status_code, duration_ms, error_message, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [webhookId, eventType, success ? 1 : 0, statusCode, duration, error]
      );

      // Update webhook stats
      if (success) {
        await this.db.run(
          'UPDATE webhooks SET last_success = CURRENT_TIMESTAMP WHERE id = ?',
          [webhookId]
        );
      } else {
        await this.db.run(
          'UPDATE webhooks SET last_failure = CURRENT_TIMESTAMP WHERE id = ?',
          [webhookId]
        );
      }
    } catch (error) {
      console.error('Failed to log webhook delivery:', error.message);
    }
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(webhookId, limit = 50) {
    try {
      const logs = await this.db.all(
        `SELECT * FROM webhook_logs WHERE webhook_id = ? ORDER BY delivered_at DESC LIMIT ?`,
        [webhookId, limit]
      );

      return {
        success: true,
        logs
      };
    } catch (error) {
      throw new Error(`Failed to get webhook logs: ${error.message}`);
    }
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId) {
    try {
      const webhook = await this.db.get('SELECT * FROM webhooks WHERE id = ?', [webhookId]);

      if (!webhook) {
        throw new Error('Webhook not found');
      }

      const testData = {
        test: true,
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString()
      };

      const result = await this.sendWebhook(webhook, 'test', testData);

      return {
        success: result.success,
        message: result.success ? 'Test webhook delivered successfully' : 'Test webhook failed',
        result
      };
    } catch (error) {
      throw new Error(`Failed to test webhook: ${error.message}`);
    }
  }
}

module.exports = WebhookService;
