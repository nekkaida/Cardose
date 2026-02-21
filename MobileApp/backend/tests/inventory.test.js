// Inventory API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Inventory API', () => {
  let app;
  let authToken;
  let testItemId;
  let testAlertId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== CREATE INVENTORY ITEM TESTS ====================
  describe('POST /api/inventory', () => {
    test('should create inventory item with valid data', async () => {
      const itemData = {
        name: 'Test Material ' + Date.now(),
        category: 'paper',
        supplier: 'Test Supplier',
        unit_cost: 5000,
        current_stock: 100,
        reorder_level: 20,
        unit: 'sheets',
        notes: 'Test material',
      };

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        itemData
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.itemId || data.item?.id).toBeDefined();

      testItemId = data.itemId || data.item?.id;
    });

    test('should reject item creation without name', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        category: 'paper',
        current_stock: 100,
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject item creation without category', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Test Material',
        current_stock: 100,
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/inventory',
        payload: {
          name: 'Test Material',
          category: 'paper',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should create item with minimal data', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Minimal Material ' + Date.now(),
        category: 'ribbon',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== LIST INVENTORY TESTS ====================
  describe('GET /api/inventory', () => {
    test('should list all inventory items', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/inventory', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.inventory) || Array.isArray(data.items)).toBe(true);
    });

    test('should filter by category', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?category=paper',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter low stock items', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?lowStock=true',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should search inventory items', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?search=Material',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?page=1&limit=10',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/inventory',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== LOW STOCK ENDPOINT TESTS ====================
  describe('GET /api/inventory/low-stock', () => {
    test('should get low stock items', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/low-stock',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  // ==================== INVENTORY STATS TESTS ====================
  describe('GET /api/inventory/stats', () => {
    test('should get inventory statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/stats',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
    });
  });

  // ==================== GET SINGLE ITEM TESTS ====================
  describe('GET /api/inventory/:id', () => {
    test('should get item by valid ID', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.item).toBeDefined();
    });

    test('should return 404 for non-existent item', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE ITEM TESTS ====================
  describe('PUT /api/inventory/:id', () => {
    test('should update item with valid data', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          name: 'Updated Material Name',
          current_stock: 150,
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent item', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        '/api/inventory/non-existent-id-123',
        authToken,
        {
          name: 'Updated Name',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== INVENTORY MOVEMENTS TESTS ====================
  describe('POST /api/inventory/movements', () => {
    test('should record purchase movement', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'purchase',
          item_id: testItemId,
          quantity: 50,
          reason: 'Restocking',
          notes: 'Regular purchase',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.movementId).toBeDefined();
    });

    test('should record usage movement', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'usage',
          item_id: testItemId,
          quantity: 10,
          reason: 'Order production',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should record adjustment movement', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'adjustment',
          item_id: testItemId,
          quantity: 100,
          reason: 'Stock count correction',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject movement without required fields', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'purchase',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject movement that would cause negative stock', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'usage',
          item_id: testItemId,
          quantity: 999999,
        }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Insufficient stock/);
    });

    test('should reject movement for non-existent item', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'purchase',
          item_id: 'non-existent-id-123',
          quantity: 10,
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/inventory/movements', () => {
    test('should get all movements', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.movements)).toBe(true);
    });

    test('should filter movements by item_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/movements?item_id=${testItemId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter movements by type', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements?type=purchase',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== REORDER ALERTS TESTS ====================
  describe('GET /api/inventory/reorder-alerts', () => {
    test('should get all reorder alerts', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/reorder-alerts',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.alerts)).toBe(true);
    });

    test('should filter alerts by status', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/reorder-alerts?status=pending',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/inventory/reorder-alerts', () => {
    test('should create reorder alert', async () => {
      // First create a low stock item
      const itemResponse = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        {
          name: 'Low Stock Item ' + Date.now(),
          category: 'paper',
          current_stock: 5,
          reorder_level: 20,
        }
      );
      const itemData = JSON.parse(itemResponse.body);
      const lowStockItemId = itemData.itemId || itemData.item?.id;

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/reorder-alerts',
        authToken,
        {
          item_id: lowStockItemId,
          priority: 'high',
          notes: 'Stock is critically low',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.alertId).toBeDefined();
      testAlertId = data.alertId;
    });

    test('should reject duplicate alert for same item', async () => {
      // Try to create another alert for the same item (if testAlertId exists)
      if (testAlertId) {
        // Get the item_id from the existing alert by creating another low stock item
        const itemResponse = await makeAuthenticatedRequest(
          app,
          'POST',
          '/api/inventory',
          authToken,
          {
            name: 'Duplicate Alert Item ' + Date.now(),
            category: 'paper',
            current_stock: 3,
            reorder_level: 15,
          }
        );
        const itemData = JSON.parse(itemResponse.body);
        const duplicateItemId = itemData.itemId || itemData.item?.id;

        // Create first alert
        await makeAuthenticatedRequest(app, 'POST', '/api/inventory/reorder-alerts', authToken, {
          item_id: duplicateItemId,
          priority: 'normal',
        });

        // Try to create duplicate
        const response = await makeAuthenticatedRequest(
          app,
          'POST',
          '/api/inventory/reorder-alerts',
          authToken,
          {
            item_id: duplicateItemId,
            priority: 'high',
          }
        );

        expect(response.statusCode).toBe(409);
      }
    });

    test('should reject alert without item_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/reorder-alerts',
        authToken,
        {
          priority: 'high',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject alert for non-existent item', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/reorder-alerts',
        authToken,
        {
          item_id: 'non-existent-id-123',
          priority: 'normal',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/inventory/reorder-alerts/:alertId', () => {
    test('should update alert status', async () => {
      if (testAlertId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PUT',
          `/api/inventory/reorder-alerts/${testAlertId}`,
          authToken,
          {
            status: 'acknowledged',
            notes: 'Order placed with supplier',
          }
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should reject invalid status', async () => {
      if (testAlertId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PUT',
          `/api/inventory/reorder-alerts/${testAlertId}`,
          authToken,
          {
            status: 'invalid_status',
          }
        );

        expect(response.statusCode).toBe(400);
      }
    });

    test('should return 404 for non-existent alert', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        '/api/inventory/reorder-alerts/non-existent-id-123',
        authToken,
        {
          status: 'resolved',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== DELETE ITEM TESTS ====================
  describe('DELETE /api/inventory/:id', () => {
    let itemToDelete;

    beforeAll(async () => {
      // Create an item to delete
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Item To Delete ' + Date.now(),
        category: 'accessories',
      });
      const data = JSON.parse(response.body);
      itemToDelete = data.itemId || data.item?.id;
    });

    test('should delete inventory item', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/inventory/${itemToDelete}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent item', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        '/api/inventory/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/inventory/${testItemId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
