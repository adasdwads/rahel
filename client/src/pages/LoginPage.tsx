import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Lock, Phone, Fingerprint, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register(formData.name, formData.email, formData.password, formData.phone || undefined);
      } else {
        await login(formData.email, formData.password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rahel-bg flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-rahel-accent/5 via-transparent to-transparent" />
        <div className="relative z-10 max-w-md text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-rahel-accent/10 border border-rahel-accent/20 flex items-center justify-center rahel-glow">
            <Shield size={48} className="text-rahel-accent" />
          </div>
          <h1 className="text-5xl font-bold mb-4 text-gradient">راحل</h1>
          <p className="text-xl text-rahel-text-secondary mb-2">RAHEL</p>
          <p className="text-rahel-text-muted leading-relaxed">
            منصة الإرث الرقمي والتوريث الآلي
            <br />
            <span className="text-sm">Digital Legacy & Automated Inheritance Platform</span>
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 text-right">
            {[
              { label: 'تشفير عسكري', desc: 'AES-256-GCM + Key Sharding' },
              { label: 'مراقبة مستمرة', desc: "Dead Man's Switch" },
              { label: 'صدقة جارية', desc: 'توزيع آلي للصدقات' },
              { label: 'كبسولات زمنية', desc: 'رسائل مجدولة للمستقبل' },
            ].map((feat, i) => (
              <div key={i} className="p-3 rounded-lg bg-rahel-surface/50 border border-rahel-border/50">
                <p className="text-sm font-medium text-rahel-text-primary">{feat.label}</p>
                <p className="text-[10px] text-rahel-text-muted">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold text-gradient">راحل</h1>
            <p className="text-sm text-rahel-text-muted mt-1">RAHEL | منصة الإرث الرقمي</p>
          </div>

          <div className="rahel-card">
            <h2 className="text-xl font-bold mb-1">
              {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h2>
            <p className="text-sm text-rahel-text-muted mb-6">
              {isRegister ? 'Create a new account' : 'Sign in to your account'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rahel-danger/10 border border-rahel-danger/20 rounded-lg text-sm text-rahel-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="rahel-label">الاسم الكامل</label>
                    <div className="relative">
                      <input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="أدخل اسمك الكامل"
                        required
                        className="rahel-input pr-10"
                      />
                      <User size={16} className="absolute top-3 right-3 text-rahel-text-muted" />
                    </div>
                  </div>
                  <div>
                    <label className="rahel-label">رقم الهاتف (اختياري)</label>
                    <div className="relative">
                      <input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+971XXXXXXXXX"
                        className="rahel-input pr-10"
                        dir="ltr"
                      />
                      <Phone size={16} className="absolute top-3 right-3 text-rahel-text-muted" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="rahel-label">البريد الإلكتروني</label>
                <div className="relative">
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    required
                    className="rahel-input pr-10"
                    dir="ltr"
                  />
                  <Mail size={16} className="absolute top-3 right-3 text-rahel-text-muted" />
                </div>
              </div>

              <div>
                <label className="rahel-label">كلمة المرور</label>
                <div className="relative">
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="rahel-input pr-10"
                  />
                  <Lock size={16} className="absolute top-3 right-3 text-rahel-text-muted" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rahel-btn-primary w-full"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={18} />
                    <span>{isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-rahel-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-rahel-surface text-rahel-text-muted">أو</span>
              </div>
            </div>

            {/* Biometric / UAE PASS Buttons */}
            <div className="space-y-3">
              <button className="rahel-btn-secondary w-full">
                <Fingerprint size={18} />
                <span>الدخول بالبصمة / FaceID</span>
              </button>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#00843D]/10 text-[#00843D] hover:bg-[#00843D]/20 transition-all border border-[#00843D]/20 text-sm font-medium">
                <Shield size={18} />
                <span>الدخول عبر UAE PASS</span>
              </button>
            </div>

            {/* Toggle Register/Login */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-sm text-rahel-accent hover:text-rahel-accent-hover transition-colors"
              >
                {isRegister ? 'لديك حساب؟ سجل الدخول' : 'ليس لديك حساب؟ سجل الآن'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
