import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';

type AuthMode = 'login-email' | 'register';

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function AuthPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login-email');
  const [form, setForm] = useState({ email: '', phone: '', password: '', name: '', businessName: '', role: 'buyer' as 'buyer' | 'seller' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const switchMode = (m: AuthMode) => { setMode(m); setError(''); setSuccess(''); };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await api.post('/auth/login', { email: form.email, password: form.password });
      login(r.data.token, r.data.user);
      navigate(r.data.user.role === 'admin' ? '/admin' : r.data.user.role === 'seller' ? '/seller' : '/buyer');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'));
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/auth/register', { email: form.email, phone: form.phone, password: form.password, name: form.name, businessName: form.businessName, role: form.role });
      setSuccess('Account created! Please sign in.');
      setMode('login-email');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'));
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 transition-all';

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden">
        <img src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&q=85" alt="DG Market"
          className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(20,83,45,0.92) 0%, rgba(20,83,45,0.70) 60%, rgba(0,0,0,0.55) 100%)' }} />
        <div className="relative z-10 p-10">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-white font-black text-2xl uppercase tracking-tight">DG MARKET</span>
          </Link>
        </div>
        <div className="relative z-10 px-10 pb-4">
          <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-3">{t('home.ethiopiaMarketplace')}</p>
          <h2 className="text-white font-black uppercase leading-none mb-5" style={{ fontSize: 'clamp(2.2rem,4vw,3.5rem)' }}>
            TRADE WITH<br /><span className="text-yellow-400">CONFIDENCE</span>
          </h2>
          <p className="text-green-100 text-sm leading-relaxed max-w-sm">{t('home.footerEscrow')}</p>
        </div>
        <div className="relative z-10 p-10 grid grid-cols-2 gap-3">
          {[
            { icon: '🔒', label: 'Secure Escrow' },
            { icon: '📱', label: 'Telebirr & CBE' },
            { icon: '✅', label: 'Verified Sellers' },
            { icon: '🚚', label: 'Nationwide Delivery' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2">
              <span className="text-lg">{b.icon}</span>
              <span className="text-white text-xs font-semibold">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <Link to="/">
            <span className="font-black text-gray-900 text-lg uppercase tracking-tight">DG MARKET</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            <div className="mb-8">
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                {mode === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {mode === 'register' ? t('auth.joinUs') : t('auth.signInDesc')}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
              {([
                { key: 'login-email', label: t('auth.emailTab') },
                { key: 'register',    label: t('auth.registerTab') },
              ] as { key: AuthMode; label: string }[]).map((tab) => (
                <button key={tab.key} onClick={() => switchMode(tab.key)}
                  className={`flex-1 pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
                    mode === tab.key ? 'border-green-800 text-green-800' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-4 py-3 mb-6">
                <span>⚠️</span> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-green-50 border-l-4 border-green-600 text-green-700 text-sm px-4 py-3 mb-6">
                <span>✅</span> {success}
              </div>
            )}

            {/* EMAIL LOGIN */}
            {mode === 'login-email' && (
              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.emailAddress')}</label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    required placeholder="you@example.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.password')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      required placeholder="••••••••" className={inputCls + ' pr-11'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-green-800 hover:bg-green-900 active:scale-[0.98] text-white font-black text-sm uppercase tracking-widest py-4 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><Spinner /> {t('auth.signingIn')}</> : t('auth.signIn')}
                </button>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{t('auth.noAccountShort')}{' '}
                    <button type="button" onClick={() => switchMode('register')} className="text-green-800 font-bold hover:underline">
                      {t('auth.createOneFree')}
                    </button>
                  </span>
                  <Link to="/reset-password" className="text-gray-400 hover:text-green-800 transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </form>
            )}

            {/* REGISTER */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.fullName')}</label>
                  <input value={form.name} onChange={(e) => set('name', e.target.value)}
                    required placeholder="Abebe Kebede" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.iWantTo')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['buyer', 'seller'] as const).map((r) => (
                      <button key={r} type="button" onClick={() => set('role', r)}
                        className={`py-3 text-sm font-black uppercase tracking-wide border-2 transition-all ${
                          form.role === r ? 'border-green-800 bg-green-800 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}>
                        {r === 'buyer' ? `🛒 ${t('auth.buy')}` : `🏪 ${t('auth.sell')}`}
                      </button>
                    ))}
                  </div>
                </div>
                {form.role === 'seller' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.businessName')}</label>
                    <input value={form.businessName} onChange={(e) => set('businessName', e.target.value)}
                      required placeholder="e.g. Abebe's Electronics" className={inputCls} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.email')}</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                      required placeholder="you@example.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.phone')}</label>
                    <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                      required placeholder="+251 9XX XXX XXX" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">{t('auth.password')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      required placeholder="Min 6 characters" className={inputCls + ' pr-11'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-gray-900 font-black text-sm uppercase tracking-widest py-4 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" /> {t('auth.creatingAccount')}</> : t('auth.createFree')}
                </button>
                <p className="text-center text-xs text-gray-500">
                  {t('auth.alreadyHaveAccount')}{' '}
                  <button type="button" onClick={() => switchMode('login-email')} className="text-green-800 font-bold hover:underline">
                    {t('auth.signIn')}
                  </button>
                </p>
              </form>
            )}

            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
              <span>🔒 Secure</span>
              <span>•</span>
              <span>📱 Telebirr & CBE</span>
              <span>•</span>
              <span>🇪🇹 Made for Ethiopia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
