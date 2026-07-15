import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import chefImage  from '../assets/ChatGPT Image Jul 2, 2026, 12_34_37 PM.png';
import centerLogo from '../assets/Screenshot 2026-07-02 173735.png';

const ROLES = ['Admin','Manager','Chef','Waiter','Cashier'];

const IconEmail = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>);
const IconLock = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
const IconEyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>);
const IconEye = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>);
const IconArrow = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>);
const IconBack = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>);

/* â”€â”€ QR Code SVG â”€â”€ */
const QRCodeSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="60" height="60" fill="none" stroke="black" strokeWidth="8"/>
    <rect x="24" y="24" width="32" height="32" fill="black"/>
    <rect x="130" y="10" width="60" height="60" fill="none" stroke="black" strokeWidth="8"/>
    <rect x="144" y="24" width="32" height="32" fill="black"/>
    <rect x="10" y="130" width="60" height="60" fill="none" stroke="black" strokeWidth="8"/>
    <rect x="24" y="144" width="32" height="32" fill="black"/>
    <rect x="80" y="10" width="8" height="8" fill="black"/><rect x="96" y="10" width="8" height="8" fill="black"/>
    <rect x="112" y="10" width="8" height="8" fill="black"/><rect x="80" y="26" width="8" height="8" fill="black"/>
    <rect x="112" y="26" width="8" height="8" fill="black"/><rect x="88" y="42" width="8" height="8" fill="black"/>
    <rect x="104" y="42" width="8" height="8" fill="black"/><rect x="80" y="58" width="8" height="8" fill="black"/>
    <rect x="10" y="80" width="8" height="8" fill="black"/><rect x="42" y="80" width="8" height="8" fill="black"/>
    <rect x="80" y="80" width="8" height="8" fill="black"/><rect x="96" y="80" width="8" height="8" fill="black"/>
    <rect x="128" y="80" width="8" height="8" fill="black"/><rect x="160" y="80" width="8" height="8" fill="black"/>
    <rect x="176" y="80" width="8" height="8" fill="black"/><rect x="10" y="96" width="8" height="8" fill="black"/>
    <rect x="80" y="96" width="8" height="8" fill="black"/><rect x="128" y="96" width="8" height="8" fill="black"/>
    <rect x="80" y="128" width="8" height="8" fill="black"/><rect x="128" y="128" width="8" height="8" fill="black"/>
    <rect x="160" y="128" width="8" height="8" fill="black"/><rect x="80" y="144" width="8" height="8" fill="black"/>
    <rect x="112" y="144" width="8" height="8" fill="black"/><rect x="144" y="144" width="8" height="8" fill="black"/>
    <rect x="80" y="160" width="8" height="8" fill="black"/><rect x="96" y="160" width="8" height="8" fill="black"/>
    <rect x="128" y="160" width="8" height="8" fill="black"/><rect x="80" y="176" width="8" height="8" fill="black"/>
    <rect x="112" y="176" width="8" height="8" fill="black"/><rect x="160" y="176" width="8" height="8" fill="black"/>
  </svg>
);

/* â”€â”€ Staff ID View Content â”€â”€ */
const StaffIDViewContent = ({ onBack, altLogin }) => {
  const [staffId, setStaffId] = useState('');
  const [pw, setPw]           = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [remember, setRemember] = useState(true);

  const handleLogin = (e) => {
    e.preventDefault();
    if (staffId) altLogin('StaffID-' + staffId);
  };

  return (
    <div className="flex flex-col items-center px-8 pt-6 pb-6 h-full overflow-y-auto" style={{scrollbarWidth:'none'}}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm mb-5 hover:text-gray-900 transition self-start">
        <IconBack/> Back
      </button>
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Staff ID Login</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Enter your Staff ID and password to continue</p>

      <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Staff ID</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconLock/></span>
            <input type="text" value={staffId} onChange={e=>setStaffId(e.target.value)} placeholder="Enter your Staff ID"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400 shadow-sm transition"/>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Password</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconLock/></span>
            <input type={showPw?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Enter your password"
              className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400 shadow-sm transition tracking-widest"/>
            <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPw?<IconEyeOff/>:<IconEye/>}</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="w-3.5 h-3.5 rounded accent-orange-500"/>
            <span className="text-[11px] font-semibold text-gray-600">Remember me</span>
          </label>
          <a href="/forgot-password" className="text-[11px] font-bold text-[#f97316]">Forgot password?</a>
        </div>
        <button type="submit" className="w-full py-3 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-full flex items-center justify-center gap-2 text-sm shadow-lg transition-all">
          Sign In <IconArrow/>
        </button>
      </form>

      {/* OR + alt buttons with Staff ID active */}
      <div className="flex items-center w-full gap-3 mt-5 mb-4">
        <div className="flex-1 h-px bg-gray-200"/>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
        <div className="flex-1 h-px bg-gray-200"/>
      </div>
      <div className="grid grid-cols-4 gap-2 w-full">
        {[
          { l:'QR Login',  v:'qr',      ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { l:'Staff ID',  v:'staffid', ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
          { l:'Face ID',   v:null,      ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg> },
          { l:'Offline',   v:null,      ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M1 12s4-2 11-2 11 2 11 2"/><line x1="2" y1="2" x2="22" y2="22"/></svg> },
        ].map(({l,v,ic})=>(
          <button key={l} type="button" onClick={()=> v ? onBack(v) : null}
            className={`flex flex-col items-center justify-center py-2.5 border rounded-2xl transition-all gap-1.5 ${v==='staffid'?'border-orange-300 bg-orange-50':'border-gray-200 hover:border-orange-400'}`}>
            <span className={v==='staffid'?'text-[#f97316]':'text-[#1e3a8a]'}>{ic}</span>
            <span className={`text-[9px] font-bold ${v==='staffid'?'text-[#f97316]':'text-gray-600'}`}>{l}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Having trouble? <a href="#" className="text-[#f97316] font-bold">Contact admin</a>
      </p>
    </div>
  );
};

/* â”€â”€ Offline View Content â”€â”€ */

const HelpViewContent = ({ onBack, onTicket }) => (
  <div className="flex flex-col items-center px-8 pt-6 pb-6 h-full overflow-y-auto" style={{scrollbarWidth:'none'}}>
    <button onClick={onBack} className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm mb-5 self-start hover:text-gray-900 transition">
      <IconBack/> Back to Login
    </button>
    <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Need Help?</h2>
    <p className="text-sm text-gray-500 text-center mb-6">Choose how you want to contact the administrator</p>
    <div className="grid grid-cols-2 gap-3 w-full mb-5">
      {[
        { label:'Email Admin', sub:'Send an email to the administrator.', color:'bg-orange-50', iconColor:'text-[#f97316]',
          icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
          action:()=>window.open('mailto:admin@restaurant.com','_blank') },
        { label:'WhatsApp', sub:'Chat with admin on WhatsApp.', color:'bg-green-50', iconColor:'text-green-500',
          icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.122 1.528 5.855L0 24l6.335-1.509A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.367l-.36-.214-3.724.977.993-3.641-.234-.374A9.818 9.818 0 1 1 12 21.818z"/></svg>,
          action:()=>window.open('https://wa.me/919999999999','_blank') },
        { label:'Call Admin', sub:'Call the administrator directly.', color:'bg-blue-50', iconColor:'text-blue-500',
          icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
          action:()=>window.open('tel:+919999999999') },
        { label:'Raise a Ticket', sub:'Create a support ticket.', color:'bg-purple-50', iconColor:'text-purple-500',
          icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>,
          action: onTicket },
      ].map(({label,sub,color,iconColor,icon,action})=>(
        <button key={label} type="button" onClick={action}
          className={`${color} rounded-2xl p-4 flex flex-col items-start gap-2 text-left hover:shadow-sm transition-all border border-transparent hover:border-gray-200`}>
          <span className={iconColor}>{icon}</span>
          <div>
            <p className="text-sm font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{sub}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={iconColor}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      ))}
    </div>
    <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-3">
      <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-blue-500 text-[9px] font-black">i</span>
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-700">Support Availability</p>
        <p className="text-[10px] text-gray-500 mt-0.5">Available on all working days from 09:00 AM to 06:00 PM.</p>
      </div>
    </div>
  </div>
);

const TicketViewContent = ({ onBack, onSuccess }) => {
  const [form, setForm] = useState({ name:'', email:'', category:'', desc:'' });
  const cats = ['Login Issue','Password Reset','Access Problem','Feature Request','Bug Report','Other'];
  const handleSubmit = (e) => { e.preventDefault(); if(form.name&&form.email&&form.category&&form.desc) onSuccess(); };
  return (
    <div className="flex flex-col px-7 pt-5 pb-6 h-full overflow-y-auto" style={{scrollbarWidth:'none'}}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm mb-4 self-start hover:text-gray-900 transition"><IconBack/> Back to Login</button>
      <div className="text-center mb-4">
        <div className="flex justify-center mb-2"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg></div>
        <h2 className="text-xl font-bold text-gray-900">Support Ticket</h2>
        <p className="text-sm text-gray-500 mt-1">Submit your issue. Our team will get back to you.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Full Name</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></span>
            <input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Enter your full name"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400"/>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Email Address</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconEmail/></span>
            <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Enter your email address"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-full text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400"/>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Issue Category</p>
          <div className="relative">
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 focus:outline-none focus:border-orange-400 appearance-none bg-white">
              <option value="">Select issue category</option>
              {cats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Description</p>
          <textarea value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="Describe your issue in detail..."
            rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm placeholder:text-gray-300 focus:outline-none focus:border-orange-400 resize-none"/>
        </div>
        <button type="submit" className="w-full py-3 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-full flex items-center justify-center gap-2 text-sm shadow-lg transition-all mt-1">
          Submit Ticket <IconArrow/>
        </button>
      </form>
      <p className="mt-3 text-[10px] text-gray-400 text-center">You will receive updates on your email.</p>
    </div>
  );
};

const TicketSuccessContent = ({ onBack }) => {
  const ticketId = 'TKT-2026-' + String(Math.floor(Math.random()*900)+100).padStart(3,'0');
  return (
    <div className="flex flex-col items-center justify-center px-8 h-full gap-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Ticket Submitted!</h2>
      <p className="text-sm text-gray-500 text-center leading-relaxed">Your support ticket has been submitted. Our team will get back to you shortly.</p>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-8 py-3 text-center">
        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-1">Ticket ID</p>
        <p className="text-lg font-black text-[#f97316]">{ticketId}</p>
      </div>
      <button onClick={onBack} className="w-full py-3 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-full flex items-center justify-center gap-2 text-sm shadow-lg transition-all">
        <IconBack/> Back to Login
      </button>
    </div>
  );
};

const OfflineViewContent = ({ onBack, altLogin }) => {
  const [selected, setSelected] = useState(0);
  const accounts = [
    { initials:'AD', name:'Admin (ADM001)',  last:'Last login: 02 Aug 2025, 06:45 PM', role:'Admin' },
    { initials:'CH', name:'Chef (CHF001)',   last:'Last login: 02 Aug 2025, 05:30 PM', role:'Chef' },
    { initials:'WT', name:'Waiter (WTR001)', last:'Last login: 02 Aug 2025, 04:15 PM', role:'Waiter' },
  ];
  return (
    <div className="flex flex-col items-center px-8 pt-6 pb-6 h-full overflow-y-auto" style={{scrollbarWidth:'none'}}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm mb-4 hover:text-gray-900 transition self-start">
        <IconBack/> Back
      </button>
      {/* Icon */}
      <div className="mb-2">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M1 12s4-2 11-2 11 2 11 2"/><line x1="2" y1="2" x2="22" y2="22"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Offline Login</h2>
      <p className="text-sm text-gray-500 text-center mb-4 leading-relaxed">Login using previously used account.<br/>You are currently offline.</p>
      {/* Info box */}
      <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-3 mb-5">
        <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-blue-400 text-[9px] font-black leading-none">i</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">You are offline. Some features may be limited. Data will be synced when you are back online.</p>
      </div>
      {/* Recently used accounts */}
      <div className="w-full mb-5">
        <p className="text-[12px] font-bold text-gray-800 mb-2.5">Recently Used Accounts</p>
        <div className="flex flex-col gap-2">
          {accounts.map((acc, i) => (
            <button key={i} type="button" onClick={()=>setSelected(i)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selected===i?'border-orange-300 bg-orange-50':'border-gray-200 bg-white hover:border-orange-200'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected===i?'bg-[#1e3a8a] text-white':'bg-gray-200 text-gray-600'}`}>
                {acc.initials}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">{acc.name}</p>
                <p className="text-[10px] text-gray-400">{acc.last}</p>
              </div>
              {selected===i && (
                <div className="w-5 h-5 rounded-full bg-[#f97316] flex items-center justify-center flex-shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* Continue Offline */}
      <button type="button" onClick={()=>altLogin(accounts[selected].role)}
        className="w-full py-3 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-full flex items-center justify-center gap-2 text-sm shadow-lg transition-all mb-4">
        Continue Offline <IconArrow/>
      </button>
      {/* OR + alt buttons */}
      <div className="flex items-center w-full gap-3 mb-3">
        <div className="flex-1 h-px bg-gray-200"/>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
        <div className="flex-1 h-px bg-gray-200"/>
      </div>
      <div className="grid grid-cols-4 gap-2 w-full">
        {[
          { l:'QR Login', v:'qr',      ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { l:'Staff ID', v:'staffid', ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
          { l:'Face ID',  v:'faceid',  ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg> },
          { l:'Offline',  v:'offline', ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M1 12s4-2 11-2 11 2 11 2"/><line x1="2" y1="2" x2="22" y2="22"/></svg> },
        ].map(({l,v,ic})=>(
          <button key={l} type="button" onClick={()=> v!=='offline' ? onBack(v) : null}
            className={`flex flex-col items-center justify-center py-2.5 border rounded-2xl transition-all gap-1.5 ${v==='offline'?'border-orange-300 bg-orange-50':'border-gray-200 hover:border-orange-400'}`}>
            <span className={v==='offline'?'text-[#f97316]':'text-[#1e3a8a]'}>{ic}</span>
/* ── Face ID View Content ── */
const FaceIDViewContent = ({ onBack }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('starting'); // 'starting'|'active'|'denied'|'unsupported'|'error'
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported'); return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStatus('active');
          setTimeout(() => setScanning(true), 800);
        }
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') setStatus('denied');
        else setStatus('error');
      }
    };
    startCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  return (
    <div className="flex flex-col items-center px-6 pt-5 pb-5 h-full overflow-y-auto" style={{scrollbarWidth:'none'}}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm mb-4 hover:text-gray-900 transition self-start">
        <IconBack/> Back
      </button>

      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
        <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
        <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <h2 className="text-xl font-bold text-gray-900 text-center mb-0.5">Face ID Login</h2>
      <p className="text-xs text-gray-500 text-center mb-4">
        {status === 'active' ? 'Position your face in the frame' : 'Starting camera...'}
      </p>

      {/* Camera / status area */}
      <div className="relative w-full rounded-2xl overflow-hidden mb-4" style={{background:'#0f172a', aspectRatio:'4/3', maxHeight:'220px'}}>
        {/* Live video */}
        <video ref={videoRef} autoPlay playsInline muted
          className={`w-full h-full object-cover ${status === 'active' ? 'opacity-100' : 'opacity-0'}`}
          style={{transform:'scaleX(-1)'}}/>

        {/* Loading */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin w-8 h-8 text-[#f97316]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-white/70 text-xs font-medium">Opening camera...</p>
          </div>
        )}

        {/* Denied */}
        {status === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-3xl">🚫</span>
            <p className="text-white font-bold text-sm">Camera Access Denied</p>
            <p className="text-white/60 text-xs leading-relaxed">Allow camera access in your browser settings and try again.</p>
          </div>
        )}

        {/* Unsupported */}
        {status === 'unsupported' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-3xl">📵</span>
            <p className="text-white font-bold text-sm">Camera Not Supported</p>
            <p className="text-white/60 text-xs">Your browser or device doesn't support camera access.</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-white font-bold text-sm">Camera Error</p>
            <p className="text-white/60 text-xs">Could not start the camera. Try another login method.</p>
          </div>
        )}

        {/* Corner brackets overlay when active */}
        {status === 'active' && (
          <>
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#f97316] rounded-tl-md"/>
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#f97316] rounded-tr-md"/>
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#f97316] rounded-bl-md"/>
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#f97316] rounded-br-md"/>
            {/* Scanning line */}
            {scanning && (
              <div className="absolute left-0 right-0 h-0.5 bg-[#f97316]/70"
                style={{animation: 'scanLine 2s ease-in-out infinite', top: '30%'}}/>
            )}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-[10px] text-white/70 font-semibold bg-black/30 px-2 py-0.5 rounded-full">
                🔍 Scanning...
              </span>
            </div>
          </>
        )}
      </div>

      {/* Info note for demo */}
      <div className="w-full bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-start gap-2 mb-4">
        <span className="text-[#f97316] text-sm mt-0.5">ℹ️</span>
        <p className="text-[10.5px] text-gray-600 leading-relaxed font-medium">
          Face ID is a demo feature. For actual authentication, use your <span className="font-bold text-gray-800">username & password</span>.
        </p>
      </div>

      {/* Cancel button */}
      <button onClick={onBack} className="w-full py-3 border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition mb-3">
        Cancel
      </button>

      {/* OR + alt buttons */}
      <div className="flex items-center w-full gap-3 mb-3">
        <div className="flex-1 h-px bg-gray-200"/>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
        <div className="flex-1 h-px bg-gray-200"/>
      </div>
      <div className="grid grid-cols-4 gap-2 w-full">
        {[
          { l:'QR Login', v:'qr',      ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { l:'Staff ID', v:'staffid', ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
          { l:'Face ID',  v:'faceid',  ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg> },
          { l:'Offline',  v:null,      ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M1 12s4-2 11-2 11 2 11 2"/><line x1="2" y1="2" x2="22" y2="22"/></svg> },
        ].map(({l,v,ic})=>(
          <button key={l} type="button" onClick={()=> v && v!=='faceid' ? onBack(v) : null}
            className={`flex flex-col items-center justify-center py-2.5 border rounded-2xl transition-all gap-1.5 ${v==='faceid'?'border-orange-300 bg-orange-50':'border-gray-200 hover:border-orange-400'}`}>
            <span className={v==='faceid'?'text-[#f97316]':'text-[#1e3a8a]'}>{ic}</span>
            <span className={`text-[9px] font-bold ${v==='faceid'?'text-[#f97316]':'text-gray-600'}`}>{l}</span>
          </button>
        ))}
      </div>
/* â”€â”€ QR View Content â”€â”€ */
const QRViewContent = ({ onBack }) => (
  <div className="flex flex-col items-center px-8 pt-6 pb-6 h-full overflow-y-auto" style={{scrollbarWidth:'none'}}>
    <button onClick={onBack} className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm mb-4 hover:text-gray-900 transition self-start">
      <IconBack/> Back
    </button>
    <h2 className="text-xl font-bold text-gray-900 text-center mb-1">QR Login</h2>
    <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
      Scan this QR code using your staff app<br/>to login instantly.
    </p>
    {/* QR with orange corners */}
    <div className="relative mb-6">
      <div className="absolute -top-2 -left-2 w-7 h-7 border-t-[3px] border-l-[3px] border-[#f97316] rounded-tl-md"/>
      <div className="absolute -top-2 -right-2 w-7 h-7 border-t-[3px] border-r-[3px] border-[#f97316] rounded-tr-md"/>
      <div className="absolute -bottom-2 -left-2 w-7 h-7 border-b-[3px] border-l-[3px] border-[#f97316] rounded-bl-md"/>
      <div className="absolute -bottom-2 -right-2 w-7 h-7 border-b-[3px] border-r-[3px] border-[#f97316] rounded-br-md"/>
      <div className="w-[180px] h-[180px] p-1 bg-white"><QRCodeSVG/></div>
    </div>
    {/* Info */}
    <div className="w-full bg-orange-50 border border-orange-100 rounded-2xl p-3.5 flex items-start gap-3 mb-5">
      <div className="w-5 h-5 rounded-full border-2 border-[#f97316] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[#f97316] text-[9px] font-black leading-none">i</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">
        Open your <span className="font-bold">RMS Staff App</span> and scan the QR code to login.
      </p>
    </div>
    {/* OR */}
    <div className="flex items-center w-full gap-3 mb-4">
      <div className="flex-1 h-px bg-gray-200"/>
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
      <div className="flex-1 h-px bg-gray-200"/>
    </div>
    <button onClick={onBack} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
      <IconBack/> Back to Employee Login
    </button>
  </div>
);

/* â”€â”€ Login Form Content â”€â”€ */
const LoginFormContent = ({ role, setRole, email, setEmail, password, setPassword, showPw, setShowPw, remember, setRemember, error, doLogin, altLogin, setView, loading }) => {
  const ALT = [
    { l:'QR Login',  m:'QR',      qr:true,  ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { l:'Staff ID',  m:'StaffID', qr:false, sid:true, ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { l:'Face ID',   m:'FaceID',  qr:false, sid:false, fid:true,  ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg> },
    { l:'Offline',   m:'Offline', qr:false, sid:false, fid:false, off:true, ic:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M1 12s4-2 11-2 11 2 11 2"/><line x1="2" y1="2" x2="22" y2="22"/></svg> },
  ];
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-10 md:pt-2 pb-3" style={{scrollbarWidth:'none',msOverflowStyle:'none'}}>
      {/* Brand */}
      <div className="text-center mb-3">
        <p className="text-[10px] text-[#f97316] font-semibold tracking-[0.18em] uppercase">Welcome to</p>
        <div className="flex items-end justify-center">
          <span className="text-[38px] font-black text-[#f97316] leading-none">R</span>
          <span className="text-[38px] font-black text-[#1e3a8a] leading-none">MS</span>
        </div>
        <p className="text-[8px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-0.5">Restaurant Management System</p>
        <div className="flex justify-center gap-1.5 mt-1.5">
          <div className="h-[2px] w-7 bg-[#1e3a8a] rounded-full"/>
          <div className="h-[2px] w-7 bg-[#f97316] rounded-full"/>
        </div>
      </div>
      {/* Role pills */}
      <div className="mb-2.5">
        <p className="text-[11px] font-bold text-gray-700 mb-1.5">Login as</p>
        <div className="flex gap-1.5">
          {ROLES.map(r=>(
            <button key={r} type="button" onClick={()=>setRole(r)}
              className={`flex-1 py-1.5 rounded-full text-[10px] font-bold border transition-all ${role===r?'bg-[#f97316] text-white border-[#f97316]':'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {error&&<div className="mb-2 p-2 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-semibold text-center flex items-center gap-2 justify-center">⚠️ {error}</div>}
      <form onSubmit={doLogin} className="flex flex-col gap-2.5">
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Username</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconEmail/></span>
            <input
              type="text"
              value={email}
              onChange={e => { setEmail(e.target.value); }}
              placeholder="admin"
              required
              className={`w-full pl-9 pr-4 py-2.5 border rounded-full text-sm placeholder:text-gray-300 focus:outline-none shadow-sm transition ${
                error && !email ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-orange-400'
              }`}
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-700 mb-1">Password</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconLock/></span>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              className={`w-full pl-9 pr-10 py-2.5 border rounded-full text-sm placeholder:text-gray-300 focus:outline-none shadow-sm transition tracking-widest ${
                error && !password ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-orange-400'
              }`}
            />
            <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPw?<IconEyeOff/>:<IconEye/>}</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="w-3.5 h-3.5 rounded accent-orange-500"/>
            <span className="text-[11px] font-semibold text-gray-600">Remember me</span>
          </label>
          <a href="/forgot-password" className="text-[11px] font-bold text-[#f97316]">Forgot password?</a>
        </div>
        <button type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#f97316] hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-full flex items-center justify-center gap-2 text-sm shadow-lg transition-all">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Signing in...
            </>
          ) : <>Sign In <IconArrow/></>}
        </button>
      </form>
      <div className="flex items-center w-full gap-3 my-2.5">
        <div className="flex-1 h-px bg-gray-200"/>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
        <div className="flex-1 h-px bg-gray-200"/>
      </div>
      <div className="grid grid-cols-4 gap-2 w-full">
        {ALT.map(({l,m,qr,sid,fid,off,ic})=>(
          <button key={m} type="button" onClick={()=> qr ? setView('qr') : sid ? setView('staffid') : fid ? setView('faceid') : off ? setView('offline') : altLogin(m)}
            className="flex flex-col items-center justify-center py-2.5 border border-gray-200 rounded-2xl hover:border-orange-400 transition-all group gap-1.5">
            <span className="text-[#1e3a8a] group-hover:scale-110 transition-transform">{ic}</span>
            <span className="text-[9px] font-bold text-gray-600 group-hover:text-orange-500">{l}</span>
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-gray-400 text-center">
        Having trouble? <button type="button" onClick={()=>setView('help')} className="text-[#f97316] font-bold hover:underline">Contact admin</button>
      </p>
    </div>
  );
};

const Login = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('Admin');
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error,    setError]    = useState('');
  const [view, setView] = useState('login'); // 'login'|'qr'|'staffid'|'faceid'|'offline'|'help'|'ticket'|'ticket-success'
  const { login } = useAuth();
  const navigate  = useNavigate();

  const doLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      toast.error('⚠️ Please enter email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.split('@')[0] || email, password);
      toast.success('✅ Welcome back! Redirecting...');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const altLogin = async (username) => {
    setLoading(true);
    try {
      await login(username.toLowerCase(), 'demo123');
      toast.success('✅ Logged in successfully!');
      navigate('/');
    } catch {
      const msg = 'Offline/Alt login not configured.';
      setError(msg);
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const formProps = { role, setRole, email, setEmail, password, setPassword, showPw, setShowPw, remember, setRemember, error, doLogin, altLogin, setView, loading };

  /* â”€â”€ Shared left panel â”€â”€ */
  const LeftPanel = () => (
    <div className="relative flex-1 overflow-hidden bg-[#1a0e06]">
      <img src={chefImage} alt="Chef" className="absolute inset-0 w-full h-full object-cover" style={{objectPosition:'65% 30%'}}/>
      <div className="absolute inset-0 bg-black/20"/>
      <svg className="absolute top-0 left-0 z-10 pointer-events-none" viewBox="0 0 520 480" style={{width:'52%',height:'65%'}} preserveAspectRatio="none">
        <path d="M0,0 L520,0 C520,0 460,60 410,150 C360,240 390,330 300,400 C230,455 110,475 0,480 Z" fill="#f97316"/>
      </svg>
      <div className="absolute top-10 left-10 z-20">
        <h1 className="text-2xl xl:text-3xl font-extrabold text-white leading-[1.25]">Cook Better.<br/>Serve Faster.<br/>Manage Smarter.</h1>
        <p className="text-white/85 text-xs font-medium mt-2 leading-relaxed">All in one solution for<br/>your restaurant.</p>
        <div className="w-10 h-[3px] bg-[#1e3a8a] mt-3 rounded-full"/>
      </div>
      <div className="absolute bottom-10 left-10 z-20 space-y-3">
        {[
          {bg:'bg-[#f97316]',label:'Manage smarter.',icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>},
          {bg:'bg-[#1e3a8a]',label:'Serve better.',icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>},
          {bg:'bg-[#1e3a8a]',label:'Grow faster.',icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
        ].map(({bg,icon,label})=>(
          <div key={label} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0 shadow-lg`}>{icon}</div>
            <span className="text-white font-bold text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden md:fixed md:inset-0 bg-[#f97316]">

      {/* â•â• DESKTOP â•â• */}
      <div className="hidden md:flex h-full w-full">
        <LeftPanel/>
        <div className="flex items-center justify-center bg-[#f97316] p-5 w-[46%] lg:w-[44%] xl:w-[42%]">
          <div className="w-full max-w-[410px] bg-white rounded-[26px] shadow-2xl flex flex-col overflow-hidden h-full max-h-[96vh]">
            {view === 'qr' ? (
              <QRViewContent onBack={()=>setView('login')}/>
            ) : view === 'staffid' ? (
              <StaffIDViewContent onBack={(v)=>setView(v||'login')} altLogin={altLogin}/>
            ) : view === 'faceid' ? (
              <FaceIDViewContent onBack={(v)=>setView(v||'login')}/>
            ) : view === 'offline' ? (
              <OfflineViewContent onBack={(v)=>setView(v||'login')} altLogin={altLogin}/>
            ) : view === 'help' ? (
              <HelpViewContent onBack={()=>setView('login')} onTicket={()=>setView('ticket')}/>
            ) : view === 'ticket' ? (
              <TicketViewContent onBack={()=>setView('login')} onSuccess={()=>setView('ticket-success')}/>
            ) : view === 'ticket-success' ? (
              <TicketSuccessContent onBack={()=>setView('login')}/>
            ) : (
              <>
                {/* Logo + waves */}
                <div className="flex flex-col items-center flex-shrink-0 pt-5">
                  <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center">
                    <img src={centerLogo} alt="RMS" className="w-full h-full object-contain p-1"/>
                  </div>
                  <div className="flex items-center gap-2 mt-1" style={{width:'180px'}}>
                    <svg viewBox="0 0 75 10" style={{flex:1,height:'10px'}} fill="none"><path d="M75,5 Q56,1 37,5 Q18,9 0,5" stroke="#f97316" strokeWidth="1.2" opacity="0.55"/></svg>
                    <svg viewBox="0 0 75 10" style={{flex:1,height:'10px'}} fill="none"><path d="M0,5 Q18,1 37,5 Q56,9 75,5" stroke="#f97316" strokeWidth="1.2" opacity="0.55"/></svg>
                  </div>
                </div>
                <LoginFormContent {...formProps}/>
                {/* Bottom wave */}
                <div className="h-10 flex-shrink-0 overflow-hidden rounded-b-[26px]">
                  <svg viewBox="0 0 410 40" preserveAspectRatio="none" className="w-full h-full block">
                    <path d="M0,16 Q102,0 205,16 T410,16 L410,40 L0,40 Z" fill="#f97316"/>
                    <path d="M0,26 Q102,10 205,26 T410,26 L410,40 L0,40 Z" fill="#1e3a8a"/>
                  </svg>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ MOBILE ══ */}
      <div className="md:hidden h-full flex flex-col w-full bg-[#f97316]">
        {/* Orange top */}
        <div className="relative flex-shrink-0 h-36">
          <img
            src={chefImage}
            alt="Chef"
            className="absolute right-0 top-0 w-[65%] h-full object-cover"
            style={{
              objectPosition: '60% 40%',
              clipPath: 'ellipse(80% 68% at 93% 68%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f97316]/80 to-transparent" style={{clipPath:'ellipse(80% 68% at 93% 68%)'}} />
          <div className="absolute bottom-4 left-4 z-10">
            <p className="text-xl font-extrabold text-white leading-tight">Great food<br/>Great service<br/>Great experience</p>
            <p className="text-[#1e3a8a] font-black text-sm mt-0.5">Every single time.</p>
            <div className="w-7 h-[2px] bg-[#1e3a8a] mt-1.5 rounded-full"/>
          </div>
        </div>

        {/* Logo - only show for main login view, so it doesn't block buttons in other views */}
        {view === 'login' && (
          <div className="relative z-20 flex justify-center flex-shrink-0 pointer-events-none" style={{marginTop:'-44px'}}>
            <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center pointer-events-none">
              <img src={centerLogo} alt="RMS" className="w-full h-full object-contain p-1"/>
            </div>
          </div>
        )}

        {/* White card */}
        <div className={`flex-1 bg-white flex flex-col overflow-hidden ${view === 'login' ? 'rounded-t-[28px] -mt-10' : 'rounded-t-[28px] mt-0'}`}>
          {view === 'qr' ? (
            <QRViewContent onBack={()=>setView('login')}/>
          ) : view === 'staffid' ? (
            <StaffIDViewContent onBack={(v)=>setView(v||'login')} altLogin={altLogin}/>
          ) : view === 'faceid' ? (
            <FaceIDViewContent onBack={(v)=>setView(v||'login')}/>
          ) : view === 'offline' ? (
            <OfflineViewContent onBack={(v)=>setView(v||'login')} altLogin={altLogin}/>
          ) : view === 'help' ? (
            <HelpViewContent onBack={()=>setView('login')} onTicket={()=>setView('ticket')}/>
          ) : view === 'ticket' ? (
            <TicketViewContent onBack={()=>setView('login')} onSuccess={()=>setView('ticket-success')}/>
          ) : view === 'ticket-success' ? (
            <TicketSuccessContent onBack={()=>setView('login')}/>
          ) : (
            <LoginFormContent {...formProps}/>
          )}
        </div>
      </div>

    </div>
  );
};

export default Login;
