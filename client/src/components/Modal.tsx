import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleEn?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, titleEn, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative ${sizeClasses[size]} w-full bg-rahel-surface border border-rahel-border rounded-2xl shadow-2xl animate-fade-in`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-rahel-border">
          <div>
            <h2 className="text-lg font-bold text-rahel-text-primary">{title}</h2>
            {titleEn && <p className="text-xs text-rahel-text-muted">{titleEn}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-rahel-elevated transition-colors"
          >
            <X size={18} className="text-rahel-text-muted" />
          </button>
        </div>
        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
