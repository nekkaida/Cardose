// WhatsApp Business API Service
const https = require('https');

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  }

  /**
   * Send text message
   */
  async sendTextMessage(to, message) {
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };

    return this.sendMessage(data);
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(to, templateName, languageCode = 'id', parameters = []) {
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components:
          parameters.length > 0
            ? [
                {
                  type: 'body',
                  parameters: parameters.map((param) => ({
                    type: 'text',
                    text: param,
                  })),
                },
              ]
            : [],
      },
    };

    return this.sendMessage(data);
  }

  /**
   * Send order notification
   */
  async sendOrderNotification(customer, order) {
    const message = `
Halo ${customer.name},

Terima kasih atas pesanan Anda!

*Detail Pesanan:*
Nomor Order: ${order.order_number}
Status: ${this.translateStatus(order.status)}
Total: ${this.formatCurrency(order.final_price)}

Kami akan segera memproses pesanan Anda. Tim kami akan menghubungi Anda untuk konfirmasi desain.

Terima kasih,
Premium Gift Box
    `.trim();

    return this.sendTextMessage(customer.phone, message);
  }

  /**
   * Send invoice notification
   */
  async sendInvoiceNotification(customer, invoice) {
    const message = `
Halo ${customer.name},

Invoice Anda sudah siap!

*Detail Invoice:*
Nomor Invoice: ${invoice.invoice_number}
Tanggal: ${this.formatDate(invoice.issue_date)}
Jatuh Tempo: ${this.formatDate(invoice.due_date)}
Total: ${this.formatCurrency(invoice.total_amount)}
Status: ${this.translateInvoiceStatus(invoice.status)}

${
  invoice.status === 'unpaid'
    ? '\n*Informasi Pembayaran:*\nBank: Bank Mandiri\nNo. Rekening: 1234567890\nAtas Nama: Premium Gift Box\n'
    : '\nTerima kasih atas pembayarannya!'
}

Premium Gift Box
    `.trim();

    return this.sendTextMessage(customer.phone, message);
  }

  /**
   * Send production update
   */
  async sendProductionUpdate(customer, order, stage) {
    const stageMessages = {
      designing: 'Desain sedang dibuat oleh tim kreatif kami',
      approved: 'Desain telah disetujui, siap produksi',
      production: 'Pesanan Anda sedang dalam proses produksi',
      quality_control: 'Pesanan sedang dalam pengecekan kualitas',
      completed: 'Pesanan Anda telah selesai dan siap untuk diambil/dikirim',
    };

    const message = `
Halo ${customer.name},

*Update Pesanan #${order.order_number}*

Status: ${this.translateStatus(stage)}
${stageMessages[stage] || 'Pesanan sedang diproses'}

${
  stage === 'completed' && order.estimated_completion
    ? `\nEstimasi Penyelesaian: ${this.formatDate(order.estimated_completion)}`
    : ''
}

Terima kasih atas kepercayaan Anda.

Premium Gift Box
    `.trim();

    return this.sendTextMessage(customer.phone, message);
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(customer, invoice, daysOverdue = 0) {
    const urgencyMessage =
      daysOverdue === 0
        ? 'Invoice Anda jatuh tempo hari ini.'
        : daysOverdue > 0
          ? `Invoice Anda telah jatuh tempo ${daysOverdue} hari yang lalu.`
          : `Invoice Anda akan jatuh tempo dalam ${Math.abs(daysOverdue)} hari.`;

    const message = `
Halo ${customer.name},

*Pengingat Pembayaran*

${urgencyMessage}

*Detail Invoice:*
Nomor: ${invoice.invoice_number}
Total: ${this.formatCurrency(invoice.total_amount)}
Jatuh Tempo: ${this.formatDate(invoice.due_date)}

*Informasi Pembayaran:*
Bank: Bank Mandiri
No. Rekening: 1234567890
Atas Nama: Premium Gift Box

Silakan konfirmasi setelah melakukan pembayaran.

Terima kasih,
Premium Gift Box
    `.trim();

    return this.sendTextMessage(customer.phone, message);
  }

  /**
   * Send promotional message
   */
  async sendPromotionalMessage(customer, promotion) {
    const message = `
Halo ${customer.name}! 🎁

*${promotion.title}*

${promotion.description}

${promotion.discount ? `Diskon: ${promotion.discount}%` : ''}
${promotion.validUntil ? `Berlaku hingga: ${this.formatDate(promotion.validUntil)}` : ''}

Hubungi kami untuk informasi lebih lanjut!

Premium Gift Box
    `.trim();

    return this.sendTextMessage(customer.phone, message);
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(recipients, message) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendTextMessage(recipient.phone, message);
        results.push({
          recipient: recipient.phone,
          name: recipient.name,
          success: true,
          messageId: result.messages?.[0]?.id,
        });

        // Rate limiting: wait 1 second between messages
        await this.sleep(1000);
      } catch (error) {
        results.push({
          recipient: recipient.phone,
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
   * Send message (internal helper)
   */
  async sendMessage(data) {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp API credentials not configured');
    }

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);

      const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v18.0/${this.phoneNumberId}/messages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          Authorization: `Bearer ${this.accessToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsedData);
            } else {
              reject(new Error(parsedData.error?.message || 'WhatsApp API request failed'));
            }
          } catch (error) {
            reject(new Error('Failed to parse WhatsApp API response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 62 (Indonesia country code)
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }

    // If doesn't start with country code, add 62
    if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }

    return cleaned;
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
   * Sleep helper for rate limiting
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(signature, body) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET || '')
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(webhookData) {
    // Extract message data from webhook
    const entry = webhookData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return { processed: false, reason: 'No messages in webhook' };
    }

    const message = messages[0];
    const from = message.from;
    const messageText = message.text?.body;
    const messageType = message.type;

    return {
      processed: true,
      from,
      messageText,
      messageType,
      timestamp: message.timestamp,
    };
  }
}

module.exports = WhatsAppService;
