import * as FileSystem from 'expo-file-system';
import { API_CONFIG } from '../config';

// Use a getter so the URL is always current (supports runtime URL changes)
const getApiUrl = () => API_CONFIG.API_URL;

export interface UploadedFile {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
}

export class FileService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Upload a single file
   */
  async uploadFile(uri: string, filename: string): Promise<UploadedFile> {
    try {
      const uploadResult = await FileSystem.uploadAsync(
        `${getApiUrl()}/files/upload`,
        uri,
        {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      if (uploadResult.status !== 200) {
        throw new Error('Upload failed');
      }

      const response = JSON.parse(uploadResult.body);

      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }

      return response.file;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: { uri: string; filename: string }[]
  ): Promise<UploadedFile[]> {
    try {
      const uploadPromises = files.map((file) =>
        this.uploadFile(file.uri, file.filename)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple upload error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const response = await fetch(`${getApiUrl()}/files/${fileId}/metadata`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file metadata');
      }

      const data = await response.json();
      return data.file;
    } catch (error) {
      console.error('Get file metadata error:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`${getApiUrl()}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  /**
   * Get user's uploaded files
   */
  async getUserFiles(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${getApiUrl()}/files/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user files');
      }

      const data = await response.json();
      return data.files;
    } catch (error) {
      console.error('Get user files error:', error);
      throw error;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(): Promise<{ totalFiles: number; totalSize: number; totalSizeMB: string }> {
    try {
      const response = await fetch(`${getApiUrl()}/files/stats/summary`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Get file stats error:', error);
      throw error;
    }
  }

  /**
   * Download file to local storage
   */
  async downloadFile(fileId: string, filename: string): Promise<string> {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        `${getApiUrl()}/files/${fileId}`,
        FileSystem.documentDirectory + filename,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error('Download failed');
      }

      return result.uri;
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  /**
   * Get full file URL
   */
  getFileUrl(fileId: string): string {
    return `${getApiUrl()}/files/${fileId}`;
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(fileId: string): string {
    return `${getApiUrl()}/files/${fileId}/thumbnail`;
  }
}

// Hook for using FileService with auth token
export const useFileService = (token: string | null): FileService | null => {
  if (!token) return null;
  return new FileService(token);
};
