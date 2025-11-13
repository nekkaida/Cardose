import { ApiService } from './ApiService';
import { DatabaseService } from './DatabaseService';
import { 
  CommunicationRecord,
  CommunicationThread,
  MessageTemplate,
  CommunicationAnalytics,
  CommunicationFilters,
  CommunicationType,
  CommunicationDirection,
  NotificationSettings,
  WhatsAppIntegration,
  EmailConfiguration
} from '../types/Communication';
import { PREDEFINED_MESSAGE_TEMPLATES } from '../types/Communication';

export class CommunicationService {
  private static readonly API_ENDPOINT = '/communication';

  /**
   * Send a message to a customer
   */
  static async sendMessage(messageData: {
    customer_id?: string;
    order_id?: string;
    type: CommunicationType;
    recipient: string;
    subject?: string;
    message: string;
    template_id?: string;
    attachments?: File[];
  }): Promise<CommunicationRecord> {
    
    // Validate message data
    this.validateMessageData(messageData);

    // Get customer and order details for context
    const customer = messageData.customer_id 
      ? await DatabaseService.getCustomerById(messageData.customer_id)
      : null;
    
    const order = messageData.order_id 
      ? await DatabaseService.getOrderById(messageData.order_id)
      : null;

    // Process message template if provided
    let processedMessage = messageData.message;
    if (messageData.template_id) {
      const template = await this.getMessageTemplate(messageData.template_id);
      if (template) {
        processedMessage = await this.processMessageTemplate(
          template.message_template,
          customer,
          order
        );
      }
    }

    const communication: CommunicationRecord = {
      id: this.generateCommunicationId(),
      customer_id: messageData.customer_id,
      customer_name: customer?.name,
      customer_contact: messageData.recipient,
      order_id: messageData.order_id,
      order_number: order?.order_number,
      type: messageData.type,
      direction: 'outgoing',
      subject: messageData.subject,
      message: processedMessage,
      status: 'draft',
      template_used: messageData.template_id as any,
      attachments: [], // TODO: Handle file uploads
      photos: [],
      sent_to: messageData.recipient,
      requires_follow_up: false,
      follow_up_completed: false,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_synced: false
    };

    try {
      // Send via appropriate channel
      const sendResult = await this.sendViaChannel(communication);
      communication.status = sendResult.success ? 'sent' : 'failed';
      communication.sent_at = sendResult.success ? new Date().toISOString() : undefined;
      
      if (sendResult.external_id) {
        switch (messageData.type) {
          case 'whatsapp':
            communication.whatsapp_message_id = sendResult.external_id;
            break;
          case 'email':
            communication.email_message_id = sendResult.external_id;
            break;
        }
      }

      // Save to server
      const response = await ApiService.post(`${this.API_ENDPOINT}/messages`, communication);
      
      if (response.success) {
        await DatabaseService.createCommunication(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Failed to send message or save to server:', error);
      communication.status = 'failed';
    }

    // Save locally regardless of send status
    await DatabaseService.createCommunication(communication);
    await DatabaseService.markForSync(communication.id, 'create');
    
    return communication;
  }

  /**
   * Get all communication records with filtering
   */
  static async getCommunications(filters?: CommunicationFilters): Promise<CommunicationRecord[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/messages`, { params: filters });
      
      if (response.success) {
        await DatabaseService.cacheCommunications(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Fallback to local database
    return await DatabaseService.getCommunications(filters);
  }

  /**
   * Get communication thread for a customer/order
   */
  static async getCommunicationThread(customerId: string, orderId?: string): Promise<CommunicationThread> {
    try {
      const params = { customer_id: customerId, order_id: orderId };
      const response = await ApiService.get(`${this.API_ENDPOINT}/threads`, { params });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, building thread from local data');
    }

    // Build thread from local communications
    return await this.buildCommunicationThreadLocally(customerId, orderId);
  }

  /**
   * Mark message as read
   */
  static async markAsRead(communicationId: string): Promise<CommunicationRecord> {
    const updateData = {
      status: 'read' as const,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const response = await ApiService.put(`${this.API_ENDPOINT}/messages/${communicationId}/read`, updateData);
      
      if (response.success) {
        await DatabaseService.updateCommunication(communicationId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    await DatabaseService.updateCommunication(communicationId, updateData);
    await DatabaseService.markForSync(communicationId, 'update');
    
    const communication = await DatabaseService.getCommunicationById(communicationId);
    return communication!;
  }

  /**
   * Log incoming message (from webhook or manual entry)
   */
  static async logIncomingMessage(messageData: {
    customer_id?: string;
    order_id?: string;
    type: CommunicationType;
    from: string;
    subject?: string;
    message: string;
    external_id?: string;
    received_at?: string;
  }): Promise<CommunicationRecord> {
    
    // Try to identify customer if not provided
    let customerId = messageData.customer_id;
    if (!customerId) {
      const customer = await this.identifyCustomerByContact(messageData.from);
      customerId = customer?.id;
    }

    const communication: CommunicationRecord = {
      id: this.generateCommunicationId(),
      customer_id: customerId,
      customer_name: customerId ? (await DatabaseService.getCustomerById(customerId))?.name : undefined,
      customer_contact: messageData.from,
      order_id: messageData.order_id,
      order_number: messageData.order_id ? (await DatabaseService.getOrderById(messageData.order_id))?.order_number : undefined,
      type: messageData.type,
      direction: 'incoming',
      subject: messageData.subject,
      message: messageData.message,
      status: 'delivered',
      attachments: [],
      photos: [],
      sent_to: 'business', // Our business received this
      sent_at: messageData.received_at || new Date().toISOString(),
      whatsapp_message_id: messageData.type === 'whatsapp' ? messageData.external_id : undefined,
      email_message_id: messageData.type === 'email' ? messageData.external_id : undefined,
      requires_follow_up: true, // Incoming messages usually need response
      follow_up_completed: false,
      tags: ['incoming'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_synced: false
    };

    try {
      const response = await ApiService.post(`${this.API_ENDPOINT}/messages`, communication);
      
      if (response.success) {
        await DatabaseService.createCommunication(response.data);
        
        // Trigger notifications for incoming message
        await this.triggerIncomingMessageNotification(response.data);
        
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, saving locally');
    }

    await DatabaseService.createCommunication(communication);
    await DatabaseService.markForSync(communication.id, 'create');
    
    // Trigger notifications locally
    await this.triggerIncomingMessageNotification(communication);
    
    return communication;
  }

  /**
   * Get message templates
   */
  static async getMessageTemplates(): Promise<MessageTemplate[]> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/templates`);
      
      if (response.success) {
        await DatabaseService.cacheMessageTemplates(response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, loading from local cache');
    }

    // Return local templates with predefined fallbacks
    const localTemplates = await DatabaseService.getMessageTemplates();
    
    if (localTemplates.length === 0) {
      // Create default templates if none exist
      return await this.createDefaultTemplates();
    }
    
    return localTemplates;
  }

  /**
   * Get single message template
   */
  static async getMessageTemplate(templateId: string): Promise<MessageTemplate | null> {
    const templates = await this.getMessageTemplates();
    return templates.find(template => template.id === templateId) || null;
  }

  /**
   * Send automated message based on trigger
   */
  static async sendAutomatedMessage(
    trigger: 'order_created' | 'status_changed' | 'payment_received' | 'production_started' | 'quality_passed' | 'ready_for_delivery',
    orderId: string,
    customData?: Record<string, any>
  ): Promise<CommunicationRecord[]> {
    
    const order = await DatabaseService.getOrderById(orderId);
    const customer = order ? await DatabaseService.getCustomerById(order.customer_id) : null;
    
    if (!order || !customer) {
      throw new Error('Order or customer not found');
    }

    // Get templates that match the trigger
    const templates = await this.getMessageTemplates();
    const triggerTemplates = templates.filter(template => 
      template.auto_send && 
      template.is_active &&
      template.trigger_conditions?.some(tc => tc.event === trigger)
    );

    const sentMessages: CommunicationRecord[] = [];

    for (const template of triggerTemplates) {
      // Check if customer has preferred communication method that matches template
      const preferredContact = customer.preferred_contact || 'whatsapp';
      
      if (template.communication_type.includes(preferredContact)) {
        try {
          const message = await this.sendMessage({
            customer_id: customer.id,
            order_id: orderId,
            type: preferredContact,
            recipient: this.getCustomerContactByType(customer, preferredContact),
            subject: template.subject_template ? 
              await this.processMessageTemplate(template.subject_template, customer, order) : 
              undefined,
            message: await this.processMessageTemplate(template.message_template, customer, order, customData),
            template_id: template.id
          });
          
          sentMessages.push(message);
          
          // Update template usage
          await this.updateTemplateUsage(template.id);
          
        } catch (error) {
          console.error(`Failed to send automated message with template ${template.id}:`, error);
        }
      }
    }

    return sentMessages;
  }

  /**
   * Get communication analytics
   */
  static async getCommunicationAnalytics(period: 'week' | 'month' | 'quarter' = 'month'): Promise<CommunicationAnalytics> {
    try {
      const response = await ApiService.get(`${this.API_ENDPOINT}/analytics`, { params: { period } });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, calculating from local data');
    }

    return await this.calculateCommunicationAnalyticsLocally(period);
  }

  /**
   * Get unread messages count
   */
  static async getUnreadCount(): Promise<number> {
    const communications = await this.getCommunications({
      direction: 'incoming',
      status: ['delivered', 'sent'], // Not yet read
      limit: 1000 // Get reasonable limit for counting
    });

    return communications.filter(comm => !comm.read_at).length;
  }

  /**
   * Schedule follow-up
   */
  static async scheduleFollowUp(
    communicationId: string, 
    followUpDate: string, 
    notes?: string
  ): Promise<CommunicationRecord> {
    const updateData = {
      requires_follow_up: true,
      follow_up_date: followUpDate,
      internal_notes: notes,
      updated_at: new Date().toISOString()
    };

    try {
      const response = await ApiService.put(`${this.API_ENDPOINT}/messages/${communicationId}/follow-up`, updateData);
      
      if (response.success) {
        await DatabaseService.updateCommunication(communicationId, response.data);
        return response.data;
      }
    } catch (error) {
      console.log('Server unavailable, updating locally');
    }

    await DatabaseService.updateCommunication(communicationId, updateData);
    await DatabaseService.markForSync(communicationId, 'update');
    
    const communication = await DatabaseService.getCommunicationById(communicationId);
    return communication!;
  }

  /**
   * Get pending follow-ups
   */
  static async getPendingFollowUps(): Promise<CommunicationRecord[]> {
    const now = new Date().toISOString();
    
    return await this.getCommunications({
      requires_follow_up: true,
      // Custom filter for follow_up_date <= now would need to be implemented in the filter logic
      sort_by: 'created_at',
      sort_order: 'asc'
    });
  }

  /**
   * Process message template with variables
   */
  private static async processMessageTemplate(
    template: string,
    customer: any,
    order: any,
    customData?: Record<string, any>
  ): Promise<string> {
    let processedMessage = template;

    // Customer variables
    if (customer) {
      processedMessage = processedMessage.replace(/{customer_name}/g, customer.name || '');
      processedMessage = processedMessage.replace(/{customer_email}/g, customer.email || '');
      processedMessage = processedMessage.replace(/{customer_phone}/g, customer.phone || '');
      processedMessage = processedMessage.replace(/{company_name}/g, customer.company_name || '');
    }

    // Order variables
    if (order) {
      processedMessage = processedMessage.replace(/{order_number}/g, order.order_number || '');
      processedMessage = processedMessage.replace(/{box_type}/g, order.box_type || '');
      processedMessage = processedMessage.replace(/{total_price}/g, this.formatCurrency(order.total_price) || '');
      processedMessage = processedMessage.replace(/{estimated_completion}/g, this.formatDate(order.estimated_completion) || '');
      processedMessage = processedMessage.replace(/{current_status}/g, order.status || '');
      
      if (order.specifications) {
        processedMessage = processedMessage.replace(/{quantity}/g, order.specifications.quantity?.toString() || '1');
        
        if (order.specifications.dimensions) {
          const dims = order.specifications.dimensions;
          processedMessage = processedMessage.replace(/{dimensions}/g, 
            `${dims.width}×${dims.height}×${dims.depth}${dims.unit || 'cm'}`);
        }
      }
    }

    // Custom data variables
    if (customData) {
      Object.entries(customData).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g');
        processedMessage = processedMessage.replace(regex, value?.toString() || '');
      });
    }

    // Business variables
    processedMessage = processedMessage.replace(/{business_name}/g, 'Premium Gift Box');
    processedMessage = processedMessage.replace(/{business_phone}/g, '+62 xxx xxxx xxxx'); // Replace with actual
    processedMessage = processedMessage.replace(/{business_email}/g, 'info@premiumgiftbox.com'); // Replace with actual
    processedMessage = processedMessage.replace(/{pickup_location}/g, 'Premium Gift Box Workshop'); // Replace with actual
    processedMessage = processedMessage.replace(/{pickup_hours}/g, 'Mon-Fri 9AM-5PM, Sat 9AM-2PM');

    return processedMessage;
  }

  /**
   * Send message via appropriate channel
   */
  private static async sendViaChannel(communication: CommunicationRecord): Promise<{
    success: boolean;
    external_id?: string;
    error?: string;
  }> {
    
    switch (communication.type) {
      case 'whatsapp':
        return await this.sendWhatsAppMessage(communication);
      
      case 'email':
        return await this.sendEmailMessage(communication);
      
      case 'sms':
        return await this.sendSMSMessage(communication);
      
      default:
        // For phone, in_person, internal_note - just mark as sent locally
        return { success: true };
    }
  }

  /**
   * Send WhatsApp message
   */
  private static async sendWhatsAppMessage(communication: CommunicationRecord): Promise<{
    success: boolean;
    external_id?: string;
    error?: string;
  }> {
    try {
      // Get WhatsApp integration settings
      const whatsappConfig = await this.getWhatsAppConfiguration();
      
      if (!whatsappConfig || !whatsappConfig.is_active) {
        return { success: false, error: 'WhatsApp not configured' };
      }

      // In a real implementation, this would call WhatsApp Business API
      // For now, simulate the API call
      console.log('Sending WhatsApp message:', {
        to: communication.sent_to,
        message: communication.message
      });

      // Simulate successful send with external ID
      return { 
        success: true, 
        external_id: `whatsapp_${Date.now()}` 
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'WhatsApp send failed' 
      };
    }
  }

  /**
   * Send email message
   */
  private static async sendEmailMessage(communication: CommunicationRecord): Promise<{
    success: boolean;
    external_id?: string;
    error?: string;
  }> {
    try {
      // Get email configuration
      const emailConfig = await this.getEmailConfiguration();
      
      if (!emailConfig || !emailConfig.is_active) {
        return { success: false, error: 'Email not configured' };
      }

      // In a real implementation, this would use SMTP or email service API
      console.log('Sending email:', {
        to: communication.sent_to,
        subject: communication.subject,
        message: communication.message
      });

      // Simulate successful send
      return { 
        success: true, 
        external_id: `email_${Date.now()}` 
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email send failed' 
      };
    }
  }

  /**
   * Send SMS message
   */
  private static async sendSMSMessage(communication: CommunicationRecord): Promise<{
    success: boolean;
    external_id?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would use SMS service API (e.g., Twilio)
      console.log('Sending SMS:', {
        to: communication.sent_to,
        message: communication.message
      });

      return { 
        success: true, 
        external_id: `sms_${Date.now()}` 
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SMS send failed' 
      };
    }
  }

  /**
   * Identify customer by contact information
   */
  private static async identifyCustomerByContact(contact: string): Promise<any> {
    const customers = await DatabaseService.getCustomers();
    
    return customers.find(customer => 
      customer.whatsapp === contact ||
      customer.email === contact ||
      customer.phone === contact
    );
  }

  /**
   * Get customer contact by communication type
   */
  private static getCustomerContactByType(customer: any, type: CommunicationType): string {
    switch (type) {
      case 'whatsapp':
        return customer.whatsapp || customer.phone || '';
      case 'email':
        return customer.email || '';
      case 'phone':
      case 'sms':
        return customer.phone || customer.whatsapp || '';
      default:
        return customer.whatsapp || customer.email || customer.phone || '';
    }
  }

  /**
   * Build communication thread from local data
   */
  private static async buildCommunicationThreadLocally(customerId: string, orderId?: string): Promise<CommunicationThread> {
    const filters: CommunicationFilters = {
      customer_id: customerId,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    if (orderId) {
      filters.order_id = orderId;
    }

    const messages = await this.getCommunications(filters);
    const customer = await DatabaseService.getCustomerById(customerId);
    const order = orderId ? await DatabaseService.getOrderById(orderId) : null;

    const unreadMessages = messages.filter(msg => 
      msg.direction === 'incoming' && !msg.read_at
    );

    const lastMessage = messages[0];

    return {
      id: this.generateThreadId(),
      customer_id: customerId,
      customer_name: customer?.name || 'Unknown Customer',
      primary_contact: customer?.whatsapp || customer?.email || customer?.phone || '',
      order_id: orderId,
      order_number: order?.order_number,
      subject: order ? `Order ${order.order_number}` : `Customer Communication`,
      status: 'active',
      priority: 'normal',
      messages,
      message_count: messages.length,
      unread_count: unreadMessages.length,
      last_message_at: lastMessage?.created_at || new Date().toISOString(),
      last_message_preview: lastMessage?.message.substring(0, 100) || '',
      last_message_direction: lastMessage?.direction || 'outgoing',
      awaiting_response: unreadMessages.length > 0,
      created_at: messages[messages.length - 1]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Create default message templates
   */
  private static async createDefaultTemplates(): Promise<MessageTemplate[]> {
    const defaultTemplates: MessageTemplate[] = [];

    for (const [templateType, messageTemplate] of Object.entries(PREDEFINED_MESSAGE_TEMPLATES)) {
      const template: MessageTemplate = {
        id: this.generateTemplateId(),
        name: templateType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        template_type: templateType as any,
        message_template: messageTemplate,
        available_variables: this.extractVariablesFromTemplate(messageTemplate),
        communication_type: ['whatsapp', 'email', 'sms'],
        is_active: true,
        auto_send: false,
        requires_approval: false,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      defaultTemplates.push(template);
      await DatabaseService.createMessageTemplate(template);
    }

    return defaultTemplates;
  }

  /**
   * Extract variables from template
   */
  private static extractVariablesFromTemplate(template: string): string[] {
    const variableRegex = /{([^}]+)}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Calculate communication analytics locally
   */
  private static async calculateCommunicationAnalyticsLocally(period: 'week' | 'month' | 'quarter'): Promise<CommunicationAnalytics> {
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

    const communications = await this.getCommunications({
      date_range: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      }
    });

    // Calculate metrics
    const byType = communications.reduce((acc, comm) => {
      acc[comm.type] = (acc[comm.type] || 0) + 1;
      return acc;
    }, {} as Record<CommunicationType, number>);

    const byDirection = communications.reduce((acc, comm) => {
      acc[comm.direction] = (acc[comm.direction] || 0) + 1;
      return acc;
    }, {} as Record<CommunicationDirection, number>);

    return {
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString()
      },
      total_communications: communications.length,
      by_type: byType,
      by_direction: byDirection,
      average_response_time: 0, // TODO: Calculate
      response_rate: 0, // TODO: Calculate
      first_response_time: 0, // TODO: Calculate
      channel_usage: [], // TODO: Calculate
      most_active_customers: [], // TODO: Calculate
      template_usage: [], // TODO: Calculate
      common_topics: [], // TODO: Calculate
      daily_volume: [] // TODO: Calculate
    };
  }

  /**
   * Get integration configurations
   */
  private static async getWhatsAppConfiguration(): Promise<WhatsAppIntegration | null> {
    // In a real implementation, this would load from database/settings
    return null;
  }

  private static async getEmailConfiguration(): Promise<EmailConfiguration | null> {
    // In a real implementation, this would load from database/settings
    return null;
  }

  /**
   * Trigger notification for incoming message
   */
  private static async triggerIncomingMessageNotification(communication: CommunicationRecord): Promise<void> {
    // In a real implementation, this would:
    // 1. Check notification settings
    // 2. Send push notification
    // 3. Send email notification if configured
    // 4. Play notification sound
    console.log('New incoming message notification:', communication.message.substring(0, 50));
  }

  /**
   * Update template usage statistics
   */
  private static async updateTemplateUsage(templateId: string): Promise<void> {
    try {
      await DatabaseService.incrementTemplateUsage(templateId);
    } catch (error) {
      console.error('Failed to update template usage:', error);
    }
  }

  /**
   * Utility functions
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID');
  }

  /**
   * Validate message data
   */
  private static validateMessageData(data: any): void {
    if (!data.message || data.message.length < 1) {
      throw new Error('Message content is required');
    }

    if (data.message.length > 4000) {
      throw new Error('Message is too long (max 4000 characters)');
    }

    if (!data.recipient) {
      throw new Error('Recipient is required');
    }

    if (data.subject && data.subject.length > 200) {
      throw new Error('Subject is too long (max 200 characters)');
    }
  }

  // ID generators
  private static generateCommunicationId(): string {
    return 'comm_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateThreadId(): string {
    return 'thread_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateTemplateId(): string {
    return 'template_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}