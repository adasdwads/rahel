import React, { useState, useRef } from 'react';
import { Upload, File, X, Lock } from 'lucide-react';
import EncryptionVisualizer from './EncryptionVisualizer';

interface FileUploaderProps {
  onUpload: (file: File, accessTier: string, description: string) => Promise<void>;
  isUploading: boolean;
  encryptionStage?: string;
  encryptionProgress?: number;
}

export default function FileUploader({ onUpload, isUploading, encryptionStage, encryptionProgress }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [accessTier, setAccessTier] = useState('Personal');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile, accessTier, description);
    setSelectedFile(null);
    setDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-rahel-accent bg-rahel-accent/5'
            : 'border-rahel-border hover:border-rahel-accent/50 hover:bg-rahel-elevated/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
        <Upload size={40} className={`mx-auto mb-3 ${isDragging ? 'text-rahel-accent' : 'text-rahel-text-muted'}`} />
        <p className="text-rahel-text-secondary text-sm mb-1">اسحب الملف هنا أو انقر للاختيار</p>
        <p className="text-rahel-text-muted text-xs">PDF, صور, فيديو, مستندات (حد أقصى 50MB)</p>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="rahel-card animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rahel-accent/10 rounded-lg">
              <File size={20} className="text-rahel-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-rahel-text-muted">{formatSize(selectedFile.size)} | {selectedFile.type || 'unknown'}</p>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-rahel-elevated rounded"
            >
              <X size={16} className="text-rahel-text-muted" />
            </button>
          </div>

          {/* Access Tier */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="rahel-label">مستوى الوصول</label>
              <select
                value={accessTier}
                onChange={(e) => setAccessTier(e.target.value)}
                className="rahel-select"
              >
                <option value="Personal">شخصي - Personal</option>
                <option value="Financial">مالي - Financial</option>
                <option value="Legal">قانوني - Legal</option>
                <option value="Medical">طبي - Medical</option>
                <option value="Restricted">مقيد - Restricted</option>
              </select>
            </div>
            <div>
              <label className="rahel-label">وصف الملف</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر (اختياري)"
                className="rahel-input"
              />
            </div>
          </div>

          {/* Encryption Visualizer */}
          {isUploading && encryptionStage && (
            <EncryptionVisualizer stage={encryptionStage} progress={encryptionProgress || 0} />
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="rahel-btn-primary w-full"
          >
            <Lock size={18} />
            <span>{isUploading ? 'جاري التشفير والرفع...' : 'تشفير ورفع الملف'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
