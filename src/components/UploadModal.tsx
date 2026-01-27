'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  onUploadComplete?: () => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  workspaceSlug,
  onUploadComplete,
}: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const uploadFile = async (file: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceSlug', workspaceSlug);
      formData.append('source', 'user_upload');

      // Upload
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { assetId, duplicate } = await uploadRes.json();

      // Annotate if not duplicate
      if (!duplicate) {
        const annotateRes = await fetch('/api/annotate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetId }),
        });

        if (!annotateRes.ok) {
          console.warn('Annotation failed for', assetId);
        }
      }

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      setErrors((prev) => [
        ...prev,
        `${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`,
      ]);
      return false;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setErrors([]);
      setProgress({ current: 0, total: acceptedFiles.length });

      for (let i = 0; i < acceptedFiles.length; i++) {
        await uploadFile(acceptedFiles[i]);
        setProgress({ current: i + 1, total: acceptedFiles.length });
      }

      setUploading(false);
      onUploadComplete?.();
    },
    [workspaceSlug, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    disabled: uploading,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!uploading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative glass-card w-full max-w-lg mx-4 p-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg tracking-[2px] uppercase">画像アップロード</h2>
          {!uploading && (
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border border-dashed p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
              : 'border-[var(--text-inactive)] hover:border-[var(--text-secondary)]'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="space-y-4">
              <div className="spinner mx-auto" />
              <p className="text-sm">
                アップロード中 {progress.current} / {progress.total}
              </p>
              <div className="w-full bg-[var(--background)] h-1">
                <div
                  className="bg-[var(--accent-cyan)] h-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : isDragActive ? (
            <p className="text-[var(--accent-cyan)]">ここにファイルをドロップ...</p>
          ) : (
            <div className="space-y-2">
              <svg
                className="w-12 h-12 mx-auto text-[var(--text-inactive)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-[var(--text-secondary)]">
                画像をドラッグ＆ドロップ、またはクリックして選択
              </p>
              <p className="text-xs text-[var(--text-inactive)]">
                PNG, JPG, WEBP 各10MBまで
              </p>
            </div>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-[var(--accent-crimson)]/10 border border-[var(--accent-crimson)]/30">
            <p className="text-xs text-[var(--accent-crimson)] mb-2">アップロードエラー:</p>
            {errors.map((error, i) => (
              <p key={i} className="text-xs text-[var(--text-secondary)]">
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Close Button */}
        {!uploading && progress.total > 0 && (
          <button
            onClick={onClose}
            className="w-full mt-6 btn-glow py-3 text-sm tracking-[1px] uppercase"
          >
            完了
          </button>
        )}
      </div>
    </div>
  );
}
