export type CommunicationType = 
  | 'whatsapp'
  | 'email'
  | 'phone'
  | 'sms'
  | 'in_person'
  | 'internal_note';

export type CommunicationDirection = 'incoming' | 'outgoing' | 'internal';

export type CommunicationStatus = 
  | 'draft'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'replied'
  | 'failed';

export type MessageTemplate = 
  | 'order_confirmation'
  | 'design_approval_request'
  | 'production_update'
  | 'quality_control_update'
  | 'ready_for_pickup'
  | 'delivery_notification'
  | 'payment_reminder'
  | 'follow_up'
  | 'custom';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CommunicationRecord {
  id: string;
  
  // Participants
  customer_id?: string;
  customer_name?: string;
  customer_contact: string; // Phone, email, etc.
  
  // Order Context
  order_id?: string;
  order_number?: string;
  
  // Communication Details
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  message: string;
  
  // Status and Tracking
  status: CommunicationStatus;
  template_used?: MessageTemplate;
  
  // Media and Attachments
  attachments: CommunicationAttachment[];
  photos: string[];
  
  // Metadata
  sent_by?: string;
  sent_to: string;
  sent_at?: string;
  read_at?: string;
  replied_at?: string;
  
  // Integration Data
  whatsapp_message_id?: string;
  email_message_id?: string;
  external_thread_id?: string;
  
  // Follow-up
  requires_follow_up: boolean;
  follow_up_date?: string;
  follow_up_completed: boolean;
  
  // Internal Notes
  internal_notes?: string;
  tags: string[];
  
  // Timeline
  created_at: string;
  updated_at: string;
  
  // Offline/sync support
  is_synced?: boolean;
}

export interface CommunicationAttachment {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  template_type: MessageTemplate;
  
  // Template Content
  subject_template?: string; // For emails
  message_template: string;
  
  // Variables that can be used in template
  available_variables: string[]; // e.g., {customer_name}, {order_number}
  
  // Usage Context
  communication_type: CommunicationType[];
  trigger_conditions?: TemplateTrigger[];
  
  // Settings
  is_active: boolean;
  auto_send: boolean;
  requires_approval: boolean;
  
  // Metadata
  usage_count: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateTrigger {
  event: 'order_created' | 'status_changed' | 'payment_received' | 'production_started' | 'quality_passed' | 'ready_for_delivery';
  conditions?: Record<string, any>;
  delay_minutes?: number; // Optional delay before sending
}

export interface CommunicationThread {
  id: string;
  
  // Thread Participants
  customer_id: string;
  customer_name: string;
  primary_contact: string;
  
  // Context
  order_id?: string;
  order_number?: string;
  subject: string;
  
  // Thread Status
  status: 'active' | 'closed' | 'archived';
  priority: NotificationPriority;
  
  // Messages in Thread
  messages: CommunicationRecord[];
  message_count: number;
  unread_count: number;
  
  // Last Activity
  last_message_at: string;
  last_message_preview: string;
  last_message_direction: CommunicationDirection;
  
  // Follow-up
  awaiting_response: boolean;
  response_due_date?: string;
  
  // Assignment
  assigned_to?: string;
  assigned_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  
  // Channel Preferences
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  
  // Notification Types
  new_orders: boolean;
  order_updates: boolean;
  payment_received: boolean;
  production_issues: boolean;
  quality_alerts: boolean;
  delivery_updates: boolean;
  customer_messages: boolean;
  
  // Timing Preferences
  business_hours_only: boolean;
  business_start_time: string; // HH:MM format
  business_end_time: string;
  weekend_notifications: boolean;
  
  // Priority Filtering
  minimum_priority: NotificationPriority;
  urgent_override: boolean; // Always notify for urgent messages
  
  // Frequency Control
  digest_mode: boolean;
  digest_frequency: 'hourly' | 'daily' | 'weekly';
  
  updated_at: string;
}

export interface AutoResponse {
  id: string;
  
  // Trigger Conditions
  trigger_type: 'keyword' | 'business_hours' | 'order_status' | 'custom';
  trigger_value: string;
  
  // Response Configuration
  response_message: string;
  response_delay_minutes: number;
  
  // Conditions
  active_hours?: {
    start: string;
    end: string;
  };
  active_days: number[]; // 0-6 (Sunday-Saturday)
  
  // Settings
  is_active: boolean;
  max_responses_per_customer: number;
  cooldown_minutes: number;
  
  // Analytics
  triggered_count: number;
  last_triggered?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CommunicationAnalytics {
  period: {
    start: string;
    end: string;
  };
  
  // Volume Metrics
  total_communications: number;
  by_type: Record<CommunicationType, number>;
  by_direction: Record<CommunicationDirection, number>;
  
  // Response Metrics
  average_response_time: number; // in minutes
  response_rate: number; // percentage
  first_response_time: number; // average time to first response
  
  // Channel Performance
  channel_usage: Array<{
    type: CommunicationType;
    usage_count: number;
    response_rate: number;
    customer_satisfaction?: number;
  }>;
  
  // Customer Engagement
  most_active_customers: Array<{
    customer_id: string;
    customer_name: string;
    message_count: number;
    last_contact: string;
  }>;
  
  // Template Performance
  template_usage: Array<{
    template_id: string;
    template_name: string;
    usage_count: number;
    success_rate: number;
  }>;
  
  // Issue Categories
  common_topics: Array<{
    topic: string;
    count: number;
    average_resolution_time: number;
  }>;
  
  // Trends
  daily_volume: Array<{
    date: string;
    message_count: number;
    response_time: number;
  }>;
}

export interface WhatsAppIntegration {
  id: string;
  
  // API Configuration
  business_account_id: string;
  phone_number_id: string;
  access_token: string;
  webhook_verify_token: string;
  
  // Status
  is_active: boolean;
  connection_status: 'connected' | 'disconnected' | 'error';
  last_webhook_received?: string;
  
  // Settings
  auto_response_enabled: boolean;
  business_hours_message?: string;
  away_message?: string;
  
  // Message Limits
  daily_message_limit: number;
  messages_sent_today: number;
  rate_limit_per_minute: number;
  
  // Template Management
  approved_templates: WhatsAppTemplate[];
  
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  category: 'marketing' | 'utility' | 'authentication';
  
  // Template Structure
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    content: string;
    variables?: string[];
  };
  body: {
    content: string;
    variables: string[];
  };
  footer?: {
    content: string;
  };
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'phone';
    text: string;
    url?: string;
    phone?: string;
  }>;
  
  created_at: string;
  updated_at: string;
}

export interface EmailConfiguration {
  id: string;
  
  // SMTP Settings
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string; // Encrypted
  
  // Sender Information
  from_name: string;
  from_email: string;
  reply_to_email?: string;
  
  // Email Signatures
  default_signature: string;
  order_signature?: string;
  support_signature?: string;
  
  // Settings
  is_active: boolean;
  track_opens: boolean;
  track_clicks: boolean;
  
  // Limits
  daily_limit: number;
  emails_sent_today: number;
  
  created_at: string;
  updated_at: string;
}

// Filters and search
export interface CommunicationFilters {
  customer_id?: string;
  order_id?: string;
  type?: CommunicationType | CommunicationType[];
  direction?: CommunicationDirection | CommunicationDirection[];
  status?: CommunicationStatus | CommunicationStatus[];
  
  date_range?: {
    start: string;
    end: string;
  };
  
  requires_follow_up?: boolean;
  unread_only?: boolean;
  tags?: string[];
  
  search_query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'sent_at' | 'read_at';
  sort_order?: 'asc' | 'desc';
}

// Default values and constants
export const DEFAULT_COMMUNICATION_VALUES = {
  type: 'whatsapp' as CommunicationType,
  direction: 'outgoing' as CommunicationDirection,
  status: 'draft' as CommunicationStatus,
  requires_follow_up: false,
  follow_up_completed: false,
  tags: [],
};

export const COMMUNICATION_TYPE_LABELS = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  phone: 'Phone Call',
  sms: 'SMS',
  in_person: 'In Person',
  internal_note: 'Internal Note',
} as const;

export const MESSAGE_TEMPLATE_LABELS = {
  order_confirmation: 'Order Confirmation',
  design_approval_request: 'Design Approval Request',
  production_update: 'Production Update',
  quality_control_update: 'Quality Control Update',
  ready_for_pickup: 'Ready for Pickup',
  delivery_notification: 'Delivery Notification',
  payment_reminder: 'Payment Reminder',
  follow_up: 'Follow Up',
  custom: 'Custom Message',
} as const;

export const PREDEFINED_MESSAGE_TEMPLATES: Record<MessageTemplate, string> = {
  order_confirmation: `Hello {customer_name}! 

Your order #{order_number} has been confirmed. 

Details:
- Box Type: {box_type}
- Quantity: {quantity}
- Estimated Completion: {estimated_completion}

We'll keep you updated on the progress. Thank you for choosing Premium Gift Box!`,

  design_approval_request: `Hi {customer_name},

Your gift box design for order #{order_number} is ready for review!

Please check the attached design and let us know if you'd like any changes or if you approve it for production.

We're excited to bring your vision to life! 🎁`,

  production_update: `Update on your order #{order_number}:

Current Status: {current_status}
Progress: {progress_percentage}% complete

{custom_message}

Estimated completion: {estimated_completion}`,

  quality_control_update: `Great news! Your order #{order_number} has passed quality control ✅

Your beautiful gift boxes are now being prepared for {delivery_method}. 

{custom_message}`,

  ready_for_pickup: `Your order #{order_number} is ready for pickup! 🎉

Pickup Details:
📍 Location: {pickup_location}
🕒 Hours: {pickup_hours}
💰 Balance: {remaining_balance}

Please bring this message and a valid ID.`,

  delivery_notification: `Your Premium Gift Boxes are on the way! 🚚

Order: #{order_number}
Estimated Delivery: {delivery_date}
Tracking: {tracking_number}

{delivery_instructions}`,

  payment_reminder: `Friendly reminder: Order #{order_number}

Outstanding Balance: {outstanding_amount}
Due Date: {due_date}

Payment Options:
💳 Bank Transfer: {bank_details}
💰 Cash on Delivery
📱 Mobile Payment

Thank you!`,

  follow_up: `Hi {customer_name}! 

How are you enjoying your Premium Gift Boxes from order #{order_number}?

We'd love to hear your feedback and help with any future gift box needs! 

{custom_message}`,

  custom: `{custom_message}`,
};

// Validation rules
export interface CommunicationValidationRules {
  message: { minLength: number; maxLength: number; required: boolean };
  subject: { maxLength: number };
  recipient: { required: boolean };
}

export const COMMUNICATION_VALIDATION_RULES: CommunicationValidationRules = {
  message: { minLength: 1, maxLength: 4000, required: true },
  subject: { maxLength: 200 },
  recipient: { required: true },
};