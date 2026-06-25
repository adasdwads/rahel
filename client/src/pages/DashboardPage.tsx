import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StatusIndicator from '../components/StatusIndicator';
import QuickActionTile from '../components/QuickActionTile';
import { Shield, Heart, Clock, Globe, Activity, TrendingUp, FileText, Users } from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshProfile } = useAuth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    refreshProfile();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('صباح الخير');
    else if (hour < 18) setGreeting('مساء الخير');
    else setGreeting('مساء النور');
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-rahel-text-primary mb-1">
          {greeting}، {user?.name} 👋
        </h1>
        <p className="text-rahel-text-secondary">مرحباً بك في لوحة تحكم راحل — إرثك الرقمي تحت السيطرة</p>
        <p className="text-xs text-rahel-text-muted mt-1">Welcome to RAHEL Dashboard — Your digital legacy under control</p>
      </div>

      {/* Status Indicator */}
      <StatusIndicator
        status={user?.status || 'Active'}
        lastHeartbeat={user?.lastHeartbeat}
        missedPings={user?.missedPings}
      />

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'ملفات الخزنة', value: user?.stats?.vaultFiles ?? 0, color: 'text-rahel-accent' },
          { icon: Users, label: 'الورثة المعينون', value: user?.stats?.heirs ?? 0, color: 'text-emerald-400' },
          { icon: Heart, label: 'تدفقات الصدقة', value: user?.stats?.charityFlows ?? 0, color: 'text-rose-400' },
          { icon: Clock, label: 'كبسولات معلقة', value: user?.stats?.pendingCapsules ?? 0, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="rahel-card flex items-center gap-3">
            <stat.icon size={22} className={stat.color} />
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-rahel-text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Tiles */}
      <div>
        <h2 className="text-lg font-bold mb-4">الإجراءات السريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionTile
            icon={Shield}
            title="الخزنة الرقمية"
            titleEn="Digital Vault"
            description="تشفير وحفظ ملفاتك المهمة بتقنية AES-256 مع تقسيم مفاتيح التشفير بين الورثة"
            stat={user?.stats?.vaultFiles ?? 0}
            statLabel="ملف مشفر"
            path="/vault"
          />
          <QuickActionTile
            icon={Heart}
            title="الصدقات الجارية"
            titleEn="Ongoing Charity"
            description="إعداد صدقات جارية آلية يتم تنفيذها فوراً عند التحقق من الوفاة"
            stat={user?.stats?.charityFlows ?? 0}
            statLabel="تدفق نشط"
            path="/charity"
            accentColor="rose-400"
          />
          <QuickActionTile
            icon={Clock}
            title="كبسولة الزمن"
            titleEn="Time Capsule"
            description="جدولة رسائل نصية وصوتية ومرئية ليتم تسليمها في مناسبات مستقبلية"
            stat={user?.stats?.pendingCapsules ?? 0}
            statLabel="كبسولة معلقة"
            path="/time-capsule"
            accentColor="amber-400"
          />
          <QuickActionTile
            icon={Globe}
            title="الإرث الرقمي والنعي"
            titleEn="Social Legacy & Obituary"
            description="إعداد نعي آلي على منصات التواصل وبروتوكول التدمير الذاتي للبيانات"
            path="/social-legacy"
            accentColor="purple-400"
          />
        </div>
      </div>

      {/* Heartbeat Monitor Widget */}
      <div className="rahel-card">
        <div className="flex items-center gap-3 mb-4">
          <Activity size={20} className="text-rahel-success" />
          <div>
            <h3 className="font-bold">مراقب النبض — Dead Man's Switch</h3>
            <p className="text-xs text-rahel-text-muted">نظام مراقبة النشاط الأسبوعي</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-rahel-bg rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-rahel-success">{user?.heartbeatStreak ?? 0}</p>
            <p className="text-xs text-rahel-text-muted mt-1">سلسلة النبضات</p>
          </div>
          <div className="bg-rahel-bg rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-rahel-warning">{user?.missedPings ?? 0}</p>
            <p className="text-xs text-rahel-text-muted mt-1">نبضات فائتة</p>
          </div>
          <div className="bg-rahel-bg rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-rahel-accent">30</p>
            <p className="text-xs text-rahel-text-muted mt-1">أيام حتى التفعيل</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-rahel-bg rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-rahel-text-muted">مدة الخمول قبل التفعيل</span>
            <span className="text-rahel-text-secondary font-medium">30 يوم</span>
          </div>
          <div className="w-full bg-rahel-elevated rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-l from-rahel-success to-rahel-accent h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, 100 - ((user?.missedPings ?? 0) / 4) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="rahel-card bg-rahel-accent/5 border-rahel-accent/20">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-rahel-accent" />
          <div>
            <h3 className="font-bold text-rahel-accent">الحماية الأمنية</h3>
            <p className="text-xs text-rahel-text-muted">Security Status</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-rahel-bg/50 rounded-lg p-3">
            <p className="text-rahel-success font-medium">AES-256-GCM</p>
            <p className="text-rahel-text-muted">تشفير نشط</p>
          </div>
          <div className="bg-rahel-bg/50 rounded-lg p-3">
            <p className="text-rahel-success font-medium">Shamir SSS</p>
            <p className="text-rahel-text-muted">تقسيم المفاتيح</p>
          </div>
          <div className="bg-rahel-bg/50 rounded-lg p-3">
            <p className="text-rahel-success font-medium">JWT + bcrypt</p>
            <p className="text-rahel-text-muted">مصادقة محمية</p>
          </div>
          <div className="bg-rahel-bg/50 rounded-lg p-3">
            <p className="text-rahel-success font-medium">WAL Mode</p>
            <p className="text-rahel-text-muted">قاعدة بيانات آمنة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
