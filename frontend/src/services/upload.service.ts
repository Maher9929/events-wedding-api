const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

/**
 * Upload service — all uploads go through the backend API
 * (which uses the service_role key to write to Supabase Storage).
 */
export const uploadService = {
  /**
   * Upload a single file via the backend.
   */
  async uploadFile(
    file: File,
    _bucket = 'attachments',
    folder = 'general',
  ): Promise<UploadResult> {
    if (!this.validateFileSize(file, MAX_SIZE_MB)) {
      throw new Error('File size must not exceed 5 MB');
    }
    if (!this.validateFileType(file, ALLOWED_TYPES)) {
      throw new Error('Only images (JPG, PNG, WEBP, GIF) are allowed');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/storage/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Upload failed');
    }

    const json = await response.json();
    return json.data ?? json;
  },

  /**
   * Upload multiple files via the backend.
   */
  async uploadMultiple(
    files: File[],
    _bucket = 'attachments',
    folder = 'general',
  ): Promise<UploadResult[]> {
    const formData = new FormData();
    for (const file of files) {
      if (!this.validateFileSize(file, MAX_SIZE_MB)) {
        throw new Error(`File ${file.name} exceeds 5 MB`);
      }
      if (!this.validateFileType(file, ALLOWED_TYPES)) {
        throw new Error(`File ${file.name} has unsupported type`);
      }
      formData.append('files', file);
    }
    formData.append('folder', folder);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/storage/upload-multiple`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Upload failed');
    }

    const json = await response.json();
    return json.data ?? json;
  },

  /**
   * Delete a file via the backend.
   */
  async deleteFile(path: string, bucket = 'attachments'): Promise<void> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/storage/${bucket}/${path}`, {
      method: 'DELETE',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Delete failed' }));
      throw new Error(err.message || 'Delete failed');
    }
  },

  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.split('/')[0] + '/');
      }
      return file.type === type;
    });
  },

  validateFileSize(file: File, maxSizeMB: number): boolean {
    return file.size <= maxSizeMB * 1024 * 1024;
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },
};
