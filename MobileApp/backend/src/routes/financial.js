// Financial management routes
const { v4: uuidv4 } = require('uuid');

async function financialRoutes(fastify, options) {
  const db = fastify.db;
  const PPN_RATE = 0.11; // 11% Indonesian VAT
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

  // ==================== INVOICE MANAGEMENT ====================

  // Create invoice for an order
  fastify.post('/invoices', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId, dueDate, notes, discountAmount = 0 } = request.body;

      if (!orderId) {
        return reply.status(400).send({ error: 'Order ID is required' });
      }

      // Get order details
      const order = await db.getOrderById(orderId);
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // Get customer details
      const customer = await db.getCustomerById(order.customer_id);

      // Calculate pricing
      const subtotal = order.total_price || 0;
      const discount = discountAmount || 0;
      const afterDiscount = subtotal - discount;
      const ppnAmount = afterDiscount * PPN_RATE;
      const totalAmount = afterDiscount + ppnAmount;

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Create invoice
      const invoiceId = uuidv4();
      const invoice = {
        id: invoiceId,
        invoice_number: invoiceNumber,
        order_id: orderId,
        customer_id: order.customer_id,
        subtotal: subtotal,
        discount: discount,
        ppn_rate: PPN_RATE * 100,
        ppn_amount: ppnAmount,
        total_amount: totalAmount,
        status: 'unpaid',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate || null,
        notes: notes || null,
        created_by: request.user.id
      };

      await db.createInvoice(invoice);

      return {
        success: true,
        message: 'Invoice created successfully',
        invoice: {
          ...invoice,
          customerName: customer?.name,
          orderNumber: order.order_number
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to create invoice: ' + error.message });
    }
  });

  // Get invoice by ID
  fastify.get('/invoices/:invoiceId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { invoiceId } = request.params;

      const invoice = await db.getInvoiceById(invoiceId);
      if (!invoice) {
        return reply.status(404).send({ error: 'Invoice not found' });
      }

      // Get related data
      const order = await db.getOrderById(invoice.order_id);
      const customer = await db.getCustomerById(invoice.customer_id);

      return {
        invoice: {
          ...invoice,
          order: {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status
          },
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch invoice' });
    }
  });

  // Get all invoices
  fastify.get('/invoices', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { status, customerId, startDate, endDate } = request.query;

      const invoices = await db.getAllInvoices({ status, customerId, startDate, endDate });

      return {
        invoices,
        total: invoices.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch invoices' });
    }
  });

  // Update invoice status
  fastify.put('/invoices/:invoiceId/status', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { invoiceId } = request.params;
      const { status, paidDate, paymentMethod } = request.body;

      if (!['unpaid', 'paid', 'cancelled'].includes(status)) {
        return reply.status(400).send({ error: 'Invalid status' });
      }

      const updates = { status };
      if (status === 'paid') {
        updates.paid_date = paidDate || new Date().toISOString().split('T')[0];
        updates.payment_method = paymentMethod || null;
      }

      await db.updateInvoice(invoiceId, updates);

      // If paid, create transaction record
      if (status === 'paid') {
        const invoice = await db.getInvoiceById(invoiceId);
        const transactionId = uuidv4();
        await db.run(
          `INSERT INTO financial_transactions (id, type, category, amount, description, order_id, payment_method, payment_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            'income',
            'sales',
            invoice.total_amount,
            `Payment for Invoice ${invoice.invoice_number}`,
            invoice.order_id,
            paymentMethod || 'cash',
            paidDate || new Date().toISOString().split('T')[0],
            request.user.id
          ]
        );
      }

      return {
        success: true,
        message: 'Invoice status updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update invoice status' });
    }
  });

  // ==================== PRICING CALCULATOR ====================

  // Calculate order pricing with materials and labor
  fastify.post('/calculate-pricing', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const {
        materials = [],
        laborHours = 0,
        overheadPercentage = 10,
        markupPercentage = 50,
        discountAmount = 0
      } = request.body;

      // Calculate material costs
      const materialCost = materials.reduce((sum, m) => {
        return sum + (m.quantity * m.unitCost);
      }, 0);

      // Calculate labor cost (IDR 50,000 per hour default)
      const laborCost = laborHours * 50000;

      // Calculate overhead
      const overheadCost = (materialCost + laborCost) * (overheadPercentage / 100);

      // Subtotal before markup
      const subtotal = materialCost + laborCost + overheadCost;

      // Apply markup
      const markupAmount = subtotal * (markupPercentage / 100);
      const afterMarkup = subtotal + markupAmount;

      // Apply discount
      const afterDiscount = afterMarkup - discountAmount;

      // Calculate PPN (11%)
      const ppnAmount = afterDiscount * PPN_RATE;

      // Final price
      const finalPrice = afterDiscount + ppnAmount;

      // Calculate profit
      const profit = afterDiscount - materialCost - laborCost - overheadCost;
      const profitMargin = afterDiscount > 0 ? (profit / afterDiscount) * 100 : 0;

      return {
        success: true,
        pricing: {
          breakdown: {
            materialCost,
            laborCost,
            overheadCost,
            subtotal,
            markupAmount,
            markupPercentage,
            afterMarkup,
            discountAmount,
            afterDiscount,
            ppnRate: PPN_RATE * 100,
            ppnAmount,
            finalPrice
          },
          profitAnalysis: {
            profit,
            profitMargin: profitMargin.toFixed(2),
            costBreakdown: {
              materials: ((materialCost / subtotal) * 100).toFixed(1),
              labor: ((laborCost / subtotal) * 100).toFixed(1),
              overhead: ((overheadCost / subtotal) * 100).toFixed(1)
            }
          },
          formattedPrices: {
            subtotal: `Rp ${subtotal.toLocaleString('id-ID')}`,
            afterDiscount: `Rp ${afterDiscount.toLocaleString('id-ID')}`,
            ppn: `Rp ${ppnAmount.toLocaleString('id-ID')}`,
            total: `Rp ${finalPrice.toLocaleString('id-ID')}`
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to calculate pricing' });
    }
  });

  // ==================== BUDGET TRACKING ====================

  // Create budget
  fastify.post('/budgets', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { category, amount, period, startDate, endDate, notes } = request.body;

      if (!category || !amount || !period) {
        return reply.status(400).send({ error: 'Category, amount, and period are required' });
      }

      const budgetId = uuidv4();
      const budget = {
        id: budgetId,
        category,
        amount,
        period,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        created_by: request.user.id
      };

      await db.createBudget(budget);

      return {
        success: true,
        message: 'Budget created successfully',
        budget
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to create budget' });
    }
  });

  // Get budget with actual spending
  fastify.get('/budgets/:budgetId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { budgetId } = request.params;

      const budget = await db.getBudgetById(budgetId);
      if (!budget) {
        return reply.status(404).send({ error: 'Budget not found' });
      }

      // Calculate actual spending
      const actualSpending = await db.getBudgetActualSpending(
        budget.category,
        budget.start_date,
        budget.end_date
      );

      const variance = budget.amount - actualSpending;
      const percentageUsed = budget.amount > 0 ? (actualSpending / budget.amount) * 100 : 0;

      return {
        budget: {
          ...budget,
          actualSpending,
          variance,
          percentageUsed: percentageUsed.toFixed(2),
          status: percentageUsed > 100 ? 'over' : percentageUsed > 90 ? 'warning' : 'good'
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch budget' });
    }
  });

  // Get all budgets
  fastify.get('/budgets', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const budgets = await db.getAllBudgets();

      // Add actual spending to each budget
      const budgetsWithActuals = await Promise.all(
        budgets.map(async (budget) => {
          const actualSpending = await db.getBudgetActualSpending(
            budget.category,
            budget.start_date,
            budget.end_date
          );

          const variance = budget.amount - actualSpending;
          const percentageUsed = budget.amount > 0 ? (actualSpending / budget.amount) * 100 : 0;

          return {
            ...budget,
            actualSpending,
            variance,
            percentageUsed: percentageUsed.toFixed(2),
            status: percentageUsed > 100 ? 'over' : percentageUsed > 90 ? 'warning' : 'good'
          };
        })
      );

      return {
        budgets: budgetsWithActuals,
        summary: {
          totalBudgeted: budgets.reduce((sum, b) => sum + b.amount, 0),
          totalSpent: budgetsWithActuals.reduce((sum, b) => sum + b.actualSpending, 0)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch budgets' });
    }
  });

  // ==================== TAX REPORTS ====================

  // Get tax report for period
  fastify.get('/tax-report', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate, month, year } = request.query;

      let start, end;
      if (month && year) {
        start = new Date(year, month - 1, 1).toISOString().split('T')[0];
        end = new Date(year, month, 0).toISOString().split('T')[0];
      } else {
        start = startDate;
        end = endDate;
      }

      const taxData = await db.getTaxReport(start, end);

      return {
        period: {
          start,
          end,
          display: month && year ? `${month}/${year}` : `${start} to ${end}`
        },
        ppn: {
          rate: PPN_RATE * 100,
          collected: taxData.ppnCollected || 0,
          paid: taxData.ppnPaid || 0,
          netPayable: (taxData.ppnCollected || 0) - (taxData.ppnPaid || 0),
          baseAmount: taxData.ppnBase || 0
        },
        summary: {
          totalIncome: taxData.totalIncome || 0,
          totalExpenses: taxData.totalExpenses || 0,
          netIncome: (taxData.totalIncome || 0) - (taxData.totalExpenses || 0),
          totalInvoices: taxData.invoiceCount || 0
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to generate tax report' });
    }
  });
}

module.exports = financialRoutes;