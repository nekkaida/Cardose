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

  // ==================== STAGE TRANSITION VALIDATION TESTS ====================
  describe('Stage transition validation', () => {
    let transitionOrderId;

    beforeAll(async () => {
      // Create a fresh order for transition tests
      transitionOrderId = await createTestOrder(app, authToken, testCustomerId, {
        order_number: 'ORD-TRANSITION-' + Date.now(),
        status: 'pending',
      });
    });

    test('should allow valid transition pending -> designing', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'designing' }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject invalid transition designing -> production (must go through approved)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'production' }
      );

      expect(response.statusCode).toBe(422);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.currentStage).toBe('designing');
      expect(data.allowedStages).toContain('approved');
      expect(data.allowedStages).not.toContain('production');
    });

    test('should allow valid transition designing -> approved', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'approved' }
      );

      expect(response.statusCode).toBe(200);
    });

    test('should allow backward transition approved -> designing', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'designing' }
      );

      expect(response.statusCode).toBe(200);
    });

    test('should allow full forward workflow to completed', async () => {
      // designing -> approved
      await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'approved' }
      );
      // approved -> production
      await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'production' }
      );
      // production -> quality_control
      await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'quality_control' }
      );
      // quality_control -> completed
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'completed' }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject transition from completed stage', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${transitionOrderId}/stage`,
        authToken,
        { stage: 'pending' }
      );

      expect(response.statusCode).toBe(422);
    });

    test('should allow cancellation from any active stage', async () => {
      const cancelOrderId = await createTestOrder(app, authToken, testCustomerId, {
        order_number: 'ORD-CANCEL-' + Date.now(),
        status: 'pending',
      });

      // Move to designing first
      await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${cancelOrderId}/stage`,
        authToken,
        { stage: 'designing' }
      );

      // Cancel from designing
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${cancelOrderId}/stage`,
        authToken,
        { stage: 'cancelled' }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== BOARD RESPONSE SHAPE TESTS ====================
  describe('Board response shape', () => {
    test('should return board with all five stage columns', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/board',
        authToken
      );

      const data = JSON.parse(response.body);
      expect(data.board.pending).toBeDefined();
      expect(data.board.designing).toBeDefined();
      expect(data.board.approved).toBeDefined();
      expect(data.board.production).toBeDefined();
      expect(data.board.quality_control).toBeDefined();
      expect(typeof data.totalActive).toBe('number');
    });

    test('board orders should include stage_entered_at field', async () => {
      // Create and move an order so it has a stage entry
      const boardOrderId = await createTestOrder(app, authToken, testCustomerId, {
        order_number: 'ORD-BOARD-' + Date.now(),
        status: 'pending',
      });

      await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${boardOrderId}/stage`,
        authToken,
        { stage: 'designing' }
      );

      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/board',
        authToken
      );

      const data = JSON.parse(response.body);
      const designingOrders = data.board.designing;
      const movedOrder = designingOrders.find((o) => o.id === boardOrderId);

      expect(movedOrder).toBeDefined();
      expect(movedOrder.order_number).toBeDefined();
      expect(movedOrder.customer_name).toBeDefined();
      expect(movedOrder.stage_entered_at).toBeDefined();
      expect(movedOrder.total_amount).toBeDefined();
    });
  });

  // ==================== STATS RESPONSE SHAPE TESTS ====================
  describe('Stats response shape', () => {
    test('should return stats with stage_distribution', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/stats',
        authToken
      );

      const data = JSON.parse(response.body);
      expect(data.stats.active_orders).toBeDefined();
      expect(data.stats.completed_today).toBeDefined();
      expect(data.stats.overdue_orders).toBeDefined();
      expect(data.stats.quality_issues).toBeDefined();
      expect(data.stats.stage_distribution).toBeDefined();
      expect(typeof data.stats.stage_distribution.pending).toBe('number');
      expect(typeof data.stats.stage_distribution.designing).toBe('number');
      expect(typeof data.stats.stage_distribution.approved).toBe('number');
      expect(typeof data.stats.stage_distribution.production).toBe('number');
      expect(typeof data.stats.stage_distribution.quality_control).toBe('number');
    });

    test('quality_issues count should be a non-negative number', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/production/stats',
        authToken
      );

      const data = JSON.parse(response.body);
      expect(data.stats.quality_issues).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== AUTHORIZATION TESTS ====================
  describe('Stage move authorization', () => {
    test('should reject stage move without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/production/orders/${testOrderId}/stage`,
        payload: { stage: 'designing' },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject stage move for employee role (not in owner/manager/staff)', async () => {
      const { token: employeeToken } = await createTestUserAndGetToken(app, {
        username: 'employee_prod_' + Date.now(),
        email: `employee_prod_${Date.now()}@test.com`,
        role: 'employee',
      });

      const empOrderId = await createTestOrder(app, employeeToken, testCustomerId, {
        order_number: 'ORD-EMP-' + Date.now(),
        status: 'pending',
      });

      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/production/orders/${empOrderId}/stage`,
        employeeToken,
        { stage: 'designing' }
      );

      expect(response.statusCode).toBe(403);
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
