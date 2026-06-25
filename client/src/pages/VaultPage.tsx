import React, { useState, useEffect, useCallback } from 'react';
import { Shield, File, Key, Users, Trash2, Plus, UserPlus, Link2 } from 'lucide-react';
import { vaultAPI } from '../services/api';
import FileUploader from '../components/FileUploader';
import Modal from '../components/Modal';
import type { VaultFile, Heir, KeyShard } from '../types';

export default function VaultPage() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [encryptionStage, setEncryptionStage] = useState('');
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [showHeirModal, setShowHeirModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [fileShards, setFileShards] = useState<KeyShard[]>([]);
  const [heirForm, setHeirForm] = useState({ recipientName: '', phone: '', email: '', relationship: '', accessTier: 'Personal' });

  const loadData = useCallback(async () => {
    try {
      const [filesRes, heirsRes] = await Promise.all([vaultAPI.listFiles(), vaultAPI.listHeirs()]);
      setFiles(filesRes.data.files);
      setHeirs(heirsRes.data.heirs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async (file: File, accessTier: string, description: string) => {
    setIsUploading(true);
    const stages = ['reading', 'generating_key', 'encrypting', 'sharding', 'uploading', 'complete'];

    for (let i = 0; i < stages.length - 1; i++) {
      setEncryptionStage(stages[i]);
      setEncryptionProgress(((i + 1) / stages.length) * 100);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accessTier', accessTier);
      formData.append('description', description);
      await vaultAPI.uploadFile(formData);
      setEncryptionStage('complete');
      setEncryptionProgress(100);
      await new Promise(r => setTimeout(r, 800));
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      setEncryptionStage('');
      setEncryptionProgress(0);
    }
  };

  const handleDeleteFile = async (fileID: string) => {
    try {
      await vaultAPI.deleteFile(fileID);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleViewShards = async (file: VaultFile) => {
    try {
      const res = await vaultAPI.getFile(file.fileID);
      setFileShards(res.data.shards);
      setSelectedFile(file);
    } catch (err) { console.error(err); }
  };

  const handleAddHeir = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await vaultAPI.addHeir(heirForm);
      setHeirForm({ recipientName: '', phone: '', email: '', relationship: '', accessTier: 'Personal' });
      setShowHeirModal(false);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteHeir = async (recipientID: string) => {
    try {
      await vaultAPI.deleteHeir(recipientID);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleAssignShard = async (shardID: string, recipientID: string) => {
    try {
      await vaultAPI.assignShard(shardID, recipientID);
      if (selectedFile) await handleViewShards(selectedFile);
    } catch (err) { console.error(err); }
  };

  const tierColors: Record<string, string> = {
    Financial: 'text-emerald-400 bg-emerald-400/10',
    Personal: 'text-blue-400 bg-blue-400/10',
    Legal: 'text-purple-400 bg-purple-400/10',
    Medical: 'text-rose-400 bg-rose-400/10',
    Restricted: 'text-red-500 bg-red-500/10',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-rahel-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="rahel-page-title flex items-center gap-3"><Shield size={28} className="text-rahel-accent" />الخزنة الرقمية</h1>
          <p className="rahel-page-subtitle">Digital Vault — تشفير وحفظ ملفاتك المهمة بتقنية AES-256-GCM</p>
        </div>
        <button onClick={() => setShowHeirModal(true)} className="rahel-btn-secondary">
          <UserPlus size={18} /><span>إضافة وريث</span>
        </button>
      </div>

      {/* File Uploader */}
      <FileUploader
        onUpload={handleUpload}
        isUploading={isUploading}
        encryptionStage={encryptionStage}
        encryptionProgress={encryptionProgress}
      />

      {/* Authorized Heirs Section */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Users size={20} />الورثة المعتمدون ({heirs.length})</h2>
        {heirs.length === 0 ? (
          <div className="rahel-card text-center text-rahel-text-muted py-8">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>لم يتم تعيين ورثة بعد</p>
            <p className="text-xs mt-1">أضف ورثة لتوزيع مفاتيح التشفير عليهم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {heirs.map(heir => (
              <div key={heir.recipientID} className="rahel-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{heir.recipientName}</p>
                    <p className="text-xs text-rahel-text-muted">{heir.relationship || 'غير محدد'}</p>
                  </div>
                  <span className={`rahel-badge ${tierColors[heir.accessTier] || ''}`}>{heir.accessTier}</span>
                </div>
                <p className="text-xs text-rahel-text-secondary mb-1" dir="ltr">{heir.phone}</p>
                {heir.email && <p className="text-xs text-rahel-text-muted" dir="ltr">{heir.email}</p>}
                <button onClick={() => handleDeleteHeir(heir.recipientID)} className="mt-3 text-xs text-rahel-danger hover:underline flex items-center gap-1">
                  <Trash2 size={12} /><span>حذف</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vault Files */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><File size={20} />الملفات المشفرة ({files.length})</h2>
        {files.length === 0 ? (
          <div className="rahel-card text-center text-rahel-text-muted py-8">
            <Shield size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد ملفات في الخزنة</p>
            <p className="text-xs mt-1">ارفع ملفاتك المهمة ليتم تشفيرها تلقائياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map(file => (
              <div key={file.fileID} className="rahel-card flex items-center gap-4 hover:border-rahel-accent/30">
                <div className="p-3 bg-rahel-accent/10 rounded-xl shrink-0">
                  <File size={24} className="text-rahel-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.fileName}</p>
                  <div className="flex items-center gap-3 text-xs text-rahel-text-muted mt-1">
                    <span>{file.formattedSize}</span>
                    <span>|</span>
                    <span className={`${tierColors[file.accessTier] || ''} px-2 py-0.5 rounded-full`}>{file.accessTier}</span>
                    <span>|</span>
                    <span>{new Date(file.uploadedAt).toLocaleDateString('ar-AE')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleViewShards(file)} className="p-2 hover:bg-rahel-elevated rounded-lg transition-colors" title="عرض أجزاء المفتاح">
                    <Key size={16} className="text-rahel-accent" />
                  </button>
                  <button onClick={() => handleDeleteFile(file.fileID)} className="p-2 hover:bg-rahel-danger/10 rounded-lg transition-colors" title="حذف">
                    <Trash2 size={16} className="text-rahel-danger" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Heir Modal */}
      <Modal isOpen={showHeirModal} onClose={() => setShowHeirModal(false)} title="إضافة وريث جديد" titleEn="Add New Heir">
        <form onSubmit={handleAddHeir} className="space-y-4">
          <div>
            <label className="rahel-label">الاسم الكامل *</label>
            <input type="text" value={heirForm.recipientName} onChange={e => setHeirForm(p => ({ ...p, recipientName: e.target.value }))} required className="rahel-input" placeholder="اسم الوريث" />
          </div>
          <div>
            <label className="rahel-label">رقم الهاتف *</label>
            <input type="tel" value={heirForm.phone} onChange={e => setHeirForm(p => ({ ...p, phone: e.target.value }))} required className="rahel-input" placeholder="+971XXXXXXXXX" dir="ltr" />
          </div>
          <div>
            <label className="rahel-label">البريد الإلكتروني</label>
            <input type="email" value={heirForm.email} onChange={e => setHeirForm(p => ({ ...p, email: e.target.value }))} className="rahel-input" placeholder="email@example.com" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="rahel-label">صلة القرابة</label>
              <input type="text" value={heirForm.relationship} onChange={e => setHeirForm(p => ({ ...p, relationship: e.target.value }))} className="rahel-input" placeholder="ابن، زوجة، أخ..." />
            </div>
            <div>
              <label className="rahel-label">مستوى الوصول</label>
              <select value={heirForm.accessTier} onChange={e => setHeirForm(p => ({ ...p, accessTier: e.target.value }))} className="rahel-select">
                <option value="Personal">شخصي</option>
                <option value="Financial">مالي</option>
                <option value="Legal">قانوني</option>
                <option value="Medical">طبي</option>
                <option value="All">كامل</option>
              </select>
            </div>
          </div>
          <button type="submit" className="rahel-btn-primary w-full"><Plus size={18} /><span>إضافة الوريث</span></button>
        </form>
      </Modal>

      {/* Key Shards Modal */}
      <Modal isOpen={!!selectedFile} onClose={() => { setSelectedFile(null); setFileShards([]); }} title="أجزاء مفتاح التشفير" titleEn="Encryption Key Shards" size="lg">
        {selectedFile && (
          <div className="space-y-4">
            <div className="bg-rahel-bg rounded-lg p-4">
              <p className="text-sm font-medium">{selectedFile.fileName}</p>
              <p className="text-xs text-rahel-text-muted">{selectedFile.formattedSize} | {selectedFile.accessTier}</p>
            </div>
            <div className="space-y-2">
              {fileShards.map(shard => (
                <div key={shard.shardID} className="bg-rahel-bg rounded-lg p-4 flex items-center gap-3">
                  <div className="p-2 bg-rahel-accent/10 rounded-lg">
                    <Key size={16} className="text-rahel-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">جزء #{shard.shardIndex}</p>
                    <p className="text-xs text-rahel-text-muted font-mono" dir="ltr">{shard.shardHash}</p>
                  </div>
                  {shard.distributed ? (
                    <span className="rahel-badge-active">تم التوزيع</span>
                  ) : heirs.length > 0 ? (
                    <select
                      onChange={e => { if (e.target.value) handleAssignShard(shard.shardID, e.target.value); }}
                      className="rahel-select text-xs w-40"
                      defaultValue=""
                    >
                      <option value="" disabled>تعيين لوريث</option>
                      {heirs.map(h => <option key={h.recipientID} value={h.recipientID}>{h.recipientName}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs text-rahel-text-muted">لا يوجد ورثة</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
