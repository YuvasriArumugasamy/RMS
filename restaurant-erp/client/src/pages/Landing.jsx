import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import rmsLogo from '../assets/ChatGPT Image Jul 2, 2026, 02_19_30 PM.png';

const Landing = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  return (
    <div 
      className="fixed inset-0 overflow-hidden flex flex-col justify-between select-none" 
      style={{ 
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', 
        fontFamily: "'Plus Jakarta Sans', sans-serif" 
      }}
    >
      
      {/* ===== PREMIUM STYLES & INTERACTIVE MICRO-ANIMATIONS ===== */}
      <style>{`
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbitSpinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes auroraGlow1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.2); }
        }
        @keyframes auroraGlow2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .aurora-blob-1 {
          animation: auroraGlow1 12s ease-in-out infinite alternate;
        }
        .aurora-blob-2 {
          animation: auroraGlow2 15s ease-in-out infinite alternate;
        }
        .orbit-ring-1 {
          animation: orbitSpin 25s linear infinite;
        }
        .orbit-ring-2 {
          animation: orbitSpinReverse 30s linear infinite;
        }
        .float-logo {
          animation: floatLogo 5s ease-in-out infinite;
        }
        .fade-in-up {
          animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .fade-in-scale {
          animation: fadeInScale 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1);
        }
        .interactive-btn {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .interactive-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 20px 40px rgba(249, 115, 22, 0.25);
          background: #FFFFFF !important;
        }
        .interactive-btn:hover .arrow-icon {
          transform: translateX(4px);
        }
        .feature-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(249, 115, 22, 0.3);
        }
        .feature-card:hover .feat-circle {
          background: rgba(249, 115, 22, 0.2);
          color: #F97316;
          border-color: rgba(249, 115, 22, 0.4);
        }
      `}</style>

      {/* ===== AURORA BACKDROP GLOWS ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Blob 1: Orange/Coral glow in top-center */}
        <div 
          className="aurora-blob-1 absolute rounded-full filter blur-[100px] opacity-[0.35]"
          style={{
            top: '5%',
            left: '25%',
            width: 'clamp(280px, 45vw, 600px)',
            height: 'clamp(280px, 45vw, 600px)',
            background: 'radial-gradient(circle, #F97316 0%, #EA580C 100%)',
          }}
        />
        
        {/* Blob 2: Deep Blue/Indigo glow in bottom-right */}
        <div 
          className="aurora-blob-2 absolute rounded-full filter blur-[120px] opacity-[0.25]"
          style={{
            bottom: '10%',
            right: '10%',
            width: 'clamp(300px, 50vw, 700px)',
            height: 'clamp(300px, 50vw, 700px)',
            background: 'radial-gradient(circle, #3B82F6 0%, #1D4ED8 100%)',
          }}
        />

        {/* Ambient warmth helper */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(15, 23, 42, 0.8) 100%)'
          }}
        />
      </div>

      {/* ===== BACKGROUND DECORATIONS ===== */}
      {/* Top Curves */}
      <div className="absolute top-0 left-0 w-full h-[25vh] opacity-10 pointer-events-none overflow-hidden z-1">
        <svg width="100%" height="100%" viewBox="0 0 1440 200" fill="none" preserveAspectRatio="none">
          <path d="M0,80 C360,180 720,20 1080,120 C1260,170 1380,150 1440,120 V0 H0 Z" fill="rgba(255,255,255,0.05)" />
          <path d="M0,100 C480,40 960,160 1440,60" stroke="white" strokeWidth="1" opacity="0.3" />
        </svg>
      </div>

      {/* Decorative dot matrix grid */}
      <div className="absolute bottom-[20%] right-8 opacity-[0.08] pointer-events-none z-1 hidden sm:block">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {[...Array(25)].map((_, i) => (
            <div key={`br-${i}`} style={{ width: 4, height: 4, borderRadius: '50%', background: 'white' }}></div>
          ))}
        </div>
      </div>

      {/* Chef hat silhouette - Top Left */}
      <div className="absolute pointer-events-none z-1" style={{ top: '6%', left: '4%', opacity: 0.03 }}>
        <svg width="220" height="220" viewBox="0 0 100 120" fill="white">
          <path d="M50 10C35 10 20 22 20 38C20 44 23 50 28 54C22 58 18 66 18 74C18 84 26 92 36 92H64C74 92 82 84 82 74C82 66 78 58 72 54C77 50 80 44 80 38C80 22 65 10 50 10Z" />
          <rect x="28" y="94" width="44" height="8" rx="2" />
        </svg>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4">
        
        {/* Glassmorphic Central Card */}
        <div 
          className={`glass-panel rounded-[3.2rem] flex flex-col items-center justify-center p-8 sm:p-12 text-center w-full max-w-lg ${mounted ? 'fade-in-scale' : 'opacity-0'}`}
          style={{ 
            transition: 'all 0.6s ease'
          }}
        >
          {/* Logo Orbit Area */}
          <div 
            className="relative flex items-center justify-center mb-8" 
            style={{ 
              width: 'clamp(220px, 35vmin, 290px)', 
              height: 'clamp(220px, 35vmin, 290px)' 
            }}
          >
            {/* Outer Orbit Ring */}
            <div 
              className="orbit-ring-1 absolute"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRightColor: 'rgba(249, 115, 22, 0.4)',
                borderLeftColor: 'rgba(249, 115, 22, 0.4)',
              }}
            >
              {/* Glowing Dot on Outer Ring */}
              <div 
                style={{
                  position: 'absolute',
                  top: '12%',
                  left: '12%',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#F97316',
                  boxShadow: '0 0 15px #F97316, 0 0 30px #F97316',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>

            {/* Inner Orbit Ring (Spinning Counter-Clockwise) */}
            <div
              className="orbit-ring-2 absolute"
              style={{
                width: '82%',
                height: '82%',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.06)',
                borderTopColor: 'rgba(59, 130, 246, 0.4)',
                borderBottomColor: 'rgba(59, 130, 246, 0.4)',
              }}
            >
              {/* Glowing Dot on Inner Ring */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: '10%',
                  right: '10%',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#3B82F6',
                  boxShadow: '0 0 12px #3B82F6, 0 0 24px #3B82F6',
                  transform: 'translate(50%, 50%)',
                }}
              />
            </div>

            {/* Logo Image in Center */}
            <div 
              className="float-logo relative flex items-center justify-center"
              style={{
                width: '64%',
                height: '64%',
                filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.35))',
              }}
            >
              <img 
                src={rmsLogo} 
                alt="RMS Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                }}
              />
            </div>
          </div>

          {/* Subtitle / App Tagline */}
          <div className="mb-8">
            <h1 className="text-white text-xl sm:text-2xl font-black tracking-tight mb-1">
              RESTAURANT MANAGEMENT SYSTEM
            </h1>
            <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">
              Smart ERP Solutions for Gastronomy
            </p>
          </div>

          {/* Premium LOGIN Button */}
          <button 
            className="interactive-btn w-full py-4.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl text-sm shadow-lg shadow-orange-500/25 transition-all duration-300 active:scale-[0.98] flex items-center justify-between px-7 cursor-pointer uppercase tracking-widest border border-orange-400/20 group mb-10"
            onClick={() => navigate('/login')}
          >
            <div className="flex items-center gap-3">
              <span className="text-base select-none">🔑</span>
              <span>Access Dashboard</span>
            </div>
            <span className="arrow-icon w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-black shadow-sm transform transition-transform duration-300">➔</span>
          </button>

          {/* Horizontal Divider */}
          <div className="w-full h-px bg-white/10 mb-8" />

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {/* Manage Smarter */}
            <div className="feature-card bg-white/2 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="feat-circle w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-2 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 18h20M4 18c0-6 4-12 8-12s8 6 8 12"/>
                  <circle cx="12" cy="5" r="1"/>
                </svg>
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Manage</span>
              <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Smarter</span>
            </div>

            {/* Serve Better */}
            <div className="feature-card bg-white/2 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="feat-circle w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-2 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                  <path d="M7 2v20"/>
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
                </svg>
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Serve</span>
              <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Better</span>
            </div>

            {/* Grow Faster */}
            <div className="feature-card bg-white/2 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="feat-circle w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-2 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="12" width="4" height="9" rx="1"/>
                  <rect x="10" y="8" width="4" height="13" rx="1"/>
                  <rect x="17" y="3" width="4" height="18" rx="1"/>
                </svg>
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Grow</span>
              <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Faster</span>
            </div>
          </div>

        </div>
      </div>

      {/* ===== BOTTOM CURVED footer wave background ===== */}
      <div className="absolute bottom-0 left-0 w-full pointer-events-none z-5">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block h-12 sm:h-20" preserveAspectRatio="none">
          <path d="M0,50 C360,95 720,5 1080,75 C1260,90 1380,80 1440,70 V100 H0 Z" fill="#0A0C16"/>
        </svg>
      </div>

    </div>
  );
};

export default Landing;
