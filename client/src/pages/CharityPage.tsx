import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Plus, Wallet, TrendingUp, Trash2, RefreshCw, DollarSign, Settings } from 'lucide-react';
import { charityAPI } from '../services/api';
import Modal from '../components/Modal';
import type { CharityFlow, CharityEndpoint, CharitySummary, WalletTransaction } from '../types';

export default function CharityPage() {
  const [flows, setFlows] = useState<CharityFlow[]>([]);
  const [endpoints, setEndpoints] = useState<CharityEndpoint[]>([]);
  const [summary, setSummary] = useState<CharitySummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedFlowID, setSelectedFlowID] = useState('');
  const [createForm, setCreateForm] = useState({ charityCode: '', recurringAmount: '', frequency: 'monthly', walletFundAmount: '' });
  const [fundAmount, setFundAmount] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [flowsRes, endpointsRes, txRes] = await Promise.all([
        charityAPI.listFlows(), charityAPI.getEndpoints(), charityAPI.getTransactions(),
      ]);
      setFlows(flowsRes.data.flows);
      setSummary(flowsRes.data.summary);
      setEndpoints(endpointsRes.data.endpoints);
      setTransactions(txRes.data.transactions);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await charityAPI.createFlow({
        charityCode: createForm.charityCode,
        recurringAmount: parseFloat(createForm.recurringAmount),
        frequency: createForm.frequency,
        walletFundAmount: createForm.walletFundAmount ? parseFloat(createForm.walletFundAmount) : 0,
      });
      setCreateForm({ charityCode: '', recurringAmount: '', frequency: 'monthly', walletFundAmount: '' });
      setShowCreateModal(false);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await charityAPI.fundWallet({ flowID: selectedFlowID, amount: parseFloat(fundAmount) });
      setFundAmount('');
      setShowFundModal(false);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteFlow = async (flowID: string) => {
    try { await charityAPI.deleteFlow(flowID); await loadData(); } catch (err) { console.error(err); }
  };

  const handleToggleActive = async (flowID: string, isActive: boolean) => {
    try { await charityAPI.updateFlow(flowID, { isActive: !isActive }); await loadData(); } catch (err) { console.error(err); }
  };

  const frequencyLabels: Record<string, string> = { once: 'مرة واحدة', weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي' };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-rahel-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="rahel-page-title flex items-center gap-3"><Heart size={28} className="text-rose-400" />الصدقات الجارية</h1>
          <p className="rahel-page-subtitle">Automated Charity Dashboard — صدقات تعمل حتى بعد الرحيل</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="rahel-btn-primary"><Plus size={18} /><span>إضافة صدقة</span></button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rahel-card text-center">
            <Heart size={24} className="text-rose-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{summary.activeFlows}</p>
            <p className="text-xs text-rahel-text-muted">تدفقات نشطة</p>
          </div>
          <div className="rahel-card text-center">
            <Wallet size={24} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{summary.walletBalance.toLocaleString()}</p>
            <p className="text-xs text-rahel-text-muted">رصيد المحفظة ({summary.currency})</p>
          </div>
          <div className="rahel-card text-center">
            <TrendingUp size={24} className="text-rahel-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{summary.totalDisbursed.toLocaleString()}</p>
            <p className="text-xs text-rahel-text-muted">إجمالي التوزيع ({summary.currency})</p>
          </div>
          <div className="rahel-card text-center">
            <RefreshCw size={24} className="text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{summary.totalFlows}</p>
            <p className="text-xs text-rahel-text-muted">إجمالي التدفقات</p>
          </div>
        </div>
      )}

      {/* Pre-funded Wallet Notice */}
      <div className="rahel-card bg-emerald-500/5 border-emerald-500/20">
        <div className="flex items-start gap-3">
          <Wallet size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-emerald-400 text-sm">المحفظة المسبقة الدفع — Pre-funded Secure Wallet</h3>
            <p className="text-xs text-rahel-text-secondary mt-1">
              قم بتمويل محفظة مخصصة لتجاوز تجميد الحسابات البنكية بعد الوفاة.
              يتم صرف الأموال تلقائياً إلى الجهات الخيرية المحددة فور التحقق.
            </p>
          </div>
        </div>
      </div>

      {/* Charity Flows */}
      <div>
        <h2 className="text-lg font-bold mb-3">تدفقات الصدقة</h2>
        {flows.length === 0 ? (
          <div className="rahel-card text-center text-rahel-text-muted py-8">
            <Heart size={40} className="mx-auto mb-3 opacity-30" />
            <p>لم يتم إعداد أي تدفقات خيرية بعد</p>
            <p className="text-xs mt-1">أضف صدقة جارية ليتم تنفيذها آلياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flows.map(flow => (
              <div key={flow.flowID} className={`rahel-card ${flow.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-400/10 rounded-xl">
                      <Heart size={20} className="text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{flow.charityName}</h3>
                      <div className="flex items-center gap-2 text-xs text-rahel-text-muted mt-1">
                        <span>{flow.recurringAmount.toLocaleString()} {flow.currency}</span>
                        <span>|</span>
                        <span>{frequencyLabels[flow.frequency]}</span>
                        <span>|</span>
                        <span className={flow.isActive ? 'text-rahel-success' : 'text-rahel-text-muted'}>{flow.isActive ? 'نشط' : 'متوقف'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-left ml-4">
                      <p className="text-sm font-bold text-emerald-400">{flow.walletBalance.toLocaleString()}</p>
                      <p className="text-[10px] text-rahel-text-muted">رصيد المحفظة</p>
                    </div>
                    <button onClick={() => { setSelectedFlowID(flow.flowID); setShowFundModal(true); }} className="p-2 hover:bg-rahel-elevated rounded-lg" title="تمويل المحفظة">
                      <DollarSign size={16} className="text-emerald-400" />
                    </button>
                    <button onClick={() => handleToggleActive(flow.flowID, flow.isActive)} className="p-2 hover:bg-rahel-elevated rounded-lg" title={flow.isActive ? 'إيقاف' : 'تفعيل'}>
                      <Settings size={16} className="text-rahel-text-muted" />
                    </button>
                    <button onClick={() => handleDeleteFlow(flow.flowID)} className="p-2 hover:bg-rahel-danger/10 rounded-lg" title="حذف">
                      <Trash2 size={16} className="text-rahel-danger" />
                    </button>
                  </div>
                </div>
                {flow.totalDisbursed > 0 && (
                  <div className="mt-3 pt-3 border-t border-rahel-border flex items-center gap-4 text-xs text-rahel-text-muted">
                    <span>إجمالي التوزيع: {flow.totalDisbursed.toLocaleString()} {flow.currency}</span>
                    <span>|</span>
                    <span>عمليات التنفيذ: {flow.executionCount}</span>
                    {flow.lastExecuted && <><span>|</span><span>آخر تنفيذ: {new Date(flow.lastExecuted).toLocaleDateString('ar-AE')}</span></>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">سجل المعاملات</h2>
          <div className="rahel-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rahel-elevated text-rahel-text-muted text-xs">
                  <th className="text-right p-3">النوع</th>
                  <th className="text-right p-3">المبلغ</th>
                  <th className="text-right p-3">الجهة</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map(tx => (
                  <tr key={tx.txID} className="border-t border-rahel-border hover:bg-rahel-elevated/50">
                    <td className="p-3 text-xs">{tx.txType === 'deposit' ? 'إيداع' : tx.txType === 'charity_disbursement' ? 'صرف صدقة' : tx.txType}</td>
                    <td className="p-3 text-xs font-medium">{tx.amount.toLocaleString()} {tx.currency}</td>
                    <td className="p-3 text-xs text-rahel-text-muted">{tx.charityName || '---'}</td>
                    <td className="p-3"><span className={`rahel-badge ${tx.status === 'completed' ? 'rahel-badge-active' : 'rahel-badge-warning'}`}>{tx.status === 'completed' ? 'مكتمل' : tx.status}</span></td>
                    <td className="p-3 text-xs text-rahel-text-muted">{new Date(tx.createdAt).toLocaleDateString('ar-AE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Flow Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="إضافة صدقة جارية" titleEn="Add Ongoing Charity">
        <form onSubmit={handleCreateFlow} className="space-y-4">
          <div>
            <label className="rahel-label">الجهة الخيرية *</label>
            <select value={createForm.charityCode} onChange={e => setCreateForm(p => ({ ...p, charityCode: e.target.value }))} required className="rahel-select">
              <option value="" disabled>اختر الجهة الخيرية</option>
              {endpoints.map(ep => <option key={ep.code} value={ep.code}>{ep.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="rahel-label">المبلغ المتكرر (AED) *</label>
              <input type="number" value={createForm.recurringAmount} onChange={e => setCreateForm(p => ({ ...p, recurringAmount: e.target.value }))} required min="1" className="rahel-input" placeholder="500" dir="ltr" />
            </div>
            <div>
              <label className="rahel-label">التكرار</label>
              <select value={createForm.frequency} onChange={e => setCreateForm(p => ({ ...p, frequency: e.target.value }))} className="rahel-select">
                <option value="once">مرة واحدة</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
            </div>
          </div>
          <div>
            <label className="rahel-label">تمويل المحفظة المسبق (AED)</label>
            <input type="number" value={createForm.walletFundAmount} onChange={e => setCreateForm(p => ({ ...p, walletFundAmount: e.target.value }))} min="0" className="rahel-input" placeholder="1000 (اختياري)" dir="ltr" />
            <p className="text-[10px] text-rahel-text-muted mt-1">المبلغ المراد إيداعه في المحفظة المخصصة لتجاوز تجميد الحسابات</p>
          </div>
          <button type="submit" className="rahel-btn-primary w-full"><Plus size={18} /><span>إنشاء تدفق الصدقة</span></button>
        </form>
      </Modal>

      {/* Fund Wallet Modal */}
      <Modal isOpen={showFundModal} onClose={() => setShowFundModal(false)} title="تمويل المحفظة" titleEn="Fund Wallet">
        <form onSubmit={handleFundWallet} className="space-y-4">
          <div>
            <label className="rahel-label">المبلغ (AED) *</label>
            <input type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)} required min="1" className="rahel-input" placeholder="1000" dir="ltr" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[100, 500, 1000].map(amt => (
              <button key={amt} type="button" onClick={() => setFundAmount(String(amt))} className="rahel-btn-secondary text-sm">{amt} AED</button>
            ))}
          </div>
          <div className="bg-rahel-bg rounded-lg p-3 text-xs text-rahel-text-muted">
            <p>سيتم محاكاة عملية الدفع عبر Apple Pay / Stripe</p>
            <p className="mt-1">في الإنتاج: يتم الاتصال ببوابة الدفع الفعلية</p>
          </div>
          <button type="submit" className="rahel-btn-primary w-full"><Wallet size={18} /><span>تمويل المحفظة</span></button>
        </form>
      </Modal>
    </div>
  );
}
