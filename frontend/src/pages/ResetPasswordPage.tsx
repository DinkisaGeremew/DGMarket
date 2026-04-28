import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Step 1: request reset (no token in URL)
  const [email, setEmail] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqMsg, setReqMsg] = useState('');
  const [reqError, setReqError] = useState('');

  // Step 2: set new password (token in URL)
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(''); setReqMsg(''); setReqLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setReqMsg('Reset link sent! Check your email inbox (and spam folder). If you don\'t receive it within a minute, check the backend console for the dev link.');
    } catch {
      setReqError('Something went wrong. Please try again.');
    } finally { setReqLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(''); setResetMsg('');
    if (password !== confirm) { setResetError('Passwords do not match.'); return; }
    if (password.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    setResetLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setResetMsg('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      setResetError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Reset link is invalid or expired.');
    } finally { setResetLoading(false); }
  };

  const inputCls = 'w-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 transition-all rounded-lg';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600 mb-6 inline-block">← Back to Sign In</Link>

        {!token ? (
          // ── STEP 1: Request reset link ──
          <>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">Forgot Password</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

            {reqMsg && (
              <div className="bg-green-50 border-l-4 border-green-600 text-green-700 text-sm px-4 py-3 mb-5 rounded-r-lg">
                ✅ {reqMsg}
              </div>
            )}
            {reqError && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-4 py-3 mb-5 rounded-r-lg">
                ⚠️ {reqError}
              </div>
            )}

            {!reqMsg && (
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                    {t('auth.emailAddress')}
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="you@example.com" className={inputCls} />
                </div>
                <button type="submit" disabled={reqLoading}
                  className="w-full bg-green-800 hover:bg-green-900 text-white font-black text-sm uppercase tracking-widest py-4 rounded-lg transition-all disabled:opacity-50">
                  {reqLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </>
        ) : (
          // ── STEP 2: Set new password ──
          <>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">Set New Password</h1>
            <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

            {resetMsg && (
              <div className="bg-green-50 border-l-4 border-green-600 text-green-700 text-sm px-4 py-3 mb-5 rounded-r-lg">
                ✅ {resetMsg} Redirecting to login...
              </div>
            )}
            {resetError && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-4 py-3 mb-5 rounded-r-lg">
                ⚠️ {resetError}
              </div>
            )}

            {!resetMsg && (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="Min 6 characters" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    required placeholder="Repeat password" className={inputCls} />
                </div>
                <button type="submit" disabled={resetLoading}
                  className="w-full bg-green-800 hover:bg-green-900 text-white font-black text-sm uppercase tracking-widest py-4 rounded-lg transition-all disabled:opacity-50">
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
