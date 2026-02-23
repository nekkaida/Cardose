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

    // Create a test user (owner role by default) and get token
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
        category: 'cardboard',
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

    test('should create item with minimal data (name and category only)', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Minimal Material ' + Date.now(),
        category: 'ribbon',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.itemId || data.item?.id).toBeDefined();
    });

    test('should create item with category fabric', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Fabric Item ' + Date.now(),
        category: 'fabric',
        unit_cost: 3000,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should create item with category packaging', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Packaging Item ' + Date.now(),
        category: 'packaging',
        unit_cost: 1500,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should create item with category tools', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Tools Item ' + Date.now(),
        category: 'tools',
        unit_cost: 25000,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should create item with category accessories', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Accessories Item ' + Date.now(),
        category: 'accessories',
        unit_cost: 800,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject item creation without name', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        category: 'cardboard',
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
          category: 'cardboard',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    // Schema validation: invalid category
    test('should reject invalid category value', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Invalid Category Item ' + Date.now(),
        category: 'paper',
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject another invalid category value', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Invalid Category Item ' + Date.now(),
        category: 'electronics',
      });

      expect(response.statusCode).toBe(400);
    });

    // Schema validation: additionalProperties false
    test('should reject unknown fields (additionalProperties: false)', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Unknown Fields Item ' + Date.now(),
        category: 'cardboard',
        unknown_field: 'some value',
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject multiple unknown fields', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Unknown Fields Item ' + Date.now(),
        category: 'cardboard',
        color: 'red',
        weight: 100,
      });

      expect(response.statusCode).toBe(400);
    });

    // Schema validation: negative numbers
    test('should reject negative unit_cost', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Negative Cost Item ' + Date.now(),
        category: 'cardboard',
        unit_cost: -100,
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject negative current_stock', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Negative Stock Item ' + Date.now(),
        category: 'cardboard',
        current_stock: -50,
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject negative reorder_level', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: 'Negative Reorder Item ' + Date.now(),
        category: 'cardboard',
        reorder_level: -10,
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject empty name string', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', authToken, {
        name: '',
        category: 'cardboard',
      });

      expect(response.statusCode).toBe(400);
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
        '/api/inventory?category=cardboard',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      const items = data.inventory || data.items;
      if (items.length > 0) {
        items.forEach((item) => {
          expect(item.category).toBe('cardboard');
        });
      }
    });

    test('should filter by ribbon category', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?category=ribbon',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      const items = data.inventory || data.items;
      if (items.length > 0) {
        items.forEach((item) => {
          expect(item.category).toBe('ribbon');
        });
      }
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

    test('should support pagination with page and limit', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?page=1&limit=2',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      const items = data.inventory || data.items;
      expect(items.length).toBeLessThanOrEqual(2);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(2);
      expect(data.total).toBeDefined();
      expect(data.totalPages).toBeDefined();
    });

    test('should return second page of results', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?page=2&limit=2',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.page).toBe(2);
    });

    // Sorting tests
    test('should sort by name descending', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?sort_by=name&sort_order=desc',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      const items = data.inventory || data.items;
      if (items.length >= 2) {
        for (let i = 0; i < items.length - 1; i++) {
          expect(items[i].name.localeCompare(items[i + 1].name)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should sort by name ascending', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?sort_by=name&sort_order=asc',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      const items = data.inventory || data.items;
      if (items.length >= 2) {
        for (let i = 0; i < items.length - 1; i++) {
          expect(items[i].name.localeCompare(items[i + 1].name)).toBeLessThanOrEqual(0);
        }
      }
    });

    test('should sort by unit_cost descending', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory?sort_by=unit_cost&sort_order=desc',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      const items = data.inventory || data.items;
      if (items.length >= 2) {
        for (let i = 0; i < items.length - 1; i++) {
          expect(items[i].unit_cost).toBeGreaterThanOrEqual(items[i + 1].unit_cost);
        }
      }
    });

    // Stats included in list response
    test('should include stats object in response', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/inventory', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.total).toBe('number');
      expect(typeof data.stats.lowStock).toBe('number');
      expect(typeof data.stats.outOfStock).toBe('number');
      expect(typeof data.stats.totalValue).toBe('number');
      expect(typeof data.stats.cardboard).toBe('number');
      expect(typeof data.stats.fabric).toBe('number');
      expect(typeof data.stats.ribbon).toBe('number');
      expect(typeof data.stats.accessories).toBe('number');
      expect(typeof data.stats.packaging).toBe('number');
      expect(typeof data.stats.tools).toBe('number');
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

    test('should return count alongside items', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/low-stock',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(typeof data.count).toBe('number');
      expect(data.count).toBe(data.items.length);
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

    test('should return expected stat fields', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/stats',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      const stats = data.stats;
      expect(typeof stats.total_materials).toBe('number');
      expect(typeof stats.low_stock_items).toBe('number');
      expect(typeof stats.out_of_stock_items).toBe('number');
      expect(typeof stats.total_inventory_value).toBe('number');
      expect(Array.isArray(stats.by_category)).toBe(true);
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
      expect(data.item.id).toBe(testItemId);
    });

    test('should include movements array in single item response', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.item).toBeDefined();
      expect(Array.isArray(data.item.movements)).toBe(true);
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
    test('should update item name', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          name: 'Updated Material Name',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update item category', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          category: 'fabric',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update item unit', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          unit: 'meters',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update item unit_cost', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          unit_cost: 7500,
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update item reorder_level', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          reorder_level: 50,
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update item supplier', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          supplier: 'New Supplier Co.',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update item notes', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          notes: 'Updated notes content',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update multiple fields at once', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          name: 'Multi-Update Material',
          category: 'cardboard',
          unit_cost: 9000,
          reorder_level: 30,
          supplier: 'Multi-Field Supplier',
          unit: 'rolls',
          notes: 'Updated everything',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject current_stock in PUT payload (additionalProperties: false)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          current_stock: 150,
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject invalid category in PUT', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          category: 'paper',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject unknown fields in PUT', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        authToken,
        {
          name: 'Valid Name',
          unknown_field: 'bad data',
        }
      );

      expect(response.statusCode).toBe(400);
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

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/inventory/${testItemId}`,
        payload: {
          name: 'Unauthorized Update',
        },
      });

      expect(response.statusCode).toBe(401);
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

    // Waste movement type
    test('should record waste movement', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'waste',
          item_id: testItemId,
          quantity: 5,
          reason: 'Damaged goods',
          notes: 'Water damage in warehouse',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.movementId).toBeDefined();
    });

    // Sale movement type
    test('should record sale movement', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'sale',
          item_id: testItemId,
          quantity: 3,
          reason: 'Direct sale to customer',
          notes: 'Walk-in customer purchase',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.movementId).toBeDefined();
    });

    test('should decrease stock after waste movement', async () => {
      // Get current stock first
      const beforeResponse = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        authToken
      );
      const beforeData = JSON.parse(beforeResponse.body);
      const stockBefore = beforeData.item.current_stock;

      const wasteQty = 2;
      await makeAuthenticatedRequest(app, 'POST', '/api/inventory/movements', authToken, {
        type: 'waste',
        item_id: testItemId,
        quantity: wasteQty,
        reason: 'Spoilage',
      });

      const afterResponse = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        authToken
      );
      const afterData = JSON.parse(afterResponse.body);
      expect(afterData.item.current_stock).toBe(stockBefore - wasteQty);
    });

    test('should decrease stock after sale movement', async () => {
      const beforeResponse = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        authToken
      );
      const beforeData = JSON.parse(beforeResponse.body);
      const stockBefore = beforeData.item.current_stock;

      const saleQty = 1;
      await makeAuthenticatedRequest(app, 'POST', '/api/inventory/movements', authToken, {
        type: 'sale',
        item_id: testItemId,
        quantity: saleQty,
        reason: 'Customer purchase',
      });

      const afterResponse = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        authToken
      );
      const afterData = JSON.parse(afterResponse.body);
      expect(afterData.item.current_stock).toBe(stockBefore - saleQty);
    });

    // Adjustment with quantity 0 should set stock to 0
    test('should set stock to 0 with adjustment quantity 0', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'adjustment',
          item_id: testItemId,
          quantity: 0,
          reason: 'Zero out stock',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.newStock).toBe(0);

      // Verify by fetching the item
      const itemResponse = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        authToken
      );
      const itemData = JSON.parse(itemResponse.body);
      expect(itemData.item.current_stock).toBe(0);
    });

    // Restore stock so later tests work
    test('should increase stock after purchase movement', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'purchase',
          item_id: testItemId,
          quantity: 200,
          reason: 'Restore stock for tests',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.newStock).toBe(200);
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

    test('should reject sale movement that would cause negative stock', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'sale',
          item_id: testItemId,
          quantity: 999999,
        }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Insufficient stock/);
    });

    test('should reject waste movement that would cause negative stock', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'waste',
          item_id: testItemId,
          quantity: 999999,
        }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Insufficient stock/);
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
      if (data.movements.length > 0) {
        data.movements.forEach((m) => {
          expect(m.item_id).toBe(testItemId);
        });
      }
    });

    test('should filter movements by type purchase', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements?type=purchase',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      if (data.movements.length > 0) {
        data.movements.forEach((m) => {
          expect(m.type).toBe('purchase');
        });
      }
    });

    test('should filter movements by type waste', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements?type=waste',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      if (data.movements.length > 0) {
        data.movements.forEach((m) => {
          expect(m.type).toBe('waste');
        });
      }
    });

    test('should filter movements by type sale', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements?type=sale',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      if (data.movements.length > 0) {
        data.movements.forEach((m) => {
          expect(m.type).toBe('sale');
        });
      }
    });

    // Movements limit cap at 500
    test('should cap movements limit at 500 when requesting more', async () => {
      // Create enough movements first by doing several purchases
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          makeAuthenticatedRequest(app, 'POST', '/api/inventory/movements', authToken, {
            type: 'purchase',
            item_id: testItemId,
            quantity: 1,
            reason: `Bulk movement ${i}`,
          })
        );
      }
      await Promise.all(promises);

      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements?limit=1000',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      // The backend caps at 500, so even requesting 1000, we should get at most 500
      expect(data.movements.length).toBeLessThanOrEqual(500);
    });

    test('should respect custom limit below the cap', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements?limit=3',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.movements.length).toBeLessThanOrEqual(3);
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
          category: 'cardboard',
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
      // Create a new item and two alerts for it
      const itemResponse = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        {
          name: 'Duplicate Alert Item ' + Date.now(),
          category: 'cardboard',
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

    // Reorder alert with invalid priority
    test('should reject alert with invalid priority value', async () => {
      const itemResponse = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        {
          name: 'Priority Test Item ' + Date.now(),
          category: 'accessories',
          current_stock: 2,
          reorder_level: 10,
        }
      );
      const itemData = JSON.parse(itemResponse.body);
      const priorityTestItemId = itemData.itemId || itemData.item?.id;

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/reorder-alerts',
        authToken,
        {
          item_id: priorityTestItemId,
          priority: 'critical',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject alert with another invalid priority value', async () => {
      const itemResponse = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        {
          name: 'Priority Test Item 2 ' + Date.now(),
          category: 'accessories',
          current_stock: 2,
          reorder_level: 10,
        }
      );
      const itemData = JSON.parse(itemResponse.body);
      const itemId = itemData.itemId || itemData.item?.id;

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/reorder-alerts',
        authToken,
        {
          item_id: itemId,
          priority: 'medium',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should accept alert with priority low', async () => {
      const itemResponse = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        {
          name: 'Low Priority Item ' + Date.now(),
          category: 'packaging',
          current_stock: 2,
          reorder_level: 10,
        }
      );
      const itemData = JSON.parse(itemResponse.body);
      const itemId = itemData.itemId || itemData.item?.id;

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/reorder-alerts',
        authToken,
        {
          item_id: itemId,
          priority: 'low',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should accept alert with priority urgent', async () => {
      const itemResponse = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        {
          name: 'Urgent Priority Item ' + Date.now(),
          category: 'tools',
          current_stock: 0,
          reorder_level: 5,
        }
      );
      const itemData = JSON.parse(itemResponse.body);
      const itemId = itemData.itemId || itemData.item?.id;

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/reorder-alerts',
        authToken,
        {
          item_id: itemId,
          priority: 'urgent',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  describe('PUT /api/inventory/reorder-alerts/:alertId', () => {
    test('should update alert status', async () => {
      expect(testAlertId).toBeDefined();

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
    });

    test('should update alert to ordered status', async () => {
      expect(testAlertId).toBeDefined();

      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/reorder-alerts/${testAlertId}`,
        authToken,
        {
          status: 'ordered',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should update alert to resolved status', async () => {
      expect(testAlertId).toBeDefined();

      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/reorder-alerts/${testAlertId}`,
        authToken,
        {
          status: 'resolved',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject invalid status', async () => {
      expect(testAlertId).toBeDefined();

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
        current_stock: 10,
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

  // ==================== SOFT-DELETE BEHAVIOR TESTS ====================
  describe('Soft-delete behavior', () => {
    let softDeleteItemId;

    beforeAll(async () => {
      // Create an item specifically for soft-delete tests
      const createResponse = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        authToken,
        {
          name: 'Soft Delete Test Item ' + Date.now(),
          category: 'cardboard',
          current_stock: 50,
          reorder_level: 10,
          unit_cost: 1000,
        }
      );
      const createData = JSON.parse(createResponse.body);
      softDeleteItemId = createData.itemId || createData.item?.id;

      // Delete the item
      await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/inventory/${softDeleteItemId}`,
        authToken
      );
    });

    test('deleted item should not appear in GET /api/inventory list', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/inventory', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      const items = data.inventory || data.items;
      const foundItem = items.find((item) => item.id === softDeleteItemId);
      expect(foundItem).toBeUndefined();
    });

    test('GET /api/inventory/:id should return 404 for deleted item', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${softDeleteItemId}`,
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('creating a movement for a deleted item should return 404', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        authToken,
        {
          type: 'purchase',
          item_id: softDeleteItemId,
          quantity: 10,
          reason: 'Attempt to add stock to deleted item',
        }
      );

      expect(response.statusCode).toBe(404);
    });

    test('DELETE on already deleted item should return 404', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/inventory/${softDeleteItemId}`,
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('PUT on deleted item should return 404', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${softDeleteItemId}`,
        authToken,
        {
          name: 'Try to update deleted item',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== AUTHORIZATION TESTS ====================
  describe('Authorization (role-based access control)', () => {
    let employeeToken;

    beforeAll(async () => {
      // Create an employee user
      const { token } = await createTestUserAndGetToken(app, { role: 'employee' });
      employeeToken = token;
    });

    test('employee should be able to GET /api/inventory (read access)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory',
        employeeToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('employee should be able to GET /api/inventory/:id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/inventory/${testItemId}`,
        employeeToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('employee should get 403 when trying POST /api/inventory', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory',
        employeeToken,
        {
          name: 'Employee Created Item ' + Date.now(),
          category: 'cardboard',
        }
      );

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });

    test('employee should get 403 when trying PUT /api/inventory/:id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/inventory/${testItemId}`,
        employeeToken,
        {
          name: 'Employee Updated Name',
        }
      );

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });

    test('employee should get 403 when trying DELETE /api/inventory/:id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/inventory/${testItemId}`,
        employeeToken
      );

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });

    test('employee should be able to record movements (no role restriction)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/inventory/movements',
        employeeToken,
        {
          type: 'purchase',
          item_id: testItemId,
          quantity: 5,
          reason: 'Employee restocking',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('employee should be able to GET /api/inventory/movements', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/movements',
        employeeToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('employee should be able to GET /api/inventory/stats', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/stats',
        employeeToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('employee should be able to GET /api/inventory/low-stock', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/inventory/low-stock',
        employeeToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    // Manager role should have access
    describe('Manager role access', () => {
      let managerToken;

      beforeAll(async () => {
        const { token } = await createTestUserAndGetToken(app, { role: 'manager' });
        managerToken = token;
      });

      test('manager should be able to POST /api/inventory', async () => {
        const response = await makeAuthenticatedRequest(
          app,
          'POST',
          '/api/inventory',
          managerToken,
          {
            name: 'Manager Created Item ' + Date.now(),
            category: 'fabric',
          }
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      });

      test('manager should be able to PUT /api/inventory/:id', async () => {
        const response = await makeAuthenticatedRequest(
          app,
          'PUT',
          `/api/inventory/${testItemId}`,
          managerToken,
          {
            notes: 'Manager updated notes',
          }
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      });

      test('manager should be able to DELETE /api/inventory/:id', async () => {
        // Create an item to delete
        const createResponse = await makeAuthenticatedRequest(
          app,
          'POST',
          '/api/inventory',
          managerToken,
          {
            name: 'Manager Delete Item ' + Date.now(),
            category: 'tools',
          }
        );
        const createData = JSON.parse(createResponse.body);
        const managerItemId = createData.itemId || createData.item?.id;

        const response = await makeAuthenticatedRequest(
          app,
          'DELETE',
          `/api/inventory/${managerItemId}`,
          managerToken
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      });
    });
  });
});
