// Message Template Service for WhatsApp, Email, SMS
class TemplateService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create template
   */
  async createTemplate(name, type, subject, body, variables, category, userId) {
    try {
      const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await this.db.run(
        `INSERT INTO message_templates (id, name, type, subject, body, variables, category, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, name, type, subject, body, JSON.stringify(variables), category, userId]
      );

      return {
        success: true,
        templateId: id,
        message: 'Template created successfully',
      };
    } catch (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Get all templates
   */
  async getTemplates(type = null, category = null) {
    try {
      let query = 'SELECT * FROM message_templates WHERE 1=1';
      const params = [];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC';

      const templates = await this.db.all(query, params);

      return templates.map((template) => {
        let vars = template.variables || '';
        // Handle both JSON array and comma-separated string formats
        if (vars.startsWith('[')) {
          try {
            vars = JSON.parse(vars);
          } catch (e) {
            vars = vars
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v);
          }
        } else {
          vars = vars
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v);
        }
        return {
          ...template,
          variables: vars,
        };
      });
    } catch (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId) {
    try {
      const template = await this.db.get('SELECT * FROM message_templates WHERE id = ?', [
        templateId,
      ]);

      if (!template) {
        throw new Error('Template not found');
      }

      let vars = template.variables || '';
      if (vars.startsWith('[')) {
        try {
          vars = JSON.parse(vars);
        } catch (e) {
          vars = vars
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v);
        }
      } else {
        vars = vars
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v);
      }

      return {
        ...template,
        variables: vars,
      };
    } catch (error) {
      throw new Error(`Failed to get template: ${error.message}`);
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updates) {
    try {
      const fields = [];
      const values = [];

      if (updates.name) {
        fields.push('name = ?');
        values.push(updates.name);
      }

      if (updates.subject !== undefined) {
        fields.push('subject = ?');
        values.push(updates.subject);
      }

      if (updates.body) {
        fields.push('body = ?');
        values.push(updates.body);
      }

      if (updates.variables) {
        fields.push('variables = ?');
        values.push(JSON.stringify(updates.variables));
      }

      if (updates.category) {
        fields.push('category = ?');
        values.push(updates.category);
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');

      if (fields.length === 1) {
        throw new Error('No fields to update');
      }

      values.push(templateId);

      const query = `UPDATE message_templates SET ${fields.join(', ')} WHERE id = ?`;
      await this.db.run(query, values);

      return {
        success: true,
        message: 'Template updated successfully',
      };
    } catch (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    try {
      await this.db.run('DELETE FROM message_templates WHERE id = ?', [templateId]);

      return {
        success: true,
        message: 'Template deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Render template with variables
   */
  renderTemplate(template, data) {
    let rendered = template;

    // Replace {{variable}} with actual data
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }

    // Clean up any unreplaced variables
    rendered = rendered.replace(/{{[^}]+}}/g, '');

    return rendered;
  }

  /**
   * Get rendered message from template
   */
  async getRenderedMessage(templateId, data) {
    try {
      const template = await this.getTemplateById(templateId);

      const renderedSubject = template.subject ? this.renderTemplate(template.subject, data) : null;

      const renderedBody = this.renderTemplate(template.body, data);

      return {
        success: true,
        type: template.type,
        subject: renderedSubject,
        body: renderedBody,
        template: {
          id: template.id,
          name: template.name,
        },
      };
    } catch (error) {
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  /**
   * Get default templates for initialization
   */
  getDefaultTemplates() {
    return [
      {
        name: 'Order Confirmation',
        type: 'whatsapp',
        subject: null,
        body: `Halo {{customer_name}},

Terima kasih atas pesanan Anda!

*Detail Pesanan:*
Nomor Order: {{order_number}}
Status: {{status}}
Total: {{total_price}}

Kami akan segera memproses pesanan Anda.

Terima kasih,
Premium Gift Box`,
        variables: ['customer_name', 'order_number', 'status', 'total_price'],
        category: 'order',
      },
      {
        name: 'Invoice Notification',
        type: 'whatsapp',
        subject: null,
        body: `Halo {{customer_name}},

Invoice Anda sudah siap!

*Detail Invoice:*
Nomor: {{invoice_number}}
Total: {{total_amount}}
Jatuh Tempo: {{due_date}}

*Informasi Pembayaran:*
Bank: Bank Mandiri
No. Rekening: 1234567890

Premium Gift Box`,
        variables: ['customer_name', 'invoice_number', 'total_amount', 'due_date'],
        category: 'invoice',
      },
      {
        name: 'Payment Reminder',
        type: 'whatsapp',
        subject: null,
        body: `Halo {{customer_name}},

Pengingat pembayaran untuk Invoice #{{invoice_number}}

Total: {{total_amount}}
Jatuh Tempo: {{due_date}}

Silakan lakukan pembayaran segera.

Premium Gift Box`,
        variables: ['customer_name', 'invoice_number', 'total_amount', 'due_date'],
        category: 'payment',
      },
      {
        name: 'Production Update',
        type: 'whatsapp',
        subject: null,
        body: `Halo {{customer_name}},

Update pesanan #{{order_number}}:

Status: {{status}}
{{message}}

Premium Gift Box`,
        variables: ['customer_name', 'order_number', 'status', 'message'],
        category: 'production',
      },
      {
        name: 'Order Confirmation Email',
        type: 'email',
        subject: 'Order Confirmation - {{order_number}}',
        body: `<h2>Thank you for your order!</h2>
<p>Hi {{customer_name}},</p>
<p>Your order has been received and is being processed.</p>
<h3>Order Details:</h3>
<ul>
  <li>Order Number: {{order_number}}</li>
  <li>Status: {{status}}</li>
  <li>Total: {{total_price}}</li>
</ul>
<p>We will contact you shortly with design details.</p>
<p>Best regards,<br>Premium Gift Box Team</p>`,
        variables: ['customer_name', 'order_number', 'status', 'total_price'],
        category: 'order',
      },
      {
        name: 'Invoice Email',
        type: 'email',
        subject: 'Invoice {{invoice_number}} - Premium Gift Box',
        body: `<h2>Invoice</h2>
<p>Hi {{customer_name}},</p>
<p>Please find your invoice details below:</p>
<h3>Invoice Details:</h3>
<ul>
  <li>Invoice Number: {{invoice_number}}</li>
  <li>Total Amount: {{total_amount}}</li>
  <li>Due Date: {{due_date}}</li>
</ul>
<h3>Payment Information:</h3>
<p>Bank: Bank Mandiri<br>
Account Number: 1234567890<br>
Account Name: Premium Gift Box</p>
<p>Best regards,<br>Premium Gift Box Team</p>`,
        variables: ['customer_name', 'invoice_number', 'total_amount', 'due_date'],
        category: 'invoice',
      },
      {
        name: 'Promotional Message',
        type: 'whatsapp',
        subject: null,
        body: `Halo {{customer_name}}! 🎁

{{promo_title}}

{{promo_description}}

Diskon: {{discount}}%
Berlaku hingga: {{valid_until}}

Hubungi kami sekarang!

Premium Gift Box`,
        variables: ['customer_name', 'promo_title', 'promo_description', 'discount', 'valid_until'],
        category: 'marketing',
      },
    ];
  }

  /**
   * Initialize default templates
   */
  async initializeDefaultTemplates(userId) {
    try {
      const defaultTemplates = this.getDefaultTemplates();
      let created = 0;

      for (const template of defaultTemplates) {
        // Check if template already exists
        const existing = await this.db.get(
          'SELECT id FROM message_templates WHERE name = ? AND type = ?',
          [template.name, template.type]
        );

        if (!existing) {
          await this.createTemplate(
            template.name,
            template.type,
            template.subject,
            template.body,
            template.variables,
            template.category,
            userId
          );
          created++;
        }
      }

      return {
        success: true,
        message: `${created} default templates initialized`,
        created,
      };
    } catch (error) {
      throw new Error(`Failed to initialize templates: ${error.message}`);
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(templateId, newName, userId) {
    try {
      const template = await this.getTemplateById(templateId);

      const result = await this.createTemplate(
        newName || `${template.name} (Copy)`,
        template.type,
        template.subject,
        template.body,
        template.variables,
        template.category,
        userId
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to duplicate template: ${error.message}`);
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId) {
    try {
      // This would require tracking template usage in communication_logs
      // For now, return basic template info
      const template = await this.getTemplateById(templateId);

      return {
        success: true,
        template: {
          id: template.id,
          name: template.name,
          type: template.type,
          category: template.category,
          created_at: template.created_at,
        },
        usage: {
          total: 0, // Would need to implement tracking
          last_used: null,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get template stats: ${error.message}`);
    }
  }
}

module.exports = TemplateService;
