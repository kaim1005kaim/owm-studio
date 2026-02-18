'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}

interface AdditionalReferencesUploadProps {
  maxFiles?: number;
  onFilesChange: (files: UploadedFile[]) => void;
  currentFiles: UploadedFile[];
}

/**
 * Component for uploading additional reference images during generation
 * Supports drag & drop and click to upload
 */
export default function AdditionalReferencesUpload({
  maxFiles = 5,
  onFilesChange,
  currentFiles,
}: AdditionalReferencesUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxFiles - currentFiles.length;
    if (remainingSlots <= 0) return;

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      newFiles.push({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (newFiles.length > 0) {
      onFilesChange([...currentFiles, ...newFiles]);
    }
  }, [currentFiles, maxFiles, onFilesChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (id: string) => {
    const fileToRemove = currentFiles.find(f => f.id === id);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    onFilesChange(currentFiles.filter(f => f.id !== id));
  };

  const canAddMore = currentFiles.length < maxFiles;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
          追加参照画像 (任意)
        </label>
        <span className="text-xs text-[var(--text-inactive)]">
          {currentFiles.length}/{maxFiles}
        </span>
      </div>

      <div className="flex gap-3 flex-wrap">
        {/* Uploaded Files */}
        {currentFiles.map((file) => (
          <div
            key={file.id}
            className="relative w-16 h-16 rounded overflow-hidden group"
          >
            <Image
              src={file.preview}
              alt="Reference"
              fill
              className="object-cover"
            />
            <button
              onClick={() => handleRemove(file.id)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add Button / Drop Zone */}
        {canAddMore && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`w-16 h-16 rounded border-2 border-dashed cursor-pointer flex items-center justify-center transition-colors ${
              isDragging
                ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                : 'border-[var(--text-inactive)] hover:border-[var(--text-secondary)]'
            }`}
          >
            <svg className="w-6 h-6 text-[var(--text-inactive)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {currentFiles.length === 0 && (
        <p className="text-xs text-[var(--text-inactive)]">
          スタイル参考、カラーパレット、ディテール画像などを追加できます
        </p>
      )}
    </div>
  );
}
