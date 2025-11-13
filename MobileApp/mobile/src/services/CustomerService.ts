import { ApiService } from './ApiService';
import { DatabaseService } from './DatabaseService';
import { 
  Customer, 
  CreateCustomerData, 
  UpdateCustomerData,
  CustomerFilters,
  CustomerAnalytics,
  CustomerCommunication,
  CustomerLifecycleStage,
  LoyaltyStatus,
  BusinessType
} from '../types/Customer';

export class CustomerService {
  private static readonly API_ENDPOINT = '/customers';

  /**
   * Get all customers with optional filtering
   */
  static async getAllCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    try {
      // Try to fetch from server first
      const response = await ApiService.get(this.API_ENDPOINT, { params: filters });
      
      if (response.success) {
        // Enrich customers with calculated metrics
        const enrichedCustomers = await Promise.all(
          response.data.map(customer => this.enrichCustomerWithMetrics(customer))
        );
        
        // Cache customers locally for offline access
        await DatabaseService.cacheCustomers(enrichedCustomers);
        return enrichedCustomers;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    return await DatabaseService.getCustomers(filters);
  }

  /**
   * Get a single customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/${customerId}`);
      
      if (response.success) {
        const enrichedCustomer = await this.enrichCustomerWithMetrics(response.data);
        return enrichedCustomer;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    return await DatabaseService.getCustomerById(customerId);
  }

  /**
   * Create a new customer
   */
  static async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
    // Validate customer data
    this.validateCustomerData(customerData);

    const customer: Customer = {
      id: this.generateCustomerId(),
      ...customerData,
      loyalty_status: 'new',
      metrics: {
        total_orders: 0,
        total_value: 0,
        average_order_value: 0,
        lifetime_value: 0
      },
      preferences: customerData.preferences || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Try to create on server first
      const response = await ApiService.post(this.API_ENDPOINT, customer);
      
      if (response.success) {
        // Cache locally
        await DatabaseService.createCustomer(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    // Save locally and mark for sync
    await DatabaseService.createCustomer(customer);
    await DatabaseService.markForSync(customer.id, 'create');
    
    return customer;
  }

  /**
   * Update an existing customer
   */
  static async updateCustomer(customerId: string, updateData: UpdateCustomerData): Promise<Customer> {
    // Validate update data
    this.validateCustomerData(updateData, false);

    const updatedCustomer = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    try {
      // Try to update on server first
      const response = await ApiService.put(`${this.API_ENDPOINT}/${customerId}`, updatedCustomer);
      
      if (response.success) {
        // Update local cache
        await DatabaseService.updateCustomer(customerId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    // Update locally and mark for sync
    await DatabaseService.updateCustomer(customerId, updatedCustomer);
    await DatabaseService.markForSync(customerId, 'update');
    
    // Return updated customer from local database
    const customer = await DatabaseService.getCustomerById(customerId);
    return customer!;
  }

  /**
   * Delete a customer
   */
  static async deleteCustomer(customerId: string): Promise<boolean> {
    // Check if customer has orders
    const customerOrders = await DatabaseService.getOrdersByCustomer(customerId);
    
    if (customerOrders.length > 0) {
      throw new Error('Cannot delete customer with existing orders. Consider archiving instead.');
    }

    try {
      // Try to delete on server first
      const response = await ApiService.delete(`${this.API_ENDPOINT}/${customerId}`);
      
      if (response.success) {
        // Delete from local cache
        await DatabaseService.deleteCustomer(customerId);
        return true;
      }
    } catch (error) {
      console.log('Server unavailable, deleting locally');
    }

    // Delete locally and mark for sync
    await DatabaseService.deleteCustomer(customerId);
    await DatabaseService.markForSync(customerId, 'delete');
    
    return true;
  }

  /**
   * Search customers
   */
  static async searchCustomers(query: string): Promise<Customer[]> {
    const allCustomers = await this.getAllCustomers();
    
    const searchTerm = query.toLowerCase();
    
    return allCustomers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm) ||
      customer.whatsapp?.includes(searchTerm) ||
      customer.phone?.includes(searchTerm) ||
      customer.company_name?.toLowerCase().includes(searchTerm) ||
      customer.industry?.toLowerCase().includes(searchTerm) ||
      customer.notes?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get customers by business type
   */
  static async getCustomersByBusinessType(businessType: BusinessType): Promise<Customer[]> {
    return await this.getAllCustomers({ business_type: businessType });
  }

  /**
   * Get customers by loyalty status
   */
  static async getCustomersByLoyaltyStatus(loyaltyStatus: LoyaltyStatus): Promise<Customer[]> {
    return await this.getAllCustomers({ loyalty_status: loyaltyStatus });
  }

  /**
   * Get customer analytics
   */
  static async getCustomerAnalytics(
    customerId: string,
    period: 'month' | 'quarter' | 'year' = 'year'
  ): Promise<CustomerAnalytics> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const orders = await DatabaseService.getOrdersByCustomer(customerId);
    
    // Filter orders by period
    const now = new Date();
    const periodStart = new Date();
    
    switch (period) {
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

    const periodOrders = orders.filter(order => 
      new Date(order.created_at) >= periodStart
    );

    const completedOrders = periodOrders.filter(order => order.status === 'completed');
    const cancelledOrders = periodOrders.filter(order => order.status === 'cancelled');
    const inProgressOrders = periodOrders.filter(order => 
      !['completed', 'cancelled'].includes(order.status)
    );

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_price, 0);
    const previousPeriodRevenue = await this.getPreviousPeriodRevenue(customerId, period);
    const revenueGrowth = previousPeriodRevenue > 0 
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : 0;

    // Calculate order frequency
    const orderDates = completedOrders.map(order => new Date(order.created_at)).sort();
    let averageFrequency = 0;
    if (orderDates.length > 1) {
      const intervals = orderDates.slice(1).map((date, index) => 
        (date.getTime() - orderDates[index].getTime()) / (1000 * 60 * 60 * 24)
      );
      averageFrequency = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    // Get box type preferences
    const boxTypeCounts = completedOrders.reduce((acc, order) => {
      acc[order.box_type] = (acc[order.box_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredBoxTypes = Object.entries(boxTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([type]) => type);

    return {
      customer_id: customerId,
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      },
      orders: {
        total: periodOrders.length,
        completed: completedOrders.length,
        cancelled: cancelledOrders.length,
        in_progress: inProgressOrders.length
      },
      revenue: {
        total: totalRevenue,
        average_per_order: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        growth_percentage: revenueGrowth
      },
      behavior: {
        order_frequency_days: averageFrequency,
        preferred_box_types: preferredBoxTypes,
        seasonal_patterns: await this.getSeasonalPatterns(customerId),
        communication_response_rate: await this.getCommunicationResponseRate(customerId)
      },
      satisfaction: {
        feedback_count: 0, // TODO: Implement feedback system
        complaints_count: 0,
        compliments_count: 0
      }
    };
  }

  /**
   * Log customer communication
   */
  static async logCommunication(communication: Omit<CustomerCommunication, 'id' | 'created_at'>): Promise<CustomerCommunication> {
    const communicationRecord: CustomerCommunication = {
      id: this.generateCommunicationId(),
      ...communication,
      created_at: new Date().toISOString()
    };

    try {
      // Try to save on server first
      const response = await ApiService.post(`${this.API_ENDPOINT}/${communication.customer_id}/communications`, communicationRecord);
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving communication locally');
    }

    // Save locally
    await DatabaseService.createCommunication(communicationRecord);
    return communicationRecord;
  }

  /**
   * Get customer communications
   */
  static async getCustomerCommunications(customerId: string): Promise<CustomerCommunication[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/${customerId}/communications`);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading communications from local cache');
    }

    return await DatabaseService.getCommunicationsByCustomer(customerId);
  }

  /**
   * Update customer loyalty status based on order history
   */
  static async updateCustomerLoyalty(customerId: string): Promise<Customer> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const orders = await DatabaseService.getOrdersByCustomer(customerId);
    const completedOrders = orders.filter(order => order.status === 'completed');
    
    let newLoyaltyStatus: LoyaltyStatus = 'new';
    
    if (completedOrders.length >= 10 || customer.metrics.total_value >= 50000000) {
      newLoyaltyStatus = 'vip';
    } else if (completedOrders.length >= 3 || customer.metrics.total_value >= 10000000) {
      newLoyaltyStatus = 'regular';
    }

    if (newLoyaltyStatus !== customer.loyalty_status) {
      return await this.updateCustomer(customerId, { loyalty_status: newLoyaltyStatus });
    }

    return customer;
  }

  /**
   * Enrich customer with calculated metrics
   */
  private static async enrichCustomerWithMetrics(customer: Customer): Promise<Customer> {
    const orders = await DatabaseService.getOrdersByCustomer(customer.id);
    const completedOrders = orders.filter(order => order.status === 'completed');
    
    const totalValue = completedOrders.reduce((sum, order) => sum + order.total_price, 0);
    const averageOrderValue = completedOrders.length > 0 ? totalValue / completedOrders.length : 0;
    
    const lastOrderDate = completedOrders.length > 0 
      ? completedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : undefined;

    const firstOrderDate = completedOrders.length > 0
      ? completedOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at
      : undefined;

    return {
      ...customer,
      metrics: {
        total_orders: orders.length,
        total_value: totalValue,
        average_order_value: averageOrderValue,
        last_order_date: lastOrderDate,
        first_order_date: firstOrderDate,
        lifetime_value: totalValue, // Could be enhanced with additional calculations
        order_frequency_days: this.calculateOrderFrequency(completedOrders)
      },
      // Update legacy fields for backward compatibility
      total_orders: orders.length,
      total_value: totalValue,
      average_order_value: averageOrderValue,
      last_order_date: lastOrderDate
    };
  }

  /**
   * Calculate order frequency in days
   */
  private static calculateOrderFrequency(orders: any[]): number {
    if (orders.length < 2) return 0;
    
    const orderDates = orders.map(order => new Date(order.created_at)).sort();
    const intervals = orderDates.slice(1).map((date, index) => 
      (date.getTime() - orderDates[index].getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * Get previous period revenue for growth calculation
   */
  private static async getPreviousPeriodRevenue(
    customerId: string, 
    period: 'month' | 'quarter' | 'year'
  ): Promise<number> {
    const orders = await DatabaseService.getOrdersByCustomer(customerId);
    const now = new Date();
    const periodStart = new Date();
    const periodEnd = new Date();

    switch (period) {
      case 'month':
        periodStart.setMonth(now.getMonth() - 2);
        periodEnd.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 6);
        periodEnd.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 2);
        periodEnd.setFullYear(now.getFullYear() - 1);
        break;
    }

    const previousPeriodOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= periodStart && orderDate < periodEnd && order.status === 'completed';
    });

    return previousPeriodOrders.reduce((sum, order) => sum + order.total_price, 0);
  }

  /**
   * Get seasonal ordering patterns
   */
  private static async getSeasonalPatterns(customerId: string): Promise<Record<string, number>> {
    const orders = await DatabaseService.getOrdersByCustomer(customerId);
    const completedOrders = orders.filter(order => order.status === 'completed');
    
    const monthlyOrders = completedOrders.reduce((acc, order) => {
      const month = new Date(order.created_at).getMonth();
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Convert to season patterns
    const seasons = {
      'Q1': (monthlyOrders[0] || 0) + (monthlyOrders[1] || 0) + (monthlyOrders[2] || 0),
      'Q2': (monthlyOrders[3] || 0) + (monthlyOrders[4] || 0) + (monthlyOrders[5] || 0),
      'Q3': (monthlyOrders[6] || 0) + (monthlyOrders[7] || 0) + (monthlyOrders[8] || 0),
      'Q4': (monthlyOrders[9] || 0) + (monthlyOrders[10] || 0) + (monthlyOrders[11] || 0)
    };

    return seasons;
  }

  /**
   * Calculate communication response rate
   */
  private static async getCommunicationResponseRate(customerId: string): Promise<number> {
    const communications = await DatabaseService.getCommunicationsByCustomer(customerId);
    
    const outgoingCount = communications.filter(comm => comm.direction === 'outgoing').length;
    const incomingCount = communications.filter(comm => comm.direction === 'incoming').length;
    
    if (outgoingCount === 0) return 100;
    
    return (incomingCount / outgoingCount) * 100;
  }

  /**
   * Validate customer data
   */
  private static validateCustomerData(data: CreateCustomerData | UpdateCustomerData, isCreate = true): void {
    if (isCreate && !data.name) {
      throw new Error('Customer name is required');
    }

    if (data.name && (data.name.length < 2 || data.name.length > 100)) {
      throw new Error('Customer name must be between 2 and 100 characters');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.whatsapp && !/^(\+62|62|0)[0-9]{9,13}$/.test(data.whatsapp.replace(/\s/g, ''))) {
      throw new Error('Invalid WhatsApp number format');
    }

    if (data.phone && !/^(\+62|62|0)[0-9]{9,13}$/.test(data.phone.replace(/\s/g, ''))) {
      throw new Error('Invalid phone number format');
    }
  }

  /**
   * Generate unique customer ID
   */
  private static generateCustomerId(): string {
    return 'cust_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate unique communication ID
   */
  private static generateCommunicationId(): string {
    return 'comm_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Sync pending customers with server
   */
  static async syncPendingCustomers(): Promise<void> {
    const pendingSyncItems = await DatabaseService.getPendingSyncItems('customer');
    
    for (const item of pendingSyncItems) {
      try {
        switch (item.operation) {
          case 'create':
            const createResponse = await ApiService.post(this.API_ENDPOINT, item.data);
            if (createResponse.success) {
              await DatabaseService.clearSyncItem(item.id);
            }
            break;
            
          case 'update':
            const updateResponse = await ApiService.put(`${this.API_ENDPOINT}/${item.entity_id}`, item.data);
            if (updateResponse.success) {
              await DatabaseService.clearSyncItem(item.id);
            }
            break;
            
          case 'delete':
            const deleteResponse = await ApiService.delete(`${this.API_ENDPOINT}/${item.entity_id}`);
            if (deleteResponse.success) {
              await DatabaseService.clearSyncItem(item.id);
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to sync customer ${item.entity_id}:`, error);
        // Continue with next item
      }
    }
  }
}