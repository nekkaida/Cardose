// Analytics and reporting routes
const { sampleCustomers, sampleOrders, sampleInventory } = require('../data/sampleData');

async function analyticsRoutes(fastify, options) {
  // Get business analytics dashboard
  fastify.get('/dashboard', async (request, reply) => {
    // Calculate real metrics from sample data
    const totalRevenue = sampleOrders.reduce((sum, order) => sum + order.pricing.finalPrice, 0);
    const averageOrderValue = totalRevenue / sampleOrders.length;
    const lowStockItems = sampleInventory.filter(item => item.currentStock <= item.reorderLevel);
    const totalInventoryValue = sampleInventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
    
    const customerSegments = {
      corporate: sampleCustomers.filter(c => c.businessType === 'corporate').length,
      wedding: sampleCustomers.filter(c => c.businessType === 'wedding').length,
      individual: sampleCustomers.filter(c => c.businessType === 'individual').length,
      trading: sampleCustomers.filter(c => c.businessType === 'trading').length,
      nonprofit: sampleCustomers.filter(c => c.businessType === 'nonprofit').length
    };

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthlyOrders = sampleOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() + 1 === currentMonth && orderDate.getFullYear() === currentYear;
    });

    // Generate last 6 months revenue data
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const monthOrders = sampleOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
      });
      
      monthlyRevenue.push({
        month: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        revenue: monthOrders.reduce((sum, order) => sum + order.pricing.finalPrice, 0)
      });
    }

    return {
      success: true,
      analytics: {
        revenue: {
          totalRevenue: totalRevenue,
          revenueGrowth: 15.2,
          averageOrderValue: Math.round(averageOrderValue),
          monthlyRevenue: monthlyRevenue
        },
        customers: {
          totalCustomers: sampleCustomers.length,
          newCustomers: sampleCustomers.filter(c => new Date(c.createdAt) >= new Date(currentYear, currentMonth - 2)).length,
          activeCustomers: sampleCustomers.filter(c => c.totalOrders > 0).length,
          customerRetentionRate: 85.5,
          customerSegments: customerSegments
        },
        inventory: {
          totalItems: sampleInventory.length,
          lowStockItems: lowStockItems.length,
          totalValue: Math.round(totalInventoryValue),
          turnoverRate: 4.2
        },
        production: {
          totalTasks: sampleOrders.length,
          completedTasks: sampleOrders.filter(o => o.status === 'completed').length,
          onTimeDelivery: 92.5,
          averageCompletionTime: 3.2,
          capacityUtilization: 75
        },
        kpis: [
          {
            id: 'revenue',
            name: 'Total Revenue',
            value: totalRevenue,
            unit: 'IDR',
            target: 25000000,
            trend: 'up',
            changePercentage: 15.2
          },
          {
            id: 'orders',
            name: 'Orders This Month',
            value: monthlyOrders.length,
            unit: 'orders',
            target: 5,
            trend: 'up',
            changePercentage: 8.5
          },
          {
            id: 'customers',
            name: 'Active Customers',
            value: sampleCustomers.filter(c => c.totalOrders > 0).length,
            unit: 'customers',
            target: 10,
            trend: 'stable',
            changePercentage: 2.1
          },
          {
            id: 'avg_order',
            name: 'Average Order Value',
            value: Math.round(averageOrderValue),
            unit: 'IDR',
            target: 8000000,
            trend: 'up',
            changePercentage: 12.3
          }
        ]
      }
    };
  });

  // Get revenue analytics
  fastify.get('/revenue', async (request, reply) => {
    const { period = '30d' } = request.query;
    
    return {
      success: true,
      revenueData: {
        totalRevenue: 125000000,
        revenueGrowth: 15.2,
        projectedRevenue: 145000000,
        revenueByProduct: {
          'Premium Box': 65000000,
          'Corporate Package': 35000000,
          'Wedding Collection': 25000000
        },
        revenueBySegment: {
          corporate: 75000000,
          wedding: 30000000,
          individual: 20000000
        },
        monthlyTrend: [
          { date: '2024-01', amount: 45000000 },
          { date: '2024-02', amount: 52000000 },
          { date: '2024-03', amount: 48000000 },
          { date: '2024-04', amount: 65000000 },
          { date: '2024-05', amount: 72000000 },
          { date: '2024-06', amount: 80000000 }
        ]
      }
    };
  });

  // Get customer analytics
  fastify.get('/customers', async (request, reply) => {
    return {
      success: true,
      customerAnalytics: {
        totalCustomers: 125,
        newCustomers: 15,
        activeCustomers: 89,
        churnRate: 5.2,
        averageLifetimeValue: 8500000,
        customerSegments: {
          corporate: 45,
          wedding: 35,
          individual: 30,
          event: 15
        },
        topCustomers: [
          {
            customer: { name: 'PT. Maju Bersama', id: 'cust_001' },
            totalSpent: 25000000,
            orderCount: 12
          },
          {
            customer: { name: 'CV. Sukses Mandiri', id: 'cust_002' },
            totalSpent: 18000000,
            orderCount: 8
          }
        ],
        acquisitionTrend: [
          { month: 'Jan', newCustomers: 8 },
          { month: 'Feb', newCustomers: 12 },
          { month: 'Mar', newCustomers: 10 },
          { month: 'Apr', newCustomers: 15 },
          { month: 'May', newCustomers: 18 },
          { month: 'Jun', newCustomers: 15 }
        ]
      }
    };
  });

  // Get inventory analytics
  fastify.get('/inventory', async (request, reply) => {
    return {
      success: true,
      inventoryAnalytics: {
        totalItems: 156,
        totalValue: 25000000,
        lowStockItems: 8,
        turnoverRate: 4.2,
        stockByCategory: {
          cardboard: 45,
          ribbons: 25,
          fabric: 30,
          accessories: 35,
          tools: 21
        },
        topMovingItems: [
          {
            item: { name: 'Premium Cardboard A4', id: 'inv_001' },
            velocity: 25
          },
          {
            item: { name: 'Satin Ribbon Gold', id: 'inv_002' },
            velocity: 18
          }
        ],
        stockAlerts: [
          { name: 'Satin Ribbon Red', currentStock: 5, reorderLevel: 10 },
          { name: 'Velvet Fabric Blue', currentStock: 8, reorderLevel: 15 }
        ]
      }
    };
  });

  // Get production analytics
  fastify.get('/production', async (request, reply) => {
    return {
      success: true,
      productionAnalytics: {
        totalTasks: 45,
        completedTasks: 38,
        onTimeDelivery: 92.5,
        averageCompletionTime: 3.2,
        capacityUtilization: 75,
        qualityMetrics: {
          passRate: 96.5,
          avgScore: 4.3
        },
        productionEfficiency: 88.5,
        taskStatusBreakdown: {
          'not_started': 3,
          'in_progress': 4,
          'quality_check': 2,
          'completed': 38
        },
        weeklyProductivity: [
          { week: 'Week 1', completed: 8 },
          { week: 'Week 2', completed: 12 },
          { week: 'Week 3', completed: 10 },
          { week: 'Week 4', completed: 8 }
        ]
      }
    };
  });

  // Export analytics data
  fastify.post('/export', async (request, reply) => {
    const { type, format, dateRange } = request.body;
    
    return {
      success: true,
      message: 'Export prepared successfully',
      downloadUrl: `/api/analytics/download/${type}_${Date.now()}.${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  });
}

module.exports = analyticsRoutes;