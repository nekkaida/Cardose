export interface DesignFile {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  resolution?: number; // DPI
  colorProfile?: string;
  thumbnailPath?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: DesignCategory;
  status: DesignStatus;
  metadata: DesignMetadata;
}

export interface DesignMetadata {
  description?: string;
  designType: DesignType;
  printSpecifications?: PrintSpecifications;
  clientInstructions?: string;
  designNotes?: string;
  version: number;
  previousVersionId?: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  revisionHistory: DesignRevision[];
}

export interface DesignRevision {
  id: string;
  version: number;
  filePath: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
  comments?: string;
}

export interface PrintSpecifications {
  paperType: PaperType;
  paperSize: PaperSize;
  orientation: 'portrait' | 'landscape';
  colorMode: ColorMode;
  finish: FinishType;
  bleed: number; // in mm
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  specialInstructions?: string;
}

export type DesignCategory = 
  | 'box_design' 
  | 'label' 
  | 'insert_card' 
  | 'wrapping_paper' 
  | 'ribbon_design' 
  | 'promotional_material' 
  | 'template' 
  | 'reference';

export type DesignStatus = 
  | 'draft' 
  | 'in_review' 
  | 'revision_needed' 
  | 'approved' 
  | 'production_ready' 
  | 'archived';

export type DesignType = 
  | 'vector' 
  | 'raster' 
  | 'layout' 
  | 'mockup' 
  | 'template' 
  | 'photo' 
  | 'illustration';

export type PaperType = 
  | 'art_paper' 
  | 'duplex' 
  | 'ivory' 
  | 'kraft' 
  | 'corrugate' 
  | 'cardboard' 
  | 'specialty';

export type PaperSize = 
  | 'A4' 
  | 'A3' 
  | 'A5' 
  | 'custom' 
  | 'roll';

export type ColorMode = 
  | 'CMYK' 
  | 'RGB' 
  | 'grayscale' 
  | 'spot_color' 
  | 'pantone';

export type FinishType = 
  | 'matte' 
  | 'gloss' 
  | 'satin' 
  | 'embossed' 
  | 'debossed' 
  | 'foil' 
  | 'uv_coating' 
  | 'laminated';

export type ApprovalStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'needs_revision';

export interface DesignProject {
  id: string;
  name: string;
  description?: string;
  clientId?: string;
  orderId?: string;
  status: ProjectStatus;
  priority: Priority;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  assignedTo?: string;
  files: string[]; // DesignFile IDs
  requirements: ProjectRequirements;
  timeline: ProjectTimeline;
  budget?: ProjectBudget;
  notes?: string;
}

export interface ProjectRequirements {
  briefDescription: string;
  targetAudience?: string;
  brandGuidelines?: string;
  colorRequirements?: string;
  sizeRequirements: string;
  quantityNeeded: number;
  specialRequests?: string;
  referenceImages?: string[]; // File paths
  inspirationLinks?: string[];
}

export interface ProjectTimeline {
  conceptDue?: Date;
  firstDraftDue?: Date;
  revisionDue?: Date;
  finalApprovalDue?: Date;
  productionStartDate?: Date;
  deliveryDate?: Date;
  milestones: ProjectMilestone[];
}

export interface ProjectMilestone {
  id: string;
  name: string;
  description?: string;
  dueDate: Date;
  status: MilestoneStatus;
  completedAt?: Date;
  deliverables: string[];
}

export interface ProjectBudget {
  designFee: number;
  revisionFee: number;
  rushFee?: number;
  totalBudget: number;
  approvedBudget?: number;
  actualCost?: number;
}

export type ProjectStatus = 
  | 'planning' 
  | 'concept' 
  | 'design' 
  | 'revision' 
  | 'approval' 
  | 'production' 
  | 'completed' 
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type MilestoneStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'delayed' 
  | 'cancelled';

export interface DesignTemplate {
  id: string;
  name: string;
  description?: string;
  category: DesignCategory;
  templateType: TemplateType;
  filePath: string;
  thumbnailPath?: string;
  previewImages: string[];
  specifications: PrintSpecifications;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  tags: string[];
  customizationOptions: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  type: CustomizationType;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: ValidationRule;
}

export type TemplateType = 
  | 'box_template' 
  | 'label_template' 
  | 'card_template' 
  | 'layout_template';

export type CustomizationType = 
  | 'text' 
  | 'color' 
  | 'image' 
  | 'size' 
  | 'font' 
  | 'style';

export interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  allowedFormats?: string[];
  maxFileSize?: number;
}

export interface DesignAsset {
  id: string;
  name: string;
  type: AssetType;
  category: AssetCategory;
  filePath: string;
  thumbnailPath?: string;
  description?: string;
  tags: string[];
  isReusable: boolean;
  usage: AssetUsage[];
  metadata: AssetMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetUsage {
  projectId: string;
  usedAt: Date;
  context: string;
}

export interface AssetMetadata {
  fileSize: number;
  dimensions?: {
    width: number;
    height: number;
  };
  colorPalette?: string[];
  dominantColors?: string[];
  format: string;
  license?: AssetLicense;
}

export type AssetType = 
  | 'logo' 
  | 'icon' 
  | 'illustration' 
  | 'pattern' 
  | 'texture' 
  | 'photo' 
  | 'font' 
  | 'color_palette';

export type AssetCategory = 
  | 'brand_assets' 
  | 'decorative' 
  | 'functional' 
  | 'seasonal' 
  | 'industry_specific';

export interface AssetLicense {
  type: LicenseType;
  attribution?: string;
  commercialUse: boolean;
  restrictions?: string[];
  expiryDate?: Date;
}

export type LicenseType = 
  | 'proprietary' 
  | 'creative_commons' 
  | 'commercial' 
  | 'royalty_free' 
  | 'public_domain';

export interface DesignWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  defaultAssignments: Record<string, string>; // Step ID -> User ID
  estimatedDuration: number; // in hours
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  requiredRole?: string;
  estimatedHours: number;
  dependencies: string[]; // Step IDs that must be completed first
  approvalRequired: boolean;
  deliverables: string[];
  checklist: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  description: string;
  required: boolean;
  completed?: boolean;
  completedBy?: string;
  completedAt?: Date;
}

export interface DesignReview {
  id: string;
  designFileId: string;
  projectId?: string;
  reviewerId: string;
  reviewerName: string;
  status: ReviewStatus;
  overallRating?: number; // 1-5 scale
  createdAt: Date;
  updatedAt: Date;
  comments: ReviewComment[];
  approvalNotes?: string;
  nextSteps?: string;
}

export interface ReviewComment {
  id: string;
  type: CommentType;
  content: string;
  position?: {
    x: number;
    y: number;
  };
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  priority: Priority;
}

export type ReviewStatus = 
  | 'pending' 
  | 'in_review' 
  | 'approved' 
  | 'rejected' 
  | 'needs_minor_changes' 
  | 'needs_major_changes';

export type CommentType = 
  | 'general' 
  | 'color' 
  | 'typography' 
  | 'layout' 
  | 'content' 
  | 'technical' 
  | 'suggestion';

export interface ColorPalette {
  id: string;
  name: string;
  colors: ColorDefinition[];
  description?: string;
  category: PaletteCategory;
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  usageCount: number;
}

export interface ColorDefinition {
  name: string;
  hex: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  cmyk?: {
    c: number;
    m: number;
    y: number;
    k: number;
  };
  pantone?: string;
  usage: ColorUsage;
}

export type ColorUsage = 
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'neutral' 
  | 'background' 
  | 'text';

export type PaletteCategory = 
  | 'brand' 
  | 'seasonal' 
  | 'trending' 
  | 'classic' 
  | 'custom';

export interface DesignMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  averageProjectDuration: number;
  onTimeDeliveryRate: number;
  clientSatisfactionRate: number;
  revisionRate: number;
  templateUsage: Record<string, number>;
  popularCategories: Record<string, number>;
  designerProductivity: Record<string, DesignerStats>;
}

export interface DesignerStats {
  projectsCompleted: number;
  averageRating: number;
  onTimeDelivery: number;
  revisionRate: number;
  specialties: DesignCategory[];
}

export interface DesignSearchFilter {
  category?: DesignCategory[];
  status?: DesignStatus[];
  designType?: DesignType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  clientId?: string;
  designerId?: string;
  projectId?: string;
}

export interface DesignExportOptions {
  format: ExportFormat;
  quality: ExportQuality;
  colorProfile: string;
  includeBleed: boolean;
  includeMarks: boolean;
  resolution?: number;
  customSettings?: Record<string, any>;
}

export type ExportFormat = 
  | 'pdf' 
  | 'jpg' 
  | 'png' 
  | 'svg' 
  | 'eps' 
  | 'ai' 
  | 'psd';

export type ExportQuality = 'draft' | 'preview' | 'print' | 'high';

export interface DesignNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId: string; // Project, file, or review ID
  recipientId: string;
  isRead: boolean;
  priority: Priority;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
}

export type NotificationType = 
  | 'project_assigned' 
  | 'deadline_approaching' 
  | 'review_completed' 
  | 'approval_received' 
  | 'revision_requested' 
  | 'project_completed' 
  | 'file_uploaded' 
  | 'comment_added';

export interface DesignSettings {
  defaultWorkflow: string;
  autoSaveInterval: number;
  defaultColorProfile: string;
  defaultExportSettings: DesignExportOptions;
  notificationPreferences: NotificationPreferences;
  fileNamingConvention: string;
  storageQuota: number;
  backupEnabled: boolean;
  versionControl: boolean;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: NotificationType[];
  quietHours?: {
    start: string; // HH:mm format
    end: string;
  };
}