// Financial management routes
const { sampleOrders, indonesianTaxRates } = require('../data/sampleData');

async function financialRoutes(fastify, options) {
  // Get financial summary
  fastify.get('/summary', async (request, reply) => {
    const totalRevenue = sampleOrders.reduce((sum, order) => sum + order.pricing.finalPrice, 0);
    const totalCosts = sampleOrders.reduce((sum, order) => 
      sum + order.pricing.materialCost + order.pricing.laborCost + order.pricing.overheadCost, 0);
    const totalTax = sampleOrders.reduce((sum, order) => sum + order.pricing.ppnAmount, 0);
    const netProfit = totalRevenue - totalCosts - totalTax;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

    const pendingOrders = sampleOrders.filter(o => o.status === 'pending' || o.status === 'in_progress');
    const completedOrders = sampleOrders.filter(o => o.status === 'completed');

    return {
      success: true,
      summary: {
        totalRevenue: totalRevenue,
        totalExpenses: totalCosts,
        totalTax: totalTax,
        netProfit: netProfit,
        profitMargin: profitMargin.toFixed(2),
        pendingInvoices: pendingOrders.length,
        completedOrders: completedOrders.length,
        averageOrderValue: sampleOrders.length > 0 ? totalRevenue / sampleOrders.length : 0,
        ppnRate: indonesianTaxRates.ppn.rate,
        monthlyGrowth: 12.5
      }
    };
  });

  // Get all transactions
  fastify.get('/financial/transactions', async (request, reply) => {
    const transactions = [
      {
        id: 'tx_001',
        type: 'income',
        amount: 8325000,
        description: 'Payment from PT. Maju Bersama Indonesia - Order PGB-2024-001',
        category: 'sales',
        orderId: 'order_001',
        customerId: 'cust_001',
        date: '2024-08-17',
        paymentMethod: 'bank_transfer',
        bankAccount: 'BCA 1234567890',
        ppnAmount: 825000,
        baseAmount: 7500000,
        invoiceNumber: 'INV-PGB-2024-001'
      },
      {
        id: 'tx_002',
        type: 'income',
        amount: 3607500,
        description: 'Payment from CV. Sukses Mandiri - Order PGB-2024-003',
        category: 'sales',
        orderId: 'order_003',
        customerId: 'cust_002',
        date: '2024-08-10',
        paymentMethod: 'cash',
        ppnAmount: 357500,
        baseAmount: 3250000,
        invoiceNumber: 'INV-PGB-2024-003'
      },
      {
        id: 'tx_003',
        type: 'expense',
        amount: 2550000,
        description: 'Material purchase - Art Paper 310gsm (300 lembar)',
        category: 'materials',
        supplier: 'PT. Indah Kiat Pulp & Paper',
        date: '2024-08-01',
        paymentMethod: 'bank_transfer',
        ppnAmount: 255000,
        baseAmount: 2295000,
        invoiceNumber: 'PO-001-2024'
      },
      {
        id: 'tx_004',
        type: 'expense',
        amount: 375000,
        description: 'Ribbon restock - Satin Gold (25 rolls)',
        category: 'materials',
        supplier: 'CV. Ribbon Nusantara',
        date: '2024-07-15',
        paymentMethod: 'cash',
        ppnAmount: 37500,
        baseAmount: 337500
      },
      {
        id: 'tx_005',
        type: 'expense',
        amount: 500000,
        description: 'Labor cost - Production Team B overtime',
        category: 'labor',
        date: '2024-08-16',
        paymentMethod: 'bank_transfer',
        description2: 'Rush order untuk Wedding Organizer Bintang'
      }
    ];

    return {
      success: true,
      transactions,
      summary: {
        totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        netIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - 
                  transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        totalPpnCollected: transactions.filter(t => t.type === 'income' && t.ppnAmount).reduce((sum, t) => sum + t.ppnAmount, 0),
        totalPpnPaid: transactions.filter(t => t.type === 'expense' && t.ppnAmount).reduce((sum, t) => sum + t.ppnAmount, 0)
      }
    };
  });

  // Create transaction
  fastify.post('/financial/transactions', async (request, reply) => {
    const transactionData = request.body;
    
    return {
      success: true,
      message: 'Transaction recorded successfully',
      transaction: {
        id: `tx_${Date.now()}`,
        ...transactionData,
        createdAt: new Date()
      }
    };
  });

  // Calculate pricing
  fastify.post('/financial/calculate-price', async (request, reply) => {
    const { materials, laborHours, overhead, markup } = request.body;
    
    const materialCost = materials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
    const laborCost = laborHours * 50000; // IDR 50k per hour
    const overheadCost = (materialCost + laborCost) * (overhead / 100);
    const subtotal = materialCost + laborCost + overheadCost;
    const markupAmount = subtotal * (markup / 100);
    const basePrice = subtotal + markupAmount;
    const tax = basePrice * 0.11; // PPN 11%
    const finalPrice = basePrice + tax;
    
    return {
      success: true,
      pricing: {
        materialCost,
        laborCost,
        overheadCost,
        markupAmount,
        basePrice,
        tax,
        finalPrice,
        breakdown: {
          materials: materialCost,
          labor: laborCost,
          overhead: overheadCost,
          markup: markupAmount,
          tax: tax
        }
      }
    };
  });

  // Get Indonesian tax reports
  fastify.get('/financial/tax-report', async (request, reply) => {
    const { month, year } = request.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Calculate PPN for the month
    const monthlyOrders = sampleOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() + 1 === parseInt(currentMonth) && 
             orderDate.getFullYear() === parseInt(currentYear);
    });

    const ppnCollected = monthlyOrders.reduce((sum, order) => sum + order.pricing.ppnAmount, 0);
    const ppnBase = monthlyOrders.reduce((sum, order) => sum + order.pricing.subtotal, 0);

    return {
      success: true,
      taxReport: {
        period: `${currentMonth}/${currentYear}`,
        ppn: {
          rate: indonesianTaxRates.ppn.rate,
          baseAmount: ppnBase,
          taxAmount: ppnCollected,
          status: ppnCollected > 0 ? 'ada_tagihan' : 'tidak_ada_tagihan'
        },
        summary: {
          totalRevenue: ppnBase + ppnCollected,
          totalOrders: monthlyOrders.length,
          averageOrderValue: monthlyOrders.length > 0 ? (ppnBase + ppnCollected) / monthlyOrders.length : 0
        },
        compliance: {
          npwp: 'Terdaftar',
          sakEtap: 'Berlaku',
          lastFilingDate: '2024-07-20',
          nextFilingDue: '2024-09-20'
        }
      }
    };
  });

  // Get business analytics dashboard
  fastify.get('/financial/analytics', async (request, reply) => {
    const monthlyRevenue = [];
    const currentDate = new Date();
    
    // Generate last 6 months revenue data
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthOrders = sampleOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === date.getMonth() && 
               orderDate.getFullYear() === date.getFullYear();
      });
      
      const revenue = monthOrders.reduce((sum, order) => sum + order.pricing.finalPrice, 0);
      const orders = monthOrders.length;
      
      monthlyRevenue.push({
        month: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        revenue: revenue,
        orders: orders,
        avgOrderValue: orders > 0 ? revenue / orders : 0
      });
    }

    const customerTypes = {
      corporate: sampleOrders.filter(o => 
        sampleCustomers.find(c => c.id === o.customerId)?.businessType === 'corporate'
      ).reduce((sum, o) => sum + o.pricing.finalPrice, 0),
      wedding: sampleOrders.filter(o => 
        sampleCustomers.find(c => c.id === o.customerId)?.businessType === 'wedding'
      ).reduce((sum, o) => sum + o.pricing.finalPrice, 0),
      trading: sampleOrders.filter(o => 
        sampleCustomers.find(c => c.id === o.customerId)?.businessType === 'trading'
      ).reduce((sum, o) => sum + o.pricing.finalPrice, 0)
    };

    return {
      success: true,
      analytics: {
        revenue: {
          monthlyRevenue: monthlyRevenue,
          totalRevenue: sampleOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0),
          growthRate: 12.5,
          projectedMonthly: 25000000
        },
        customers: {
          total: sampleCustomers.length,
          byType: {
            corporate: sampleCustomers.filter(c => c.businessType === 'corporate').length,
            wedding: sampleCustomers.filter(c => c.businessType === 'wedding').length,
            trading: sampleCustomers.filter(c => c.businessType === 'trading').length,
            individual: sampleCustomers.filter(c => c.businessType === 'individual').length
          },
          revenueByType: customerTypes,
          topCustomers: sampleCustomers
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5)
            .map(c => ({ name: c.name, totalSpent: c.totalSpent, totalOrders: c.totalOrders }))
        },
        orders: {
          total: sampleOrders.length,
          byStatus: {
            pending: sampleOrders.filter(o => o.status === 'pending').length,
            in_progress: sampleOrders.filter(o => o.status === 'in_progress').length,
            completed: sampleOrders.filter(o => o.status === 'completed').length
          },
          averageValue: sampleOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0) / sampleOrders.length,
          conversionRate: 85.5
        },
        profitability: {
          totalRevenue: sampleOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0),
          totalCosts: sampleOrders.reduce((sum, o) => sum + o.pricing.materialCost + o.pricing.laborCost, 0),
          grossProfit: sampleOrders.reduce((sum, o) => sum + o.pricing.finalPrice - o.pricing.materialCost - o.pricing.laborCost, 0),
          netProfit: sampleOrders.reduce((sum, o) => sum + o.pricing.finalPrice - o.pricing.materialCost - o.pricing.laborCost - o.pricing.overheadCost, 0),
          marginPercentage: 45.9
        }
      }
    };
  });
}

module.exports = financialRoutes;