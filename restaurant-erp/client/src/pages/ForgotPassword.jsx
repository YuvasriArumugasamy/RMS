import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── tiny input component to keep JSX clean ── */
const Field = ({ label, type = 'text', value, onChange, placeholder, autoComplete }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white placeholder-slate-500
                 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-400 focus:ring-1
                 focus:ring-orange-400 transition-colors"
    />
  </div>
);

// ── STEP 1: Request reset link ────────────────────────────────
const RequestStep = ({ onBack }) => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/auth/forgot-password`, { email: email.trim() });
      if (data.success) setSent(true);
      else setError(data.message || 'Something went wrong.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">📧</span>
        </div>
        <h2 className="text-xl font-black text-white">Check Your Inbox</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          If <span className="text-orange-400 font-bold">{email}</span> is registered,
          a reset link has been sent. Check your spam folder too.
        </p>
        <p className="text-xs text-slate-500 font-medium">Link expires in 15 minutes.</p>
        <button
          onClick={onBack}
          className="w-full mt-2 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors text-sm"
        >
          ← Back to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
          <span className="text-2xl">🔑</span>
        </div>
        <h1 className="text-2xl font-black text-white">Forgot Password?</h1>
        <p className="text-sm text-slate-400 mt-1">
          Enter your registered email and we'll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          placeholder="you@example.com"
          autoComplete="email"
        />

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <span className="text-red-400 text-sm">⚠</span>
            <p className="text-red-400 text-xs font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40
                     text-white font-black rounded-xl text-sm shadow-lg transition-all
                     flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
          ) : 'Send Reset Link'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 text-slate-400 hover:text-white font-bold text-sm transition-colors"
        >
          ← Back to Login
        </button>
      </form>
    </>
  );
};

// ── STEP 2: Set new password (arrived via email link) ─────────
const ResetStep = ({ token, userId, onSuccess }) => {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6)  s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-emerald-500'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/auth/reset-password`, {
        token, id: userId, password,
      });
      if (data.success) {
        // Save the returned JWT so user is logged in after reset
        if (data.token) localStorage.setItem('rms_token', data.token);
        onSuccess(data.user);
      } else {
        setError(data.message || 'Reset failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
          <span className="text-2xl">🔐</span>
        </div>
        <h1 className="text-2xl font-black text-white">Set New Password</h1>
        <p className="text-sm text-slate-400 mt-1">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password field with show/hide */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Min 6 characters"
              autoComplete="new-password"
              className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 text-white placeholder-slate-500
                         rounded-xl text-sm font-medium focus:outline-none focus:border-orange-400 focus:ring-1
                         focus:ring-orange-400 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-lg"
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {/* Strength bar */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-slate-600'}`} />
                ))}
              </div>
              <p className={`text-[10px] font-bold ${['','text-red-400','text-yellow-400','text-blue-400','text-green-400','text-emerald-400'][strength]}`}>
                {strengthLabel}
              </p>
            </div>
          )}
        </div>

        <Field
          label="Confirm Password"
          type="password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setError(''); }}
          placeholder="Re-enter new password"
          autoComplete="new-password"
        />

        {/* Match indicator */}
        {confirm && (
          <p className={`text-xs font-bold flex items-center gap-1 ${password === confirm ? 'text-green-400' : 'text-red-400'}`}>
            {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <span className="text-red-400 text-sm">⚠</span>
            <p className="text-red-400 text-xs font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || password !== confirm || password.length < 6}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40
                     text-white font-black rounded-xl text-sm shadow-lg transition-all
                     flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating...</>
          ) : '✓ Reset Password'}
        </button>
      </form>
    </>
  );
};

// ── STEP 3: Success screen ────────────────────────────────────
const SuccessStep = ({ user, onContinue }) => (
  <div className="text-center space-y-4">
    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
      <span className="text-3xl">🎉</span>
    </div>
    <h2 className="text-xl font-black text-white">Password Updated!</h2>
    <p className="text-sm text-slate-400">
      Welcome back, <span className="text-orange-400 font-bold">{user?.username}</span>.
      You're now logged in.
    </p>
    <button
      onClick={onContinue}
      className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-sm shadow-lg transition-all"
    >
      Go to Dashboard →
    </button>
  </div>
);

// ── INVALID / EXPIRED TOKEN screen ───────────────────────────
const ExpiredStep = ({ onBack }) => (
  <div className="text-center space-y-4">
    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
      <span className="text-3xl">⏰</span>
    </div>
    <h2 className="text-xl font-black text-white">Link Expired</h2>
    <p className="text-sm text-slate-400 leading-relaxed">
      This reset link is invalid or has expired (links are valid for 15 minutes).
      Please request a new one.
    </p>
    <button
      onClick={onBack}
      className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-sm shadow-lg transition-all"
    >
      Request New Link
    </button>
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────
const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const token  = searchParams.get('token');
  const userId = searchParams.get('id');

  // step: 'request' | 'reset' | 'success' | 'expired'
  const [step, setStep]         = useState(token && userId ? 'reset' : 'request');
  const [resetUser, setResetUser] = useState(null);

  // If someone manually navigates to /forgot-password?token=...&id=... verify it looks valid
  useEffect(() => {
    if (token && userId && token.length < 10) {
      setStep('expired');
    }
  }, [token, userId]);

  const handleResetSuccess = (user) => {
    setResetUser(user);
    setStep('success');
  };

  const handleContinue = () => {
    navigate('/');
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleBackToRequest = () => {
    // Clear URL params and go back to request step
    setSearchParams({});
    setStep('request');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-700">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">R</span>
          </div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Restaurant ERP</span>
        </div>

        {step === 'request' && <RequestStep onBack={handleBackToLogin} />}
        {step === 'reset'   && (
          <ResetStep
            token={token}
            userId={userId}
            onSuccess={handleResetSuccess}
          />
        )}
        {step === 'success' && <SuccessStep user={resetUser} onContinue={handleContinue} />}
        {step === 'expired' && <ExpiredStep onBack={handleBackToRequest} />}
      </div>
    </div>
  );
};

export default ForgotPassword;
