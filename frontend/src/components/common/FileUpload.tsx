import { useState, useRef } from 'react';
import { uploadService, type UploadResult } from '../../services/upload.service';
import { toastService } from '../../services/toast.service';

interface FileUploadProps {
  onUploadComplete: (files: UploadResult[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSizeMB?: number;
  bucket?: string;
  folder?: string;
  buttonText?: string;
  buttonClassName?: string;
}

const FileUpload = ({
  onUploadComplete,
  multiple = false,
  accept = '*/*',
  maxSizeMB = 10,
  bucket = 'attachments',
  folder = 'general',
  buttonText = '',
  buttonClassName = 'px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-purple-700 transition-colors',
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validation
    for (const file of fileArray) {
      if (!uploadService.validateFileSize(file, maxSizeMB)) {
        toastService.error(`File ${file.name} is too large. Max ${maxSizeMB}MB`);
        return;
      }
    }

    setUploading(true);
    setProgress(0);

    try {
      const results: UploadResult[] = [];
      
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const result = await uploadService.uploadFile(file, bucket, folder);
        results.push(result);
        setProgress(((i + 1) / fileArray.length) * 100);
      }

      toastService.success(`${results.length} files uploaded successfully`);
      onUploadComplete(results);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toastService.error('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        multiple={multiple}
        accept={accept}
        className="hidden"
        disabled={uploading}
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`${buttonClassName} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Uploading... {Math.round(progress)}%
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-upload"></i>
            {buttonText}
          </span>
        )}
      </button>

      {uploading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
