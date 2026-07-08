import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

const QRLogin = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch tables to generate QR codes
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await axios.get(`${API_URL}/tables`);
        if (res.data.success && res.data.data.length > 0) {
          setTables(res.data.data);
          setSelectedTable(res.data.data[0]);
          return;
        }
      } catch {}
      // Fallback to localStorage
      const saved = JSON.parse(localStorage.getItem('tables') || '[]');
      if (saved.length > 0) {
        setTables(saved);
        setSelectedTable(saved[0]);
      }
      setLoading(false);
    };
    fetchTables().finally(() => setLoading(false));
  }, []);

  // QR value = the URL customer scans to open CustomerMenu
  const tableId = selectedTable?._id || selectedTable?.id || selectedTable?.name;
  const qrValue = tableId ? `${APP_URL}/qr-order/${tableId}` : `${APP_URL}/qr-order/1`;

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
      <div className="flex-1 flex flex-col items-center justify-start px-6 pb-8 overflow-y-auto pt-2">

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Table QR Codes</h1>
        <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
          Customers scan this to order directly from their phone.
        </p>

        {/* Table Selector */}
        {tables.length > 1 && (
          <div className="w-full max-w-sm mb-5">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Table</p>
            <div className="flex flex-wrap gap-2">
              {tables.map(t => {
                const tid = t._id || t.id;
                const stid = selectedTable?._id || selectedTable?.id;
                return (
                  <button
                    key={tid}
                    onClick={() => setSelectedTable(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      tid === stid
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-400'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* QR Code Box */}
        <div className="relative mb-5">
          {/* Orange corner brackets */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-[3px] border-l-[3px] border-[#f97316] rounded-tl-md z-10"/>
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-[3px] border-r-[3px] border-[#f97316] rounded-tr-md z-10"/>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-[3px] border-l-[3px] border-[#f97316] rounded-bl-md z-10"/>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-[3px] border-r-[3px] border-[#f97316] rounded-br-md z-10"/>

          <div className="w-[220px] h-[220px] flex items-center justify-center bg-white p-4 shadow-sm border border-gray-100 rounded-xl">
            {loading ? (
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/>
            ) : (
              <QRCode
                value={qrValue}
                size={192}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            )}
          </div>
        </div>

        {/* Table name + URL */}
        {selectedTable && (
          <div className="text-center mb-5">
            <p className="text-base font-black text-gray-800">{selectedTable.name}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-1 break-all max-w-xs">{qrValue}</p>
          </div>
        )}

        {/* Info box */}
        <div className="w-full max-w-sm bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3 mb-5">
          <div className="w-6 h-6 rounded-full border-2 border-[#f97316] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#f97316] text-xs font-black">i</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Customer scans this QR code with their phone camera — no app needed. They can browse the menu and place orders directly.
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
