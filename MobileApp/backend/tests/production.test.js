// Production API Tests
const {
  buildApp,
  createTestUserAndGetToken,
  makeAuthenticatedRequest,
  createTestCustomer,
  createTestOrder,
} = require('./helpers');

describe('Production API', () => {
  let app;
  let authToken;
  let testCustomerId;
  let testOrderId;
  let testTaskId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;

    // Create a test customer
    testCustomerId = await createTestCustomer(app, authToken);

    // Create a test order
    testOrderId = await createTestOrder(app, authToken, testCustomerId);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== PRODUCTION BOARD TESTS ====================
  describe('GET /api/production/board', () => {
    test('should get production board (Kanban view)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/board',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.board).toBeDefined();
      expect(data.board.pending).toBeDefined();
      expect(data.board.designing).toBeDefined();
      expect(data.board.production).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/production/board',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== PRODUCTION STATS TESTS ====================
  describe('GET /api/production/stats', () => {
    test('should get production statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/stats',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
    });
  });

  // ==================== PRODUCTION TASKS TESTS ====================
  describe('GET /api/production/tasks', () => {
    test('should get all production tasks', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/tasks',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.tasks)).toBe(true);
    });

    test('should filter tasks by status', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/tasks?status=pending',
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
        '/api/production/tasks?page=1&limit=10',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/production/tasks', () => {
    test('should create production task with valid data', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/tasks',
        authToken,
        {
          order_id: testOrderId,
          title: 'Test Task ' + Date.now(),
          description: 'Test task description',
          priority: 'high',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.taskId).toBeDefined();
      testTaskId = data.taskId;
    });

    test('should reject task creation without order_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/tasks',
        authToken,
        {
          title: 'Test Task',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject task creation without title', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/tasks',
        authToken,
        {
          order_id: testOrderId,
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/tasks',
        authToken,
        {
          order_id: 'non-existent-id-123',
          title: 'Test Task',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/production/tasks/:id', () => {
    test('should get task by valid ID', async () => {
      if (testTaskId) {
        const response = await makeAuthenticatedRequest(
          app,
          'GET',
          `/api/production/tasks/${testTaskId}`,
          authToken
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.task).toBeDefined();
      }
    });

    test('should return 404 for non-existent task', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/tasks/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/production/tasks/:id', () => {
    test('should update task with valid data', async () => {
      if (testTaskId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PUT',
          `/api/production/tasks/${testTaskId}`,
          authToken,
          {
            title: 'Updated Task Title',
            priority: 'urgent',
          }
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should return 404 for non-existent task', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        '/api/production/tasks/non-existent-id-123',
        authToken,
        {
          title: 'Updated Title',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/production/tasks/:id/status', () => {
    test('should update task status', async () => {
      if (testTaskId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PATCH',
          `/api/production/tasks/${testTaskId}/status`,
          authToken,
          {
            status: 'in_progress',
          }
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should reject invalid status', async () => {
      if (testTaskId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PATCH',
          `/api/production/tasks/${testTaskId}/status`,
          authToken,
          {
            status: 'invalid_status',
          }
        );

        expect(response.statusCode).toBe(400);
      }
    });

    test('should return 404 for non-existent task', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        '/api/production/tasks/non-existent-id-123/status',
        authToken,
        {
          status: 'completed',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== ORDER STAGE TESTS ====================
  describe('PATCH /api/production/orders/:id/stage', () => {
    test('should update order stage', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${testOrderId}/stage`,
        authToken,
        {
          stage: 'designing',
          notes: 'Moving to design phase',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject invalid stage', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${testOrderId}/stage`,
        authToken,
        {
          stage: 'invalid_stage',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        '/api/production/orders/non-existent-id-123/stage',
        authToken,
        {
          stage: 'production',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== QUALITY CHECKS TESTS ====================
  describe('GET /api/production/quality-checks', () => {
    test('should get all quality checks', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/quality-checks',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.checks)).toBe(true);
    });

    test('should filter by order_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/production/quality-checks?order_id=${testOrderId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/production/quality-checks', () => {
    test('should create quality check', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/quality-checks',
        authToken,
        {
          order_id: testOrderId,
          check_type: 'final_inspection',
          status: 'passed',
          notes: 'All quality checks passed',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.checkId).toBeDefined();
    });

    test('should reject without required fields', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/quality-checks',
        authToken,
        {
          status: 'passed',
        }
      );

      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== PRODUCTION WORKFLOWS TESTS ====================
  describe('POST /api/production/workflows', () => {
    test('should create production workflow', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/workflows',
        authToken,
        {
          order_id: testOrderId,
          name: 'Standard Production Workflow',
          steps: [
            { name: 'Design', description: 'Create design' },
            { name: 'Print', description: 'Print materials' },
            { name: 'Assembly', description: 'Assemble product' },
          ],
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.workflowId).toBeDefined();
    });

    test('should reject without order_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/workflows',
        authToken,
        {
          name: 'Test Workflow',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/workflows',
        authToken,
        {
          order_id: 'non-existent-id-123',
          name: 'Test Workflow',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/production/workflows/order/:orderId', () => {
    test('should get workflows by order', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/production/workflows/order/${testOrderId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.workflows)).toBe(true);
    });
  });

  // ==================== PRODUCTION ISSUES TESTS ====================
  describe('POST /api/production/issues', () => {
    test('should create production issue', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/issues',
        authToken,
        {
          order_id: testOrderId,
          type: 'material',
          severity: 'high',
          title: 'Material shortage',
          description: 'Ran out of premium paper',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.issueId).toBeDefined();
    });

    test('should reject without required fields', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/issues',
        authToken,
        {
          severity: 'high',
        }
      );

      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== PRODUCTION SCHEDULE TESTS ====================
  describe('GET /api/production/schedule', () => {
    test('should get production schedule', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/schedule',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.schedule).toBeDefined();
    });

    test('should filter by date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/production/schedule?date=${today}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== PRODUCTION ANALYTICS TESTS ====================
  describe('GET /api/production/analytics', () => {
    test('should get production analytics (week)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/analytics?period=week',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.analytics).toBeDefined();
    });

    test('should get production analytics (month)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/analytics?period=month',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== PRODUCTION TEMPLATES TESTS ====================
  describe('GET /api/production/templates', () => {
    test('should get production templates', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/templates',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.templates)).toBe(true);
    });
  });

  // ==================== TASK ASSIGNMENT TESTS ====================
  describe('PUT /api/production/tasks/:id/assign', () => {
    test('should assign task', async () => {
      if (testTaskId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PUT',
          `/api/production/tasks/${testTaskId}/assign`,
          authToken,
          {
            assigned_to: null, // Can assign to null (unassigned)
          }
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should return 404 for non-existent task', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        '/api/production/tasks/non-existent-id-123/assign',
        authToken,
        {
          assigned_to: 'user-id',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== DELETE TASK TESTS ====================
  describe('DELETE /api/production/tasks/:id', () => {
    let taskToDelete;

    beforeAll(async () => {
      // Create a task to delete
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/production/tasks',
        authToken,
        {
          order_id: testOrderId,
          title: 'Task To Delete ' + Date.now(),
        }
      );
      const data = JSON.parse(response.body);
      taskToDelete = data.taskId;
    });

    test('should delete task', async () => {
      if (taskToDelete) {
        const response = await makeAuthenticatedRequest(
          app,
          'DELETE',
          `/api/production/tasks/${taskToDelete}`,
          authToken
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should return 404 for non-existent task', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        '/api/production/tasks/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });
  });
});
