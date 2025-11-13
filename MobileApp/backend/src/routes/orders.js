const { v4: uuidv4 } = require('uuid');
const { sampleOrders } = require('../data/sampleData');

async function ordersRoutes(fastify, options) {
  // Get all orders
  fastify.get('/', async (request, reply) => {
    try {
      const { status, customer_id, limit } = request.query;
      
      // Use sample data for now, but keep database functionality for future
      let orders = sampleOrders;
      
      // Apply filters
      if (status) {
        orders = orders.filter(order => order.status === status);
      }
      if (customer_id) {
        orders = orders.filter(order => order.customerId === customer_id);
      }
      if (limit) {
        orders = orders.slice(0, parseInt(limit));
      }

      const stats = {
        total: sampleOrders.length,
        pending: sampleOrders.filter(o => o.status === 'pending').length,
        in_progress: sampleOrders.filter(o => o.status === 'in_progress').length,
        completed: sampleOrders.filter(o => o.status === 'completed').length,
        cancelled: sampleOrders.filter(o => o.status === 'cancelled').length,
        totalValue: sampleOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0),
        averageValue: sampleOrders.length > 0 ? sampleOrders.reduce((sum, o) => sum + o.pricing.finalPrice, 0) / sampleOrders.length : 0
      };

      return { success: true, orders, stats };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch orders' 
      });
    }
  });

  // Get single order
  fastify.get('/:id', async (request, reply) => {
    try {
      const order = await fastify.db.get(
        'SELECT * FROM orders WHERE id = ?',
        [request.params.id]
      );

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: 'Order not found'
        });
      }

      // Get order stages
      const stages = await fastify.db.all(
        'SELECT * FROM order_stages WHERE order_id = ? ORDER BY start_date',
        [request.params.id]
      );

      return { 
        success: true, 
        data: { ...order, stages } 
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch order' 
      });
    }
  });

  // Create new order
  fastify.post('/', async (request, reply) => {
    try {
      const orderData = {
        id: uuidv4(),
        order_number: await generateOrderNumber(),
        ...request.body
      };

      // Validate required fields
      if (!orderData.customer_id || !orderData.total_price) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: customer_id, total_price'
        });
      }

      await fastify.db.createOrder(orderData);

      return reply.status(201).send({ 
        success: true, 
        data: orderData 
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to create order' 
      });
    }
  });

  // Update order
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Build dynamic UPDATE query
      const fields = Object.keys(updateData).filter(key => key !== 'id');
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        // Handle JSON fields
        if (field === 'materials' || field === 'colors') {
          return JSON.stringify(updateData[field]);
        }
        return updateData[field];
      });

      const sql = `UPDATE orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      values.push(id);

      const result = await fastify.db.run(sql, values);

      if (result.changes === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Order not found'
        });
      }

      return { success: true, message: 'Order updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to update order' 
      });
    }
  });

  // Update order status
  fastify.patch('/:id/status', async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, notes } = request.body;

      if (!status) {
        return reply.status(400).send({
          success: false,
          error: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid status value'
        });
      }

      await fastify.db.updateOrderStatus(id, status, notes || '');

      return { 
        success: true, 
        message: 'Order status updated successfully' 
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to update order status' 
      });
    }
  });

  // Delete order
  fastify.delete('/:id', async (request, reply) => {
    try {
      const result = await fastify.db.run(
        'DELETE FROM orders WHERE id = ?',
        [request.params.id]
      );

      if (result.changes === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Order not found'
        });
      }

      return { success: true, message: 'Order deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to delete order' 
      });
    }
  });

  // Generate unique order number
  async function generateOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `PGB-${year}-`;
    
    // Get the latest order number for this year
    const latestOrder = await fastify.db.get(
      "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1",
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (latestOrder) {
      const currentNumber = parseInt(latestOrder.order_number.split('-').pop());
      nextNumber = currentNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }
}

module.exports = ordersRoutes;