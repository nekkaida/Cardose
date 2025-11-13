import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { 
  DesignFile, 
  DesignProject, 
  DesignTemplate,
  DesignAsset,
  DesignReview,
  ColorPalette,
  DesignWorkflow,
  DesignMetrics,
  DesignSearchFilter,
  DesignExportOptions,
  DesignNotification,
  ProjectStatus,
  ReviewStatus,
  DesignStatus,
  DesignCategory,
  ApprovalStatus
} from '../types/Design';

export class DesignService {
  private static readonly DESIGNS_KEY = 'design_files';
  private static readonly PROJECTS_KEY = 'design_projects';
  private static readonly TEMPLATES_KEY = 'design_templates';
  private static readonly ASSETS_KEY = 'design_assets';
  private static readonly REVIEWS_KEY = 'design_reviews';
  private static readonly PALETTES_KEY = 'color_palettes';
  private static readonly WORKFLOWS_KEY = 'design_workflows';
  private static readonly SETTINGS_KEY = 'design_settings';

  // File Management
  static async uploadDesignFile(
    projectId?: string,
    category?: DesignCategory
  ): Promise<DesignFile | null> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Media library permission required');
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/postscript'],
        copyToCacheDirectory: true
      });

      if (result.type === 'cancel') return null;

      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      if (!fileInfo.exists) {
        throw new Error('Selected file does not exist');
      }

      // Create permanent storage location
      const designsDir = `${FileSystem.documentDirectory}designs/`;
      await FileSystem.makeDirectoryAsync(designsDir, { intermediates: true });
      
      const fileName = `${Date.now()}_${asset.name}`;
      const permanentPath = `${designsDir}${fileName}`;
      
      // Copy file to permanent location
      await FileSystem.copyAsync({
        from: asset.uri,
        to: permanentPath
      });

      // Get image dimensions if it's an image
      let dimensions;
      if (asset.mimeType?.startsWith('image/')) {
        // This would require additional image processing library
        // For now, we'll use placeholder values
        dimensions = { width: 1920, height: 1080 };
      }

      const designFile: DesignFile = {
        id: `design_${Date.now()}`,
        name: asset.name.split('.')[0],
        fileName: asset.name,
        filePath: permanentPath,
        fileSize: fileInfo.size || asset.size || 0,
        mimeType: asset.mimeType || 'application/octet-stream',
        dimensions,
        resolution: 300,
        colorProfile: 'sRGB',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        category: category || 'box_design',
        status: 'draft',
        metadata: {
          designType: this.determineDesignType(asset.mimeType || ''),
          version: 1,
          approvalStatus: 'pending',
          revisionHistory: []
        }
      };

      // Generate thumbnail
      await this.generateThumbnail(designFile);

      // Save design file
      await this.saveDesignFile(designFile);

      // Associate with project if provided
      if (projectId) {
        await this.addFileToProject(projectId, designFile.id);
      }

      return designFile;
    } catch (error) {
      console.error('Error uploading design file:', error);
      throw error;
    }
  }

  static async saveDesignFile(designFile: DesignFile): Promise<void> {
    try {
      const designs = await this.getAllDesignFiles();
      const existingIndex = designs.findIndex(d => d.id === designFile.id);
      
      if (existingIndex !== -1) {
        designs[existingIndex] = { ...designFile, updatedAt: new Date() };
      } else {
        designs.push(designFile);
      }

      await AsyncStorage.setItem(this.DESIGNS_KEY, JSON.stringify(designs));
    } catch (error) {
      console.error('Error saving design file:', error);
      throw error;
    }
  }

  static async getAllDesignFiles(filter?: DesignSearchFilter): Promise<DesignFile[]> {
    try {
      const stored = await AsyncStorage.getItem(this.DESIGNS_KEY);
      let designs: DesignFile[] = stored ? JSON.parse(stored) : [];

      if (filter) {
        designs = this.applyDesignFilter(designs, filter);
      }

      return designs.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error retrieving design files:', error);
      return [];
    }
  }

  static async getDesignFile(id: string): Promise<DesignFile | null> {
    try {
      const designs = await this.getAllDesignFiles();
      return designs.find(d => d.id === id) || null;
    } catch (error) {
      console.error('Error retrieving design file:', error);
      return null;
    }
  }

  static async updateDesignFile(id: string, updates: Partial<DesignFile>): Promise<DesignFile | null> {
    try {
      const designs = await this.getAllDesignFiles();
      const index = designs.findIndex(d => d.id === id);
      
      if (index === -1) return null;

      const updatedDesign = {
        ...designs[index],
        ...updates,
        updatedAt: new Date()
      };

      designs[index] = updatedDesign;
      await AsyncStorage.setItem(this.DESIGNS_KEY, JSON.stringify(designs));
      
      return updatedDesign;
    } catch (error) {
      console.error('Error updating design file:', error);
      throw error;
    }
  }

  static async deleteDesignFile(id: string): Promise<void> {
    try {
      const design = await this.getDesignFile(id);
      if (!design) return;

      // Delete physical file
      const fileInfo = await FileSystem.getInfoAsync(design.filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(design.filePath);
      }

      // Delete thumbnail if exists
      if (design.thumbnailPath) {
        const thumbInfo = await FileSystem.getInfoAsync(design.thumbnailPath);
        if (thumbInfo.exists) {
          await FileSystem.deleteAsync(design.thumbnailPath);
        }
      }

      // Remove from storage
      const designs = await this.getAllDesignFiles();
      const filtered = designs.filter(d => d.id !== id);
      await AsyncStorage.setItem(this.DESIGNS_KEY, JSON.stringify(filtered));

      // Remove from projects
      const projects = await this.getAllProjects();
      for (const project of projects) {
        if (project.files.includes(id)) {
          await this.removeFileFromProject(project.id, id);
        }
      }
    } catch (error) {
      console.error('Error deleting design file:', error);
      throw error;
    }
  }

  // Project Management
  static async createProject(projectData: Partial<DesignProject>): Promise<DesignProject> {
    try {
      const project: DesignProject = {
        id: `project_${Date.now()}`,
        name: projectData.name || 'New Project',
        description: projectData.description,
        clientId: projectData.clientId,
        orderId: projectData.orderId,
        status: 'planning',
        priority: projectData.priority || 'medium',
        deadline: projectData.deadline,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: projectData.createdBy || 'system',
        assignedTo: projectData.assignedTo,
        files: [],
        requirements: projectData.requirements || {
          briefDescription: '',
          sizeRequirements: '',
          quantityNeeded: 1,
          milestones: []
        },
        timeline: projectData.timeline || {
          milestones: []
        },
        budget: projectData.budget
      };

      await this.saveProject(project);
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  static async saveProject(project: DesignProject): Promise<void> {
    try {
      const projects = await this.getAllProjects();
      const existingIndex = projects.findIndex(p => p.id === project.id);
      
      if (existingIndex !== -1) {
        projects[existingIndex] = { ...project, updatedAt: new Date() };
      } else {
        projects.push(project);
      }

      await AsyncStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  static async getAllProjects(): Promise<DesignProject[]> {
    try {
      const stored = await AsyncStorage.getItem(this.PROJECTS_KEY);
      const projects: DesignProject[] = stored ? JSON.parse(stored) : [];
      
      return projects.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error retrieving projects:', error);
      return [];
    }
  }

  static async getProject(id: string): Promise<DesignProject | null> {
    try {
      const projects = await this.getAllProjects();
      return projects.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Error retrieving project:', error);
      return null;
    }
  }

  static async updateProjectStatus(id: string, status: ProjectStatus): Promise<void> {
    try {
      const project = await this.getProject(id);
      if (!project) return;

      project.status = status;
      project.updatedAt = new Date();

      await this.saveProject(project);

      // Send notification
      await this.createNotification({
        type: status === 'completed' ? 'project_completed' : 'project_assigned',
        title: 'Project Status Updated',
        message: `Project "${project.name}" status changed to ${status}`,
        relatedId: id,
        recipientId: project.assignedTo || project.createdBy,
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  }

  static async addFileToProject(projectId: string, fileId: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) return;

      if (!project.files.includes(fileId)) {
        project.files.push(fileId);
        await this.saveProject(project);
      }
    } catch (error) {
      console.error('Error adding file to project:', error);
      throw error;
    }
  }

  static async removeFileFromProject(projectId: string, fileId: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) return;

      project.files = project.files.filter(id => id !== fileId);
      await this.saveProject(project);
    } catch (error) {
      console.error('Error removing file from project:', error);
      throw error;
    }
  }

  // Review Management
  static async createReview(reviewData: Partial<DesignReview>): Promise<DesignReview> {
    try {
      const review: DesignReview = {
        id: `review_${Date.now()}`,
        designFileId: reviewData.designFileId!,
        projectId: reviewData.projectId,
        reviewerId: reviewData.reviewerId!,
        reviewerName: reviewData.reviewerName!,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: []
      };

      await this.saveReview(review);

      // Update design file status
      await this.updateDesignFile(review.designFileId, { status: 'in_review' });

      // Send notification
      await this.createNotification({
        type: 'review_completed',
        title: 'Design Review Started',
        message: `Review started for design file`,
        relatedId: review.designFileId,
        recipientId: reviewData.reviewerId!,
        priority: 'medium'
      });

      return review;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  static async saveReview(review: DesignReview): Promise<void> {
    try {
      const reviews = await this.getAllReviews();
      const existingIndex = reviews.findIndex(r => r.id === review.id);
      
      if (existingIndex !== -1) {
        reviews[existingIndex] = { ...review, updatedAt: new Date() };
      } else {
        reviews.push(review);
      }

      await AsyncStorage.setItem(this.REVIEWS_KEY, JSON.stringify(reviews));
    } catch (error) {
      console.error('Error saving review:', error);
      throw error;
    }
  }

  static async getAllReviews(): Promise<DesignReview[]> {
    try {
      const stored = await AsyncStorage.getItem(this.REVIEWS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving reviews:', error);
      return [];
    }
  }

  static async getReviewsForFile(fileId: string): Promise<DesignReview[]> {
    try {
      const reviews = await this.getAllReviews();
      return reviews.filter(r => r.designFileId === fileId);
    } catch (error) {
      console.error('Error retrieving file reviews:', error);
      return [];
    }
  }

  static async completeReview(
    reviewId: string, 
    status: ReviewStatus,
    comments: string,
    rating?: number
  ): Promise<void> {
    try {
      const reviews = await this.getAllReviews();
      const review = reviews.find(r => r.id === reviewId);
      
      if (!review) return;

      review.status = status;
      review.overallRating = rating;
      review.approvalNotes = comments;
      review.updatedAt = new Date();

      await this.saveReview(review);

      // Update design file status based on review
      let designStatus: DesignStatus;
      let approvalStatus: ApprovalStatus;

      switch (status) {
        case 'approved':
          designStatus = 'approved';
          approvalStatus = 'approved';
          break;
        case 'rejected':
          designStatus = 'revision_needed';
          approvalStatus = 'rejected';
          break;
        case 'needs_minor_changes':
        case 'needs_major_changes':
          designStatus = 'revision_needed';
          approvalStatus = 'needs_revision';
          break;
        default:
          designStatus = 'in_review';
          approvalStatus = 'pending';
      }

      await this.updateDesignFile(review.designFileId, {
        status: designStatus,
        'metadata.approvalStatus': approvalStatus,
        'metadata.approvedBy': review.reviewerName,
        'metadata.approvedAt': new Date()
      });

      // Send notification
      await this.createNotification({
        type: 'review_completed',
        title: 'Design Review Completed',
        message: `Review completed with status: ${status}`,
        relatedId: review.designFileId,
        recipientId: review.reviewerId,
        priority: status === 'approved' ? 'low' : 'medium'
      });
    } catch (error) {
      console.error('Error completing review:', error);
      throw error;
    }
  }

  // Template Management
  static async createTemplate(templateData: Partial<DesignTemplate>): Promise<DesignTemplate> {
    try {
      const template: DesignTemplate = {
        id: `template_${Date.now()}`,
        name: templateData.name!,
        description: templateData.description,
        category: templateData.category!,
        templateType: templateData.templateType!,
        filePath: templateData.filePath!,
        thumbnailPath: templateData.thumbnailPath,
        previewImages: templateData.previewImages || [],
        specifications: templateData.specifications!,
        isPublic: templateData.isPublic || false,
        createdBy: templateData.createdBy!,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        tags: templateData.tags || [],
        customizationOptions: templateData.customizationOptions || []
      };

      await this.saveTemplate(template);
      return template;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  static async saveTemplate(template: DesignTemplate): Promise<void> {
    try {
      const templates = await this.getAllTemplates();
      const existingIndex = templates.findIndex(t => t.id === template.id);
      
      if (existingIndex !== -1) {
        templates[existingIndex] = { ...template, updatedAt: new Date() };
      } else {
        templates.push(template);
      }

      await AsyncStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  static async getAllTemplates(): Promise<DesignTemplate[]> {
    try {
      const stored = await AsyncStorage.getItem(this.TEMPLATES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving templates:', error);
      return [];
    }
  }

  // Analytics and Metrics
  static async getDesignMetrics(): Promise<DesignMetrics> {
    try {
      const projects = await this.getAllProjects();
      const designs = await this.getAllDesignFiles();
      const reviews = await this.getAllReviews();
      const templates = await this.getAllTemplates();

      const completedProjects = projects.filter(p => p.status === 'completed');
      const activeProjects = projects.filter(p => 
        ['planning', 'concept', 'design', 'revision', 'approval', 'production'].includes(p.status)
      );

      // Calculate average project duration
      const projectDurations = completedProjects
        .filter(p => p.timeline.deliveryDate)
        .map(p => {
          const start = new Date(p.createdAt).getTime();
          const end = new Date(p.timeline.deliveryDate!).getTime();
          return (end - start) / (1000 * 60 * 60 * 24); // Convert to days
        });

      const averageProjectDuration = projectDurations.length > 0 ?
        projectDurations.reduce((sum, duration) => sum + duration, 0) / projectDurations.length : 0;

      // Calculate on-time delivery rate
      const onTimeProjects = completedProjects.filter(p => {
        if (!p.deadline || !p.timeline.deliveryDate) return false;
        return new Date(p.timeline.deliveryDate) <= new Date(p.deadline);
      });

      const onTimeDeliveryRate = completedProjects.length > 0 ?
        (onTimeProjects.length / completedProjects.length) * 100 : 0;

      // Calculate client satisfaction rate
      const approvedReviews = reviews.filter(r => r.status === 'approved');
      const clientSatisfactionRate = reviews.length > 0 ?
        (approvedReviews.length / reviews.length) * 100 : 0;

      // Calculate revision rate
      const revisionsNeeded = reviews.filter(r => 
        ['needs_minor_changes', 'needs_major_changes', 'rejected'].includes(r.status)
      );
      const revisionRate = reviews.length > 0 ?
        (revisionsNeeded.length / reviews.length) * 100 : 0;

      // Template usage statistics
      const templateUsage = templates.reduce((acc, template) => {
        acc[template.name] = template.usageCount;
        return acc;
      }, {} as Record<string, number>);

      // Popular categories
      const popularCategories = designs.reduce((acc, design) => {
        acc[design.category] = (acc[design.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        averageProjectDuration,
        onTimeDeliveryRate,
        clientSatisfactionRate,
        revisionRate,
        templateUsage,
        popularCategories,
        designerProductivity: {} // Would be calculated based on user data
      };
    } catch (error) {
      console.error('Error calculating design metrics:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        averageProjectDuration: 0,
        onTimeDeliveryRate: 0,
        clientSatisfactionRate: 0,
        revisionRate: 0,
        templateUsage: {},
        popularCategories: {},
        designerProductivity: {}
      };
    }
  }

  // Notification Management
  static async createNotification(notificationData: Partial<DesignNotification>): Promise<void> {
    try {
      const notification: DesignNotification = {
        id: `notification_${Date.now()}`,
        type: notificationData.type!,
        title: notificationData.title!,
        message: notificationData.message!,
        relatedId: notificationData.relatedId!,
        recipientId: notificationData.recipientId!,
        isRead: false,
        priority: notificationData.priority || 'medium',
        createdAt: new Date(),
        expiresAt: notificationData.expiresAt,
        actionUrl: notificationData.actionUrl
      };

      const notifications = await this.getAllNotifications();
      notifications.push(notification);
      await AsyncStorage.setItem('design_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  static async getAllNotifications(): Promise<DesignNotification[]> {
    try {
      const stored = await AsyncStorage.getItem('design_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving notifications:', error);
      return [];
    }
  }

  // Helper Methods
  private static determineDesignType(mimeType: string): any {
    if (mimeType.includes('svg')) return 'vector';
    if (mimeType.includes('pdf') || mimeType.includes('postscript')) return 'layout';
    if (mimeType.includes('image')) return 'raster';
    return 'raster';
  }

  private static async generateThumbnail(designFile: DesignFile): Promise<void> {
    try {
      // This would require image processing library
      // For now, we'll just set the thumbnail path to the original file
      if (designFile.mimeType.startsWith('image/')) {
        designFile.thumbnailPath = designFile.filePath;
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }
  }

  private static applyDesignFilter(designs: DesignFile[], filter: DesignSearchFilter): DesignFile[] {
    return designs.filter(design => {
      if (filter.category && !filter.category.includes(design.category)) return false;
      if (filter.status && !filter.status.includes(design.status)) return false;
      if (filter.designType && !filter.designType.includes(design.metadata.designType)) return false;
      if (filter.tags && !filter.tags.some(tag => design.tags.includes(tag))) return false;
      if (filter.dateRange) {
        const designDate = new Date(design.createdAt);
        if (designDate < filter.dateRange.start || designDate > filter.dateRange.end) return false;
      }
      return true;
    });
  }

  static async exportDesign(designId: string, options: DesignExportOptions): Promise<string> {
    try {
      const design = await this.getDesignFile(designId);
      if (!design) throw new Error('Design file not found');

      // For now, just return the current file path
      // In a real implementation, this would process the file according to export options
      return design.filePath;
    } catch (error) {
      console.error('Error exporting design:', error);
      throw error;
    }
  }

  static async clearCache(): Promise<void> {
    try {
      const keys = [
        this.DESIGNS_KEY,
        this.PROJECTS_KEY,
        this.TEMPLATES_KEY,
        this.ASSETS_KEY,
        this.REVIEWS_KEY,
        this.PALETTES_KEY,
        this.WORKFLOWS_KEY,
        'design_notifications'
      ];

      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    } catch (error) {
      console.error('Error clearing design cache:', error);
    }
  }
}