import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Shield, Heart, Clock, Globe, LogOut, Activity, User
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'لوحة التحكم', labelEn: 'Dashboard' },
  { path: '/vault', icon: Shield, label: 'الخزنة الرقمية', labelEn: 'Digital Vault' },
  { path: '/charity', icon: Heart, label: 'الصدقات الجارية', labelEn: 'Charity' },
  { path: '/time-capsule', icon: Clock, label: 'كبسولة الزمن', labelEn: 'Time Capsule' },
  { path: '/social-legacy', icon: Globe, label: 'الإرث الرقمي', labelEn: 'Social Legacy' },
];

export default function Sidebar() {
  const { user, logout, sendHeartbeat } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed right-0 top-0 h-screen w-64 bg-rahel-surface border-l border-rahel-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-rahel-border">
        <h1 className="text-2xl font-bold text-gradient">راحل</h1>
        <p className="text-xs text-rahel-text-muted mt-1">RAHEL | منصة الإرث الرقمي</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-rahel-accent/10 text-rahel-accent border border-rahel-accent/20'
                  : 'text-rahel-text-secondary hover:bg-rahel-elevated hover:text-rahel-text-primary border border-transparent'
              }`
            }
          >
            <item.icon size={20} className="shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">{item.label}</span>
              <span className="text-[10px] text-rahel-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                {item.labelEn}
              </span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Heartbeat Button */}
      <div className="px-3 pb-2">
        <button
          onClick={sendHeartbeat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rahel-success/10 text-rahel-success hover:bg-rahel-success/20 transition-all duration-200 text-sm border border-rahel-success/20"
        >
          <Activity size={16} className="animate-pulse" />
          <span>تأكيد النبض</span>
        </button>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-rahel-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-rahel-accent/20 flex items-center justify-center">
            <User size={18} className="text-rahel-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-rahel-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-rahel-text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-rahel-text-secondary hover:text-rahel-danger hover:bg-rahel-danger/10 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
