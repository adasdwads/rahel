import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface QuickActionTileProps {
  icon: LucideIcon;
  title: string;
  titleEn: string;
  description: string;
  stat?: string | number;
  statLabel?: string;
  path: string;
  accentColor?: string;
}

export default function QuickActionTile({
  icon: Icon,
  title,
  titleEn,
  description,
  stat,
  statLabel,
  path,
  accentColor = 'rahel-accent',
}: QuickActionTileProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className="rahel-card text-right w-full group hover:rahel-glow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${accentColor}/10 group-hover:bg-${accentColor}/20 transition-colors`}>
          <Icon size={24} className={`text-${accentColor}`} />
        </div>
        {stat !== undefined && (
          <div className="text-left">
            <p className={`text-2xl font-bold text-${accentColor}`}>{stat}</p>
            {statLabel && <p className="text-[10px] text-rahel-text-muted">{statLabel}</p>}
          </div>
        )}
      </div>
      <h3 className="text-base font-bold text-rahel-text-primary mb-0.5">{title}</h3>
      <p className="text-[10px] text-rahel-text-muted mb-2">{titleEn}</p>
      <p className="text-xs text-rahel-text-secondary leading-relaxed">{description}</p>
    </button>
  );
}
