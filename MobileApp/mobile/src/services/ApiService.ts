/**
 * API Service - HTTP Client for Backend Communication
 *
 * Handles all HTTP requests to the backend API with:
 * - JWT authentication
 * - Error handling
 * - Request/response transformation
 * - Network error handling
 * - File upload support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@cardose_token';

interface RequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiService {
  private static readonly BASE_URL = 'http://localhost:3000/api';
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Get authentication token from storage
   */
  private static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Build query string from params object
   */
  private static buildQueryString(params: Record<string, any>): string {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, String(v)));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Build full URL with base URL and query params
   */
  private static buildUrl(endpoint: string, params?: Record<string, any>): string {
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseUrl = `${this.BASE_URL}${normalizedEndpoint}`;

    if (params) {
      return `${baseUrl}${this.buildQueryString(params)}`;
    }

    return baseUrl;
  }

  /**
   * Get default headers including auth token
   */
  private static async getHeaders(additionalHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle fetch with timeout
   */
  private static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Parse and format response
   */
  private static async formatResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!isJson) {
        // Non-JSON response (e.g., file download)
        const blob = await response.blob();
        return {
          success: response.ok,
          data: blob as any,
        };
      }

      const data = await response.json();

      if (response.ok) {
        // Successful response (2xx)
        return {
          success: true,
          data: data.data || data,
          message: data.message,
        };
      } else {
        // Error response (4xx, 5xx)
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
          data: data.data,
        };
      }
    } catch (error: any) {
      console.error('Response parsing error:', error);
      return {
        success: false,
        error: 'Failed to parse server response',
      };
    }
  }

  /**
   * Handle network and HTTP errors
   */
  private static handleError(error: any): ApiResponse {
    console.error('API Error:', error);

    // Network errors
    if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
      return {
        success: false,
        error: 'Network error. Please check your internet connection.',
      };
    }

    // Timeout errors
    if (error.message === 'Request timeout') {
      return {
        success: false,
        error: 'Request timeout. Please try again.',
      };
    }

    // Other errors
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }

  /**
   * Generic GET request
   */
  static async get<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, options.params);
      const headers = await this.getHeaders(options.headers);

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers,
        },
        options.timeout
      );

      return await this.formatResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic POST request
   */
  static async post<T = any>(
    endpoint: string,
    data: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, options.params);
      const headers = await this.getHeaders(options.headers);

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        },
        options.timeout
      );

      return await this.formatResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic PUT request
   */
  static async put<T = any>(
    endpoint: string,
    data: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, options.params);
      const headers = await this.getHeaders(options.headers);

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        },
        options.timeout
      );

      return await this.formatResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic PATCH request
   */
  static async patch<T = any>(
    endpoint: string,
    data: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, options.params);
      const headers = await this.getHeaders(options.headers);

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data),
        },
        options.timeout
      );

      return await this.formatResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generic DELETE request
   */
  static async delete<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, options.params);
      const headers = await this.getHeaders(options.headers);

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'DELETE',
          headers,
        },
        options.timeout
      );

      return await this.formatResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Upload file with multipart/form-data
   */
  static async uploadFile<T = any>(
    endpoint: string,
    file: {
      uri: string;
      name: string;
      type: string;
    },
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const token = await this.getToken();

      const formData = new FormData();

      // Add file
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      // Add additional data
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      return await this.formatResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Download file
   */
  static async downloadFile(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<Blob>> {
    try {
      const url = this.buildUrl(endpoint, options.params);
      const headers = await this.getHeaders(options.headers);

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers,
        },
        options.timeout
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error || data.message || 'Download failed',
        };
      }

      const blob = await response.blob();
      return {
        success: true,
        data: blob,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Set base URL (for different environments)
   */
  static setBaseUrl(url: string): void {
    (this as any).BASE_URL = url;
  }

  /**
   * Get current base URL
   */
  static getBaseUrl(): string {
    return this.BASE_URL;
  }

  /**
   * Check if server is reachable
   */
  static async ping(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Batch requests (parallel)
   */
  static async batch<T = any>(
    requests: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      endpoint: string;
      data?: any;
      options?: RequestOptions;
    }>
  ): Promise<ApiResponse<T>[]> {
    const promises = requests.map(req => {
      switch (req.method) {
        case 'GET':
          return this.get(req.endpoint, req.options);
        case 'POST':
          return this.post(req.endpoint, req.data, req.options);
        case 'PUT':
          return this.put(req.endpoint, req.data, req.options);
        case 'PATCH':
          return this.patch(req.endpoint, req.data, req.options);
        case 'DELETE':
          return this.delete(req.endpoint, req.options);
        default:
          return Promise.resolve({
            success: false,
            error: `Unsupported method: ${req.method}`,
          });
      }
    });

    return await Promise.all(promises);
  }
}

export default ApiService;
