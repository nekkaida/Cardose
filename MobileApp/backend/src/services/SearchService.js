// Global search service
class SearchService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Global search across all entities
   */
  async globalSearch(query, options = {}) {
    try {
      const limit = parseInt(options.limit || 20);
      const entityTypes = options.entityTypes || ['customers', 'orders', 'invoices', 'materials'];

      const results = {
        query,
        total: 0,
        results: {},
      };

      const searchPromises = [];

      if (entityTypes.includes('customers')) {
        searchPromises.push(
          this.searchCustomers(query, limit).then((r) => (results.results.customers = r))
        );
      }

      if (entityTypes.includes('orders')) {
        searchPromises.push(
          this.searchOrders(query, limit).then((r) => (results.results.orders = r))
        );
      }

      if (entityTypes.includes('invoices')) {
        searchPromises.push(
          this.searchInvoices(query, limit).then((r) => (results.results.invoices = r))
        );
      }

      if (entityTypes.includes('materials')) {
        searchPromises.push(
          this.searchMaterials(query, limit).then((r) => (results.results.materials = r))
        );
      }

      await Promise.all(searchPromises);

      results.total = Object.values(results.results).reduce((sum, items) => sum + items.length, 0);

      return {
        success: true,
        ...results,
      };
    } catch (error) {
      throw new Error(`Global search failed: ${error.message}`);
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(query, limit = 20) {
    const searchPattern = `%${query}%`;

    return await this.db.all(
      `
      SELECT id, name, email, phone, business_type
      FROM customers
      WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR business_type LIKE ?
      ORDER BY name ASC LIMIT ?
    `,
      [searchPattern, searchPattern, searchPattern, searchPattern, limit]
    );
  }

  /**
   * Search orders
   */
  async searchOrders(query, limit = 20) {
    const searchPattern = `%${query}%`;

    return await this.db.all(
      `
      SELECT o.id, o.order_number, o.status, o.box_type, o.final_price, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.order_number LIKE ? OR c.name LIKE ?
      ORDER BY o.created_at DESC LIMIT ?
    `,
      [searchPattern, searchPattern, limit]
    );
  }

  /**
   * Search invoices
   */
  async searchInvoices(query, limit = 20) {
    const searchPattern = `%${query}%`;

    return await this.db.all(
      `
      SELECT i.id, i.invoice_number, i.status, i.total_amount, i.issue_date, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.invoice_number LIKE ? OR c.name LIKE ?
      ORDER BY i.issue_date DESC LIMIT ?
    `,
      [searchPattern, searchPattern, limit]
    );
  }

  /**
   * Search materials
   */
  async searchMaterials(query, limit = 20) {
    const searchPattern = `%${query}%`;

    return await this.db.all(
      `
      SELECT id, name, category, current_stock, unit, unit_cost
      FROM inventory_materials
      WHERE name LIKE ? OR category LIKE ?
      ORDER BY name ASC LIMIT ?
    `,
      [searchPattern, searchPattern, limit]
    );
  }

  /**
   * Advanced order search
   */
  async advancedOrderSearch(filters) {
    let query = `SELECT o.*, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE 1=1`;
    const params = [];

    if (filters.status) {
      query += ' AND o.status = ?';
      params.push(filters.status);
    }

    if (filters.boxType) {
      query += ' AND o.box_type = ?';
      params.push(filters.boxType);
    }

    if (filters.startDate) {
      query += ' AND DATE(o.created_at) >= DATE(?)';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND DATE(o.created_at) <= DATE(?)';
      params.push(filters.endDate);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ?';
    params.push(parseInt(filters.limit || 50));

    const results = await this.db.all(query, params);

    return { success: true, results };
  }
}

module.exports = SearchService;
