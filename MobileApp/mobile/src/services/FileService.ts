import * as FileSystem from 'expo-file-system';
import { API_CONFIG, APP_CONFIG } from '../config';

// Use a getter so the URL is always current (supports runtime URL changes)
const getApiUrl = () => API_CONFIG.API_URL;
const DEFAULT_TIMEOUT = API_CONFIG.TIMEOUT;

export interface UploadedFile {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  uploadedAt?: string;
}

export interface OrderFile {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  uploadedAt: string;
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  totalSizeMB: string;
}

export type UploadProgressCallback = (progress: number) => void;

export class FileServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isAuthError: boolean = false,
  ) {
    super(message);
    this.name = 'FileServiceError';
  }
}

export class FileService {
  private token: string;
  private onUnauthorized?: () => void;

  constructor(token: string, onUnauthorized?: () => void) {
    this.token = token;
    this.onUnauthorized = onUnauthorized;
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }

  /**
   * Centralized fetch wrapper with 401 handling and timeout.
   */
  private async fetchWithAuth(
    url: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.authHeaders(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        this.onUnauthorized?.();
        throw new FileServiceError(
          'Sesi Anda telah berakhir. Silakan login kembali.',
          401,
          true,
        );
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error instanceof FileServiceError) throw error;
      if (error.name === 'AbortError') {
        throw new FileServiceError('Permintaan timeout. Silakan coba lagi.');
      }
      throw new FileServiceError(
        error.message || 'Terjadi kesalahan jaringan.',
      );
    }
  }

  /**
   * Validate file size before uploading.
   * Returns file info or throws if file exceeds the limit.
   */
  async validateFileSize(uri: string): Promise<FileSystem.FileInfo> {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });

    if (!fileInfo.exists) {
      throw new FileServiceError('File tidak ditemukan.');
    }

    const maxBytes = APP_CONFIG.MAX_FILE_SIZE;
    const maxMB = maxBytes / (1024 * 1024);

    if (fileInfo.size && fileInfo.size > maxBytes) {
      const fileMB = (fileInfo.size / (1024 * 1024)).toFixed(1);
      throw new FileServiceError(
        `Ukuran file (${fileMB} MB) melebihi batas maksimum ${maxMB} MB.`,
      );
    }

    return fileInfo;
  }

  /**
   * Upload a single file with optional progress tracking.
   * Uses API_CONFIG.UPLOAD_TIMEOUT (120s) to prevent stalled uploads.
   */
  async uploadFile(
    uri: string,
    filename: string,
    onProgress?: UploadProgressCallback,
  ): Promise<UploadedFile> {
    // Validate size before uploading
    await this.validateFileSize(uri);

    const uploadUrl = `${getApiUrl()}/files/upload`;
    const uploadTimeout = API_CONFIG.UPLOAD_TIMEOUT;

    if (onProgress) {
      // Use createUploadTask for progress tracking
      const task = FileSystem.createUploadTask(
        uploadUrl,
        uri,
        {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          headers: this.authHeaders(),
        },
        (data) => {
          if (data.totalBytesSent && data.totalBytesExpectedToSend) {
            const pct = data.totalBytesSent / data.totalBytesExpectedToSend;
            onProgress(Math.min(pct, 1));
          }
        },
      );

      // Cancel the task if it exceeds the upload timeout
      const timeoutId = setTimeout(() => task.cancelAsync(), uploadTimeout);
      const uploadResult = await task.uploadAsync();
      clearTimeout(timeoutId);

      if (!uploadResult) {
        throw new FileServiceError('Upload dibatalkan atau timeout.');
      }

      return this.parseUploadResult(uploadResult);
    }

    // Simple upload without progress — race against a timeout
    const uploadPromise = FileSystem.uploadAsync(uploadUrl, uri, {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      headers: this.authHeaders(),
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new FileServiceError('Upload timeout. Silakan coba lagi.')),
        uploadTimeout,
      ),
    );
    const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);

    return this.parseUploadResult(uploadResult);
  }

  private parseUploadResult(
    result: FileSystem.FileSystemUploadResult,
  ): UploadedFile {
    if (result.status === 401) {
      this.onUnauthorized?.();
      throw new FileServiceError(
        'Sesi Anda telah berakhir. Silakan login kembali.',
        401,
        true,
      );
    }

    if (result.status !== 200) {
      throw new FileServiceError(`Upload gagal (status ${result.status}).`);
    }

    let response: any;
    try {
      response = JSON.parse(result.body);
    } catch {
      throw new FileServiceError('Respons server tidak valid.');
    }

    if (!response.success) {
      throw new FileServiceError(response.error || 'Upload gagal.');
    }

    return response.file;
  }

  /**
   * Upload multiple files.
   */
  async uploadMultipleFiles(
    files: { uri: string; filename: string }[],
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file.uri, file.filename),
    );
    return await Promise.all(uploadPromises);
  }

  /**
   * Get file metadata.
   */
  async getFileMetadata(fileId: string): Promise<UploadedFile> {
    const response = await this.fetchWithAuth(
      `${getApiUrl()}/files/${fileId}/metadata`,
    );

    if (!response.ok) {
      throw new FileServiceError('Gagal mengambil metadata file.');
    }

    const data = await response.json();
    return data.file;
  }

  /**
   * Delete a file.
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await this.fetchWithAuth(
      `${getApiUrl()}/files/${fileId}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      throw new FileServiceError('Gagal menghapus file.');
    }

    const data = await response.json();

    if (!data.success) {
      throw new FileServiceError(data.error || 'Gagal menghapus file.');
    }
  }

  /**
   * Get user's uploaded files.
   */
  async getUserFiles(userId: string): Promise<OrderFile[]> {
    const response = await this.fetchWithAuth(
      `${getApiUrl()}/files/user/${userId}`,
    );

    if (!response.ok) {
      throw new FileServiceError('Gagal mengambil daftar file.');
    }

    const data = await response.json();
    return data.files;
  }

  /**
   * Get files attached to a specific order.
   */
  async getOrderFiles(orderId: string): Promise<OrderFile[]> {
    const response = await this.fetchWithAuth(
      `${getApiUrl()}/files/order/${orderId}`,
    );

    if (!response.ok) {
      throw new FileServiceError('Gagal mengambil foto pesanan.');
    }

    const data = await response.json();
    return data.files;
  }

  /**
   * Upload a file and attach it to an order.
   * If the attach step fails, attempts to clean up the orphaned file.
   */
  async uploadOrderFile(
    uri: string,
    filename: string,
    orderId: string,
    onProgress?: UploadProgressCallback,
  ): Promise<UploadedFile> {
    // Step 1: Upload the file
    const uploadedFile = await this.uploadFile(uri, filename, onProgress);

    // Step 2: Attach to order
    try {
      const response = await this.fetchWithAuth(
        `${getApiUrl()}/files/order/${orderId}/attach/${uploadedFile.id}`,
        { method: 'POST' },
      );

      if (!response.ok) {
        throw new FileServiceError('Gagal menautkan file ke pesanan.');
      }
    } catch (attachError) {
      // Skip orphan cleanup if the attach failed due to auth — the delete
      // call would also 401 and fire onUnauthorized a second time.
      if (!(attachError instanceof FileServiceError && attachError.isAuthError)) {
        try {
          await this.deleteFile(uploadedFile.id);
        } catch {
          console.warn(
            `Orphaned file ${uploadedFile.id} could not be cleaned up.`,
          );
        }
      }
      throw attachError;
    }

    return uploadedFile;
  }

  /**
   * Get file statistics.
   */
  async getFileStats(): Promise<FileStats> {
    const response = await this.fetchWithAuth(
      `${getApiUrl()}/files/stats/summary`,
    );

    if (!response.ok) {
      throw new FileServiceError('Gagal mengambil statistik file.');
    }

    return await response.json();
  }

  /**
   * Download file to local storage.
   */
  async downloadFile(fileId: string, filename: string): Promise<string> {
    const downloadResumable = FileSystem.createDownloadResumable(
      `${getApiUrl()}/files/${fileId}`,
      FileSystem.documentDirectory + filename,
      { headers: this.authHeaders() },
    );

    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new FileServiceError('Download gagal.');
    }

    return result.uri;
  }

  /**
   * Get full file URL.
   */
  getFileUrl(fileId: string): string {
    return `${getApiUrl()}/files/${fileId}`;
  }

  /**
   * Get thumbnail URL.
   */
  getThumbnailUrl(fileId: string): string {
    return `${getApiUrl()}/files/${fileId}/thumbnail`;
  }
}
