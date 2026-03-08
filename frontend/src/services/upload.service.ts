import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ocdgmujkxlaqfsqtwycr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZGdtdWpreGxhcWZzcXR3eWNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUwNzg2MCwiZXhwIjoyMDg2MDgzODYwfQ.2yaHm0td9jALPU-H9rCnlHonZ-d7xm9iQA4Azhvk9F0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export const uploadService = {
  /**
   * Upload un fichier vers Supabase Storage
   */
  async uploadFile(
    file: File,
    bucket: string = 'attachments',
    folder: string = 'general'
  ): Promise<UploadResult> {
    try {
      // 1. Validate File Size (Max 5MB)
      if (!this.validateFileSize(file, 5)) {
        throw new Error('La taille du fichier ne doit pas dépasser 5 MB');
      }

      // 2. Validate File Type (Images Only for now)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!this.validateFileType(file, allowedTypes)) {
        throw new Error('Seules les images (JPG, PNG, WEBP, GIF) sont autorisées');
      }
      // Générer un nom unique pour le fichier
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload vers Supabase Storage
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload plusieurs fichiers
   */
  async uploadMultiple(
    files: File[],
    bucket: string = 'attachments',
    folder: string = 'general'
  ): Promise<UploadResult[]> {
    const uploads = files.map(file => this.uploadFile(file, bucket, folder));
    return Promise.all(uploads);
  },

  /**
   * Supprimer un fichier
   */
  async deleteFile(path: string, bucket: string = 'attachments'): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Obtenir l'URL publique d'un fichier avec transformations optionnelles
   */
  getPublicUrl(path: string, bucket: string = 'attachments', transform?: { width?: number; height?: number; quality?: number }): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path, { transform });
    return data.publicUrl;
  },

  /**
   * Valider le type de fichier
   */
  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(category + '/');
      }
      return file.type === type;
    });
  },

  /**
   * Valider la taille du fichier (en MB)
   */
  validateFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  },

  /**
   * Formater la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },
};
