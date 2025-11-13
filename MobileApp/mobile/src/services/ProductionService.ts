import { ApiService } from './ApiService';
import { DatabaseService } from './DatabaseService';
import { 
  ProductionTask,
  ProductionWorkflow,
  ProductionStage,
  TaskStatus,
  ProductionIssue,
  ProductionAnalytics,
  ProductionSchedule,
  WorkflowTemplate,
  ProductionFilters,
  QualityCheck
} from '../types/Production';
import { OrderService } from './OrderService';
import { InventoryService } from './InventoryService';

export class ProductionService {
  private static readonly API_ENDPOINT = '/production';

  /**
   * Create production workflow for an order
   */
  static async createProductionWorkflow(orderId: string, templateId?: string): Promise<ProductionWorkflow> {
    const order = await DatabaseService.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Get appropriate workflow template
    const template = templateId 
      ? await this.getWorkflowTemplate(templateId)
      : await this.getDefaultWorkflowTemplate(order.box_type);

    if (!template) {
      throw new Error('No workflow template found');
    }

    // Calculate timeline
    const plannedStartDate = new Date();
    const plannedCompletionDate = new Date(plannedStartDate);
    plannedCompletionDate.setDate(plannedCompletionDate.getDate() + template.estimated_days);

    const workflow: ProductionWorkflow = {
      id: this.generateWorkflowId(),
      order_id: orderId,
      workflow_template: template.id,
      current_stage: 'design_review',
      overall_progress: 0,
      status: 'not_started',
      planned_start_date: plannedStartDate.toISOString(),
      planned_completion_date: plannedCompletionDate.toISOString(),
      total_estimated_hours: template.total_estimated_hours,
      actual_hours_spent: 0,
      assigned_team_members: [],
      stages: template.stages.map(stageTemplate => ({
        stage: stageTemplate.stage,
        status: 'pending',
        progress_percentage: 0,
        estimated_hours: stageTemplate.estimated_hours,
        actual_hours: 0
      })),
      issues: [],
      delays: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create individual tasks for each stage
    const tasks = await this.createTasksFromTemplate(orderId, template, workflow);

    try {
      // Save on server first
      const response = await ApiService.post(`${this.API_ENDPOINT}/workflows`, workflow);
      
      if (response.success) {
        await DatabaseService.createProductionWorkflow(response.data);
        
        // Create tasks
        for (const task of tasks) {
          await this.createProductionTask(task);
        }
        
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    // Save locally
    await DatabaseService.createProductionWorkflow(workflow);
    
    // Create tasks locally
    for (const task of tasks) {
      await this.createProductionTask(task);
    }

    return workflow;
  }

  /**
   * Get all production tasks with filtering
   */
  static async getProductionTasks(filters?: ProductionFilters): Promise<ProductionTask[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/tasks`, { params: filters });
      
      if (response.success) {
        await DatabaseService.cacheProductionTasks(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    return await DatabaseService.getProductionTasks(filters);
  }

  /**
   * Get production tasks for today
   */
  static async getTodaysTasks(assignedTo?: string): Promise<ProductionTask[]> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return await this.getProductionTasks({
      due_date_range: {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      },
      assigned_to: assignedTo,
      status: ['pending', 'in_progress'],
      sort_by: 'priority',
      sort_order: 'desc'
    });
  }

  /**
   * Create a production task
   */
  static async createProductionTask(taskData: Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>): Promise<ProductionTask> {
    // Validate task data
    this.validateTaskData(taskData);

    const task: ProductionTask = {
      id: this.generateTaskId(),
      ...taskData,
      progress_percentage: 0,
      quality_checks: [],
      required_materials: [],
      required_tools: [],
      photos: [],
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_synced: false
    };

    try {
      const response = await ApiService.post(`${this.API_ENDPOINT}/tasks`, task);
      
      if (response.success) {
        await DatabaseService.createProductionTask(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    // Save locally and mark for sync
    await DatabaseService.createProductionTask(task);
    await DatabaseService.markForSync(task.id, 'create');
    
    return task;
  }

  /**
   * Update task status and progress
   */
  static async updateTaskStatus(
    taskId: string, 
    status: TaskStatus, 
    progressPercentage?: number,
    notes?: string
  ): Promise<ProductionTask> {
    const currentTask = await DatabaseService.getProductionTaskById(taskId);
    if (!currentTask) {
      throw new Error('Task not found');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (progressPercentage !== undefined) {
      updateData.progress_percentage = Math.max(0, Math.min(100, progressPercentage));
    }

    if (notes) {
      updateData.notes = notes;
    }

    // Handle status-specific updates
    switch (status) {
      case 'in_progress':
        if (!currentTask.started_at) {
          updateData.started_at = new Date().toISOString();
        }
        break;
        
      case 'completed':
        updateData.completed_at = new Date().toISOString();
        updateData.progress_percentage = 100;
        
        // Update order status if this is the last task
        await this.checkAndUpdateOrderStatus(currentTask.order_id);
        break;
        
      case 'blocked':
        // Create an issue if task is blocked
        if (notes) {
          await this.reportProductionIssue({
            order_id: currentTask.order_id,
            task_id: taskId,
            stage: currentTask.stage,
            title: 'Task Blocked',
            description: notes,
            severity: 'medium',
            category: 'other',
            causes_delay: true,
            affects_quality: false,
            requires_rework: false,
            photos: []
          });
        }
        break;
    }

    try {
      const response = await ApiService.put(`${this.API_ENDPOINT}/tasks/${taskId}`, updateData);
      
      if (response.success) {
        await DatabaseService.updateProductionTask(taskId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    // Update locally
    await DatabaseService.updateProductionTask(taskId, updateData);
    await DatabaseService.markForSync(taskId, 'update');
    
    const updatedTask = await DatabaseService.getProductionTaskById(taskId);
    return updatedTask!;
  }

  /**
   * Assign task to team member
   */
  static async assignTask(taskId: string, assignedTo: string, notes?: string): Promise<ProductionTask> {
    const updateData = {
      assigned_to: assignedTo,
      assigned_at: new Date().toISOString(),
      assigned_by: 'system', // TODO: Get from auth context
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    try {
      const response = await ApiService.put(`${this.API_ENDPOINT}/tasks/${taskId}/assign`, updateData);
      
      if (response.success) {
        await DatabaseService.updateProductionTask(taskId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    await DatabaseService.updateProductionTask(taskId, updateData);
    await DatabaseService.markForSync(taskId, 'update');
    
    const updatedTask = await DatabaseService.getProductionTaskById(taskId);
    return updatedTask!;
  }

  /**
   * Add quality check result
   */
  static async addQualityCheck(
    taskId: string, 
    qualityCheck: Omit<QualityCheck, 'id' | 'checked_at'>
  ): Promise<ProductionTask> {
    const task = await DatabaseService.getProductionTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const newQualityCheck: QualityCheck = {
      id: this.generateQualityCheckId(),
      ...qualityCheck,
      checked_at: new Date().toISOString()
    };

    const updatedQualityChecks = [...task.quality_checks, newQualityCheck];

    const updateData = {
      quality_checks: updatedQualityChecks,
      updated_at: new Date().toISOString()
    };

    // If quality check failed, create an issue
    if (qualityCheck.status === 'failed') {
      await this.reportProductionIssue({
        order_id: task.order_id,
        task_id: taskId,
        stage: task.stage,
        title: `Quality Check Failed: ${qualityCheck.check_point}`,
        description: qualityCheck.notes || 'Quality check did not meet requirements',
        severity: 'high',
        category: 'quality',
        causes_delay: qualityCheck.rework_required || false,
        affects_quality: true,
        requires_rework: qualityCheck.rework_required || false,
        photos: qualityCheck.photos || []
      });
    }

    try {
      const response = await ApiService.put(`${this.API_ENDPOINT}/tasks/${taskId}/quality`, updateData);
      
      if (response.success) {
        await DatabaseService.updateProductionTask(taskId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    await DatabaseService.updateProductionTask(taskId, updateData);
    await DatabaseService.markForSync(taskId, 'update');
    
    const updatedTask = await DatabaseService.getProductionTaskById(taskId);
    return updatedTask!;
  }

  /**
   * Report production issue
   */
  static async reportProductionIssue(issueData: Omit<ProductionIssue, 'id' | 'reported_at' | 'updated_at'>): Promise<ProductionIssue> {
    const issue: ProductionIssue = {
      id: this.generateIssueId(),
      ...issueData,
      status: 'open',
      photos: issueData.photos || [],
      reported_by: 'system', // TODO: Get from auth context
      reported_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const response = await ApiService.post(`${this.API_ENDPOINT}/issues`, issue);
      
      if (response.success) {
        await DatabaseService.createProductionIssue(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    await DatabaseService.createProductionIssue(issue);
    await DatabaseService.markForSync(issue.id, 'create');
    
    return issue;
  }

  /**
   * Get production workflow for an order
   */
  static async getProductionWorkflow(orderId: string): Promise<ProductionWorkflow | null> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/workflows/order/${orderId}`);
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    return await DatabaseService.getProductionWorkflowByOrder(orderId);
  }

  /**
   * Get production schedule for a date
   */
  static async getProductionSchedule(date: string): Promise<ProductionSchedule> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/schedule`, { params: { date } });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, calculating from local data');
    }

    // Calculate schedule from local data
    return await this.calculateProductionScheduleLocally(date);
  }

  /**
   * Get production analytics
   */
  static async getProductionAnalytics(period: 'week' | 'month' | 'quarter' = 'month'): Promise<ProductionAnalytics> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/analytics`, { params: { period } });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, calculating from local data');
    }

    return await this.calculateProductionAnalyticsLocally(period);
  }

  /**
   * Get workflow templates
   */
  static async getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/templates`);
      
      if (response.success) {
        await DatabaseService.cacheWorkflowTemplates(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    return await DatabaseService.getWorkflowTemplates();
  }

  /**
   * Get workflow template by ID
   */
  static async getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    const templates = await this.getWorkflowTemplates();
    return templates.find(template => template.id === templateId) || null;
  }

  /**
   * Get default workflow template for box type
   */
  static async getDefaultWorkflowTemplate(boxType: string): Promise<WorkflowTemplate | null> {
    const templates = await this.getWorkflowTemplates();
    return templates.find(template => 
      template.box_type === boxType && template.is_active
    ) || templates.find(template => 
      template.box_type === 'custom' && template.is_active
    ) || null;
  }

  /**
   * Create tasks from workflow template
   */
  private static async createTasksFromTemplate(
    orderId: string, 
    template: WorkflowTemplate, 
    workflow: ProductionWorkflow
  ): Promise<Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>[]> {
    const order = await DatabaseService.getOrderById(orderId);
    const customer = await DatabaseService.getCustomerById(order?.customer_id || '');

    const tasks: Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>[] = [];
    let currentDueDate = new Date(workflow.planned_start_date);

    for (const stageTemplate of template.stages) {
      // Calculate due date for this stage
      const stageDueDate = new Date(currentDueDate);
      stageDueDate.setHours(stageDueDate.getHours() + stageTemplate.estimated_hours);

      // Get required materials for this stage
      const requiredMaterials = await this.getRequiredMaterialsForStage(
        order?.specifications || {},
        stageTemplate.stage
      );

      const task: Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'> = {
        order_id: orderId,
        order_number: order?.order_number || '',
        customer_name: customer?.name || '',
        stage: stageTemplate.stage,
        title: stageTemplate.title,
        description: stageTemplate.description,
        priority: this.calculateTaskPriority(order?.estimated_completion || '', stageDueDate.toISOString()),
        estimated_duration: stageTemplate.estimated_hours * 60, // Convert to minutes
        due_date: stageDueDate.toISOString(),
        status: 'pending',
        progress_percentage: 0,
        depends_on: this.getTaskDependencies(stageTemplate.stage, tasks),
        blocks: [],
        quality_checks: template.quality_checkpoints
          .filter(qc => qc.stage === stageTemplate.stage)
          .map(qc => ({
            id: this.generateQualityCheckId(),
            check_point: qc.check_point,
            description: qc.description,
            status: 'pending' as const
          })),
        requires_approval: stageTemplate.stage === 'quality_control',
        required_materials: requiredMaterials,
        required_tools: stageTemplate.required_materials, // Tools are listed in materials for simplicity
        workspace: 'main_workshop', // Default workspace
        photos: [],
        notes: '',
        is_synced: false
      };

      tasks.push(task);
      currentDueDate = stageDueDate;
    }

    return tasks;
  }

  /**
   * Get required materials for a production stage
   */
  private static async getRequiredMaterialsForStage(
    specifications: any,
    stage: ProductionStage
  ): Promise<any[]> {
    // This would typically analyze the order specifications and determine
    // what materials are needed for each stage
    const materials = [];

    switch (stage) {
      case 'material_preparation':
        // Get materials based on order specifications
        if (specifications.materials) {
          for (const material of specifications.materials) {
            // Look up inventory item
            const inventoryItems = await InventoryService.searchInventoryItems(material);
            if (inventoryItems.length > 0) {
              materials.push({
                inventory_item_id: inventoryItems[0].id,
                item_name: inventoryItems[0].name,
                quantity_needed: this.calculateMaterialQuantity(material, specifications),
                quantity_allocated: 0,
                unit: inventoryItems[0].unit,
                is_available: inventoryItems[0].current_stock > 0
              });
            }
          }
        }
        break;
        
      case 'cutting':
        // Add cutting tools and base materials
        break;
        
      case 'assembly':
        // Add assembly materials (glue, fasteners, etc.)
        break;
        
      case 'finishing':
        // Add finishing materials (ribbons, decorations, etc.)
        break;
    }

    return materials;
  }

  /**
   * Calculate material quantity needed
   */
  private static calculateMaterialQuantity(material: string, specifications: any): number {
    // Simple calculation based on box size and quantity
    const quantity = specifications.quantity || 1;
    const dimensions = specifications.dimensions || { width: 20, height: 20, depth: 10 };
    
    // Calculate based on material type
    if (material.toLowerCase().includes('cardboard')) {
      // Calculate area needed in square meters
      const area = (dimensions.width * dimensions.height * 2 + 
                   dimensions.width * dimensions.depth * 2 + 
                   dimensions.height * dimensions.depth * 2) / 10000;
      return Math.ceil(area * quantity * 1.1); // 10% waste factor
    }
    
    // Default quantity calculation
    return quantity;
  }

  /**
   * Get task dependencies
   */
  private static getTaskDependencies(stage: ProductionStage, existingTasks: any[]): string[] {
    const dependencies: Record<ProductionStage, ProductionStage[]> = {
      design_review: [],
      material_preparation: ['design_review'],
      cutting: ['material_preparation'],
      assembly: ['cutting'],
      finishing: ['assembly'],
      quality_control: ['finishing'],
      packaging: ['quality_control'],
      ready_for_delivery: ['packaging']
    };

    const dependentStages = dependencies[stage] || [];
    return existingTasks
      .filter(task => dependentStages.includes(task.stage))
      .map(task => task.id);
  }

  /**
   * Calculate task priority based on due date
   */
  private static calculateTaskPriority(orderDeadline: string, taskDueDate: string): 'low' | 'normal' | 'high' | 'urgent' {
    const now = new Date();
    const deadline = new Date(orderDeadline);
    const dueDate = new Date(taskDueDate);
    
    const daysUntilOrderDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilTaskDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilOrderDeadline < 0 || daysUntilTaskDue < 0) return 'urgent';
    if (daysUntilOrderDeadline <= 2 || daysUntilTaskDue <= 1) return 'high';
    if (daysUntilOrderDeadline <= 7 || daysUntilTaskDue <= 3) return 'normal';
    return 'low';
  }

  /**
   * Check and update order status based on production progress
   */
  private static async checkAndUpdateOrderStatus(orderId: string): Promise<void> {
    const tasks = await this.getProductionTasks({ order_id: orderId });
    const workflow = await this.getProductionWorkflow(orderId);
    
    if (!workflow) return;

    const completedTasks = tasks.filter(task => task.status === 'completed');
    const totalTasks = tasks.length;
    
    if (completedTasks.length === totalTasks) {
      // All tasks completed - update order to completed
      await OrderService.updateOrderStatus(orderId, 'completed', 'All production tasks completed');
    } else {
      // Determine current stage based on completed tasks
      const lastCompletedTask = completedTasks
        .sort((a, b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime())[0];
      
      if (lastCompletedTask) {
        const stageOrderMap: Record<ProductionStage, string> = {
          design_review: 'designing',
          material_preparation: 'approved',
          cutting: 'production',
          assembly: 'production',
          finishing: 'production',
          quality_control: 'quality_control',
          packaging: 'quality_control',
          ready_for_delivery: 'completed'
        };
        
        const newOrderStatus = stageOrderMap[lastCompletedTask.stage];
        if (newOrderStatus) {
          await OrderService.updateOrderStatus(orderId, newOrderStatus as any, `Production stage: ${lastCompletedTask.stage} completed`);
        }
      }
    }
  }

  /**
   * Calculate production schedule locally
   */
  private static async calculateProductionScheduleLocally(date: string): Promise<ProductionSchedule> {
    const tasks = await this.getProductionTasks({
      due_date_range: {
        start: `${date}T00:00:00.000Z`,
        end: `${date}T23:59:59.999Z`
      }
    });

    // Calculate capacity (8 hours per day for now)
    const totalCapacityHours = 8;
    const allocatedHours = tasks.reduce((sum, task) => sum + (task.estimated_duration / 60), 0);

    return {
      id: this.generateScheduleId(),
      date,
      total_capacity_hours: totalCapacityHours,
      allocated_hours: allocatedHours,
      remaining_capacity: Math.max(0, totalCapacityHours - allocatedHours),
      scheduled_tasks: tasks.map(task => ({
        task_id: task.id,
        assigned_to: task.assigned_to || '',
        start_time: `${date}T09:00:00.000Z`, // Default start time
        end_time: new Date(new Date(`${date}T09:00:00.000Z`).getTime() + task.estimated_duration * 60000).toISOString(),
        workspace: task.workspace,
        equipment_needed: task.required_tools,
        materials_prepared: task.required_materials.every(m => m.is_available)
      })),
      available_team_members: [], // TODO: Implement team management
      team_capacity: {},
      workspace_allocation: [],
      equipment_allocation: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Calculate production analytics locally
   */
  private static async calculateProductionAnalyticsLocally(period: 'week' | 'month' | 'quarter'): Promise<ProductionAnalytics> {
    const now = new Date();
    const periodStart = new Date();
    
    switch (period) {
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 3);
        break;
    }

    const tasks = await DatabaseService.getProductionTasks({
      date_range: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      }
    });

    const workflows = await DatabaseService.getProductionWorkflows({
      date_range: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      }
    });

    const completedWorkflows = workflows.filter(w => w.status === 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return {
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      },
      completed_orders: completedWorkflows.length,
      average_completion_time: completedWorkflows.length > 0 
        ? completedWorkflows.reduce((sum, w) => {
            const start = new Date(w.actual_start_date || w.planned_start_date);
            const end = new Date(w.actual_completion_date || now);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / completedWorkflows.length
        : 0,
      on_time_delivery_rate: 0, // TODO: Calculate based on due dates
      quality_score_average: 0, // TODO: Calculate from quality checks
      planned_vs_actual_hours: {
        planned: workflows.reduce((sum, w) => sum + w.total_estimated_hours, 0),
        actual: workflows.reduce((sum, w) => sum + w.actual_hours_spent, 0),
        efficiency_percentage: 0 // TODO: Calculate
      },
      stage_performance: {} as any, // TODO: Implement
      team_performance: [], // TODO: Implement
      common_issues: [], // TODO: Implement
      bottlenecks: [] // TODO: Implement
    };
  }

  /**
   * Validate task data
   */
  private static validateTaskData(data: any): void {
    if (!data.title || data.title.length < 3) {
      throw new Error('Task title must be at least 3 characters');
    }

    if (!data.estimated_duration || data.estimated_duration < 15) {
      throw new Error('Estimated duration must be at least 15 minutes');
    }

    if (!data.due_date) {
      throw new Error('Due date is required');
    }
  }

  // ID generators
  private static generateWorkflowId(): string {
    return 'workflow_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateTaskId(): string {
    return 'task_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateIssueId(): string {
    return 'issue_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateQualityCheckId(): string {
    return 'qc_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateScheduleId(): string {
    return 'schedule_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}