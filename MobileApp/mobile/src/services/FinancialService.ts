import { ApiService } from './ApiService';
import { DatabaseService } from './DatabaseService';
import { 
  FinancialTransaction, 
  CreateTransactionData, 
  UpdateTransactionData,
  FinancialSummary,
  RevenueAnalytics,
  PricingCalculation,
  Invoice,
  InvoiceItem,
  Budget,
  FinancialFilters,
  TransactionType,
  TransactionCategory
} from '../types/Financial';

export class FinancialService {
  private static readonly API_ENDPOINT = '/financial';

  /**
   * Get financial summary for a period
   */
  static async getFinancialSummary(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<FinancialSummary> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/summary`, { params: { period } });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, calculating from local data');
    }

    // Fallback to local calculation
    return await this.calculateFinancialSummaryLocally(period);
  }

  /**
   * Get all transactions with optional filtering
   */
  static async getAllTransactions(filters?: FinancialFilters): Promise<FinancialTransaction[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/transactions`, { params: filters });
      
      if (response.success) {
        // Cache transactions locally
        await DatabaseService.cacheTransactions(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    return await DatabaseService.getTransactions(filters);
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(limit: number = 10): Promise<FinancialTransaction[]> {
    return await this.getAllTransactions({ 
      limit, 
      sort_by: 'created_at', 
      sort_order: 'desc' 
    });
  }

  /**
   * Create a new transaction
   */
  static async createTransaction(transactionData: CreateTransactionData): Promise<FinancialTransaction> {
    // Validate transaction data
    this.validateTransactionData(transactionData);

    // Calculate tax amounts
    const taxRate = transactionData.tax_rate || 0;
    const grossAmount = transactionData.amount;
    const taxAmount = (grossAmount * taxRate) / 100;
    const netAmount = grossAmount + taxAmount;

    const transaction: FinancialTransaction = {
      id: this.generateTransactionId(),
      ...transactionData,
      currency: 'IDR',
      gross_amount: grossAmount,
      tax_amount: taxAmount,
      net_amount: netAmount,
      payment_status: transactionData.payment_status || 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'system', // TODO: Get from auth context
      is_synced: false
    };

    try {
      // Try to create on server first
      const response = await ApiService.post(`${this.API_ENDPOINT}/transactions`, transaction);
      
      if (response.success) {
        await DatabaseService.createTransaction(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    // Save locally and mark for sync
    await DatabaseService.createTransaction(transaction);
    await DatabaseService.markForSync(transaction.id, 'create');
    
    return transaction;
  }

  /**
   * Update an existing transaction
   */
  static async updateTransaction(transactionId: string, updateData: UpdateTransactionData): Promise<FinancialTransaction> {
    // Validate update data
    this.validateTransactionData(updateData, false);

    // Recalculate tax if amount or tax rate changed
    const currentTransaction = await DatabaseService.getTransactionById(transactionId);
    if (!currentTransaction) {
      throw new Error('Transaction not found');
    }

    let updatedTransaction = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    if (updateData.amount !== undefined || updateData.tax_rate !== undefined) {
      const amount = updateData.amount || currentTransaction.amount;
      const taxRate = updateData.tax_rate !== undefined ? updateData.tax_rate : (currentTransaction.tax_rate || 0);
      const taxAmount = (amount * taxRate) / 100;
      
      updatedTransaction = {
        ...updatedTransaction,
        gross_amount: amount,
        tax_amount: taxAmount,
        net_amount: amount + taxAmount
      };
    }

    try {
      // Try to update on server first
      const response = await ApiService.put(`${this.API_ENDPOINT}/transactions/${transactionId}`, updatedTransaction);
      
      if (response.success) {
        await DatabaseService.updateTransaction(transactionId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    // Update locally and mark for sync
    await DatabaseService.updateTransaction(transactionId, updatedTransaction);
    await DatabaseService.markForSync(transactionId, 'update');
    
    const transaction = await DatabaseService.getTransactionById(transactionId);
    return transaction!;
  }

  /**
   * Delete a transaction
   */
  static async deleteTransaction(transactionId: string): Promise<boolean> {
    try {
      const response = await ApiService.delete(`${this.API_ENDPOINT}/transactions/${transactionId}`);
      
      if (response.success) {
        await DatabaseService.deleteTransaction(transactionId);
        return true;
      }
    } catch (error) {
      console.log('Server unavailable, deleting locally');
    }

    // Delete locally and mark for sync
    await DatabaseService.deleteTransaction(transactionId);
    await DatabaseService.markForSync(transactionId, 'delete');
    
    return true;
  }

  /**
   * Record order payment
   */
  static async recordOrderPayment(orderId: string, amount: number, paymentMethod: string, notes?: string): Promise<FinancialTransaction> {
    const order = await DatabaseService.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const customer = await DatabaseService.getCustomerById(order.customer_id);

    return await this.createTransaction({
      type: 'income',
      category: 'order_payment',
      amount,
      description: `Payment for order ${order.order_number}${customer ? ` from ${customer.name}` : ''}`,
      order_id: orderId,
      customer_id: order.customer_id,
      payment_method: paymentMethod as any,
      payment_date: new Date().toISOString(),
      notes
    });
  }

  /**
   * Calculate pricing for an order
   */
  static async calculatePricing(specifications: {
    box_type: string;
    dimensions: { width: number; height: number; depth: number; unit: string };
    quantity: number;
    materials: string[];
    colors: string[];
    finishing_type?: string;
    complexity_level: 'simple' | 'moderate' | 'complex' | 'premium';
  }): Promise<PricingCalculation> {
    
    // Get material costs from inventory
    const materialCosts = await this.calculateMaterialCosts(specifications);
    
    // Calculate labor costs
    const laborCosts = await this.calculateLaborCosts(specifications);
    
    // Calculate overhead costs
    const overheadCosts = await this.calculateOverheadCosts(specifications);
    
    // Get pricing strategy from settings
    const markupPercentage = await this.getMarkupPercentage(specifications.complexity_level);
    const taxRate = 11; // PPN Indonesia
    
    const costTotal = materialCosts.total + laborCosts.total + overheadCosts.total;
    const markupAmount = (costTotal * markupPercentage) / 100;
    const basePrice = costTotal + markupAmount;
    const taxAmount = (basePrice * taxRate) / 100;
    const finalPrice = basePrice + taxAmount;
    
    const profitAmount = markupAmount;
    const profitMargin = (profitAmount / finalPrice) * 100;

    const calculation: PricingCalculation = {
      id: this.generatePricingId(),
      ...specifications,
      material_costs: materialCosts,
      labor_costs: laborCosts,
      overhead_costs: overheadCosts,
      cost_total: costTotal,
      markup_percentage: markupPercentage,
      markup_amount: markupAmount,
      base_price: basePrice,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      final_price: finalPrice,
      profit_amount: profitAmount,
      profit_margin: profitMargin,
      calculated_at: new Date().toISOString(),
      calculated_by: 'system' // TODO: Get from auth context
    };

    // Save calculation for future reference
    await DatabaseService.savePricingCalculation(calculation);

    return calculation;
  }

  /**
   * Generate invoice for an order
   */
  static async generateInvoice(orderId: string): Promise<Invoice> {
    const order = await DatabaseService.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const customer = await DatabaseService.getCustomerById(order.customer_id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Create invoice items
    const items: InvoiceItem[] = [{
      id: this.generateInvoiceItemId(),
      description: `${order.box_type} Gift Box - ${order.specifications?.dimensions?.width}x${order.specifications?.dimensions?.height}x${order.specifications?.dimensions?.depth}cm`,
      quantity: order.specifications?.quantity || 1,
      unit_price: order.total_price / (order.specifications?.quantity || 1),
      total_price: order.total_price,
      unit: 'pcs',
      tax_rate: 11,
      tax_amount: (order.total_price * 11) / 100
    }];

    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const totalAmount = subtotal + taxAmount;

    const invoice: Invoice = {
      id: this.generateInvoiceId(),
      invoice_number: await this.generateInvoiceNumber(),
      customer_id: customer.id,
      customer_name: customer.name,
      customer_address: this.formatCustomerAddress(customer),
      customer_email: customer.email,
      order_id: order.id,
      order_number: order.order_number,
      items,
      subtotal,
      tax_rate: 11,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: 'IDR',
      payment_terms: 'Due on receipt',
      due_date: new Date().toISOString(),
      status: 'draft',
      issue_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'system'
    };

    // Save invoice
    await DatabaseService.createInvoice(invoice);

    return invoice;
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<RevenueAnalytics> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/analytics/revenue`, { params: { period } });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, calculating from local data');
    }

    // Fallback to local calculation
    return await this.calculateRevenueAnalyticsLocally(period);
  }

  /**
   * Search transactions
   */
  static async searchTransactions(query: string): Promise<FinancialTransaction[]> {
    const allTransactions = await this.getAllTransactions();
    
    const searchTerm = query.toLowerCase();
    
    return allTransactions.filter(transaction => 
      transaction.description.toLowerCase().includes(searchTerm) ||
      transaction.reference_number?.toLowerCase().includes(searchTerm) ||
      transaction.invoice_number?.toLowerCase().includes(searchTerm) ||
      transaction.notes?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get transactions by type
   */
  static async getTransactionsByType(type: TransactionType): Promise<FinancialTransaction[]> {
    return await this.getAllTransactions({ transaction_type: type });
  }

  /**
   * Get transactions by category
   */
  static async getTransactionsByCategory(category: TransactionCategory): Promise<FinancialTransaction[]> {
    return await this.getAllTransactions({ category });
  }

  /**
   * Calculate financial summary locally
   */
  private static async calculateFinancialSummaryLocally(period: 'week' | 'month' | 'quarter' | 'year'): Promise<FinancialSummary> {
    const now = new Date();
    const periodStart = new Date();
    
    switch (period) {
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
    }

    const transactions = await DatabaseService.getTransactions({
      date_range: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      }
    });

    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');

    const totalRevenue = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    const orderRevenue = incomeTransactions
      .filter(t => t.category === 'order_payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesByCategory = expenseTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get completed orders for the period
    const orders = await DatabaseService.getOrders({
      date_range: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      }
    });
    const completedOrders = orders.filter(o => o.status === 'completed');

    return {
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString(),
        type: period
      },
      revenue: {
        total: totalRevenue,
        from_orders: orderRevenue,
        other_income: totalRevenue - orderRevenue,
        growth_percentage: 0 // TODO: Calculate compared to previous period
      },
      expenses: {
        total: totalExpenses,
        by_category: expensesByCategory,
        growth_percentage: 0 // TODO: Calculate compared to previous period
      },
      expense_breakdown: {
        materials: expensesByCategory['materials'] || 0,
        labor: expensesByCategory['labor'] || 0,
        overhead: (expensesByCategory['overhead'] || 0) + (expensesByCategory['utilities'] || 0) + (expensesByCategory['rent'] || 0),
        other: Object.entries(expensesByCategory)
          .filter(([key]) => !['materials', 'labor', 'overhead', 'utilities', 'rent'].includes(key))
          .reduce((sum, [, value]) => sum + value, 0)
      },
      profit: {
        gross: totalRevenue - (expensesByCategory['materials'] || 0),
        net: totalRevenue - totalExpenses,
        margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
      },
      orders: {
        completed: completedOrders.length,
        total_value: completedOrders.reduce((sum, o) => sum + o.total_price, 0),
        average_value: completedOrders.length > 0 
          ? completedOrders.reduce((sum, o) => sum + o.total_price, 0) / completedOrders.length 
          : 0
      },
      cash_flow: {
        opening_balance: 0, // TODO: Calculate from previous period
        closing_balance: totalRevenue - totalExpenses,
        net_change: totalRevenue - totalExpenses
      },
      outstanding: {
        receivables: 0, // TODO: Calculate from pending invoices
        payables: 0,    // TODO: Calculate from pending bills
        overdue_invoices: 0 // TODO: Calculate from overdue invoices
      }
    };
  }

  /**
   * Calculate revenue analytics locally
   */
  private static async calculateRevenueAnalyticsLocally(period: 'week' | 'month' | 'quarter' | 'year'): Promise<RevenueAnalytics> {
    const now = new Date();
    const months = [];
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toISOString().substring(0, 7)); // YYYY-MM format
    }

    const monthlyTrend = [];
    
    for (const month of months) {
      const monthStart = new Date(`${month}-01`);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const transactions = await DatabaseService.getTransactions({
        transaction_type: 'income',
        date_range: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        }
      });

      const orders = await DatabaseService.getOrders({
        date_range: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        }
      });
      
      const completedOrders = orders.filter(o => o.status === 'completed');
      const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);

      monthlyTrend.push({
        month,
        revenue,
        orders: completedOrders.length,
        average_order_value: completedOrders.length > 0 ? revenue / completedOrders.length : 0
      });
    }

    // Calculate revenue by source (business type)
    const customers = await DatabaseService.getCustomers();
    const revenueBySource = {
      individual_customers: 0,
      corporate_clients: 0,
      wedding_events: 0,
      other_events: 0
    };

    for (const customer of customers) {
      const customerRevenue = await this.getCustomerRevenue(customer.id);
      
      switch (customer.business_type) {
        case 'individual':
          revenueBySource.individual_customers += customerRevenue;
          break;
        case 'corporate':
          revenueBySource.corporate_clients += customerRevenue;
          break;
        case 'wedding':
          revenueBySource.wedding_events += customerRevenue;
          break;
        case 'event':
          revenueBySource.other_events += customerRevenue;
          break;
      }
    }

    return {
      monthly_trend: monthlyTrend,
      revenue_by_source: revenueBySource,
      top_customers: [], // TODO: Calculate top customers by revenue
      seasonal_patterns: {
        q1: monthlyTrend.slice(0, 3).reduce((sum, m) => sum + m.revenue, 0),
        q2: monthlyTrend.slice(3, 6).reduce((sum, m) => sum + m.revenue, 0),
        q3: monthlyTrend.slice(6, 9).reduce((sum, m) => sum + m.revenue, 0),
        q4: monthlyTrend.slice(9, 12).reduce((sum, m) => sum + m.revenue, 0)
      },
      profitability: {
        most_profitable_products: [], // TODO: Calculate product profitability
        least_profitable_products: []
      }
    };
  }

  /**
   * Calculate material costs for pricing
   */
  private static async calculateMaterialCosts(specifications: any): Promise<any> {
    // This would typically query inventory items and calculate based on specifications
    // For now, return estimated costs
    const baseArea = (specifications.dimensions.width * specifications.dimensions.height) / 10000; // Convert to m²
    
    return {
      cardboard: baseArea * 15000 * specifications.quantity, // IDR per m²
      fabric: baseArea * 25000 * specifications.quantity,
      ribbons: 5000 * specifications.quantity,
      accessories: 10000 * specifications.quantity,
      other: 2000 * specifications.quantity,
      total: (baseArea * 40000 + 17000) * specifications.quantity
    };
  }

  /**
   * Calculate labor costs for pricing
   */
  private static async calculateLaborCosts(specifications: any): Promise<any> {
    const complexityMultiplier = {
      simple: 1,
      moderate: 1.5,
      complex: 2,
      premium: 3
    }[specifications.complexity_level];

    const hourlyRate = 50000; // IDR per hour
    const baseHours = 2; // Base hours per unit

    const totalHours = baseHours * complexityMultiplier * specifications.quantity;

    return {
      design_time: 1 * complexityMultiplier,
      production_time: totalHours * 0.8,
      finishing_time: totalHours * 0.2,
      hourly_rate: hourlyRate,
      total: totalHours * hourlyRate
    };
  }

  /**
   * Calculate overhead costs for pricing
   */
  private static async calculateOverheadCosts(specifications: any): Promise<any> {
    const overheadRate = 0.15; // 15% of material + labor costs
    const materialCosts = await this.calculateMaterialCosts(specifications);
    const laborCosts = await this.calculateLaborCosts(specifications);
    
    const baseOverhead = (materialCosts.total + laborCosts.total) * overheadRate;

    return {
      equipment: baseOverhead * 0.4,
      utilities: baseOverhead * 0.3,
      workspace: baseOverhead * 0.2,
      packaging: baseOverhead * 0.1,
      total: baseOverhead
    };
  }

  /**
   * Get markup percentage based on complexity
   */
  private static async getMarkupPercentage(complexityLevel: string): Promise<number> {
    const markupRates = {
      simple: 80,
      moderate: 100,
      complex: 120,
      premium: 150
    };
    
    return markupRates[complexityLevel as keyof typeof markupRates] || 100;
  }

  /**
   * Get customer revenue
   */
  private static async getCustomerRevenue(customerId: string): Promise<number> {
    const transactions = await DatabaseService.getTransactions({
      customer_id: customerId,
      transaction_type: 'income'
    });
    
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Format customer address for invoice
   */
  private static formatCustomerAddress(customer: any): string {
    if (!customer.address) return '';
    
    const parts = [
      customer.address.street,
      customer.address.city,
      customer.address.province,
      customer.address.postal_code,
      customer.address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Generate invoice number
   */
  private static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}-`;
    
    const invoices = await DatabaseService.getInvoices();
    const currentMonthInvoices = invoices.filter(inv => 
      inv.invoice_number.startsWith(prefix)
    );
    
    const nextNumber = currentMonthInvoices.length + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Validate transaction data
   */
  private static validateTransactionData(data: CreateTransactionData | UpdateTransactionData, isCreate = true): void {
    if (isCreate && !data.description) {
      throw new Error('Transaction description is required');
    }

    if (data.description && (data.description.length < 3 || data.description.length > 200)) {
      throw new Error('Description must be between 3 and 200 characters');
    }

    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (data.tax_rate !== undefined && (data.tax_rate < 0 || data.tax_rate > 100)) {
      throw new Error('Tax rate must be between 0 and 100');
    }
  }

  /**
   * Generate unique transaction ID
   */
  private static generateTransactionId(): string {
    return 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate unique pricing calculation ID
   */
  private static generatePricingId(): string {
    return 'price_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate unique invoice ID
   */
  private static generateInvoiceId(): string {
    return 'inv_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate unique invoice item ID
   */
  private static generateInvoiceItemId(): string {
    return 'item_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Sync pending financial data with server
   */
  static async syncPendingFinancialData(): Promise<void> {
    const pendingSyncItems = await DatabaseService.getPendingSyncItems('financial');
    
    for (const item of pendingSyncItems) {
      try {
        switch (item.operation) {
          case 'create':
            const createResponse = await ApiService.post(`${this.API_ENDPOINT}/transactions`, item.data);
            if (createResponse.success) {
              await DatabaseService.clearSyncItem(item.id);
            }
            break;
            
          case 'update':
            const updateResponse = await ApiService.put(`${this.API_ENDPOINT}/transactions/${item.entity_id}`, item.data);
            if (updateResponse.success) {
              await DatabaseService.clearSyncItem(item.id);
            }
            break;
            
          case 'delete':
            const deleteResponse = await ApiService.delete(`${this.API_ENDPOINT}/transactions/${item.entity_id}`);
            if (deleteResponse.success) {
              await DatabaseService.clearSyncItem(item.id);
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to sync financial transaction ${item.entity_id}:`, error);
        // Continue with next item
      }
    }
  }
}