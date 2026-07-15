import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import centerLogo from '../assets/Screenshot 2026-07-02 173735.png';
import chefImage  from '../assets/ChatGPT Image Jul 2, 2026, 12_34_37 PM.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const IconEmail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

// ── STEP 1: Request reset link ────────────────────────────────────
const RequestStep = ({ onBack }) => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_URL}/auth/forgot-password`, { email: email.trim() });
      if (data.success) setSent(true);
      else setError(data.message || 'Something went wrong.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to server.');
    } finally { setLoading(false); }
  };

  if (sent) return (
    <div className="text-center space-y-4 px-6 py-8">
      <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto">
        <span className="text-3xl">📧</span>
      </div>
      <h2 className="text-xl font-black text-gray-900">Check Your Inbox</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        If <span className="text-[#f97316] font-bold">{email}</span> is registered,
        a reset link has been sent. Check your spam folder too.
      </p>
      <p className="text-xs text-gray-400 font-medium">Link expires in 15 minutes.</p>
      <button onClick={onBack}
        className="w-full mt-2 py-3 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-full transition-all text-sm shadow-lg">
        ← Back to Login
      </button>
    </div>
  );

  return (
    <div className="px-6 pb-6 space-y-4">
      <div>
        <div className="w-11 h-11 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mb-3">
          <span className="text-2xl">🔑</span>
        </div>
        <h1 className="text-xl font-black text-gray-900">Forgot Password?</h1>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          Enter your registered email and we'll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Email Address</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconEmail/></span>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400 shadow-sm transition"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-red-400 text-sm">⚠</span>
            <p className="text-red-500 text-xs font-medium">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-[#f97316] hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-full flex items-center justify-center gap-2 text-sm shadow-lg transition-all">
          {loading ? (
            <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending...</>
          ) : <>Send Reset Link <IconArrow/></>}
        </button>

        <button type="button" onClick={onBack}
          className="w-full py-2.5 flex items-center justify-center gap-1 text-gray-500 hover:text-[#f97316] font-bold text-sm transition-colors">
          <IconBack/> Back to Login
        </button>
      </form>
    </div>
  );
};

// ── STEP 2: Set new password ──────────────────────────────────────
const ResetStep = ({ token, userId, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

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
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_URL}/auth/reset-password`, { token, id: userId, password });
      if (data.success) { if (data.token) localStorage.setItem('rms_token', data.token); onSuccess(data.user); }
      else setError(data.message || 'Reset failed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect to server.');
    } finally { setLoading(false); }
  };

  return (
    <div className="px-6 pb-6 space-y-4">
      <div>
        <div className="w-11 h-11 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center mb-3">
          <span className="text-2xl">🔐</span>
        </div>
        <h1 className="text-xl font-black text-gray-900">Set New Password</h1>
        <p className="text-xs text-gray-500 mt-0.5">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">New Password</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconLock/></span>
            <input type={showPw ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Min 6 characters" autoComplete="new-password"
              className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400 shadow-sm transition tracking-widest"/>
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <IconEyeOff/> : <IconEye/>}
            </button>
          </div>
          {password && (
            <div className="space-y-1 px-1">
              <div className="flex gap-1">{[1,2,3,4,5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-gray-200'}`}/>
              ))}</div>
              <p className={`text-[10px] font-bold ${['','text-red-500','text-yellow-500','text-blue-500','text-green-500','text-emerald-500'][strength]}`}>{strengthLabel}</p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Confirm Password</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconLock/></span>
            <input type={showCf ? 'text' : 'password'} value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              placeholder="Re-enter password" autoComplete="new-password"
              className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400 shadow-sm transition tracking-widest"/>
            <button type="button" onClick={() => setShowCf(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showCf ? <IconEyeOff/> : <IconEye/>}
            </button>
          </div>
          {confirm && (
            <p className={`text-xs font-bold px-1 ${password === confirm ? 'text-green-500' : 'text-red-500'}`}>
              {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-red-400 text-sm">⚠</span>
            <p className="text-red-500 text-xs font-medium">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || password !== confirm || password.length < 6}
          className="w-full py-3 bg-[#f97316] hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-full flex items-center justify-center gap-2 text-sm shadow-lg transition-all">
          {loading ? (
            <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Updating...</>
          ) : <>✓ Reset Password <IconArrow/></>}
        </button>
      </form>
    </div>
  );
};

// ── STEP 3: Success ───────────────────────────────────────────────
const SuccessStep = ({ user, onContinue }) => (
  <div className="text-center space-y-4 px-6 py-8">
    <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto">
      <span className="text-3xl">🎉</span>
    </div>
    <h2 className="text-xl font-black text-gray-900">Password Updated!</h2>
    <p className="text-sm text-gray-500">
      Welcome back, <span className="text-[#f97316] font-bold">{user?.username}</span>. You're now logged in.
    </p>
    <button onClick={onContinue}
      className="w-full py-3 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-full text-sm shadow-lg transition-all flex items-center justify-center gap-2">
      Go to Dashboard <IconArrow/>
    </button>
  </div>
);

// ── EXPIRED TOKEN ─────────────────────────────────────────────────
const ExpiredStep = ({ onBack }) => (
  <div className="text-center space-y-4 px-6 py-8">
    <div className="w-16 h-16 bg-red-50 border-2 border-red-200 rounded-full flex items-center justify-center mx-auto">
      <span className="text-3xl">⏰</span>
    </div>
    <h2 className="text-xl font-black text-gray-900">Link Expired</h2>
    <p className="text-sm text-gray-500 leading-relaxed">
      This reset link is invalid or has expired (links are valid for 15 minutes). Please request a new one.
    </p>
    <button onClick={onBack}
      className="w-full py-3 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-full text-sm shadow-lg transition-all flex items-center justify-center gap-2">
      Request New Link <IconArrow/>
    </button>
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────
const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const token  = searchParams.get('token');
  const userId = searchParams.get('id');

  const [step, setStep]         = useState(token && userId ? 'reset' : 'request');
  const [resetUser, setResetUser] = useState(null);

  useEffect(() => {
    if (token && userId && token.length < 10) setStep('expired');
  }, [token, userId]);

  const handleResetSuccess  = (user) => { setResetUser(user); setStep('success'); };
  const handleContinue      = () => navigate('/');
  const handleBackToLogin   = () => navigate('/login');
  const handleBackToRequest = () => { setSearchParams({}); setStep('request'); };

  return (
    <div className="h-screen overflow-hidden bg-[#f97316] flex flex-col">

      {/* Orange top section */}
      <div className="relative flex-shrink-0 h-36 md:h-44">
        {/* Desktop left panel style */}
        <div className="hidden md:block absolute inset-0 bg-[#f97316]">
          <div className="absolute top-8 left-12 z-10">
            <h2 className="text-3xl font-extrabold text-white leading-tight">Secure your<br/>account.</h2>
            <p className="text-white/80 text-xs mt-1">Reset in seconds.</p>
            <div className="w-10 h-[3px] bg-[#1e3a8a] mt-3 rounded-full"/>
          </div>
        </div>

        {/* Chef image */}
        <img src={chefImage} alt="Chef"
          className="absolute right-0 top-0 w-[65%] md:w-[40%] h-full object-cover"
          style={{ objectPosition: '60% 40%', clipPath: 'ellipse(80% 68% at 93% 68%)' }}/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#f97316]/80 to-transparent"
          style={{ clipPath: 'ellipse(80% 68% at 93% 68%)' }}/>

        {/* Mobile text */}
        <div className="md:hidden absolute bottom-4 left-4 z-10">
          <p className="text-lg font-extrabold text-white leading-tight">Secure your<br/>account.</p>
          <p className="text-[#1e3a8a] font-black text-sm mt-0.5">Reset in seconds.</p>
          <div className="w-6 h-[2px] bg-[#1e3a8a] mt-1 rounded-full"/>
        </div>
      </div>

      {/* Logo overlap */}
      <div className="relative z-20 flex justify-center flex-shrink-0 pointer-events-none" style={{marginTop:'-44px'}}>
        <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center pointer-events-none">
          <img src={centerLogo} alt="RMS" className="w-full h-full object-contain p-1"/>
        </div>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-[28px] -mt-10 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{scrollbarWidth:'none'}}>

          {/* Brand */}
          <div className="text-center pt-10 pb-3">
            <p className="text-[10px] text-[#f97316] font-semibold tracking-[0.18em] uppercase">Welcome to</p>
            <div className="flex items-end justify-center">
              <span className="text-[34px] font-black text-[#f97316] leading-none">R</span>
              <span className="text-[34px] font-black text-[#1e3a8a] leading-none">MS</span>
            </div>
            <p className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-0.5">Restaurant Management System</p>
            <div className="flex justify-center gap-1.5 mt-1.5">
              <div className="h-[2px] w-7 bg-[#1e3a8a] rounded-full"/>
              <div className="h-[2px] w-7 bg-[#f97316] rounded-full"/>
            </div>
          </div>

          {step === 'request' && <RequestStep onBack={handleBackToLogin}/>}
          {step === 'reset'   && <ResetStep token={token} userId={userId} onSuccess={handleResetSuccess}/>}
          {step === 'success' && <SuccessStep user={resetUser} onContinue={handleContinue}/>}
          {step === 'expired' && <ExpiredStep onBack={handleBackToRequest}/>}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
