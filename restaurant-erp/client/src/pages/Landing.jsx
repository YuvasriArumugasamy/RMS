import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import rmsLogo from '../assets/ChatGPT Image Jul 2, 2026, 02_19_30 PM.png';

const Landing = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#FF7518', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* ===== INLINE STYLES FOR ANIMATIONS ===== */}
      <style>{`
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbitSpinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 20px 5px rgba(255,255,255,0.15); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.3); }
        }
        .orbit-ring-1 {
          animation: orbitSpin 18s linear infinite;
        }
        .orbit-ring-2 {
          animation: orbitSpinReverse 22s linear infinite;
        }
        .float-logo {
          animation: floatLogo 4s ease-in-out infinite;
        }
        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .fade-in-scale {
          animation: fadeInScale 0.6s ease-out forwards;
        }
        .login-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }
        .login-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-icon:hover {
          transform: scale(1.15);
          background: rgba(255,255,255,0.35);
        }
        .feature-icon {
          transition: all 0.3s ease;
        }
        .orbit-dot {
          animation: dotPulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* ===== BACKGROUND DECORATIONS ===== */}

      {/* Top-right decorative curves */}
      <div className="absolute top-8 right-0 w-[40%] h-[15%] opacity-15 pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 300 60" fill="none" preserveAspectRatio="none">
          <path d="M0,30 Q75,50 150,30 T300,30" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5"/>
          <path d="M0,40 Q75,20 150,40 T300,40" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5"/>
          <path d="M0,20 Q75,40 150,20 T300,20" stroke="white" strokeWidth="0.5" fill="none" opacity="0.3"/>
        </svg>
      </div>

      {/* Top-right dot grid removed */}

      {/* Bottom-right dot grid */}
      <div className="absolute bottom-[18%] right-6 sm:right-10 opacity-25 pointer-events-none">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {[...Array(16)].map((_, i) => (
            <div key={`br-${i}`} style={{ width: 5, height: 5, borderRadius: '50%', background: 'white' }}></div>
          ))}
        </div>
      </div>

      {/* Left side dots (vertical) */}
      <div className="absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 opacity-25 pointer-events-none flex flex-col gap-3">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }}></div>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }}></div>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }}></div>
      </div>

      {/* Large faint chef hat - top left */}
      <div className="absolute pointer-events-none" style={{ top: '5%', left: '2%', opacity: 0.08 }}>
        <svg width="clamp(150px, 20vw, 280px)" height="clamp(150px, 20vw, 280px)" viewBox="0 0 100 120" fill="white">
          {/* Chef hat */}
          <ellipse cx="50" cy="30" rx="30" ry="25" />
          <ellipse cx="25" cy="35" rx="18" ry="16" />
          <ellipse cx="75" cy="35" rx="18" ry="16" />
          <rect x="25" y="40" width="50" height="35" rx="2" />
          {/* Fork */}
          <line x1="38" y1="85" x2="38" y2="115" stroke="white" strokeWidth="3" />
          <line x1="32" y1="85" x2="32" y2="100" stroke="white" strokeWidth="2" />
          <line x1="38" y1="85" x2="38" y2="100" stroke="white" strokeWidth="2" />
          <line x1="44" y1="85" x2="44" y2="100" stroke="white" strokeWidth="2" />
          {/* Spoon */}
          <line x1="62" y1="90" x2="62" y2="115" stroke="white" strokeWidth="3" />
          <ellipse cx="62" cy="85" rx="6" ry="8" fill="white" />
        </svg>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4">
        
        {/* Center area: Orbits + Logo Image */}
        <div className="relative flex items-center justify-center" style={{ width: 'clamp(300px, 50vmin, 460px)', height: 'clamp(300px, 50vmin, 460px)', marginBottom: 'clamp(20px, 4vh, 50px)', marginTop: '-3vh' }}>
          
          {/* Orbit Ring 1 - White/Gray semicircle arc */}
          <div 
            className="orbit-ring-1 absolute"
            style={{
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            }}
          >
            {/* White dot on orbit - positioned at bottom-left of this ring */}
            <div className="orbit-dot" style={{
              position: 'absolute',
              bottom: '12%',
              left: '5%',
              width: 'clamp(10px, 1.5vmin, 16px)',
              height: 'clamp(10px, 1.5vmin, 16px)',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 0 12px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.4)',
            }}></div>
          </div>

          {/* Orbit Ring 2 - Blue arc (opposite half) */}
          <div
            className="orbit-ring-2 absolute"
            style={{
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              borderRadius: '50%',
              border: '2.5px solid transparent',
              borderTopColor: '#1E3A8A',
              borderRightColor: '#1E3A8A',
            }}
          >
            {/* Blue dot on orbit - exactly on ring border top-right */}
            <div className="orbit-dot" style={{
              position: 'absolute',
              top: '14.6%',
              right: '14.6%',
              width: 'clamp(14px, 2vmin, 22px)',
              height: 'clamp(14px, 2vmin, 22px)',
              borderRadius: '50%',
              background: '#1E3A8A',
              boxShadow: '0 0 15px rgba(30,58,138,0.8), 0 0 30px rgba(30,58,138,0.4)',
              transform: 'translate(50%, -50%)',
            }}></div>
          </div>

          {/* Logo Image - floating inside the orbit rings */}
          <div 
            className="float-logo relative"
            style={{
              width: 'clamp(180px, 32vmin, 300px)',
              height: 'clamp(180px, 32vmin, 300px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.6s ease',
              filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.18))',
            }}
          >
            <img 
              src={rmsLogo} 
              alt="RMS - Restaurant Management System Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                clipPath: 'polygon(50% 1.5%, 98.5% 25%, 98.5% 75%, 50% 98.5%, 1.5% 75%, 1.5% 25%)',
              }}
            />
          </div>
        </div>

        {/* LOGIN Button */}
        <div 
          className={`login-btn cursor-pointer ${mounted ? 'fade-in-up' : ''}`}
          onClick={() => navigate('/login')}
          style={{ 
            animationDelay: '0.3s',
            opacity: mounted ? undefined : 0,
            display: 'flex',
            alignItems: 'center',
            background: 'white',
            borderRadius: '50px',
            padding: 'clamp(4px, 0.6vmin, 8px)',
            paddingRight: 'clamp(20px, 3vmin, 36px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            marginBottom: 'clamp(20px, 4vh, 50px)',
          }}
        >
          {/* Blue hexagon icon */}
          <div style={{
            width: 'clamp(42px, 6vmin, 56px)',
            height: 'clamp(42px, 6vmin, 56px)',
            background: '#0F286B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          }}>
            <svg width="clamp(18px, 2.5vmin, 24px)" height="clamp(18px, 2.5vmin, 24px)" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
          </div>
          
          {/* Divider */}
          <div style={{ width: 1, height: 'clamp(24px, 3.5vmin, 36px)', background: '#D1D5DB', margin: '0 clamp(14px, 2vmin, 28px)' }}></div>
          
          {/* LOGIN text */}
          <span style={{ 
            color: '#0F286B', 
            fontWeight: 800, 
            fontSize: 'clamp(16px, 2.5vmin, 24px)', 
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginRight: 'clamp(10px, 2vmin, 24px)',
          }}>
            LOGIN
          </span>
          
          {/* Arrow */}
          <span style={{ color: '#F97316', fontWeight: 900, fontSize: 'clamp(18px, 2.8vmin, 28px)' }}>&gt;</span>
        </div>

        {/* Bottom Features */}
        <div 
          className={mounted ? 'fade-in-up' : ''}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'clamp(16px, 4vw, 60px)',
            animationDelay: '0.5s',
            opacity: mounted ? undefined : 0,
          }}
        >
          {/* Manage Smarter */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="feature-icon" style={{
              width: 'clamp(36px, 5vmin, 52px)',
              height: 'clamp(36px, 5vmin, 52px)',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'clamp(4px, 0.8vmin, 10px)',
              cursor: 'pointer',
            }}>
              <svg width="clamp(16px, 2.5vmin, 24px)" height="clamp(16px, 2.5vmin, 24px)" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* Cloche / dish cover */}
                <path d="M2 18h20M4 18c0-6 4-12 8-12s8 6 8 12"/>
                <circle cx="12" cy="5" r="1" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: 'clamp(8px, 1.2vmin, 12px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.9)' }}>Manage</span>
            <span style={{ fontSize: 'clamp(8px, 1.2vmin, 12px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#0F286B' }}>Smarter</span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 'clamp(30px, 5vmin, 50px)', background: 'rgba(255,255,255,0.3)' }}></div>

          {/* Serve Better */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="feature-icon" style={{
              width: 'clamp(36px, 5vmin, 52px)',
              height: 'clamp(36px, 5vmin, 52px)',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'clamp(4px, 0.8vmin, 10px)',
              cursor: 'pointer',
            }}>
              <svg width="clamp(16px, 2.5vmin, 24px)" height="clamp(16px, 2.5vmin, 24px)" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* Fork & knife */}
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                <path d="M7 2v20"/>
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
              </svg>
            </div>
            <span style={{ fontSize: 'clamp(8px, 1.2vmin, 12px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.9)' }}>Serve</span>
            <span style={{ fontSize: 'clamp(8px, 1.2vmin, 12px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#0F286B' }}>Better</span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 'clamp(30px, 5vmin, 50px)', background: 'rgba(255,255,255,0.3)' }}></div>

          {/* Grow Faster */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="feature-icon" style={{
              width: 'clamp(36px, 5vmin, 52px)',
              height: 'clamp(36px, 5vmin, 52px)',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'clamp(4px, 0.8vmin, 10px)',
              cursor: 'pointer',
            }}>
              <svg width="clamp(16px, 2.5vmin, 24px)" height="clamp(16px, 2.5vmin, 24px)" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* Bar chart / growth */}
                <rect x="3" y="12" width="4" height="9" rx="1"/>
                <rect x="10" y="8" width="4" height="13" rx="1"/>
                <rect x="17" y="3" width="4" height="18" rx="1"/>
              </svg>
            </div>
            <span style={{ fontSize: 'clamp(8px, 1.2vmin, 12px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.9)' }}>Grow</span>
            <span style={{ fontSize: 'clamp(8px, 1.2vmin, 12px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#0F286B' }}>Faster</span>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM WAVE ===== */}
      <div className="absolute bottom-0 left-0 w-full pointer-events-none" style={{ zIndex: 5 }}>
        <svg viewBox="0 0 1440 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" style={{ height: 'clamp(60px, 10vh, 130px)' }} preserveAspectRatio="none">
          <path d="M0 65L60 58C120 51 240 37 360 32C480 27 600 30 720 42C840 54 960 74 1080 78C1200 82 1320 70 1380 64L1440 58V130H0V65Z" fill="#1E3A8A"/>
          <path d="M0 85L60 80C120 75 240 65 360 68C480 71 600 87 720 92C840 97 960 91 1080 82C1200 73 1320 63 1380 58L1440 53V130H0V85Z" fill="rgba(255,255,255,0.08)"/>
        </svg>
      </div>
    </div>
  );
};

export default Landing;
