import { ApiService } from './ApiService';
import { DatabaseService } from './DatabaseService';
import { 
  InventoryItem, 
  CreateInventoryItemData, 
  UpdateInventoryItemData,
  StockMovement,
  StockAdjustmentData,
  ReorderAlert,
  InventoryFilters,
  InventoryAnalytics,
  StockLevel,
  InventoryCategory,
  MovementType
} from '../types/Inventory';

export class InventoryService {
  private static readonly API_ENDPOINT = '/inventory';

  /**
   * Get all inventory items with optional filtering
   */
  static async getAllInventoryItems(filters?: InventoryFilters): Promise<InventoryItem[]> {
    try {
      // Try to fetch from server first
      const response = await ApiService.get(this.API_ENDPOINT, { params: filters });
      
      if (response.success) {
        // Enrich items with calculated stock levels
        const enrichedItems = response.data.map(item => this.enrichItemWithStockLevel(item));
        
        // Cache items locally for offline access
        await DatabaseService.cacheInventoryItems(enrichedItems);
        return enrichedItems;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    const items = await DatabaseService.getInventoryItems(filters);
    return items.map(item => this.enrichItemWithStockLevel(item));
  }

  /**
   * Get a single inventory item by ID
   */
  static async getInventoryItemById(itemId: string): Promise<InventoryItem | null> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/${itemId}`);
      
      if (response.success) {
        const enrichedItem = this.enrichItemWithStockLevel(response.data);
        return enrichedItem;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    const item = await DatabaseService.getInventoryItemById(itemId);
    return item ? this.enrichItemWithStockLevel(item) : null;
  }

  /**
   * Create a new inventory item
   */
  static async createInventoryItem(itemData: CreateInventoryItemData): Promise<InventoryItem> {
    // Validate item data
    this.validateInventoryItemData(itemData);

    const item: InventoryItem = {
      id: this.generateInventoryItemId(),
      ...itemData,
      total_value: itemData.current_stock * itemData.unit_cost,
      stock_level: this.calculateStockLevel(itemData.current_stock, itemData.reorder_level),
      currency: 'IDR',
      is_active: true,
      is_consumable: itemData.is_consumable ?? true,
      requires_quality_check: itemData.requires_quality_check ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Try to create on server first
      const response = await ApiService.post(this.API_ENDPOINT, item);
      
      if (response.success) {
        // Cache locally
        await DatabaseService.createInventoryItem(response.data);
        
        // Log initial stock as a purchase movement
        await this.logStockMovement({
          inventory_item_id: response.data.id,
          type: 'purchase',
          quantity: item.current_stock,
          unit_cost: item.unit_cost,
          reason: 'Initial stock entry',
          notes: 'Item created with initial stock'
        });
        
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    // Save locally and mark for sync
    await DatabaseService.createInventoryItem(item);
    await DatabaseService.markForSync(item.id, 'create');
    
    // Log initial stock movement locally
    await this.logStockMovement({
      inventory_item_id: item.id,
      type: 'purchase',
      quantity: item.current_stock,
      unit_cost: item.unit_cost,
      reason: 'Initial stock entry',
      notes: 'Item created with initial stock'
    });
    
    return item;
  }

  /**
   * Update an existing inventory item
   */
  static async updateInventoryItem(itemId: string, updateData: UpdateInventoryItemData): Promise<InventoryItem> {
    // Validate update data
    this.validateInventoryItemData(updateData, false);

    const updatedItem = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // Recalculate total value if stock or cost changed
    const currentItem = await this.getInventoryItemById(itemId);
    if (currentItem && (updateData.unit_cost !== undefined)) {
      updatedItem.total_value = currentItem.current_stock * (updateData.unit_cost || currentItem.unit_cost);
    }

    try {
      // Try to update on server first
      const response = await ApiService.put(`${this.API_ENDPOINT}/${itemId}`, updatedItem);
      
      if (response.success) {
        // Update local cache
        await DatabaseService.updateInventoryItem(itemId, response.data);
        return this.enrichItemWithStockLevel(response.data);
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    // Update locally and mark for sync
    await DatabaseService.updateInventoryItem(itemId, updatedItem);
    await DatabaseService.markForSync(itemId, 'update');
    
    // Return updated item from local database
    const item = await DatabaseService.getInventoryItemById(itemId);
    return this.enrichItemWithStockLevel(item!);
  }

  /**
   * Delete an inventory item
   */
  static async deleteInventoryItem(itemId: string): Promise<boolean> {
    // Check if item has been used in orders
    const movements = await DatabaseService.getStockMovementsByItem(itemId);
    const hasUsage = movements.some(movement => movement.type === 'usage');
    
    if (hasUsage) {
      throw new Error('Cannot delete inventory item that has been used in orders. Consider deactivating instead.');
    }

    try {
      // Try to delete on server first
      const response = await ApiService.delete(`${this.API_ENDPOINT}/${itemId}`);
      
      if (response.success) {
        // Delete from local cache
        await DatabaseService.deleteInventoryItem(itemId);
        return true;
      }
    } catch (error) {
      console.log('Server unavailable, deleting locally');
    }

    // Delete locally and mark for sync
    await DatabaseService.deleteInventoryItem(itemId);
    await DatabaseService.markForSync(itemId, 'delete');
    
    return true;
  }

  /**
   * Adjust stock levels (add or remove stock)
   */
  static async adjustStock(adjustmentData: StockAdjustmentData): Promise<InventoryItem> {
    const { inventory_item_id, type, quantity, reason, notes, unit_cost, batch_number, expiry_date } = adjustmentData;
    
    const currentItem = await this.getInventoryItemById(inventory_item_id);
    if (!currentItem) {
      throw new Error('Inventory item not found');
    }

    // Calculate new stock level
    const stockChange = type === 'add' ? quantity : -quantity;
    const newStock = Math.max(0, currentItem.current_stock + stockChange);
    
    if (type === 'remove' && quantity > currentItem.current_stock) {
      throw new Error('Cannot remove more stock than currently available');
    }

    // Update stock level
    const updatedItem = await this.updateInventoryItem(inventory_item_id, {
      current_stock: newStock,
      last_restocked: type === 'add' ? new Date().toISOString() : currentItem.last_restocked,
      last_used: type === 'remove' ? new Date().toISOString() : currentItem.last_used
    });

    // Log the stock movement
    await this.logStockMovement({
      inventory_item_id,
      type: type === 'add' ? 'purchase' : 'adjustment',
      quantity: stockChange,
      unit_cost: unit_cost || currentItem.unit_cost,
      reason,
      notes,
      batch_number,
      expiry_date
    });

    // Check if item needs reorder alert
    if (newStock <= currentItem.reorder_level) {
      await this.createReorderAlert(inventory_item_id);
    }

    return updatedItem;
  }

  /**
   * Log stock movement
   */
  static async logStockMovement(movementData: {
    inventory_item_id: string;
    type: MovementType;
    quantity: number;
    unit_cost?: number;
    reason: string;
    notes?: string;
    order_id?: string;
    batch_number?: string;
    expiry_date?: string;
  }, userId: string = 'system'): Promise<StockMovement> {
    const movement: StockMovement = {
      id: this.generateMovementId(),
      ...movementData,
      total_cost: movementData.quantity * (movementData.unit_cost || 0),
      created_at: new Date().toISOString(),
      created_by: userId,
      is_synced: false
    };

    try {
      // Try to create on server first
      const response = await ApiService.post(`${this.API_ENDPOINT}/movements`, movement);
      
      if (response.success) {
        await DatabaseService.createStockMovement(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving movement locally');
    }

    // Save locally and mark for sync
    await DatabaseService.createStockMovement(movement);
    await DatabaseService.markForSync(movement.id, 'create');
    
    return movement;
  }

  /**
   * Get stock movements for an item
   */
  static async getStockMovements(itemId: string, limit?: number): Promise<StockMovement[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/${itemId}/movements`, { params: { limit } });
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading movements from local cache');
    }

    return await DatabaseService.getStockMovementsByItem(itemId, limit);
  }

  /**
   * Create reorder alert
   */
  static async createReorderAlert(itemId: string): Promise<ReorderAlert> {
    const item = await this.getInventoryItemById(itemId);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    // Check if alert already exists
    const existingAlerts = await DatabaseService.getReorderAlerts();
    const existingAlert = existingAlerts.find(alert => 
      alert.inventory_item_id === itemId && alert.status === 'active'
    );

    if (existingAlert) {
      return existingAlert;
    }

    // Calculate suggested quantity (3x reorder level or minimum order quantity)
    const suggestedQuantity = Math.max(
      item.reorder_level * 3,
      item.minimum_order_quantity || item.reorder_level
    );

    const alert: ReorderAlert = {
      id: this.generateAlertId(),
      inventory_item_id: itemId,
      item_name: item.name,
      current_stock: item.current_stock,
      reorder_level: item.reorder_level,
      suggested_quantity: suggestedQuantity,
      priority: this.calculateAlertPriority(item),
      status: 'active',
      created_at: new Date().toISOString()
    };

    try {
      // Try to create on server first
      const response = await ApiService.post(`${this.API_ENDPOINT}/reorder-alerts`, alert);
      
      if (response.success) {
        await DatabaseService.createReorderAlert(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving alert locally');
    }

    // Save locally
    await DatabaseService.createReorderAlert(alert);
    return alert;
  }

  /**
   * Get active reorder alerts
   */
  static async getReorderAlerts(status?: 'active' | 'acknowledged' | 'resolved'): Promise<ReorderAlert[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/reorder-alerts`, { params: { status } });
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading alerts from local cache');
    }

    const alerts = await DatabaseService.getReorderAlerts();
    return status ? alerts.filter(alert => alert.status === status) : alerts;
  }

  /**
   * Search inventory items
   */
  static async searchInventoryItems(query: string): Promise<InventoryItem[]> {
    const allItems = await this.getAllInventoryItems();
    
    const searchTerm = query.toLowerCase();
    
    return allItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.sku?.toLowerCase().includes(searchTerm) ||
      item.supplier?.toLowerCase().includes(searchTerm) ||
      item.notes?.toLowerCase().includes(searchTerm) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get items by category
   */
  static async getItemsByCategory(category: InventoryCategory): Promise<InventoryItem[]> {
    return await this.getAllInventoryItems({ category });
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(): Promise<InventoryItem[]> {
    return await this.getAllInventoryItems({ 
      stock_level: ['out_of_stock', 'critical', 'low'] 
    });
  }

  /**
   * Get inventory analytics
   */
  static async getInventoryAnalytics(period: 'month' | 'quarter' | 'year' = 'month'): Promise<InventoryAnalytics> {
    const allItems = await this.getAllInventoryItems();
    const allMovements = await DatabaseService.getAllStockMovements();
    
    // Filter movements by period
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

    const periodMovements = allMovements.filter(movement => 
      new Date(movement.created_at) >= periodStart
    );

    // Calculate summary
    const totalValue = allItems.reduce((sum, item) => sum + (item.total_value || 0), 0);
    const lowStockItems = allItems.filter(item => 
      ['critical', 'low', 'out_of_stock'].includes(item.stock_level)
    );

    // Calculate by category
    const byCategory = {} as any;
    for (const item of allItems) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = {
          item_count: 0,
          total_value: 0,
          low_stock_count: 0,
          usage_value: 0
        };
      }
      
      byCategory[item.category].item_count++;
      byCategory[item.category].total_value += item.total_value || 0;
      
      if (['critical', 'low', 'out_of_stock'].includes(item.stock_level)) {
        byCategory[item.category].low_stock_count++;
      }
      
      // Calculate usage value from movements
      const itemUsage = periodMovements
        .filter(m => m.inventory_item_id === item.id && m.type === 'usage')
        .reduce((sum, m) => sum + (m.total_cost || 0), 0);
      byCategory[item.category].usage_value += itemUsage;
    }

    // Calculate movement statistics
    const purchases = periodMovements.filter(m => m.type === 'purchase');
    const usage = periodMovements.filter(m => m.type === 'usage');
    const adjustments = periodMovements.filter(m => m.type === 'adjustment');

    // Calculate turnover
    const fastMoving = allItems
      .filter(item => {
        const itemUsage = periodMovements
          .filter(m => m.inventory_item_id === item.id && m.type === 'usage')
          .reduce((sum, m) => sum + m.quantity, 0);
        return itemUsage > (item.current_stock * 0.5); // Used more than 50% of current stock
      })
      .slice(0, 10);

    const slowMoving = allItems
      .filter(item => {
        const itemUsage = periodMovements
          .filter(m => m.inventory_item_id === item.id && m.type === 'usage')
          .reduce((sum, m) => sum + m.quantity, 0);
        return itemUsage < (item.current_stock * 0.1); // Used less than 10% of current stock
      })
      .slice(0, 10);

    return {
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      },
      summary: {
        total_items: allItems.length,
        total_value: totalValue,
        low_stock_items: lowStockItems.length,
        out_of_stock_items: allItems.filter(item => item.stock_level === 'out_of_stock').length,
        total_movements: periodMovements.length
      },
      by_category: byCategory,
      movements: {
        purchases: {
          count: purchases.length,
          total_cost: purchases.reduce((sum, m) => sum + (m.total_cost || 0), 0),
          average_cost: purchases.length > 0 
            ? purchases.reduce((sum, m) => sum + (m.total_cost || 0), 0) / purchases.length 
            : 0
        },
        usage: {
          count: usage.length,
          total_value: usage.reduce((sum, m) => sum + (m.total_cost || 0), 0),
          average_value: usage.length > 0 
            ? usage.reduce((sum, m) => sum + (m.total_cost || 0), 0) / usage.length 
            : 0
        },
        adjustments: {
          count: adjustments.length,
          net_value: adjustments.reduce((sum, m) => sum + (m.total_cost || 0), 0)
        }
      },
      turnover: {
        fast_moving: fastMoving,
        slow_moving: slowMoving,
        average_turnover_days: (() => {
          const totalUsageValue = usage.reduce((sum, m) => sum + Math.abs(m.total_cost || 0), 0);
          const periodDays = Math.max(1, (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
          const dailyUsageValue = totalUsageValue / periodDays;
          return dailyUsageValue > 0 ? Math.round(totalValue / dailyUsageValue) : 30;
        })()
      },
      trends: {
        stock_value_change: (() => {
          const purchaseValue = purchases.reduce((sum, m) => sum + (m.total_cost || 0), 0);
          const usageValue = usage.reduce((sum, m) => sum + Math.abs(m.total_cost || 0), 0);
          return purchaseValue - usageValue;
        })(),
        usage_trend: 'stable',
        reorder_frequency: allItems.filter(item => item.current_stock <= item.reorder_level).length
      }
    };
  }

  /**
   * Calculate stock level based on current stock and reorder level
   */
  private static calculateStockLevel(currentStock: number, reorderLevel: number): StockLevel {
    if (currentStock <= 0) return 'out_of_stock';
    if (currentStock <= reorderLevel * 0.1) return 'critical';
    if (currentStock <= reorderLevel * 0.5) return 'low';
    if (currentStock <= reorderLevel) return 'adequate';
    return 'high';
  }

  /**
   * Enrich item with calculated stock level
   */
  private static enrichItemWithStockLevel(item: InventoryItem): InventoryItem {
    return {
      ...item,
      stock_level: this.calculateStockLevel(item.current_stock, item.reorder_level),
      total_value: item.current_stock * item.unit_cost
    };
  }

  /**
   * Calculate alert priority based on stock level and usage
   */
  private static calculateAlertPriority(item: InventoryItem): 'low' | 'medium' | 'high' | 'critical' {
    if (item.stock_level === 'out_of_stock') return 'critical';
    if (item.stock_level === 'critical') return 'high';
    if (item.stock_level === 'low' && item.is_consumable) return 'medium';
    return 'low';
  }

  /**
   * Validate inventory item data
   */
  private static validateInventoryItemData(data: CreateInventoryItemData | UpdateInventoryItemData, isCreate = true): void {
    if (isCreate && !data.name) {
      throw new Error('Item name is required');
    }

    if (data.name && (data.name.length < 2 || data.name.length > 100)) {
      throw new Error('Item name must be between 2 and 100 characters');
    }

    if (data.current_stock !== undefined && data.current_stock < 0) {
      throw new Error('Current stock cannot be negative');
    }

    if (data.reorder_level !== undefined && data.reorder_level < 0) {
      throw new Error('Reorder level cannot be negative');
    }

    if (data.unit_cost !== undefined && data.unit_cost < 0) {
      throw new Error('Unit cost cannot be negative');
    }

    if (data.max_stock_level !== undefined && data.reorder_level !== undefined && 
        data.max_stock_level < data.reorder_level) {
      throw new Error('Maximum stock level cannot be less than reorder level');
    }
  }

  /**
   * Generate unique inventory item ID
   */
  private static generateInventoryItemId(): string {
    return 'inv_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate unique movement ID
   */
  private static generateMovementId(): string {
    return 'mov_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate unique alert ID
   */
  private static generateAlertId(): string {
    return 'alert_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Sync pending inventory data with server
   */
  static async syncPendingInventory(): Promise<void> {
    const pendingSyncItems = await DatabaseService.getPendingSyncItems('inventory');
    
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
        console.error(`Failed to sync inventory item ${item.entity_id}:`, error);
        // Continue with next item
      }
    }
  }
}