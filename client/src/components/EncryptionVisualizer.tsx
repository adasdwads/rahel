import React from 'react';
import { Lock, Key, Shield, Check } from 'lucide-react';

interface EncryptionVisualizerProps {
  stage: string;
  progress: number;
}

const stages = [
  { key: 'reading', icon: Lock, label: 'قراءة الملف', labelEn: 'Reading file' },
  { key: 'generating_key', icon: Key, label: 'توليد مفتاح AES-256', labelEn: 'Generating AES-256 key' },
  { key: 'encrypting', icon: Shield, label: 'تشفير البيانات', labelEn: 'Encrypting data' },
  { key: 'sharding', icon: Key, label: 'تقسيم المفتاح (Shamir)', labelEn: 'Key sharding (Shamir)' },
  { key: 'uploading', icon: Shield, label: 'رفع البيانات المشفرة', labelEn: 'Uploading encrypted data' },
  { key: 'complete', icon: Check, label: 'اكتمل بنجاح', labelEn: 'Completed' },
];

export default function EncryptionVisualizer({ stage, progress }: EncryptionVisualizerProps) {
  const currentIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="bg-rahel-bg rounded-xl p-4 mb-4 border border-rahel-border">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} className="text-rahel-accent" />
        <span className="text-xs font-medium text-rahel-accent">AES-256-GCM Encryption Pipeline</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-rahel-elevated rounded-full h-1.5 mb-4">
        <div
          className="bg-rahel-accent h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stages */}
      <div className="space-y-2">
        {stages.map((s, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const Icon = s.icon;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 py-1.5 px-3 rounded-lg text-xs transition-all duration-300 ${
                isCurrent ? 'bg-rahel-accent/10 text-rahel-accent' :
                isComplete ? 'text-rahel-success' :
                'text-rahel-text-muted'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                isComplete ? 'bg-rahel-success/20' :
                isCurrent ? 'bg-rahel-accent/20 animate-pulse' :
                'bg-rahel-elevated'
              }`}>
                {isComplete ? (
                  <Check size={12} />
                ) : (
                  <Icon size={12} />
                )}
              </div>
              <span className="flex-1">{s.label}</span>
              <span className="text-rahel-text-muted">{s.labelEn}</span>
              {isCurrent && (
                <div className="w-4 h-4 border-2 border-rahel-accent border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          );
        })}
      </div>

      {/* Hex visualization */}
      {stage !== 'complete' && (
        <div className="mt-3 p-2 bg-rahel-elevated rounded font-mono text-[10px] text-rahel-accent/60 overflow-hidden encrypt-shimmer" dir="ltr">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="whitespace-nowrap overflow-hidden">
              {Array.from({ length: 32 }, () =>
                Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
              ).join(' ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
