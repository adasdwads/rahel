import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Plus, Trash2, CheckCircle, AlertTriangle, Copy, ExternalLink,
  Twitter, Facebook, Instagram, Shield, FileWarning, Check
} from 'lucide-react';
import { socialAPI } from '../services/api';
import Modal from '../components/Modal';
import type { SocialLegacyConfig, SelfDestructItem } from '../types';

export default function SocialLegacyPage() {
  const [socialConfigs, setSocialConfigs] = useState<SocialLegacyConfig[]>([]);
  const [destructItems, setDestructItems] = useState<SelfDestructItem[]>([]);
  const [donationLink, setDonationLink] = useState('');
  const [donationSnippet, setDonationSnippet] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showDestructModal, setShowDestructModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [platformForm, setPlatformForm] = useState({ platform: '', action: 'post_obituary', obituaryText: '', donationLink: '' });
  const [destructForm, setDestructForm] = useState({ targetType: 'file', targetPath: '', description: '', priority: 1 });

  const loadData = useCallback(async () => {
    try {
      const res = await socialAPI.getConfigs();
      setSocialConfigs(res.data.socialConfigs);
      setDestructItems(res.data.selfDestructItems);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerateDonationLink = async () => {
    try {
      const res = await socialAPI.generateDonationLink();
      setDonationLink(res.data.donationLink);
      setDonationSnippet(res.data.donationSnippet);
    } catch (err) { console.error(err); }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(donationSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfigurePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await socialAPI.configurePlatform(platformForm);
      setPlatformForm({ platform: '', action: 'post_obituary', obituaryText: '', donationLink: '' });
      setShowPlatformModal(false);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeletePlatform = async (configID: string) => {
    try { await socialAPI.deletePlatform(configID); await loadData(); } catch (err) { console.error(err); }
  };

  const handleAddDestructItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await socialAPI.addSelfDestructItem(destructForm);
      setDestructForm({ targetType: 'file', targetPath: '', description: '', priority: 1 });
      setShowDestructModal(false);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleConfirmDestruct = async (itemID: string) => {
    try { await socialAPI.confirmSelfDestruct(itemID); await loadData(); } catch (err) { console.error(err); }
  };

  const handleDeleteDestruct = async (itemID: string) => {
    try { await socialAPI.deleteSelfDestruct(itemID); await loadData(); } catch (err) { console.error(err); }
  };

  const platformIcons: Record<string, React.ReactNode> = {
    TWITTER: <Twitter size={20} />,
    FACEBOOK: <Facebook size={20} />,
    INSTAGRAM: <Instagram size={20} />,
  };

  const platformNames: Record<string, string> = {
    TWITTER: 'X (Twitter)', FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram',
  };

  const actionLabels: Record<string, string> = {
    post_obituary: 'نشر نعي', deactivate: 'تعطيل الحساب', memorialize: 'تحويل لحساب تذكاري', delete: 'حذف الحساب',
  };

  const destructTypes: Record<string, string> = {
    file: 'ملف', account: 'حساب', data: 'بيانات', browser_history: 'سجل المتصفح', app_data: 'بيانات تطبيق', custom: 'مخصص',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-rahel-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="rahel-page-title flex items-center gap-3"><Globe size={28} className="text-purple-400" />الإرث الرقمي والنعي</h1>
        <p className="rahel-page-subtitle">Social Legacy & Self-Destruct Hub — إدارة حضورك الرقمي بعد الرحيل</p>
      </div>

      {/* ═══ SECTION 1: Social Media Obituary ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Globe size={20} />النعي الآلي على المنصات</h2>
          <button onClick={() => setShowPlatformModal(true)} className="rahel-btn-secondary text-sm"><Plus size={16} /><span>إضافة منصة</span></button>
        </div>

        {socialConfigs.length === 0 ? (
          <div className="rahel-card text-center text-rahel-text-muted py-8">
            <Globe size={40} className="mx-auto mb-3 opacity-30" />
            <p>لم يتم تكوين أي منصة بعد</p>
            <p className="text-xs mt-1">أضف منصات التواصل لإعداد النعي الآلي</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {socialConfigs.map(cfg => (
              <div key={cfg.configID} className={`rahel-card ${cfg.executed ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-400/10 rounded-lg text-purple-400">
                      {platformIcons[cfg.platform] || <Globe size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{platformNames[cfg.platform] || cfg.platform}</h3>
                      <p className="text-xs text-rahel-text-muted">{actionLabels[cfg.action]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cfg.executed ? (
                      <span className="rahel-badge-active">تم التنفيذ</span>
                    ) : cfg.isConfigured ? (
                      <span className="rahel-badge bg-rahel-accent/20 text-rahel-accent">جاهز</span>
                    ) : (
                      <span className="rahel-badge-warning">غير مكتمل</span>
                    )}
                    <button onClick={() => handleDeletePlatform(cfg.configID)} className="p-1.5 hover:bg-rahel-danger/10 rounded">
                      <Trash2 size={14} className="text-rahel-danger" />
                    </button>
                  </div>
                </div>
                {cfg.obituaryText && (
                  <div className="p-3 bg-rahel-bg rounded-lg text-xs text-rahel-text-secondary leading-relaxed">
                    {cfg.obituaryText.substring(0, 150)}{cfg.obituaryText.length > 150 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ SECTION 2: Donation Link Generator ═══ */}
      <div className="rahel-card">
        <div className="flex items-center gap-3 mb-4">
          <ExternalLink size={20} className="text-emerald-400" />
          <div>
            <h3 className="font-bold">رابط التبرعات العام</h3>
            <p className="text-xs text-rahel-text-muted">Public Donation Link — يُلحق بالنعي الآلي</p>
          </div>
        </div>

        {!donationLink ? (
          <button onClick={handleGenerateDonationLink} className="rahel-btn-secondary"><ExternalLink size={16} /><span>توليد رابط التبرعات</span></button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-rahel-bg rounded-lg p-3">
              <input type="text" value={donationLink} readOnly className="rahel-input bg-transparent border-none flex-1 text-sm" dir="ltr" />
              <button onClick={handleCopySnippet} className="rahel-btn-secondary text-xs shrink-0">
                {copied ? <><Check size={14} /><span>تم النسخ</span></> : <><Copy size={14} /><span>نسخ</span></>}
              </button>
            </div>
            <div className="p-3 bg-rahel-bg rounded-lg text-xs text-rahel-text-secondary whitespace-pre-line" dir="rtl">
              {donationSnippet}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: Self-Destruct Protocol ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle size={20} className="text-rahel-danger" />
              بروتوكول التدمير الذاتي
            </h2>
            <p className="text-xs text-rahel-text-muted">Self-Destruct Protocol — حذف البيانات المحددة عند التفعيل</p>
          </div>
          <button onClick={() => setShowDestructModal(true)} className="rahel-btn-danger text-sm"><Plus size={16} /><span>إضافة عنصر</span></button>
        </div>

        {destructItems.length === 0 ? (
          <div className="rahel-card text-center text-rahel-text-muted py-8 border-rahel-danger/10">
            <FileWarning size={40} className="mx-auto mb-3 opacity-30" />
            <p>لم يتم تحديد أي عناصر للتدمير</p>
            <p className="text-xs mt-1">أضف ملفات أو حسابات ليتم حذفها عند التفعيل</p>
          </div>
        ) : (
          <div className="space-y-2">
            {destructItems.map((item, index) => (
              <div key={item.itemID} className={`rahel-card flex items-center gap-4 ${item.executed ? 'opacity-50' : ''}`}>
                <div className="text-center shrink-0">
                  <span className="text-xs text-rahel-text-muted">أولوية</span>
                  <p className="text-lg font-bold text-rahel-danger">{item.priority}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.description}</p>
                  <div className="flex items-center gap-2 text-xs text-rahel-text-muted mt-1">
                    <span className="bg-rahel-danger/10 text-rahel-danger px-2 py-0.5 rounded">{destructTypes[item.targetType]}</span>
                    {item.targetPath && <span dir="ltr" className="font-mono text-rahel-text-muted">{item.targetPath}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.executed ? (
                    <span className="rahel-badge bg-rahel-danger/20 text-rahel-danger">تم التدمير</span>
                  ) : item.confirmed ? (
                    <span className="rahel-badge-active">مؤكد</span>
                  ) : (
                    <button onClick={() => handleConfirmDestruct(item.itemID)} className="text-xs text-rahel-warning hover:text-rahel-danger flex items-center gap-1">
                      <CheckCircle size={14} /><span>تأكيد</span>
                    </button>
                  )}
                  {!item.executed && (
                    <button onClick={() => handleDeleteDestruct(item.itemID)} className="p-1.5 hover:bg-rahel-danger/10 rounded">
                      <Trash2 size={14} className="text-rahel-danger" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configure Platform Modal */}
      <Modal isOpen={showPlatformModal} onClose={() => setShowPlatformModal(false)} title="تكوين منصة تواصل" titleEn="Configure Social Platform">
        <form onSubmit={handleConfigurePlatform} className="space-y-4">
          <div>
            <label className="rahel-label">المنصة *</label>
            <select value={platformForm.platform} onChange={e => setPlatformForm(p => ({ ...p, platform: e.target.value }))} required className="rahel-select">
              <option value="" disabled>اختر المنصة</option>
              <option value="TWITTER">X (Twitter)</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="INSTAGRAM">Instagram</option>
            </select>
          </div>
          <div>
            <label className="rahel-label">الإجراء</label>
            <select value={platformForm.action} onChange={e => setPlatformForm(p => ({ ...p, action: e.target.value }))} className="rahel-select">
              <option value="post_obituary">نشر نعي</option>
              <option value="deactivate">تعطيل الحساب</option>
              <option value="memorialize">تحويل لحساب تذكاري</option>
              <option value="delete">حذف الحساب</option>
            </select>
          </div>
          <div>
            <label className="rahel-label">نص النعي</label>
            <textarea
              value={platformForm.obituaryText}
              onChange={e => setPlatformForm(p => ({ ...p, obituaryText: e.target.value }))}
              className="rahel-input min-h-[120px] resize-y"
              placeholder="إنا لله وإنا إليه راجعون. انتقل إلى رحمة الله تعالى..."
            />
          </div>
          <button type="submit" className="rahel-btn-primary w-full"><Plus size={18} /><span>حفظ الإعدادات</span></button>
        </form>
      </Modal>

      {/* Add Self-Destruct Item Modal */}
      <Modal isOpen={showDestructModal} onClose={() => setShowDestructModal(false)} title="إضافة عنصر تدمير ذاتي" titleEn="Add Self-Destruct Item">
        <form onSubmit={handleAddDestructItem} className="space-y-4">
          <div className="bg-rahel-danger/5 border border-rahel-danger/20 rounded-lg p-3 text-xs text-rahel-danger">
            <div className="flex items-center gap-2 font-medium mb-1"><AlertTriangle size={14} />تحذير</div>
            <p>العناصر المؤكدة سيتم حذفها نهائياً عند تفعيل البروتوكول. تأكد من صحة البيانات.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="rahel-label">نوع الهدف *</label>
              <select value={destructForm.targetType} onChange={e => setDestructForm(p => ({ ...p, targetType: e.target.value }))} className="rahel-select">
                <option value="file">ملف</option>
                <option value="account">حساب</option>
                <option value="data">بيانات</option>
                <option value="browser_history">سجل المتصفح</option>
                <option value="app_data">بيانات تطبيق</option>
                <option value="custom">مخصص</option>
              </select>
            </div>
            <div>
              <label className="rahel-label">الأولوية</label>
              <input type="number" value={destructForm.priority} onChange={e => setDestructForm(p => ({ ...p, priority: parseInt(e.target.value) || 1 }))} min="1" max="10" className="rahel-input" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="rahel-label">الوصف *</label>
            <input type="text" value={destructForm.description} onChange={e => setDestructForm(p => ({ ...p, description: e.target.value }))} required className="rahel-input" placeholder="حذف مجلد الصور الخاصة" />
          </div>
          <div>
            <label className="rahel-label">المسار (اختياري)</label>
            <input type="text" value={destructForm.targetPath} onChange={e => setDestructForm(p => ({ ...p, targetPath: e.target.value }))} className="rahel-input" placeholder="C:\Users\...\folder" dir="ltr" />
          </div>
          <button type="submit" className="rahel-btn-danger w-full"><Plus size={18} /><span>إضافة عنصر التدمير</span></button>
        </form>
      </Modal>
    </div>
  );
}
