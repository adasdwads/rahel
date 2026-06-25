import React from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface StatusIndicatorProps {
  status: string;
  lastHeartbeat?: string;
  missedPings?: number;
}

export default function StatusIndicator({ status, lastHeartbeat, missedPings = 0 }: StatusIndicatorProps) {
  const statusConfig: Record<string, { label: string; labelEn: string; color: string; icon: React.ReactNode; bgClass: string; borderClass: string; }> = {
    Active: {
      label: 'الحساب نشط ويراقب',
      labelEn: 'Account is active and monitoring',
      color: 'text-rahel-success',
      icon: <CheckCircle size={20} className="text-rahel-success" />,
      bgClass: 'bg-rahel-success/5',
      borderClass: 'border-rahel-success/20',
    },
    Triggered: {
      label: 'تم تفعيل البروتوكول',
      labelEn: 'Protocol has been triggered',
      color: 'text-rahel-danger',
      icon: <AlertTriangle size={20} className="text-rahel-danger" />,
      bgClass: 'bg-rahel-danger/5',
      borderClass: 'border-rahel-danger/20',
    },
    Verified: {
      label: 'قيد التحقق النهائي',
      labelEn: 'Pending final verification',
      color: 'text-rahel-warning',
      icon: <AlertTriangle size={20} className="text-rahel-warning" />,
      bgClass: 'bg-rahel-warning/5',
      borderClass: 'border-rahel-warning/20',
    },
    Suspended: {
      label: 'الحساب معلق',
      labelEn: 'Account suspended',
      color: 'text-rahel-text-muted',
      icon: <Shield size={20} className="text-rahel-text-muted" />,
      bgClass: 'bg-rahel-elevated',
      borderClass: 'border-rahel-border',
    },
  };

  const config = statusConfig[status] || statusConfig.Active;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-AE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className={`${config.bgClass} border ${config.borderClass} rounded-xl p-5 transition-all duration-300`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${config.bgClass}`}>
          {config.icon}
        </div>
        <div>
          <h3 className={`font-bold text-lg ${config.color}`}>{config.label}</h3>
          <p className="text-xs text-rahel-text-muted">{config.labelEn}</p>
        </div>
        {status === 'Active' && (
          <div className="mr-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rahel-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rahel-success" />
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-6 text-xs text-rahel-text-secondary">
        <div>
          <span className="text-rahel-text-muted">آخر نبضة: </span>
          <span>{formatDate(lastHeartbeat)}</span>
        </div>
        {missedPings > 0 && (
          <div className="text-rahel-warning">
            <span>نبضات فائتة: </span>
            <span className="font-bold">{missedPings}</span>
          </div>
        )}
      </div>
    </div>
  );
}
