import { ApiService } from './ApiService';
import { DatabaseService } from './DatabaseService';
import { Order, OrderStatus, CreateOrderData, UpdateOrderData } from '../types/Order';

export class OrderService {
  private static readonly API_ENDPOINT = '/orders';

  /**
   * Get all orders with optional filtering
   */
  static async getAllOrders(filters?: {
    status?: OrderStatus;
    customer_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    try {
      // Try to fetch from server first
      const response = await ApiService.get(this.API_ENDPOINT, { params: filters });
      
      if (response.success) {
        // Cache orders locally for offline access
        await DatabaseService.cacheOrders(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    return await DatabaseService.getOrders(filters);
  }

  /**
   * Get a single order by ID
   */
  static async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/${orderId}`);
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    return await DatabaseService.getOrderById(orderId);
  }

  /**
   * Create a new order
   */
  static async createOrder(orderData: CreateOrderData): Promise<Order> {
    const order: Order = {
      id: this.generateOrderId(),
      order_number: await this.generateOrderNumber(),
      ...orderData,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Try to create on server first
      const response = await ApiService.post(this.API_ENDPOINT, order);
      
      if (response.success) {
        // Cache locally
        await DatabaseService.createOrder(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    // Save locally and mark for sync
    await DatabaseService.createOrder(order);
    await DatabaseService.markForSync(order.id, 'create');
    
    return order;
  }

  /**
   * Update an existing order
   */
  static async updateOrder(orderId: string, updateData: UpdateOrderData): Promise<Order> {
    const updatedOrder = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    try {
      // Try to update on server first
      const response = await ApiService.put(`${this.API_ENDPOINT}/${orderId}`, updatedOrder);
      
      if (response.success) {
        // Update local cache
        await DatabaseService.updateOrder(orderId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    // Update locally and mark for sync
    await DatabaseService.updateOrder(orderId, updatedOrder);
    await DatabaseService.markForSync(orderId, 'update');
    
    // Return updated order from local database
    const order = await DatabaseService.getOrderById(orderId);
    return order!;
  }

  /**
   * Update order status with workflow validation
   */
  static async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    notes?: string
  ): Promise<Order> {
    // Get current order to validate status transition
    const currentOrder = await this.getOrderById(orderId);
    
    if (!currentOrder) {
      throw new Error('Order not found');
    }

    // Validate status transition
    if (!this.isValidStatusTransition(currentOrder.status, newStatus)) {
      throw new Error(`Invalid status transition from ${currentOrder.status} to ${newStatus}`);
    }

    const updateData = {
      status: newStatus,
      ...(notes && { status_notes: notes }),
      ...(newStatus === 'completed' && { actual_completion: new Date().toISOString() }),
    };

    try {
      // Try to update on server first
      const response = await ApiService.patch(`${this.API_ENDPOINT}/${orderId}/status`, updateData);
      
      if (response.success) {
        // Update local cache
        await DatabaseService.updateOrder(orderId, updateData);
        
        // Log status change
        await DatabaseService.logOrderStatusChange(orderId, currentOrder.status, newStatus, notes);
        
        return await this.getOrderById(orderId) as Order;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    // Update locally and mark for sync
    await DatabaseService.updateOrder(orderId, updateData);
    await DatabaseService.logOrderStatusChange(orderId, currentOrder.status, newStatus, notes);
    await DatabaseService.markForSync(orderId, 'update');
    
    return await this.getOrderById(orderId) as Order;
  }

  /**
   * Delete an order
   */
  static async deleteOrder(orderId: string): Promise<boolean> {
    try {
      // Try to delete on server first
      const response = await ApiService.delete(`${this.API_ENDPOINT}/${orderId}`);
      
      if (response.success) {
        // Delete from local cache
        await DatabaseService.deleteOrder(orderId);
        return true;
      }
    } catch (error) {
      console.log('Server unavailable, deleting locally');
    }

    // Delete locally and mark for sync
    await DatabaseService.deleteOrder(orderId);
    await DatabaseService.markForSync(orderId, 'delete');
    
    return true;
  }

  /**
   * Get orders by customer
   */
  static async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await this.getAllOrders({ customer_id: customerId });
  }

  /**
   * Get orders by status
   */
  static async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return await this.getAllOrders({ status });
  }

  /**
   * Search orders
   */
  static async searchOrders(query: string): Promise<Order[]> {
    const allOrders = await this.getAllOrders();
    
    const searchTerm = query.toLowerCase();
    
    return allOrders.filter(order => 
      order.order_number.toLowerCase().includes(searchTerm) ||
      order.customer_name?.toLowerCase().includes(searchTerm) ||
      order.box_type?.toLowerCase().includes(searchTerm) ||
      order.special_requests?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Calculate order pricing
   */
  static calculateOrderPrice(
    materialCost: number,
    laborCost: number,
    markupPercentage: number = 100
  ): number {
    const subtotal = materialCost + laborCost;
    const markup = subtotal * (markupPercentage / 100);
    return subtotal + markup;
  }

  /**
   * Get order analytics
   */
  static async getOrderAnalytics(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<{
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: { [key in OrderStatus]: number };
  }> {
    const orders = await this.getAllOrders();
    
    // Filter by period
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

    const periodOrders = orders.filter(order => 
      new Date(order.created_at) >= periodStart
    );

    const completedOrders = periodOrders.filter(order => order.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_price, 0);

    const ordersByStatus = {
      pending: 0,
      designing: 0,
      approved: 0,
      production: 0,
      quality_control: 0,
      completed: 0,
      cancelled: 0,
    } as { [key in OrderStatus]: number };

    periodOrders.forEach(order => {
      ordersByStatus[order.status]++;
    });

    return {
      totalOrders: periodOrders.length,
      completedOrders: completedOrders.length,
      pendingOrders: periodOrders.filter(order => order.status !== 'completed' && order.status !== 'cancelled').length,
      totalRevenue,
      averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
      ordersByStatus,
    };
  }

  /**
   * Validate status transitions
   */
  private static isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: { [key in OrderStatus]: OrderStatus[] } = {
      pending: ['designing', 'cancelled'],
      designing: ['approved', 'pending', 'cancelled'],
      approved: ['production', 'designing', 'cancelled'],
      production: ['quality_control', 'approved', 'cancelled'],
      quality_control: ['completed', 'production', 'cancelled'],
      completed: [], // Completed orders cannot be changed
      cancelled: ['pending'], // Only allow revival to pending
    };

    return validTransitions[currentStatus].includes(newStatus);
  }

  /**
   * Generate unique order ID
   */
  private static generateOrderId(): string {
    return 'ord_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate order number
   */
  private static async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PGB-${year}-`;
    
    try {
      // Get latest order number from server
      const response = await ApiService.get('/orders/latest-number');
      if (response.success) {
        return response.data.next_number;
      }
    } catch (error) {
      // Fallback to local generation
    }

    // Generate locally
    const orders = await DatabaseService.getOrders();
    const currentYearOrders = orders.filter(order => 
      order.order_number.startsWith(prefix)
    );

    let nextNumber = 1;
    if (currentYearOrders.length > 0) {
      const numbers = currentYearOrders.map(order => 
        parseInt(order.order_number.split('-').pop() || '0')
      );
      nextNumber = Math.max(...numbers) + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Sync pending orders with server
   */
  static async syncPendingOrders(): Promise<void> {
    const pendingSyncItems = await DatabaseService.getPendingSyncItems('order');
    
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
        console.error(`Failed to sync order ${item.entity_id}:`, error);
        // Continue with next item
      }
    }
  }
}