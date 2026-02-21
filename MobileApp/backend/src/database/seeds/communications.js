// Seed: Communications - Message Templates (20), Communication Messages (50),
//        Notifications (60), Settings (30), Webhooks (10), Audit Logs (100), Backups (20)
const { v4: uuidv4 } = require('uuid');

module.exports = async function seedCommunications(
  db,
  { log, helpers, users, customers, ownerId }
) {
  const { randomInt, pickRandom, formatDateTime, formatDate, randomDate } = helpers;

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

  // ==================== MESSAGE TEMPLATES ====================
  log('Seeding message templates (20 templates - all types)...');
  const templates = [
    // WhatsApp templates
    {
      name: 'Order Confirmation WA',
      type: 'whatsapp',
      subject: null,
      content:
        'Hi {{customer_name}}, pesanan Anda #{{order_number}} sudah kami terima. Total: Rp {{total_amount}}. Estimasi selesai: {{due_date}}',
      variables: 'customer_name,order_number,total_amount,due_date',
      is_active: 1,
    },
    {
      name: 'Payment Reminder WA',
      type: 'whatsapp',
      subject: null,
      content:
        'Hi {{customer_name}}, pengingat pembayaran invoice #{{invoice_number}} sebesar Rp {{total_amount}}. Jatuh tempo: {{due_date}}',
      variables: 'customer_name,invoice_number,total_amount,due_date',
      is_active: 1,
    },
    {
      name: 'Order Ready WA',
      type: 'whatsapp',
      subject: null,
      content:
        'Hi {{customer_name}}, pesanan #{{order_number}} sudah siap! Silakan hubungi kami untuk pengambilan/pengiriman.',
      variables: 'customer_name,order_number',
      is_active: 1,
    },
    {
      name: 'Production Update WA',
      type: 'whatsapp',
      subject: null,
      content:
        'Hi {{customer_name}}, update pesanan #{{order_number}}: Status saat ini {{status}}. {{message}}',
      variables: 'customer_name,order_number,status,message',
      is_active: 1,
    },
    {
      name: 'Thank You WA',
      type: 'whatsapp',
      subject: null,
      content:
        'Terima kasih {{customer_name}} atas pesanan Anda! Kami senang bisa melayani Anda. - Premium Gift Box',
      variables: 'customer_name',
      is_active: 1,
    },
    {
      name: 'Promotion WA',
      type: 'whatsapp',
      subject: null,
      content:
        'Hi {{customer_name}}! Promo spesial {{promo_title}}: Diskon {{discount}}% untuk semua produk. Berlaku hingga {{valid_until}}',
      variables: 'customer_name,promo_title,discount,valid_until',
      is_active: 1,
    },
    {
      name: 'Delivery WA',
      type: 'whatsapp',
      subject: null,
      content:
        'Pesanan #{{order_number}} sedang dalam perjalanan! Estimasi tiba: {{delivery_date}}. Kurir: {{courier_name}}',
      variables: 'order_number,delivery_date,courier_name',
      is_active: 1,
    },

    // Email templates
    {
      name: 'Order Confirmation Email',
      type: 'email',
      subject: 'Konfirmasi Pesanan #{{order_number}}',
      content:
        'Dear {{customer_name}},\n\nTerima kasih atas pesanan Anda.\n\nDetail Pesanan:\n- Nomor: {{order_number}}\n- Total: Rp {{total_amount}}\n- Estimasi Selesai: {{due_date}}\n\nKami akan menghubungi Anda untuk konfirmasi desain.\n\nSalam,\nPremium Gift Box',
      variables: 'customer_name,order_number,total_amount,due_date',
      is_active: 1,
    },
    {
      name: 'Invoice Email',
      type: 'email',
      subject: 'Invoice #{{invoice_number}} - Premium Gift Box',
      content:
        'Dear {{customer_name}},\n\nBerikut invoice untuk pesanan Anda:\n\nInvoice: #{{invoice_number}}\nTotal: Rp {{total_amount}}\nJatuh Tempo: {{due_date}}\n\nPembayaran dapat dilakukan ke:\nBank Mandiri\n1234567890\na.n. PT Premium Gift Box\n\nTerima kasih.',
      variables: 'customer_name,invoice_number,total_amount,due_date',
      is_active: 1,
    },
    {
      name: 'Payment Reminder Email',
      type: 'email',
      subject: 'Pengingat Pembayaran Invoice #{{invoice_number}}',
      content:
        'Dear {{customer_name}},\n\nIni adalah pengingat untuk pembayaran invoice #{{invoice_number}} sebesar Rp {{total_amount}} yang jatuh tempo pada {{due_date}}.\n\nMohon abaikan jika sudah melakukan pembayaran.\n\nTerima kasih.',
      variables: 'customer_name,invoice_number,total_amount,due_date',
      is_active: 1,
    },
    {
      name: 'Thank You Email',
      type: 'email',
      subject: 'Terima Kasih - Premium Gift Box',
      content:
        'Dear {{customer_name}},\n\nTerima kasih telah mempercayakan pesanan Anda kepada kami.\n\nKami berharap produk kami memenuhi harapan Anda. Jangan ragu untuk menghubungi kami jika ada pertanyaan.\n\nSalam hangat,\nTim Premium Gift Box',
      variables: 'customer_name',
      is_active: 1,
    },
    {
      name: 'Feedback Request Email',
      type: 'email',
      subject: 'Bagaimana Pengalaman Anda? - Pesanan #{{order_number}}',
      content:
        'Dear {{customer_name}},\n\nKami ingin mendengar pendapat Anda tentang pesanan #{{order_number}}.\n\nFeedback Anda sangat berarti untuk peningkatan layanan kami.\n\nTerima kasih!',
      variables: 'customer_name,order_number',
      is_active: 1,
    },

    // SMS templates
    {
      name: 'Order Status SMS',
      type: 'sms',
      subject: null,
      content: 'PGB: Pesanan #{{order_number}} status: {{status}}. Info: {{phone}}',
      variables: 'order_number,status,phone',
      is_active: 1,
    },
    {
      name: 'Payment Received SMS',
      type: 'sms',
      subject: null,
      content: 'PGB: Pembayaran Rp {{amount}} untuk INV#{{invoice_number}} diterima. Terima kasih!',
      variables: 'amount,invoice_number',
      is_active: 1,
    },
    {
      name: 'Delivery SMS',
      type: 'sms',
      subject: null,
      content: 'PGB: Pesanan #{{order_number}} dlm pengiriman. Est: {{delivery_date}}',
      variables: 'order_number,delivery_date',
      is_active: 1,
    },

    // Inactive templates (for testing filter)
    {
      name: 'Old Promo Template',
      type: 'email',
      subject: 'Promo Lama',
      content: 'Template promo yang sudah tidak digunakan',
      variables: '',
      is_active: 0,
    },
    {
      name: 'Deprecated WA Template',
      type: 'whatsapp',
      subject: null,
      content: 'Template lama',
      variables: '',
      is_active: 0,
    },
    {
      name: 'Test Template',
      type: 'email',
      subject: 'Test',
      content: 'Template untuk testing saja',
      variables: 'test_var',
      is_active: 0,
    },
    {
      name: 'Empty Variables Template',
      type: 'whatsapp',
      subject: null,
      content: 'Template tanpa variabel',
      variables: '',
      is_active: 1,
    },
  ];

  const insertTemplate = db.prepare(
    `INSERT INTO message_templates (id, name, type, subject, content, variables, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  templates.forEach((t) => {
    insertTemplate.run(
      uuidv4(),
      t.name,
      t.type,
      t.subject,
      t.content,
      t.variables,
      t.is_active,
      ownerId
    );
  });
  log(`   Created ${templates.length} message templates`);

  // ==================== SETTINGS ====================
  log('Seeding settings (30 settings - all categories)...');
  const settings = [
    // General
    {
      key: 'company_name',
      value: 'Premium Gift Box',
      type: 'string',
      category: 'general',
      description: 'Company name',
    },
    {
      key: 'company_address',
      value: 'Jl. Kemang Raya No. 45, Jakarta Selatan 12730',
      type: 'string',
      category: 'general',
      description: 'Company address',
    },
    {
      key: 'company_phone',
      value: '+62-21-7891234',
      type: 'string',
      category: 'general',
      description: 'Company phone',
    },
    {
      key: 'company_email',
      value: 'info@premiumgiftbox.com',
      type: 'string',
      category: 'general',
      description: 'Company email',
    },
    {
      key: 'company_website',
      value: 'www.premiumgiftbox.com',
      type: 'string',
      category: 'general',
      description: 'Company website',
    },
    {
      key: 'order_prefix',
      value: 'ORD',
      type: 'string',
      category: 'general',
      description: 'Order number prefix',
    },

    // Financial
    {
      key: 'currency',
      value: 'IDR',
      type: 'string',
      category: 'financial',
      description: 'Default currency',
    },
    {
      key: 'tax_rate',
      value: '11',
      type: 'number',
      category: 'financial',
      description: 'PPN rate percentage',
    },
    {
      key: 'default_markup',
      value: '50',
      type: 'number',
      category: 'financial',
      description: 'Default markup percentage',
    },
    {
      key: 'default_due_days',
      value: '14',
      type: 'number',
      category: 'financial',
      description: 'Default invoice due days',
    },
    {
      key: 'bank_name',
      value: 'Bank Mandiri',
      type: 'string',
      category: 'financial',
      description: 'Bank name',
    },
    {
      key: 'bank_account',
      value: '1234567890',
      type: 'string',
      category: 'financial',
      description: 'Bank account number',
    },
    {
      key: 'bank_holder',
      value: 'PT Premium Gift Box',
      type: 'string',
      category: 'financial',
      description: 'Bank account holder',
    },
    {
      key: 'invoice_prefix',
      value: 'INV',
      type: 'string',
      category: 'financial',
      description: 'Invoice number prefix',
    },

    // Inventory
    {
      key: 'low_stock_threshold',
      value: '10',
      type: 'number',
      category: 'inventory',
      description: 'Low stock warning threshold',
    },
    {
      key: 'auto_reorder',
      value: 'false',
      type: 'boolean',
      category: 'inventory',
      description: 'Enable auto reorder',
    },
    {
      key: 'stock_alert_email',
      value: 'inventory@premiumgiftbox.com',
      type: 'string',
      category: 'inventory',
      description: 'Stock alert email',
    },

    // Notifications
    {
      key: 'email_notifications',
      value: 'true',
      type: 'boolean',
      category: 'notifications',
      description: 'Enable email notifications',
    },
    {
      key: 'whatsapp_notifications',
      value: 'true',
      type: 'boolean',
      category: 'notifications',
      description: 'Enable WhatsApp notifications',
    },
    {
      key: 'sms_notifications',
      value: 'false',
      type: 'boolean',
      category: 'notifications',
      description: 'Enable SMS notifications',
    },
    {
      key: 'notification_email',
      value: 'notifications@premiumgiftbox.com',
      type: 'string',
      category: 'notifications',
      description: 'Notification email address',
    },

    // System
    {
      key: 'auto_backup',
      value: 'true',
      type: 'boolean',
      category: 'system',
      description: 'Enable auto backup',
    },
    {
      key: 'backup_frequency',
      value: '24',
      type: 'number',
      category: 'system',
      description: 'Backup frequency in hours',
    },
    {
      key: 'timezone',
      value: 'Asia/Jakarta',
      type: 'string',
      category: 'system',
      description: 'System timezone',
    },
    {
      key: 'language',
      value: 'id',
      type: 'string',
      category: 'system',
      description: 'Default language',
    },
    {
      key: 'date_format',
      value: 'DD/MM/YYYY',
      type: 'string',
      category: 'system',
      description: 'Date format',
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      type: 'boolean',
      category: 'system',
      description: 'Maintenance mode',
    },

    // Production
    {
      key: 'default_production_days',
      value: '7',
      type: 'number',
      category: 'production',
      description: 'Default production time in days',
    },
    {
      key: 'working_hours_start',
      value: '08:00',
      type: 'string',
      category: 'production',
      description: 'Working hours start',
    },
    {
      key: 'working_hours_end',
      value: '17:00',
      type: 'string',
      category: 'production',
      description: 'Working hours end',
    },
  ];

  const insertSetting = db.prepare(
    `INSERT INTO settings (id, key, value, type, category, description, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  settings.forEach((s) =>
    insertSetting.run(uuidv4(), s.key, s.value, s.type, s.category, s.description, ownerId)
  );
  log(`   Created ${settings.length} settings`);

  // ==================== NOTIFICATIONS ====================
  log('Seeding notifications (60 notifications - read and unread)...');
  const notifTypes = ['order', 'invoice', 'inventory', 'system', 'task', 'payment', 'reminder'];
  const notifications = [];

  for (let i = 0; i < 60; i++) {
    const type = pickRandom(notifTypes);
    const userId = pickRandom(users.filter((u) => u.is_active)).id;
    const isRead = Math.random() > 0.4 ? 1 : 0; // 60% read, 40% unread

    notifications.push({
      id: uuidv4(),
      user_id: userId,
      type: type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification ${i + 1}`,
      message: `This is a ${type} notification message for testing. Created at ${new Date().toISOString()}`,
      data: JSON.stringify({ ref_id: uuidv4(), extra: `data_${i}` }),
      is_read: isRead,
    });
  }

  const insertNotif = db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, data, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  notifications.forEach((n) =>
    insertNotif.run(n.id, n.user_id, n.type, n.title, n.message, n.data, n.is_read)
  );
  log(`   Created ${notifications.length} notifications`);

  // ==================== AUDIT LOGS ====================
  log('Seeding audit logs (100 logs - all action types)...');
  const auditActions = [
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'view',
    'export',
    'import',
    'approve',
    'reject',
  ];
  const auditEntityTypes = [
    'order',
    'customer',
    'invoice',
    'user',
    'material',
    'task',
    'budget',
    'template',
    'webhook',
    'setting',
  ];
  const auditLogs = [];

  for (let i = 0; i < 100; i++) {
    const action = pickRandom(auditActions);
    const entityType = pickRandom(auditEntityTypes);
    const createdAt = randomDate(oneYearAgo, now);

    auditLogs.push({
      id: uuidv4(),
      user_id: pickRandom(users).id,
      action: action,
      entity_type: entityType,
      entity_id: uuidv4(),
      old_values: ['update', 'delete'].includes(action)
        ? JSON.stringify({ status: 'old_value', modified: true })
        : null,
      new_values: ['create', 'update'].includes(action)
        ? JSON.stringify({ status: 'new_value', modified: true })
        : null,
      ip_address: `192.168.1.${randomInt(1, 255)}`,
      created_at: formatDateTime(createdAt),
    });
  }

  const insertAudit = db.prepare(
    `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  auditLogs.forEach((a) =>
    insertAudit.run(
      a.id,
      a.user_id,
      a.action,
      a.entity_type,
      a.entity_id,
      a.old_values,
      a.new_values,
      a.ip_address
    )
  );
  log(`   Created ${auditLogs.length} audit logs`);

  // ==================== WEBHOOKS ====================
  log('Seeding webhooks (10 webhooks - active and inactive)...');
  const webhooks = [
    {
      name: 'Slack Order Notifications',
      url: 'https://hooks.example.com/slack/orders',
      events: 'order.created,order.updated,order.completed',
      is_active: 1,
    },
    {
      name: 'CRM Integration',
      url: 'https://crm.example.com/webhook/orders',
      events: 'order.created,customer.created',
      is_active: 1,
    },
    {
      name: 'Inventory Alert System',
      url: 'https://inventory.example.com/alerts',
      events: 'inventory.low,inventory.out_of_stock',
      is_active: 1,
    },
    {
      name: 'Payment Gateway Callback',
      url: 'https://payment.example.com/callback',
      events: 'payment.received,invoice.paid',
      is_active: 1,
    },
    {
      name: 'Analytics Tracker',
      url: 'https://analytics.example.com/events',
      events: 'order.completed,invoice.paid',
      is_active: 1,
    },
    {
      name: 'Email Service',
      url: 'https://email.example.com/trigger',
      events: 'order.created,invoice.created,invoice.overdue',
      is_active: 1,
    },
    {
      name: 'Production Monitor',
      url: 'https://monitor.example.com/production',
      events: 'task.completed,order.production',
      is_active: 1,
    },
    // Inactive webhooks
    {
      name: 'Old Integration',
      url: 'https://old.example.com/webhook',
      events: 'order.created',
      is_active: 0,
    },
    {
      name: 'Deprecated Service',
      url: 'https://deprecated.example.com/api',
      events: 'all',
      is_active: 0,
    },
    {
      name: 'Test Webhook',
      url: 'https://test.example.com/hook',
      events: 'test.event',
      is_active: 0,
    },
  ];

  const insertWebhook = db.prepare(
    `INSERT INTO webhooks (id, name, url, events, secret, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  webhooks.forEach((w) => {
    insertWebhook.run(
      uuidv4(),
      w.name,
      w.url,
      w.events,
      'whsec_' + uuidv4().replace(/-/g, ''),
      w.is_active,
      ownerId
    );
  });
  log(`   Created ${webhooks.length} webhooks`);

  // ==================== COMMUNICATION MESSAGES ====================
  log('Seeding communication messages (50 messages)...');
  const msgTypes = ['email', 'whatsapp', 'sms'];
  const msgStatuses = ['pending', 'sent', 'delivered', 'failed', 'read'];
  const msgDirections = ['inbound', 'outbound'];
  const commMessages = [];

  for (let i = 0; i < 50; i++) {
    const customer = pickRandom(customers);
    const type = pickRandom(msgTypes);
    const status = pickRandom(msgStatuses);
    const direction = pickRandom(msgDirections);
    const sentDate = randomDate(sixMonthsAgo, now);

    commMessages.push({
      id: uuidv4(),
      customer_id: customer.id,
      type: type,
      direction: direction,
      subject:
        type === 'email'
          ? `Subject ${i + 1}: ${pickRandom(['Order Update', 'Invoice', 'Inquiry', 'Feedback', 'Promotion'])}`
          : null,
      content: `Message content ${i + 1} - ${direction === 'inbound' ? 'From' : 'To'} ${customer.name}. This is a ${type} message.`,
      status: status,
      sent_at: status !== 'pending' ? formatDateTime(sentDate) : null,
      created_by: pickRandom(users.filter((u) => u.is_active)).id,
    });
  }

  const insertMsg = db.prepare(
    `INSERT INTO communication_messages (id, customer_id, type, direction, subject, content, status, sent_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  commMessages.forEach((m) =>
    insertMsg.run(
      m.id,
      m.customer_id,
      m.type,
      m.direction,
      m.subject,
      m.content,
      m.status,
      m.sent_at,
      m.created_by
    )
  );
  log(`   Created ${commMessages.length} communication messages`);

  // ==================== BACKUPS ====================
  log('Seeding backups (20 backups - all statuses)...');
  const backupStatuses = ['pending', 'in_progress', 'completed', 'failed'];
  const backupTypes = ['manual', 'automatic'];
  const backups = [];

  for (let i = 0; i < 20; i++) {
    const status = pickRandom(backupStatuses);
    const createdDate = randomDate(sixMonthsAgo, now);

    backups.push({
      id: uuidv4(),
      filename: `backup_${formatDate(createdDate)}_${String(i + 1).padStart(3, '0')}.db`,
      size: status === 'completed' ? randomInt(1000000, 100000000) : null,
      type: pickRandom(backupTypes),
      status: status,
      created_by: ownerId,
    });
  }

  const insertBackup = db.prepare(
    `INSERT INTO backups (id, filename, size, type, status, created_by) VALUES (?, ?, ?, ?, ?, ?)`
  );
  backups.forEach((b) =>
    insertBackup.run(b.id, b.filename, b.size, b.type, b.status, b.created_by)
  );
  log(`   Created ${backups.length} backups`);

  return {
    templates,
    settings,
    notifications,
    auditLogs,
    webhooks,
    commMessages,
    backups,
  };
};
