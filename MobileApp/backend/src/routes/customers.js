// Customer management routes
const { sampleCustomers } = require('../data/sampleData');

async function customerRoutes(fastify, options) {
  // Get all customers
  fastify.get('/', async (request, reply) => {
    return {
      success: true,
      customers: sampleCustomers,
      total: sampleCustomers.length,
      stats: {
        corporate: sampleCustomers.filter(c => c.businessType === 'corporate').length,
        wedding: sampleCustomers.filter(c => c.businessType === 'wedding').length,
        individual: sampleCustomers.filter(c => c.businessType === 'individual').length,
        trading: sampleCustomers.filter(c => c.businessType === 'trading').length,
        totalValue: sampleCustomers.reduce((sum, c) => sum + c.totalSpent, 0)
      }
    };
  });

  // Create customer
  fastify.post('/customers', async (request, reply) => {
    const customerData = request.body;
    
    return {
      success: true,
      message: 'Customer created successfully',
      customer: {
        id: `customer_${Date.now()}`,
        ...customerData,
        createdAt: new Date()
      }
    };
  });

  // Get customer by ID
  fastify.get('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    
    return {
      success: true,
      customer: {
        id,
        name: 'Sample Customer',
        email: 'customer@example.com',
        phone: '+62-812-3456789'
      }
    };
  });

  // Update customer
  fastify.put('/customers/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    return {
      success: true,
      message: 'Customer updated successfully',
      customer: { id, ...updates, updatedAt: new Date() }
    };
  });
}

module.exports = customerRoutes;