import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Send, Trash2, Calendar, Gift, MessageSquare, Video, Mic } from 'lucide-react';
import { capsuleAPI } from '../services/api';
import Modal from '../components/Modal';
import type { TimeCapsule } from '../types';

export default function TimeCapsulePage() {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    title: '', contentType: 'text', textContent: '', targetReleaseDate: '', recipientContact: '', recipientName: '', occasion: '',
  });

  const loadData = useCallback(async () => {
    try {
      const res = await capsuleAPI.timeline();
      setCapsules(res.data.timeline);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await capsuleAPI.create({
        title: form.title,
        contentType: form.contentType,
        textContent: form.textContent || undefined,
        targetReleaseDate: form.targetReleaseDate,
        recipientContact: form.recipientContact,
        recipientName: form.recipientName || undefined,
        occasion: form.occasion || undefined,
      });
      setForm({ title: '', contentType: 'text', textContent: '', targetReleaseDate: '', recipientContact: '', recipientName: '', occasion: '' });
      setShowCreateModal(false);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    try { await capsuleAPI.delete(id); await loadData(); } catch (err) { console.error(err); }
  };

  const contentIcons: Record<string, React.ReactNode> = {
    text: <MessageSquare size={16} />,
    voice: <Mic size={16} />,
    video: <Video size={16} />,
    mixed: <Gift size={16} />,
  };

  const contentLabels: Record<string, string> = {
    text: 'رسالة نصية',
    voice: 'رسالة صوتية',
    video: 'رسالة مرئية',
    mixed: 'محتوى متنوع',
  };

  const occasions = [
    { value: '', label: 'بدون مناسبة' },
    { value: 'graduation', label: 'تخرج 🎓' },
    { value: 'wedding', label: 'زواج 💍' },
    { value: 'birthday', label: 'عيد ميلاد 🎂' },
    { value: 'eid', label: 'عيد 🌙' },
    { value: 'anniversary', label: 'ذكرى سنوية' },
    { value: 'ramadan', label: 'رمضان' },
    { value: 'other', label: 'أخرى' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-rahel-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  const pending = capsules.filter(c => !c.delivered);
  const delivered = capsules.filter(c => c.delivered);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="rahel-page-title flex items-center gap-3"><Clock size={28} className="text-amber-400" />كبسولة الزمن</h1>
          <p className="rahel-page-subtitle">Time Capsule Scheduler — رسائل من الماضي إلى المستقبل</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="rahel-btn-primary"><Plus size={18} /><span>كبسولة جديدة</span></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rahel-card text-center">
          <Clock size={24} className="text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{pending.length}</p>
          <p className="text-xs text-rahel-text-muted">كبسولات معلقة</p>
        </div>
        <div className="rahel-card text-center">
          <Send size={24} className="text-rahel-success mx-auto mb-2" />
          <p className="text-2xl font-bold">{delivered.length}</p>
          <p className="text-xs text-rahel-text-muted">تم تسليمها</p>
        </div>
        <div className="rahel-card text-center">
          <Calendar size={24} className="text-rahel-accent mx-auto mb-2" />
          <p className="text-2xl font-bold">{capsules.length}</p>
          <p className="text-xs text-rahel-text-muted">إجمالي الكبسولات</p>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-bold mb-4">الجدول الزمني</h2>
        {capsules.length === 0 ? (
          <div className="rahel-card text-center text-rahel-text-muted py-12">
            <Clock size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-1">لا توجد كبسولات زمنية بعد</p>
            <p className="text-xs">أنشئ كبسولة زمنية لإرسال رسالة في المستقبل</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-rahel-border" />

            <div className="space-y-4">
              {capsules.map((capsule, index) => (
                <div key={capsule.capsuleID} className="relative flex gap-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  {/* Timeline Dot */}
                  <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    capsule.delivered ? 'bg-rahel-success/20 border-2 border-rahel-success' :
                    capsule.isPast ? 'bg-rahel-danger/20 border-2 border-rahel-danger' :
                    'bg-rahel-accent/20 border-2 border-rahel-accent'
                  }`}>
                    {contentIcons[capsule.contentType]}
                  </div>

                  {/* Card */}
                  <div className="flex-1 rahel-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{capsule.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-rahel-text-muted">
                          <span>{contentLabels[capsule.contentType]}</span>
                          {capsule.occasion && <><span>|</span><span>{capsule.occasion}</span></>}
                          <span>|</span>
                          <span>إلى: {capsule.recipientName || capsule.recipientContact}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        {capsule.delivered ? (
                          <span className="rahel-badge-active">تم التسليم</span>
                        ) : (
                          <div>
                            <span className={`rahel-badge ${capsule.daysUntilRelease && capsule.daysUntilRelease > 0 ? 'bg-rahel-accent/20 text-rahel-accent' : 'rahel-badge-warning'}`}>
                              {capsule.daysUntilRelease && capsule.daysUntilRelease > 0
                                ? `بعد ${capsule.daysUntilRelease} يوم`
                                : 'متأخر'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-rahel-text-muted">
                        <Calendar size={12} />
                        <span>{new Date(capsule.targetReleaseDate).toLocaleDateString('ar-AE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      {!capsule.delivered && (
                        <button onClick={() => handleDelete(capsule.capsuleID)} className="p-1.5 hover:bg-rahel-danger/10 rounded-lg">
                          <Trash2 size={14} className="text-rahel-danger" />
                        </button>
                      )}
                    </div>

                    {capsule.textContent && (
                      <div className="mt-3 p-3 bg-rahel-bg rounded-lg text-xs text-rahel-text-secondary leading-relaxed">
                        {capsule.textContent.substring(0, 200)}{capsule.textContent.length > 200 ? '...' : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="إنشاء كبسولة زمنية" titleEn="Create Time Capsule" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="rahel-label">عنوان الكبسولة *</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required className="rahel-input" placeholder="رسالة إلى ابني في يوم تخرجه" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="rahel-label">نوع المحتوى</label>
              <select value={form.contentType} onChange={e => setForm(p => ({ ...p, contentType: e.target.value }))} className="rahel-select">
                <option value="text">رسالة نصية</option>
                <option value="voice">رسالة صوتية</option>
                <option value="video">رسالة مرئية</option>
                <option value="mixed">محتوى متنوع</option>
              </select>
            </div>
            <div>
              <label className="rahel-label">المناسبة</label>
              <select value={form.occasion} onChange={e => setForm(p => ({ ...p, occasion: e.target.value }))} className="rahel-select">
                {occasions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="rahel-label">المحتوى النصي</label>
            <textarea
              value={form.textContent}
              onChange={e => setForm(p => ({ ...p, textContent: e.target.value }))}
              className="rahel-input min-h-[120px] resize-y"
              placeholder="اكتب رسالتك هنا..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="rahel-label">تاريخ التسليم *</label>
              <input type="date" value={form.targetReleaseDate} onChange={e => setForm(p => ({ ...p, targetReleaseDate: e.target.value }))} required className="rahel-input" dir="ltr" min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="rahel-label">اسم المستلم</label>
              <input type="text" value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} className="rahel-input" placeholder="محمد" />
            </div>
          </div>

          <div>
            <label className="rahel-label">بيانات التواصل مع المستلم *</label>
            <input type="text" value={form.recipientContact} onChange={e => setForm(p => ({ ...p, recipientContact: e.target.value }))} required className="rahel-input" placeholder="رقم هاتف أو بريد إلكتروني" />
          </div>

          <button type="submit" className="rahel-btn-primary w-full"><Plus size={18} /><span>إنشاء الكبسولة</span></button>
        </form>
      </Modal>
    </div>
  );
}
