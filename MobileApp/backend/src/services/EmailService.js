// Email Service using Nodemailer
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.SMTP_FROM || 'noreply@premiumgiftbox.com';
    this.initializeTransporter();
  }

  initializeTransporter() {
    // SMTP configuration from environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    if (smtpConfig.auth.user && smtpConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(smtpConfig);
    } else {
      this.configWarning =
        'SMTP credentials not set (SMTP_USER/SMTP_PASS) - email features disabled';
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text = null, attachments = []) {
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set SMTP credentials.');
    }

    const mailOptions = {
      from: this.from,
      to,
      subject,
      html,
      text: text || this.stripHtml(html),
      attachments,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(customer, order) {
    const subject = `Order Confirmation - ${order.order_number}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2C5530; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .order-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { background-color: #2C5530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Premium Gift Box</h1>
            <p>Thank You for Your Order!</p>
        </div>

        <div class="content">
            <h2>Hi ${customer.name},</h2>
            <p>Thank you for your order! We're excited to create your premium gift box.</p>

            <div class="order-details">
                <h3>Order Details</h3>
                <div class="detail-row">
                    <strong>Order Number:</strong>
                    <span>${order.order_number}</span>
                </div>
                <div class="detail-row">
                    <strong>Order Date:</strong>
                    <span>${this.formatDate(order.created_at)}</span>
                </div>
                <div class="detail-row">
                    <strong>Status:</strong>
                    <span>${this.translateStatus(order.status)}</span>
                </div>
                <div class="detail-row">
                    <strong>Total Amount:</strong>
                    <span>${this.formatCurrency(order.final_price)}</span>
                </div>
                ${
                  order.estimated_completion
                    ? `
                <div class="detail-row">
                    <strong>Estimated Completion:</strong>
                    <span>${this.formatDate(order.estimated_completion)}</span>
                </div>
                `
                    : ''
                }
            </div>

            <h3>Next Steps</h3>
            <p>Our design team will contact you shortly to discuss the design details and customization options for your gift box.</p>

            <p>If you have any questions, please don't hesitate to contact us.</p>

            <p>Best regards,<br>Premium Gift Box Team</p>
        </div>

        <div class="footer">
            <p>Premium Gift Box<br>
            Jl. Contoh No. 123, Jakarta, Indonesia<br>
            Phone: +62 21 1234 5678 | Email: info@premiumgiftbox.com</p>
        </div>
    </div>
</body>
</html>
    `;

    return await this.sendEmail(customer.email, subject, html);
  }

  /**
   * Send invoice email
   */
  async sendInvoiceEmail(customer, invoice, attachmentPath = null) {
    const subject = `Invoice ${invoice.invoice_number} - Premium Gift Box`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2C5530; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .total-row { border-top: 2px solid #2C5530; padding-top: 10px; margin-top: 10px; font-size: 18px; font-weight: bold; }
        .payment-info { background-color: #e8f5e9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Premium Gift Box</h1>
            <p>Invoice</p>
        </div>

        <div class="content">
            <h2>Hi ${customer.name},</h2>
            <p>Please find your invoice details below.</p>

            <div class="invoice-details">
                <h3>Invoice Details</h3>
                <div class="detail-row">
                    <strong>Invoice Number:</strong>
                    <span>${invoice.invoice_number}</span>
                </div>
                <div class="detail-row">
                    <strong>Issue Date:</strong>
                    <span>${this.formatDate(invoice.issue_date)}</span>
                </div>
                <div class="detail-row">
                    <strong>Due Date:</strong>
                    <span>${this.formatDate(invoice.due_date)}</span>
                </div>
                <div class="detail-row">
                    <strong>Status:</strong>
                    <span style="color: ${this.getStatusColor(invoice.status)}">${this.translateInvoiceStatus(invoice.status)}</span>
                </div>
                <hr>
                <div class="detail-row">
                    <strong>Subtotal:</strong>
                    <span>${this.formatCurrency(invoice.subtotal)}</span>
                </div>
                ${
                  invoice.discount > 0
                    ? `
                <div class="detail-row">
                    <strong>Discount:</strong>
                    <span>-${this.formatCurrency(invoice.discount)}</span>
                </div>
                `
                    : ''
                }
                <div class="detail-row">
                    <strong>PPN (${invoice.ppn_rate}%):</strong>
                    <span>${this.formatCurrency(invoice.ppn_amount)}</span>
                </div>
                <div class="detail-row total-row">
                    <strong>Total Amount:</strong>
                    <span>${this.formatCurrency(invoice.total_amount)}</span>
                </div>
            </div>

            ${
              invoice.status === 'unpaid' || invoice.status === 'overdue'
                ? `
            <div class="payment-info">
                <h3>Payment Information</h3>
                <p><strong>Bank:</strong> Bank Mandiri<br>
                <strong>Account Number:</strong> 1234567890<br>
                <strong>Account Name:</strong> Premium Gift Box</p>
                <p>Please include your invoice number (${invoice.invoice_number}) as the payment reference.</p>
            </div>
            `
                : `
            <p style="color: #4CAF50; font-weight: bold;">✓ Thank you for your payment!</p>
            `
            }

            ${attachmentPath ? '<p>Please find the detailed invoice PDF attached to this email.</p>' : ''}

            <p>If you have any questions about this invoice, please contact us.</p>

            <p>Best regards,<br>Premium Gift Box Team</p>
        </div>

        <div class="footer">
            <p>Premium Gift Box<br>
            Jl. Contoh No. 123, Jakarta, Indonesia<br>
            Phone: +62 21 1234 5678 | Email: info@premiumgiftbox.com</p>
        </div>
    </div>
</body>
</html>
    `;

    const attachments = [];
    if (attachmentPath && fs.existsSync(attachmentPath)) {
      attachments.push({
        filename: path.basename(attachmentPath),
        path: attachmentPath,
      });
    }

    return await this.sendEmail(customer.email, subject, html, null, attachments);
  }

  /**
   * Send production update email
   */
  async sendProductionUpdateEmail(customer, order, stage) {
    const subject = `Order Update: ${order.order_number} - ${this.translateStatus(stage)}`;

    const stageMessages = {
      designing: 'Our creative team is working on your design',
      approved: 'Your design has been approved and is ready for production',
      production: 'Your order is currently in production',
      quality_control: 'Your order is undergoing quality control checks',
      completed: 'Your order is complete and ready for pickup/delivery',
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2C5530; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .status-update { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #2C5530; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Premium Gift Box</h1>
            <p>Order Status Update</p>
        </div>

        <div class="content">
            <h2>Hi ${customer.name},</h2>
            <p>We have an update on your order <strong>${order.order_number}</strong>.</p>

            <div class="status-update">
                <h3 style="color: #2C5530;">Current Status: ${this.translateStatus(stage)}</h3>
                <p>${stageMessages[stage] || 'Your order is being processed.'}</p>
                ${
                  stage === 'completed' && order.estimated_completion
                    ? `
                <p><strong>Completion Date:</strong> ${this.formatDate(order.estimated_completion)}</p>
                `
                    : ''
                }
            </div>

            <p>Thank you for your patience and trust in Premium Gift Box.</p>

            <p>Best regards,<br>Premium Gift Box Team</p>
        </div>

        <div class="footer">
            <p>Premium Gift Box<br>
            Jl. Contoh No. 123, Jakarta, Indonesia<br>
            Phone: +62 21 1234 5678 | Email: info@premiumgiftbox.com</p>
        </div>
    </div>
</body>
</html>
    `;

    return await this.sendEmail(customer.email, subject, html);
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(customer, invoice, daysOverdue = 0) {
    const urgency = daysOverdue > 0 ? 'Overdue' : 'Upcoming';
    const subject = `Payment Reminder: Invoice ${invoice.invoice_number} ${daysOverdue > 0 ? '(Overdue)' : ''}`;

    const urgencyMessage =
      daysOverdue === 0
        ? 'Your invoice is due today.'
        : daysOverdue > 0
          ? `Your invoice is overdue by ${daysOverdue} days.`
          : `Your invoice will be due in ${Math.abs(daysOverdue)} days.`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${daysOverdue > 0 ? '#F44336' : '#FF9800'}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .reminder { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid ${daysOverdue > 0 ? '#F44336' : '#FF9800'}; }
        .payment-info { background-color: #e8f5e9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Reminder</h1>
        </div>

        <div class="content">
            <h2>Hi ${customer.name},</h2>

            <div class="reminder">
                <p style="color: ${daysOverdue > 0 ? '#F44336' : '#FF9800'}; font-weight: bold; font-size: 16px;">
                    ${urgencyMessage}
                </p>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Issue Date:</strong> ${this.formatDate(invoice.issue_date)}</p>
                <p><strong>Due Date:</strong> ${this.formatDate(invoice.due_date)}</p>
                <p><strong>Total Amount:</strong> ${this.formatCurrency(invoice.total_amount)}</p>
            </div>

            <div class="payment-info">
                <h3>Payment Information</h3>
                <p><strong>Bank:</strong> Bank Mandiri<br>
                <strong>Account Number:</strong> 1234567890<br>
                <strong>Account Name:</strong> Premium Gift Box</p>
                <p>Please include your invoice number (${invoice.invoice_number}) as the payment reference.</p>
            </div>

            <p>Please confirm with us after making the payment.</p>

            <p>If you have already made the payment, please disregard this reminder.</p>

            <p>Best regards,<br>Premium Gift Box Team</p>
        </div>

        <div class="footer">
            <p>Premium Gift Box<br>
            Jl. Contoh No. 123, Jakarta, Indonesia<br>
            Phone: +62 21 1234 5678 | Email: info@premiumgiftbox.com</p>
        </div>
    </div>
</body>
</html>
    `;

    return await this.sendEmail(customer.email, subject, html);
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, subject, html) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(recipient.email, subject, html);
        results.push({
          recipient: recipient.email,
          name: recipient.name,
          success: true,
          messageId: result.messageId,
        });

        // Rate limiting: wait 500ms between emails
        await this.sleep(500);
      } catch (error) {
        results.push({
          recipient: recipient.email,
          name: recipient.name,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total: recipients.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Format currency in Indonesian Rupiah
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Translate order status to Indonesian
   */
  translateStatus(status) {
    const translations = {
      pending: 'Menunggu',
      designing: 'Desain',
      approved: 'Disetujui',
      production: 'Produksi',
      quality_control: 'Quality Control',
      completed: 'Selesai',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan',
    };
    return translations[status] || status;
  }

  /**
   * Translate invoice status to Indonesian
   */
  translateInvoiceStatus(status) {
    const translations = {
      unpaid: 'Belum Dibayar',
      paid: 'Sudah Dibayar',
      overdue: 'Terlambat',
      cancelled: 'Dibatalkan',
    };
    return translations[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status) {
    const colors = {
      paid: '#4CAF50',
      unpaid: '#FF9800',
      overdue: '#F44336',
      cancelled: '#9E9E9E',
    };
    return colors[status] || '#000000';
  }

  /**
   * Strip HTML tags
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sleep helper for rate limiting
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = EmailService;
