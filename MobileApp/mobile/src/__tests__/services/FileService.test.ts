/**
 * FileService Unit Tests
 */

import * as FileSystem from 'expo-file-system';
import {
  FileService,
  FileServiceError,
} from '../../services/FileService';

// Cast mocks for type safety
const mockUploadAsync = FileSystem.uploadAsync as jest.MockedFunction<typeof FileSystem.uploadAsync>;
const mockGetInfoAsync = FileSystem.getInfoAsync as jest.MockedFunction<typeof FileSystem.getInfoAsync>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FileService', () => {
  const token = 'test-jwt-token';
  const onUnauthorized = jest.fn();
  let service: FileService;

  const mockUploadedFile = {
    id: 'file-1',
    filename: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: 2048,
    url: 'http://api/files/file-1',
    thumbnailUrl: 'http://api/files/file-1/thumbnail',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FileService(token, onUnauthorized);
  });

  describe('validateFileSize', () => {
    it('should pass for files under the size limit', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      const result = await service.validateFileSize('file:///test.jpg');
      expect(result.exists).toBe(true);
    });

    it('should throw for files over the size limit', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 50 * 1024 * 1024, // 50MB
        isDirectory: false,
        uri: 'file:///huge.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      await expect(service.validateFileSize('file:///huge.jpg')).rejects.toThrow(
        FileServiceError,
      );
    });

    it('should throw for non-existent files', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: 'file:///missing.jpg',
      });

      await expect(
        service.validateFileSize('file:///missing.jpg'),
      ).rejects.toThrow('File tidak ditemukan.');
    });
  });

  describe('uploadFile', () => {
    it('should upload file and return parsed result', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      mockUploadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        mimeType: 'image/jpeg',
        body: JSON.stringify({ success: true, file: mockUploadedFile }),
      });

      const result = await service.uploadFile('file:///test.jpg', 'photo.jpg');

      expect(result).toEqual(mockUploadedFile);
      expect(mockUploadAsync).toHaveBeenCalledWith(
        expect.stringContaining('/files/upload'),
        'file:///test.jpg',
        expect.objectContaining({
          fieldName: 'file',
          httpMethod: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    });

    it('should throw FileServiceError on 401', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      mockUploadAsync.mockResolvedValue({
        status: 401,
        headers: {},
        mimeType: null,
        body: '{"error":"Unauthorized"}',
      });

      await expect(
        service.uploadFile('file:///test.jpg', 'photo.jpg'),
      ).rejects.toThrow(FileServiceError);

      expect(onUnauthorized).toHaveBeenCalled();
    });

    it('should throw on upload failure', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      mockUploadAsync.mockResolvedValue({
        status: 500,
        headers: {},
        mimeType: null,
        body: '{"error":"Server error"}',
      });

      await expect(
        service.uploadFile('file:///test.jpg', 'photo.jpg'),
      ).rejects.toThrow('Upload gagal');
    });
  });

  describe('getOrderFiles', () => {
    it('should return files from the API', async () => {
      const files = [
        { id: '1', filename: 'a.jpg', url: 'http://test/1', size: 100, uploadedAt: '2024-01-01' },
        { id: '2', filename: 'b.jpg', url: 'http://test/2', size: 200, uploadedAt: '2024-01-02' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ files }),
      });

      const result = await service.getOrderFiles('order-123');

      expect(result).toEqual(files);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/files/order/order-123'),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    });

    it('should throw FileServiceError on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(service.getOrderFiles('order-123')).rejects.toThrow(
        'Gagal mengambil foto pesanan.',
      );
    });

    it('should call onUnauthorized on 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(service.getOrderFiles('order-123')).rejects.toThrow(
        FileServiceError,
      );
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(service.deleteFile('file-1')).resolves.toBeUndefined();
    });

    it('should throw on failed delete', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(service.deleteFile('file-1')).rejects.toThrow(
        'Gagal menghapus file.',
      );
    });
  });

  describe('uploadOrderFile', () => {
    it('should upload and attach file to order', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      mockUploadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        mimeType: 'image/jpeg',
        body: JSON.stringify({ success: true, file: mockUploadedFile }),
      });

      // Mock the attach call
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await service.uploadOrderFile(
        'file:///test.jpg',
        'photo.jpg',
        'order-123',
      );

      expect(result).toEqual(mockUploadedFile);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/files/order/order-123/attach/file-1'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should cleanup orphaned file if attach fails', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      mockUploadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        mimeType: 'image/jpeg',
        body: JSON.stringify({ success: true, file: mockUploadedFile }),
      });

      // First fetch call (attach) fails, second (cleanup delete) succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });

      await expect(
        service.uploadOrderFile('file:///test.jpg', 'photo.jpg', 'order-123'),
      ).rejects.toThrow('Gagal menautkan file ke pesanan.');

      // Verify cleanup was attempted (the delete call)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/files/file-1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('timeout and network error handling', () => {
    it('should throw FileServiceError on fetch abort (timeout)', async () => {
      const abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(service.getOrderFiles('order-123')).rejects.toThrow(
        'Permintaan timeout. Silakan coba lagi.',
      );
    });

    it('should wrap network errors as FileServiceError', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = service.getOrderFiles('order-123');
      await expect(result).rejects.toThrow(FileServiceError);
      await expect(service.getOrderFiles('order-123')).rejects.toThrow(
        'Failed to fetch',
      );
    });

    it('should preserve FileServiceError through the catch block', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(service.deleteFile('file-1')).rejects.toThrow(
        'Sesi Anda telah berakhir',
      );
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  describe('parseUploadResult with malformed response', () => {
    it('should throw FileServiceError for non-JSON response body', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      mockUploadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        mimeType: null,
        body: '<html>Internal Server Error</html>',
      });

      await expect(
        service.uploadFile('file:///test.jpg', 'photo.jpg'),
      ).rejects.toThrow('Respons server tidak valid.');
    });

    it('should throw FileServiceError for empty response body', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        isDirectory: false,
        uri: 'file:///test.jpg',
        modificationTime: 0,
        md5: undefined,
      });

      mockUploadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        mimeType: null,
        body: '',
      });

      await expect(
        service.uploadFile('file:///test.jpg', 'photo.jpg'),
      ).rejects.toThrow('Respons server tidak valid.');
    });
  });

  describe('URL helpers', () => {
    it('should return correct file URL', () => {
      expect(service.getFileUrl('abc')).toContain('/files/abc');
    });

    it('should return correct thumbnail URL', () => {
      expect(service.getThumbnailUrl('abc')).toContain('/files/abc/thumbnail');
    });
  });
});
