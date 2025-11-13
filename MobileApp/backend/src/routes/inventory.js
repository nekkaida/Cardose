// Inventory management routes
const { sampleInventory } = require('../data/sampleData');

async function inventoryRoutes(fastify, options) {
  // Get all inventory items
  fastify.get('/', async (request, reply) => {
    const lowStockItems = sampleInventory.filter(item => item.currentStock <= item.reorderLevel);
    const outOfStockItems = sampleInventory.filter(item => item.currentStock === 0);
    const totalValue = sampleInventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);

    return {
      success: true,
      inventory: sampleInventory,
      total: sampleInventory.length,
      stats: {
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalValue: totalValue,
        categories: {
          paper: sampleInventory.filter(item => item.category === 'paper').length,
          ribbon: sampleInventory.filter(item => item.category === 'ribbon').length,
          insert: sampleInventory.filter(item => item.category === 'insert').length,
          finishing: sampleInventory.filter(item => item.category === 'finishing').length
        }
      },
      alerts: lowStockItems.map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        message: `${item.name} is running low (${item.currentStock} remaining, reorder at ${item.reorderLevel})`
      }))
    };
  });

  // Add inventory item
  fastify.post('/inventory', async (request, reply) => {
    const itemData = request.body;
    
    return {
      success: true,
      message: 'Inventory item added successfully',
      item: {
        id: `inv_${Date.now()}`,
        ...itemData,
        createdAt: new Date()
      }
    };
  });

  // Update stock levels
  fastify.put('/inventory/:id/stock', async (request, reply) => {
    const { id } = request.params;
    const { quantity, movement, reason } = request.body;
    
    return {
      success: true,
      message: 'Stock updated successfully',
      movement: {
        id: `mov_${Date.now()}`,
        itemId: id,
        quantity,
        movement,
        reason,
        timestamp: new Date()
      }
    };
  });
}

module.exports = inventoryRoutes;