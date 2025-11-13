import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  BusinessAnalytics, 
  RevenueAnalytics, 
  CustomerAnalytics, 
  InventoryAnalytics,
  ProductionAnalytics,
  FinancialAnalytics,
  KPI,
  DashboardWidget,
  ReportFilter,
  ExportFormat
} from '../types/Analytics';
import { Order } from '../types/Order';
import { Customer } from '../types/Customer';
import { InventoryItem } from '../types/Inventory';
import { ProductionTask } from '../types/Production';
import { FinancialTransaction } from '../types/Financial';

export class AnalyticsService {
  private static readonly ANALYTICS_KEY = 'analytics_data';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async generateBusinessAnalytics(
    orders: Order[],
    customers: Customer[],
    inventory: InventoryItem[],
    productions: ProductionTask[],
    transactions: FinancialTransaction[]
  ): Promise<BusinessAnalytics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Revenue Analytics
    const revenueAnalytics = this.calculateRevenueAnalytics(orders, now);
    
    // Customer Analytics
    const customerAnalytics = this.calculateCustomerAnalytics(customers, orders, now);
    
    // Inventory Analytics
    const inventoryAnalytics = this.calculateInventoryAnalytics(inventory);
    
    // Production Analytics
    const productionAnalytics = this.calculateProductionAnalytics(productions, now);
    
    // Financial Analytics
    const financialAnalytics = this.calculateFinancialAnalytics(transactions, orders, now);

    // Key Performance Indicators
    const kpis = this.calculateKPIs(orders, customers, now);

    const analytics: BusinessAnalytics = {
      id: `analytics_${Date.now()}`,
      generatedAt: now,
      periodStart: thirtyDaysAgo,
      periodEnd: now,
      revenue: revenueAnalytics,
      customers: customerAnalytics,
      inventory: inventoryAnalytics,
      production: productionAnalytics,
      financial: financialAnalytics,
      kpis,
      trends: this.calculateTrends(orders, customers, now),
      alerts: this.generateAlerts(inventory, productions, orders)
    };

    // Cache the analytics
    await this.cacheAnalytics(analytics);
    
    return analytics;
  }

  private static calculateRevenueAnalytics(orders: Order[], now: Date): RevenueAnalytics {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentPeriodOrders = orders.filter(o => 
      new Date(o.createdAt) >= thirtyDaysAgo && o.status !== 'cancelled'
    );
    const previousPeriodOrders = orders.filter(o => 
      new Date(o.createdAt) >= sixtyDaysAgo && 
      new Date(o.createdAt) < thirtyDaysAgo && 
      o.status !== 'cancelled'
    );

    const totalRevenue = currentPeriodOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0);
    const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Revenue by product type
    const revenueByProduct = currentPeriodOrders.reduce((acc, order) => {
      const category = order.items[0]?.category || 'Other';
      acc[category] = (acc[category] || 0) + order.pricing.finalPrice;
      return acc;
    }, {} as Record<string, number>);

    // Revenue by customer segment
    const revenueBySegment = currentPeriodOrders.reduce((acc, order) => {
      const segment = order.customer.businessType || 'Individual';
      acc[segment] = (acc[segment] || 0) + order.pricing.finalPrice;
      return acc;
    }, {} as Record<string, number>);

    // Monthly revenue trend
    const monthlyRevenue = this.calculateMonthlyRevenue(orders, 12);

    return {
      totalRevenue,
      revenueGrowth,
      averageOrderValue: currentPeriodOrders.length > 0 ? totalRevenue / currentPeriodOrders.length : 0,
      revenueByProduct,
      revenueBySegment,
      monthlyRevenue,
      projectedRevenue: this.calculateProjectedRevenue(monthlyRevenue)
    };
  }

  private static calculateCustomerAnalytics(customers: Customer[], orders: Order[], now: Date): CustomerAnalytics {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const newCustomers = customers.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
    const activeCustomers = customers.filter(c => 
      orders.some(o => o.customer.id === c.id && new Date(o.createdAt) >= thirtyDaysAgo)
    ).length;

    const customerSegments = customers.reduce((acc, customer) => {
      const segment = customer.businessType || 'Individual';
      acc[segment] = (acc[segment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const customerLifetimeValue = this.calculateCustomerLifetimeValue(customers, orders);
    const churnRate = this.calculateChurnRate(customers, orders, now);

    return {
      totalCustomers: customers.length,
      newCustomers,
      activeCustomers,
      customerRetentionRate: ((activeCustomers / customers.length) * 100),
      customerSegments,
      averageLifetimeValue: customerLifetimeValue,
      churnRate,
      topCustomers: this.getTopCustomers(customers, orders, 10)
    };
  }

  private static calculateInventoryAnalytics(inventory: InventoryItem[]): InventoryAnalytics {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
    const lowStockItems = inventory.filter(item => 
      item.currentStock <= item.reorderLevel
    ).length;

    const stockByCategory = inventory.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.currentStock;
      return acc;
    }, {} as Record<string, number>);

    const turnoverRate = this.calculateInventoryTurnover(inventory);

    return {
      totalItems,
      totalValue,
      lowStockItems,
      stockByCategory,
      turnoverRate,
      topMovingItems: this.getTopMovingItems(inventory, 10),
      stockAlerts: inventory.filter(item => item.currentStock <= item.reorderLevel)
    };
  }

  private static calculateProductionAnalytics(productions: ProductionTask[], now: Date): ProductionAnalytics {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentTasks = productions.filter(p => new Date(p.createdAt) >= thirtyDaysAgo);
    const completedTasks = recentTasks.filter(p => p.status === 'completed');
    const onTimeTasks = completedTasks.filter(p => 
      p.completedAt && new Date(p.completedAt) <= new Date(p.dueDate)
    );

    const averageCompletionTime = this.calculateAverageCompletionTime(completedTasks);
    const capacityUtilization = this.calculateCapacityUtilization(productions, now);

    return {
      totalTasks: recentTasks.length,
      completedTasks: completedTasks.length,
      onTimeDelivery: completedTasks.length > 0 ? (onTimeTasks.length / completedTasks.length) * 100 : 0,
      averageCompletionTime,
      capacityUtilization,
      qualityMetrics: this.calculateQualityMetrics(completedTasks),
      productionEfficiency: this.calculateProductionEfficiency(recentTasks)
    };
  }

  private static calculateFinancialAnalytics(
    transactions: FinancialTransaction[], 
    orders: Order[], 
    now: Date
  ): FinancialAnalytics {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
    const income = recentTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = recentTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const profitMargin = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const cashFlow = income - expenses;

    const expensesByCategory = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: cashFlow,
      profitMargin,
      cashFlow,
      expensesByCategory,
      paymentMethods: this.analyzePaymentMethods(transactions),
      taxSummary: this.calculateTaxSummary(transactions, orders)
    };
  }

  private static calculateKPIs(orders: Order[], customers: Customer[], now: Date): KPI[] {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
    
    return [
      {
        id: 'revenue',
        name: 'Total Revenue',
        value: recentOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0),
        unit: 'IDR',
        target: 50000000,
        trend: 'up',
        changePercentage: 15.2
      },
      {
        id: 'orders',
        name: 'Orders This Month',
        value: recentOrders.length,
        unit: 'orders',
        target: 100,
        trend: 'up',
        changePercentage: 8.5
      },
      {
        id: 'customers',
        name: 'Active Customers',
        value: customers.filter(c => 
          recentOrders.some(o => o.customer.id === c.id)
        ).length,
        unit: 'customers',
        target: 50,
        trend: 'stable',
        changePercentage: 2.1
      },
      {
        id: 'avg_order',
        name: 'Average Order Value',
        value: recentOrders.length > 0 ? 
          recentOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0) / recentOrders.length : 0,
        unit: 'IDR',
        target: 500000,
        trend: 'up',
        changePercentage: 12.3
      }
    ];
  }

  private static calculateTrends(orders: Order[], customers: Customer[], now: Date): Record<string, any> {
    return {
      orderTrend: this.calculateOrderTrend(orders, now),
      customerGrowthTrend: this.calculateCustomerGrowthTrend(customers, now),
      seasonalTrends: this.calculateSeasonalTrends(orders),
      productTrends: this.calculateProductTrends(orders)
    };
  }

  private static generateAlerts(
    inventory: InventoryItem[], 
    productions: ProductionTask[], 
    orders: Order[]
  ): Array<{type: string, message: string, severity: 'low' | 'medium' | 'high'}> {
    const alerts = [];

    // Low stock alerts
    const lowStockItems = inventory.filter(item => item.currentStock <= item.reorderLevel);
    if (lowStockItems.length > 0) {
      alerts.push({
        type: 'inventory',
        message: `${lowStockItems.length} items are running low on stock`,
        severity: 'medium' as const
      });
    }

    // Overdue production tasks
    const overdueTasks = productions.filter(p => 
      p.status !== 'completed' && new Date(p.dueDate) < new Date()
    );
    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'production',
        message: `${overdueTasks.length} production tasks are overdue`,
        severity: 'high' as const
      });
    }

    // Pending orders
    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 5) {
      alerts.push({
        type: 'orders',
        message: `${pendingOrders.length} orders are pending processing`,
        severity: 'medium' as const
      });
    }

    return alerts;
  }

  // Helper methods
  private static calculateMonthlyRevenue(orders: Order[], months: number): Array<{month: string, revenue: number}> {
    const now = new Date();
    const monthlyData = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthRevenue = orders
        .filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= date && orderDate < nextMonth && o.status !== 'cancelled';
        })
        .reduce((sum, o) => sum + o.pricing.finalPrice, 0);

      monthlyData.push({
        month: date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }),
        revenue: monthRevenue
      });
    }

    return monthlyData;
  }

  private static calculateProjectedRevenue(monthlyRevenue: Array<{month: string, revenue: number}>): number {
    if (monthlyRevenue.length < 3) return 0;
    
    const lastThreeMonths = monthlyRevenue.slice(-3);
    const averageGrowth = lastThreeMonths.reduce((acc, curr, index, arr) => {
      if (index === 0) return acc;
      const previousRevenue = arr[index - 1].revenue;
      if (previousRevenue === 0) return acc;
      return acc + ((curr.revenue - previousRevenue) / previousRevenue);
    }, 0) / (lastThreeMonths.length - 1);

    const currentRevenue = monthlyRevenue[monthlyRevenue.length - 1].revenue;
    return currentRevenue * (1 + averageGrowth);
  }

  private static calculateCustomerLifetimeValue(customers: Customer[], orders: Order[]): number {
    const customerValues = customers.map(customer => {
      const customerOrders = orders.filter(o => o.customer.id === customer.id && o.status !== 'cancelled');
      return customerOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0);
    });

    return customerValues.length > 0 ? 
      customerValues.reduce((sum, val) => sum + val, 0) / customerValues.length : 0;
  }

  private static calculateChurnRate(customers: Customer[], orders: Order[], now: Date): number {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const activeCustomers = customers.filter(c => 
      orders.some(o => o.customer.id === c.id && new Date(o.createdAt) >= ninetyDaysAgo)
    );
    
    return customers.length > 0 ? 
      ((customers.length - activeCustomers.length) / customers.length) * 100 : 0;
  }

  private static getTopCustomers(customers: Customer[], orders: Order[], limit: number): Array<{customer: Customer, totalSpent: number, orderCount: number}> {
    const customerStats = customers.map(customer => {
      const customerOrders = orders.filter(o => o.customer.id === customer.id && o.status !== 'cancelled');
      const totalSpent = customerOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0);
      
      return {
        customer,
        totalSpent,
        orderCount: customerOrders.length
      };
    });

    return customerStats
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  private static calculateInventoryTurnover(inventory: InventoryItem[]): number {
    // Simplified turnover calculation
    const totalCost = inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
    const avgInventoryValue = totalCost / 2; // Simplified average
    return avgInventoryValue > 0 ? totalCost / avgInventoryValue : 0;
  }

  private static getTopMovingItems(inventory: InventoryItem[], limit: number): Array<{item: InventoryItem, velocity: number}> {
    // Calculate velocity based on stock movements (simplified)
    return inventory
      .map(item => ({
        item,
        velocity: item.totalUsed || 0 // This would need to be tracked in real implementation
      }))
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, limit);
  }

  private static calculateAverageCompletionTime(tasks: ProductionTask[]): number {
    const completedTasks = tasks.filter(t => t.completedAt);
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const start = new Date(task.createdAt).getTime();
      const end = new Date(task.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return totalTime / completedTasks.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  private static calculateCapacityUtilization(productions: ProductionTask[], now: Date): number {
    // Simplified capacity calculation
    const activeTasks = productions.filter(p => p.status === 'in_progress').length;
    const maxCapacity = 20; // Assuming max 20 concurrent tasks
    return (activeTasks / maxCapacity) * 100;
  }

  private static calculateQualityMetrics(tasks: ProductionTask[]): Record<string, number> {
    const qualityChecks = tasks.filter(t => t.qualityCheckResults && t.qualityCheckResults.length > 0);
    if (qualityChecks.length === 0) return { passRate: 0, avgScore: 0 };

    const passedChecks = qualityChecks.filter(t => 
      t.qualityCheckResults!.every(check => check.passed)
    );

    return {
      passRate: (passedChecks.length / qualityChecks.length) * 100,
      avgScore: qualityChecks.reduce((sum, t) => {
        const avgTaskScore = t.qualityCheckResults!.reduce((taskSum, check) => 
          taskSum + (check.passed ? 100 : 0), 0) / t.qualityCheckResults!.length;
        return sum + avgTaskScore;
      }, 0) / qualityChecks.length
    };
  }

  private static calculateProductionEfficiency(tasks: ProductionTask[]): number {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    if (completedTasks.length === 0) return 0;

    const onTimeTasks = completedTasks.filter(t => 
      t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate)
    );

    return (onTimeTasks.length / completedTasks.length) * 100;
  }

  private static analyzePaymentMethods(transactions: FinancialTransaction[]): Record<string, number> {
    return transactions.reduce((acc, transaction) => {
      const method = transaction.paymentMethod || 'Unknown';
      acc[method] = (acc[method] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);
  }

  private static calculateTaxSummary(transactions: FinancialTransaction[], orders: Order[]): Record<string, number> {
    const totalTax = orders.reduce((sum, order) => sum + (order.pricing.tax || 0), 0);
    const taxableIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalTax,
      taxableIncome,
      taxRate: taxableIncome > 0 ? (totalTax / taxableIncome) * 100 : 0
    };
  }

  private static calculateOrderTrend(orders: Order[], now: Date): Array<{date: string, count: number}> {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === date.toDateString();
      });

      last30Days.push({
        date: date.toLocaleDateString('id-ID'),
        count: dayOrders.length
      });
    }
    return last30Days;
  }

  private static calculateCustomerGrowthTrend(customers: Customer[], now: Date): Array<{month: string, newCustomers: number}> {
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const newCustomers = customers.filter(c => {
        const customerDate = new Date(c.createdAt);
        return customerDate >= date && customerDate < nextMonth;
      }).length;

      last12Months.push({
        month: date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }),
        newCustomers
      });
    }
    return last12Months;
  }

  private static calculateSeasonalTrends(orders: Order[]): Record<string, number> {
    const seasonalData = orders.reduce((acc, order) => {
      const month = new Date(order.createdAt).getMonth();
      const season = this.getSeasonFromMonth(month);
      acc[season] = (acc[season] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return seasonalData;
  }

  private static calculateProductTrends(orders: Order[]): Array<{product: string, trend: 'up' | 'down' | 'stable', orderCount: number}> {
    const productCounts = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        acc[item.name] = (acc[item.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productCounts)
      .map(([product, orderCount]) => ({
        product,
        orderCount,
        trend: 'stable' as const // Simplified - would need historical data for real trends
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);
  }

  private static getSeasonFromMonth(month: number): string {
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  static async getCachedAnalytics(): Promise<BusinessAnalytics | null> {
    try {
      const cached = await AsyncStorage.getItem(this.ANALYTICS_KEY);
      if (!cached) return null;

      const analytics = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(analytics.generatedAt).getTime();
      
      if (cacheAge > this.CACHE_DURATION) {
        await AsyncStorage.removeItem(this.ANALYTICS_KEY);
        return null;
      }

      return analytics;
    } catch (error) {
      console.error('Error retrieving cached analytics:', error);
      return null;
    }
  }

  private static async cacheAnalytics(analytics: BusinessAnalytics): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.error('Error caching analytics:', error);
    }
  }

  static async exportAnalytics(
    analytics: BusinessAnalytics, 
    format: ExportFormat,
    filter?: ReportFilter
  ): Promise<string> {
    // Implementation would depend on the export format
    // For now, return a simple JSON string
    const exportData = {
      ...analytics,
      exportedAt: new Date(),
      format,
      filter
    };

    return JSON.stringify(exportData, null, 2);
  }

  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ANALYTICS_KEY);
    } catch (error) {
      console.error('Error clearing analytics cache:', error);
    }
  }
}