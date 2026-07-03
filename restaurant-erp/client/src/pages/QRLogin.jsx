import { useNavigate } from 'react-router-dom';

const QRLogin = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden">

      {/* Back button */}
      <div className="px-5 pt-5 pb-2">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm hover:text-gray-900 transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Login</h1>
        <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
          Scan this QR code using your staff app<br/>to login instantly.
        </p>

        {/* QR Code box */}
        <div className="relative mb-8">
          {/* Corner brackets */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-[3px] border-l-[3px] border-[#f97316] rounded-tl-md"/>
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-[3px] border-r-[3px] border-[#f97316] rounded-tr-md"/>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-[3px] border-l-[3px] border-[#f97316] rounded-bl-md"/>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-[3px] border-r-[3px] border-[#f97316] rounded-br-md"/>

          {/* QR Code SVG */}
          <div className="w-[220px] h-[220px] flex items-center justify-center bg-white p-3">
            <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Top-left finder pattern */}
              <rect x="10" y="10" width="60" height="60" fill="none" stroke="black" strokeWidth="8"/>
              <rect x="24" y="24" width="32" height="32" fill="black"/>
              {/* Top-right finder pattern */}
              <rect x="130" y="10" width="60" height="60" fill="none" stroke="black" strokeWidth="8"/>
              <rect x="144" y="24" width="32" height="32" fill="black"/>
              {/* Bottom-left finder pattern */}
              <rect x="10" y="130" width="60" height="60" fill="none" stroke="black" strokeWidth="8"/>
              <rect x="24" y="144" width="32" height="32" fill="black"/>
              {/* Data modules - random pattern */}
              <rect x="80" y="10" width="8" height="8" fill="black"/>
              <rect x="96" y="10" width="8" height="8" fill="black"/>
              <rect x="112" y="10" width="8" height="8" fill="black"/>
              <rect x="80" y="26" width="8" height="8" fill="black"/>
              <rect x="112" y="26" width="8" height="8" fill="black"/>
              <rect x="88" y="42" width="8" height="8" fill="black"/>
              <rect x="104" y="42" width="8" height="8" fill="black"/>
              <rect x="80" y="58" width="8" height="8" fill="black"/>
              <rect x="96" y="58" width="8" height="8" fill="black"/>
              <rect x="10" y="80" width="8" height="8" fill="black"/>
              <rect x="26" y="80" width="8" height="8" fill="black"/>
              <rect x="42" y="80" width="8" height="8" fill="black"/>
              <rect x="58" y="80" width="8" height="8" fill="black"/>
              <rect x="80" y="80" width="8" height="8" fill="black"/>
              <rect x="96" y="80" width="8" height="8" fill="black"/>
              <rect x="112" y="80" width="8" height="8" fill="black"/>
              <rect x="128" y="80" width="8" height="8" fill="black"/>
              <rect x="144" y="80" width="8" height="8" fill="black"/>
              <rect x="160" y="80" width="8" height="8" fill="black"/>
              <rect x="176" y="80" width="8" height="8" fill="black"/>
              <rect x="10" y="96" width="8" height="8" fill="black"/>
              <rect x="42" y="96" width="8" height="8" fill="black"/>
              <rect x="80" y="96" width="8" height="8" fill="black"/>
              <rect x="104" y="96" width="8" height="8" fill="black"/>
              <rect x="128" y="96" width="8" height="8" fill="black"/>
              <rect x="160" y="96" width="8" height="8" fill="black"/>
              <rect x="26" y="112" width="8" height="8" fill="black"/>
              <rect x="58" y="112" width="8" height="8" fill="black"/>
              <rect x="88" y="112" width="8" height="8" fill="black"/>
              <rect x="112" y="112" width="8" height="8" fill="black"/>
              <rect x="144" y="112" width="8" height="8" fill="black"/>
              <rect x="176" y="112" width="8" height="8" fill="black"/>
              <rect x="80" y="128" width="8" height="8" fill="black"/>
              <rect x="96" y="128" width="8" height="8" fill="black"/>
              <rect x="128" y="128" width="8" height="8" fill="black"/>
              <rect x="160" y="128" width="8" height="8" fill="black"/>
              <rect x="80" y="144" width="8" height="8" fill="black"/>
              <rect x="112" y="144" width="8" height="8" fill="black"/>
              <rect x="144" y="144" width="8" height="8" fill="black"/>
              <rect x="176" y="144" width="8" height="8" fill="black"/>
              <rect x="80" y="160" width="8" height="8" fill="black"/>
              <rect x="96" y="160" width="8" height="8" fill="black"/>
              <rect x="128" y="160" width="8" height="8" fill="black"/>
              <rect x="80" y="176" width="8" height="8" fill="black"/>
              <rect x="112" y="176" width="8" height="8" fill="black"/>
              <rect x="160" y="176" width="8" height="8" fill="black"/>
              <rect x="176" y="176" width="8" height="8" fill="black"/>
            </svg>
          </div>
        </div>

        {/* Info box */}
        <div className="w-full max-w-sm bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3 mb-8">
          <div className="w-6 h-6 rounded-full border-2 border-[#f97316] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#f97316] text-xs font-black">i</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Open your <span className="font-bold">RMS Staff App</span> and scan the QR code to login.
          </p>
        </div>

        {/* OR */}
        <div className="flex items-center w-full max-w-sm gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200"/>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
          <div className="flex-1 h-px bg-gray-200"/>
        </div>

        {/* Back to Employee Login */}
        <button
          onClick={() => navigate('/login')}
          className="w-full max-w-sm flex items-center justify-center gap-2 py-3.5 border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Employee Login
        </button>
      </div>
    </div>
  );
};

export default QRLogin;
