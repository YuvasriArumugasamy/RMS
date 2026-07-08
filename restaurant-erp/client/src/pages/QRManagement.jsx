import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { api } from '../context/AuthContext';
import { toast } from 'react-toastify';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const QRManagement = () => {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const { data } = await api.get('/tables');
        if (data.success && data.data.length > 0) {
          setTables(data.data);
          localStorage.setItem('tables', JSON.stringify(data.data));
          return;
        }
      } catch {}
      // Fallback localStorage
      const saved = localStorage.getItem('tables');
      if (saved) {
        setTables(JSON.parse(saved));
      } else {
        const defaults = [
          { id:1, name:'Table 01', capacity:2, status:'Available' },
          { id:2, name:'Table 02', capacity:4, status:'Available' },
          { id:3, name:'Table 03', capacity:6, status:'Available' },
          { id:4, name:'Table 04', capacity:8, status:'Available' },
          { id:5, name:'Table 05', capacity:4, status:'Available' },
        ];
        setTables(defaults);
      }
      setLoading(false);
    };
    fetchTables().finally(() => setLoading(false));
  }, []);

  // Use MongoDB _id if available, fallback to id (for localStorage defaults)
  const getTableId = (table) => table._id || table.id;
  const getURL = (table) => `${APP_URL}/qr-order/${getTableId(table)}`;

  const copyURL = (table) => {
    navigator.clipboard.writeText(getURL(table)).then(() => 
      toast.success(`📋 Copied: ${getURL(table)}`)
    );
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>QR Code - ${selected?.name}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#fff;}
      h2{font-size:24px;font-weight:900;margin-bottom:4px;}
      p{color:#666;font-size:14px;margin-bottom:16px;}
      .url{font-size:11px;color:#999;word-break:break-all;max-width:200px;margin:0 auto;margin-top:12px;}</style>
      </head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  const STATUS_COLORS = {
    Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Reserved:  'bg-amber-50 text-amber-700 border-amber-200',
    Occupied:  'bg-red-50 text-red-700 border-red-200',
    Maintenance: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">QR Code Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Generate, view & print QR codes for each table. Customers scan to order instantly.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setSelected(null); setShowPrintModal(true); }}
            className="px-4 py-2 bg-[#1e3a8a] text-white font-bold rounded-xl text-xs shadow-md hover:bg-blue-900 transition-all flex items-center gap-2">
            🖨️ Print All QR Codes
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl mt-0.5">📱</span>
        <div>
          <p className="text-sm font-bold text-orange-800">How it works</p>
          <p className="text-xs text-orange-700 font-medium mt-0.5">Each QR code is unique to a table. When a customer scans it, they are taken directly to the digital menu for that table — no app download needed.</p>
        </div>
      </div>

      {/* QR Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map(table => (
          <div key={getTableId(table)} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-all">
            <div className="mb-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <QRCode
                value={getURL(table)}
                size={120}
                level="H"
                fgColor="#111827"
                bgColor="#ffffff"
              />
            </div>
            <h3 className="text-sm font-black text-slate-800">{table.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-1">Capacity: {table.capacity}</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border mb-3 ${STATUS_COLORS[table.status] || STATUS_COLORS.Available}`}>
              {table.status}
            </span>
            <p className="text-[9px] text-slate-400 font-mono break-all mb-3 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100 w-full">
              /qr-order/{getTableId(table)}
            </p>
            <div className="flex gap-1.5 w-full">
              <button onClick={() => copyURL(table)}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-[10px] transition-all">Copy URL</button>
              <button onClick={() => { setSelected(table); setShowPrintModal(true); }}
                className="flex-1 py-1.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-[10px] transition-all">Print</button>
            </div>
            <a href={getURL(table)} target="_blank" rel="noreferrer"
              className="mt-1.5 w-full py-1.5 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-lg text-[10px] text-center transition-all block">
              Preview Menu
            </a>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default QRManagement;
