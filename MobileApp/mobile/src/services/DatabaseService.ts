/**
 * Database Service - SQLite Local Storage Management
 *
 * Provides offline-first data storage with:
 * - SQLite database operations
 * - Data caching for offline access
 * - Sync queue management
 * - CRUD operations for all entities
 */

import * as SQLite from 'expo-sqlite';
import { Order } from '../types/Order';
import { Customer } from '../types/Customer';

const DB_NAME = 'cardose.db';
const DB_VERSION = 1;

export class DatabaseService {
  private static db: SQLite.WebSQLDatabase | null = null;
  private static isInitialized = false;

  /**
   * Initialize database and create tables
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.db = SQLite.openDatabase(DB_NAME);

      await this.createTables();
      await this.runMigrations();

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Create all database tables
   */
  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT,
        box_type TEXT,
        width REAL,
        height REAL,
        depth REAL,
        materials TEXT,
        colors TEXT,
        special_requests TEXT,
        design_files TEXT,
        material_cost REAL,
        labor_cost REAL,
        markup_percentage REAL,
        total_price REAL,
        currency TEXT DEFAULT 'IDR',
        estimated_completion TEXT,
        actual_completion TEXT,
        whatsapp_thread TEXT,
        last_contact TEXT,
        created_at TEXT,
        updated_at TEXT,
        is_synced INTEGER DEFAULT 0,
        sync_pending INTEGER DEFAULT 0
      )`,

      // Customers table
      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        whatsapp TEXT,
        phone TEXT,
        address TEXT,
        business_type TEXT NOT NULL,
        company_name TEXT,
        industry TEXT,
        tax_id TEXT,
        preferred_contact TEXT,
        loyalty_status TEXT DEFAULT 'new',
        referred_by TEXT,
        notes TEXT,
        tags TEXT,
        preferences TEXT,
        metrics TEXT,
        created_at TEXT,
        updated_at TEXT,
        created_by TEXT,
        updated_by TEXT,
        is_synced INTEGER DEFAULT 0
      )`,

      // Inventory materials table
      `CREATE TABLE IF NOT EXISTS inventory_materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        supplier TEXT,
        unit_cost REAL,
        current_stock REAL,
        reorder_level REAL,
        unit TEXT,
        last_restocked TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT,
        is_synced INTEGER DEFAULT 0
      )`,

      // Invoices table
      `CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL,
        order_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        subtotal REAL,
        discount REAL,
        ppn_rate REAL DEFAULT 11,
        ppn_amount REAL,
        total_amount REAL,
        status TEXT DEFAULT 'unpaid',
        issue_date TEXT,
        due_date TEXT,
        paid_date TEXT,
        payment_method TEXT,
        notes TEXT,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        is_synced INTEGER DEFAULT 0
      )`,

      // Production tasks table
      `CREATE TABLE IF NOT EXISTS production_tasks (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        due_date TEXT,
        completed_at TEXT,
        notes TEXT,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        is_synced INTEGER DEFAULT 0
      )`,

      // Communications table
      `CREATE TABLE IF NOT EXISTS communications (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        order_id TEXT,
        type TEXT NOT NULL,
        direction TEXT NOT NULL,
        subject TEXT,
        content TEXT NOT NULL,
        created_at TEXT,
        created_by TEXT,
        attachments TEXT
      )`,

      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT,
        created_at TEXT,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT
      )`,

      // Order status history
      `CREATE TABLE IF NOT EXISTS order_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        old_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT
      )`,

      // App metadata
      `CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )`,
    ];

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_customers_business_type ON customers(business_type)',
      'CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON customers(loyalty_status)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_order ON production_tasks(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON production_tasks(assigned_to)',
      'CREATE INDEX IF NOT EXISTS idx_communications_customer ON communications(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)',
    ];

    await this.executeBatch([...queries, ...indexes]);
  }

  /**
   * Execute multiple SQL queries in a transaction
   */
  private static async executeBatch(queries: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(
        tx => {
          queries.forEach(query => {
            tx.executeSql(query);
          });
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Execute a single SQL query
   */
  private static async executeQuery<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => {
            const rows: T[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i));
            }
            resolve(rows);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Run database migrations
   */
  private static async runMigrations(): Promise<void> {
    const currentVersion = await this.getMetadata('db_version');
    const version = currentVersion ? parseInt(currentVersion) : 0;

    if (version < DB_VERSION) {
      // Add migration logic here as needed
      await this.setMetadata('db_version', String(DB_VERSION));
    }
  }

  /**
   * Get metadata value
   */
  private static async getMetadata(key: string): Promise<string | null> {
    const results = await this.executeQuery<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ?',
      [key]
    );
    return results.length > 0 ? results[0].value : null;
  }

  /**
   * Set metadata value
   */
  private static async setMetadata(key: string, value: string): Promise<void> {
    await this.executeQuery(
      'INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, new Date().toISOString()]
    );
  }

  // ==================== ORDERS ====================

  /**
   * Get all orders with optional filters
   */
  static async getOrders(filters?: {
    status?: string;
    customer_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.customer_id) {
      sql += ' AND customer_id = ?';
      params.push(filters.customer_id);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);

      if (filters?.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const rows = await this.executeQuery<any>(sql, params);
    return rows.map(this.deserializeOrder);
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string): Promise<Order | null> {
    const rows = await this.executeQuery<any>(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    return rows.length > 0 ? this.deserializeOrder(rows[0]) : null;
  }

  /**
   * Create new order
   */
  static async createOrder(order: Order): Promise<void> {
    const sql = `
      INSERT INTO orders (
        id, order_number, customer_id, status, priority, box_type,
        width, height, depth, materials, colors, special_requests,
        design_files, material_cost, labor_cost, markup_percentage,
        total_price, currency, estimated_completion, actual_completion,
        whatsapp_thread, last_contact, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      order.id,
      order.order_number,
      order.customer_id,
      order.status,
      order.priority || null,
      order.box_type || null,
      order.dimensions?.width || null,
      order.dimensions?.height || null,
      order.dimensions?.depth || null,
      JSON.stringify(order.materials || []),
      JSON.stringify(order.colors || []),
      order.special_requests || null,
      JSON.stringify(order.design_files || []),
      order.pricing?.material_cost || null,
      order.pricing?.labor_cost || null,
      order.pricing?.markup_percentage || null,
      order.total_price,
      order.currency || 'IDR',
      order.estimated_completion,
      order.actual_completion || null,
      order.whatsapp_thread || null,
      order.last_contact || null,
      order.created_at,
      order.updated_at,
    ];

    await this.executeQuery(sql, params);
  }

  /**
   * Update existing order
   */
  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    const fieldMap: Record<string, (val: any) => any> = {
      order_number: (v: any) => v,
      customer_id: (v: any) => v,
      status: (v: any) => v,
      priority: (v: any) => v,
      box_type: (v: any) => v,
      width: (v: any) => v,
      height: (v: any) => v,
      depth: (v: any) => v,
      materials: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
      colors: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
      special_requests: (v: any) => v,
      design_files: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
      material_cost: (v: any) => v,
      labor_cost: (v: any) => v,
      markup_percentage: (v: any) => v,
      total_price: (v: any) => v,
      currency: (v: any) => v,
      estimated_completion: (v: any) => v,
      actual_completion: (v: any) => v,
      whatsapp_thread: (v: any) => v,
      last_contact: (v: any) => v,
      created_by: (v: any) => v,
      updated_by: (v: any) => v,
    };

    const fields: string[] = [];
    const params: any[] = [];

    for (const [col, transform] of Object.entries(fieldMap)) {
      if ((updates as any)[col] !== undefined) {
        fields.push(`${col} = ?`);
        params.push(transform((updates as any)[col]));
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(orderId);

    const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
    await this.executeQuery(sql, params);
  }

  /**
   * Delete order
   */
  static async deleteOrder(orderId: string): Promise<void> {
    await this.executeQuery('DELETE FROM orders WHERE id = ?', [orderId]);
  }

  /**
   * Cache multiple orders
   */
  static async cacheOrders(orders: Order[]): Promise<void> {
    for (const order of orders) {
      const existing = await this.getOrderById(order.id);
      if (existing) {
        await this.updateOrder(order.id, order);
      } else {
        await this.createOrder(order);
      }
    }
  }

  /**
   * Deserialize order from database row
   */
  private static deserializeOrder(row: any): Order {
    return {
      ...row,
      materials: row.materials ? JSON.parse(row.materials) : [],
      colors: row.colors ? JSON.parse(row.colors) : [],
      design_files: row.design_files ? JSON.parse(row.design_files) : [],
      dimensions: {
        width: row.width,
        height: row.height,
        depth: row.depth,
      },
      pricing: {
        material_cost: row.material_cost,
        labor_cost: row.labor_cost,
        markup_percentage: row.markup_percentage,
      },
    };
  }

  // ==================== CUSTOMERS ====================

  /**
   * Get all customers with optional filters
   */
  static async getCustomers(filters?: {
    business_type?: string;
    loyalty_status?: string;
  }): Promise<Customer[]> {
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (filters?.business_type) {
      sql += ' AND business_type = ?';
      params.push(filters.business_type);
    }

    if (filters?.loyalty_status) {
      sql += ' AND loyalty_status = ?';
      params.push(filters.loyalty_status);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await this.executeQuery<any>(sql, params);
    return rows.map(this.deserializeCustomer);
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    const rows = await this.executeQuery<any>(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    return rows.length > 0 ? this.deserializeCustomer(rows[0]) : null;
  }

  /**
   * Create new customer
   */
  static async createCustomer(customer: Customer): Promise<void> {
    const sql = `
      INSERT INTO customers (
        id, name, email, whatsapp, phone, address, business_type,
        company_name, industry, tax_id, preferred_contact, loyalty_status,
        referred_by, notes, tags, preferences, metrics,
        created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      customer.id,
      customer.name,
      customer.email || null,
      customer.whatsapp || null,
      customer.phone || null,
      JSON.stringify(customer.address || {}),
      customer.business_type,
      customer.company_name || null,
      customer.industry || null,
      customer.tax_id || null,
      customer.preferred_contact || null,
      customer.loyalty_status,
      customer.referred_by || null,
      customer.notes || null,
      JSON.stringify(customer.tags || []),
      JSON.stringify(customer.preferences || {}),
      JSON.stringify(customer.metrics || {}),
      customer.created_at,
      customer.updated_at,
      customer.created_by || null,
      customer.updated_by || null,
    ];

    await this.executeQuery(sql, params);
  }

  /**
   * Update existing customer
   */
  static async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
    const fieldMap: Record<string, (val: any) => any> = {
      name: (v: any) => v,
      email: (v: any) => v,
      whatsapp: (v: any) => v,
      phone: (v: any) => v,
      address: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
      business_type: (v: any) => v,
      company_name: (v: any) => v,
      industry: (v: any) => v,
      tax_id: (v: any) => v,
      preferred_contact: (v: any) => v,
      loyalty_status: (v: any) => v,
      referred_by: (v: any) => v,
      notes: (v: any) => v,
      tags: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
      preferences: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
      metrics: (v: any) => typeof v === 'string' ? v : JSON.stringify(v),
      created_by: (v: any) => v,
      updated_by: (v: any) => v,
    };

    const fields: string[] = [];
    const params: any[] = [];

    for (const [col, transform] of Object.entries(fieldMap)) {
      if ((updates as any)[col] !== undefined) {
        fields.push(`${col} = ?`);
        params.push(transform((updates as any)[col]));
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(customerId);

    const sql = `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`;
    await this.executeQuery(sql, params);
  }

  /**
   * Delete customer
   */
  static async deleteCustomer(customerId: string): Promise<void> {
    await this.executeQuery('DELETE FROM customers WHERE id = ?', [customerId]);
  }

  /**
   * Cache multiple customers
   */
  static async cacheCustomers(customers: Customer[]): Promise<void> {
    for (const customer of customers) {
      const existing = await this.getCustomerById(customer.id);
      if (existing) {
        await this.updateCustomer(customer.id, customer);
      } else {
        await this.createCustomer(customer);
      }
    }
  }

  /**
   * Deserialize customer from database row
   */
  private static deserializeCustomer(row: any): Customer {
    return {
      ...row,
      address: row.address ? JSON.parse(row.address) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      metrics: row.metrics ? JSON.parse(row.metrics) : {},
    };
  }

  /**
   * Get orders by customer
   */
  static async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await this.getOrders({ customer_id: customerId });
  }

  // ==================== COMMUNICATIONS ====================

  /**
   * Create communication log
   */
  static async createCommunication(communication: any): Promise<void> {
    const sql = `
      INSERT INTO communications (
        id, customer_id, order_id, type, direction,
        subject, content, created_at, created_by, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      communication.id,
      communication.customer_id,
      communication.order_id || null,
      communication.type,
      communication.direction,
      communication.subject || null,
      communication.content,
      communication.created_at,
      communication.created_by,
      JSON.stringify(communication.attachments || []),
    ];

    await this.executeQuery(sql, params);
  }

  /**
   * Get communications by customer
   */
  static async getCommunicationsByCustomer(customerId: string): Promise<any[]> {
    const rows = await this.executeQuery<any>(
      'SELECT * FROM communications WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
    );

    return rows.map(row => ({
      ...row,
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
    }));
  }

  // ==================== SYNC QUEUE ====================

  /**
   * Mark entity for sync
   */
  static async markForSync(
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    entityType: string = 'order',
    data?: any
  ): Promise<void> {
    const sql = `
      INSERT INTO sync_queue (
        entity_type, entity_id, operation, data, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      entityType,
      entityId,
      operation,
      data ? JSON.stringify(data) : null,
      new Date().toISOString(),
    ];

    await this.executeQuery(sql, params);
  }

  /**
   * Get pending sync items
   */
  static async getPendingSyncItems(entityType?: string): Promise<any[]> {
    let sql = 'SELECT * FROM sync_queue';
    const params: any[] = [];

    if (entityType) {
      sql += ' WHERE entity_type = ?';
      params.push(entityType);
    }

    sql += ' ORDER BY created_at ASC';

    const rows = await this.executeQuery<any>(sql, params);
    return rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null,
    }));
  }

  /**
   * Clear sync item after successful sync
   */
  static async clearSyncItem(syncId: number): Promise<void> {
    await this.executeQuery('DELETE FROM sync_queue WHERE id = ?', [syncId]);
  }

  /**
   * Log order status change
   */
  static async logOrderStatusChange(
    orderId: string,
    oldStatus: string,
    newStatus: string,
    notes?: string
  ): Promise<void> {
    const sql = `
      INSERT INTO order_status_history (
        order_id, old_status, new_status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `;

    await this.executeQuery(sql, [
      orderId,
      oldStatus,
      newStatus,
      notes || null,
      new Date().toISOString(),
    ]);
  }

  /**
   * Clear all data (for testing/reset)
   */
  static async clearAllData(): Promise<void> {
    const tables = [
      'orders',
      'customers',
      'inventory_materials',
      'invoices',
      'production_tasks',
      'communications',
      'sync_queue',
      'order_status_history',
    ];

    for (const table of tables) {
      await this.executeQuery(`DELETE FROM ${table}`);
    }
  }

  /**
   * Get database statistics
   */
  static async getStats(): Promise<{
    orders: number;
    customers: number;
    pendingSync: number;
  }> {
    const ordersCount = await this.executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM orders'
    );
    const customersCount = await this.executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM customers'
    );
    const syncCount = await this.executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue'
    );

    return {
      orders: ordersCount[0]?.count || 0,
      customers: customersCount[0]?.count || 0,
      pendingSync: syncCount[0]?.count || 0,
    };
  }

  // ==================== FINANCIAL/TRANSACTIONS ====================

  /**
   * Cache multiple transactions
   */
  static async cacheTransactions(transactions: any[]): Promise<void> {
    // Implementation would store financial transactions
    // For now, just log
    console.log(`Caching ${transactions.length} transactions`);
  }

  /**
   * Get transactions with filters
   */
  static async getTransactions(filters?: any): Promise<any[]> {
    // Would query transactions table
    // For now, return empty array
    return [];
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(transactionId: string): Promise<any | null> {
    // Would query transactions table
    return null;
  }

  /**
   * Create transaction
   */
  static async createTransaction(transaction: any): Promise<void> {
    // Would insert into transactions table
    console.log('Creating transaction:', transaction.id);
  }

  /**
   * Update transaction
   */
  static async updateTransaction(transactionId: string, updates: any): Promise<void> {
    // Would update transactions table
    console.log('Updating transaction:', transactionId);
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(transactionId: string): Promise<void> {
    // Would delete from transactions table
    console.log('Deleting transaction:', transactionId);
  }

  // ==================== INVOICES ====================

  /**
   * Get all invoices
   */
  static async getInvoices(): Promise<any[]> {
    const rows = await this.executeQuery<any>('SELECT * FROM invoices ORDER BY created_at DESC');
    return rows;
  }

  /**
   * Get invoice by ID
   */
  static async getInvoiceById(invoiceId: string): Promise<any | null> {
    const rows = await this.executeQuery<any>('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Create invoice
   */
  static async createInvoice(invoice: any): Promise<void> {
    const sql = `
      INSERT INTO invoices (
        id, invoice_number, order_id, customer_id, subtotal, discount,
        ppn_rate, ppn_amount, total_amount, status, issue_date, due_date,
        paid_date, payment_method, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      invoice.id,
      invoice.invoice_number,
      invoice.order_id,
      invoice.customer_id,
      invoice.subtotal,
      invoice.discount || 0,
      invoice.ppn_rate || 11,
      invoice.ppn_amount,
      invoice.total_amount,
      invoice.status || 'unpaid',
      invoice.issue_date,
      invoice.due_date,
      invoice.paid_date || null,
      invoice.payment_method || null,
      invoice.notes || null,
      invoice.created_by,
      invoice.created_at,
      invoice.updated_at,
    ];

    await this.executeQuery(sql, params);
  }

  /**
   * Update invoice
   */
  static async updateInvoice(invoiceId: string, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.paid_date !== undefined) {
      fields.push('paid_date = ?');
      params.push(updates.paid_date);
    }

    if (updates.payment_method !== undefined) {
      fields.push('payment_method = ?');
      params.push(updates.payment_method);
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(invoiceId);

    const sql = `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`;
    await this.executeQuery(sql, params);
  }

  // ==================== PRICING CALCULATIONS ====================

  /**
   * Save pricing calculation
   */
  static async savePricingCalculation(calculation: any): Promise<void> {
    // Would store pricing calculation for reference
    console.log('Saving pricing calculation:', calculation.id);
  }

  // ==================== MATERIALS ====================

  /**
   * Get material by ID
   */
  static async getMaterialById(materialId: string): Promise<any | null> {
    const rows = await this.executeQuery<any>(
      'SELECT * FROM inventory_materials WHERE id = ?',
      [materialId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get all materials
   */
  static async getMaterials(): Promise<any[]> {
    const rows = await this.executeQuery<any>('SELECT * FROM inventory_materials');
    return rows;
  }

  // ==================== PRODUCTION TASKS ====================

  /**
   * Get task by ID
   */
  static async getTaskById(taskId: string): Promise<any | null> {
    const rows = await this.executeQuery<any>(
      'SELECT * FROM production_tasks WHERE id = ?',
      [taskId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get all production tasks
   */
  static async getTasks(filters?: any): Promise<any[]> {
    let sql = 'SELECT * FROM production_tasks WHERE 1=1';
    const params: any[] = [];

    if (filters?.order_id) {
      sql += ' AND order_id = ?';
      params.push(filters.order_id);
    }

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC';

    return await this.executeQuery<any>(sql, params);
  }
}

export default DatabaseService;
