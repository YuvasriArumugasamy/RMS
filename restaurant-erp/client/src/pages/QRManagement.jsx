import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'react-qr-code';
import { api } from '../context/AuthContext';
import { toast } from 'react-toastify';

const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

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
          { id: 1, name: 'Table 01', capacity: 2, status: 'Available' },
          { id: 2, name: 'Table 02', capacity: 4, status: 'Available' },
          { id: 3, name: 'Table 03', capacity: 6, status: 'Available' },
          { id: 4, name: 'Table 04', capacity: 8, status: 'Available' },
          { id: 5, name: 'Table 05', capacity: 4, status: 'Available' },
        ];
        setTables(defaults);
      }
      setLoading(false);
    };
    fetchTables().finally(() => setLoading(false));
  }, []);

  const getTableId = (table) => table._id || table.id;
  const getURL = (table) => `${APP_URL}/qr-order/${getTableId(table)}`;

  const copyURL = (table) => {
    navigator.clipboard.writeText(getURL(table)).then(() => 
      toast.success(`📋 Link copied: ${table.name}`)
    );
  };

  const handlePrint = () => {
    const targetTables = selected ? [selected] : tables;

    // Chunk tables into groups of 6 for A4 printing (2 columns x 3 rows per page)
    const chunkSize = 6;
    const pages = [];
    for (let i = 0; i < targetTables.length; i += chunkSize) {
      pages.push(targetTables.slice(i, i + chunkSize));
    }

    const pagesHtml = pages.map((chunk, pageIdx) => `
      <div class="page">
        <div class="page-header">
          <h2>RMS RESTAURANT — TABLE QR CODES</h2>
          <p>Scan QR code with smartphone camera to view menu & place order</p>
        </div>
        <div class="page-grid">
          ${chunk.map(t => {
            const url = getURL(t);
            return `
              <div class="qr-card">
                <div class="brand">RMS RESTAURANT</div>
                <div class="qr-box">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&color=0F286B" alt="${t.name}" />
                </div>
                <div class="table-name">${t.name}</div>
                <div class="sub-text">Capacity: ${t.capacity} Guests</div>
                <div class="scan-badge">📷 SCAN TO ORDER</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="page-footer">
          Page ${pageIdx + 1} of ${pages.length} · RMS Restaurant Management System
        </div>
      </div>
    `).join('\n');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Codes - RMS</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: system-ui, -apple-system, sans-serif;
              color: #0f172a;
            }
            .page {
              width: 100%;
              min-height: 270mm;
              padding: 4mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: auto;
            }
            .page-header {
              text-align: center;
              margin-bottom: 5mm;
              border-bottom: 2px solid #0F286B;
              padding-bottom: 3mm;
            }
            .page-header h2 {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
              color: #0F286B;
              letter-spacing: 0.5px;
            }
            .page-header p {
              margin: 3px 0 0;
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
            }
            .page-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6mm;
              flex: 1;
            }
            .qr-card {
              border: 2px solid #e2e8f0;
              border-radius: 16px;
              padding: 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              background: #ffffff;
            }
            .brand {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 1px;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .qr-box {
              padding: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              margin-bottom: 6px;
            }
            .qr-box img {
              width: 120px;
              height: 120px;
              display: block;
            }
            .table-name {
              font-size: 15px;
              font-weight: 900;
              color: #0F286B;
              margin-bottom: 2px;
            }
            .sub-text {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              margin-bottom: 6px;
            }
            .scan-badge {
              font-size: 9px;
              font-weight: 900;
              background: #ecfdf5;
              color: #047857;
              border: 1px solid #a7f3d0;
              padding: 3px 10px;
              border-radius: 20px;
              letter-spacing: 0.5px;
            }
            .page-footer {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 3mm;
              margin-top: 3mm;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const STATUS_COLORS = {
    Available: 'bg-emerald-50 text-emerald-700 border-emerald-150',
    Reserved:  'bg-amber-50 text-amber-700 border-amber-150',
    Occupied:  'bg-red-50 text-red-700 border-red-150',
    Maintenance: 'bg-slate-50 text-slate-650 border-slate-150',
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out] font-sans pb-12">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">QR Code Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Generate, view & print QR codes for each table. Customers scan to order instantly.</p>
        </div>
        <button 
          onClick={() => { setSelected(null); setShowPrintModal(true); }}
          className="px-5 py-3.5 bg-[#0F286B] hover:bg-[#1e3a8a] text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-650/10 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          🖨️ Print All QR Codes
        </button>
      </div>

      {/* ── INFO BANNER ── */}
      <div className="bg-orange-50/70 border border-orange-100 rounded-3xl p-5 flex items-start gap-3.5 shadow-sm">
        <span className="text-2xl select-none mt-0.5">📱</span>
        <div>
          <p className="text-xs font-black text-orange-800 uppercase tracking-widest">How it works</p>
          <p className="text-xs text-orange-700 font-bold mt-1 leading-relaxed">
            Each QR code is unique to a table. When a customer scans it with their phone camera, they are taken directly to the digital menu for that specific table to place their orders. No app installation required!
          </p>
        </div>
      </div>

      {/* ── QR CARDS GRID ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-3 border-indigo-650 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tables.map(table => (
            <div 
              key={getTableId(table)} 
              className="bg-white rounded-3xl border border-slate-100 p-5 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:scale-102 transition-all duration-300 relative group"
            >
              
              {/* QR Image block */}
              <div className="mb-4.5 p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center justify-center shadow-inner">
                <QRCode
                  value={getURL(table)}
                  size={140}
                  level="H"
                  fgColor="#0F286B"
                  bgColor="#ffffff"
                />
              </div>

              {/* Table Info */}
              <h3 className="font-extrabold text-sm text-slate-800 leading-none">{table.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 mb-2.5">👤 Capacity: {table.capacity} guests</p>
              
              <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded border mb-4 leading-none ${STATUS_COLORS[table.status] || STATUS_COLORS.Available}`}>
                {table.status}
              </span>

              {/* URL String code */}
              <p className="text-[8.5px] text-slate-400 font-mono break-all mb-4 bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 w-full truncate" title={getURL(table)}>
                /qr-order/{getTableId(table)}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full mt-auto">
                <button 
                  onClick={() => copyURL(table)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-[10px] uppercase border border-slate-100 transition-all cursor-pointer"
                >
                  Copy Link
                </button>
                <button 
                  onClick={() => { setSelected(table); setShowPrintModal(true); }}
                  className="flex-1 py-2 bg-[#0F286B] hover:bg-[#1e3a8a] text-white font-bold rounded-xl text-[10px] uppercase transition-all cursor-pointer"
                >
                  Print QR
                </button>
              </div>

              {/* Direct Preview Link */}
              <a 
                href={getURL(table)} 
                target="_blank" 
                rel="noreferrer"
                className="mt-2 w-full py-2 bg-orange-50 hover:bg-orange-100 text-[#f97316] font-bold rounded-xl text-[10px] uppercase text-center transition-all block border border-orange-100 cursor-pointer"
              >
                Preview Menu
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ── PRINT PREVIEW MODAL ── */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setShowPrintModal(false)} />
          
          {/* Modal Content container */}
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative z-10 p-6 space-y-4 animate-[fadeInScale_0.25s_cubic-bezier(0.4,0,0.2,1)]">
            
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                🖨️ {selected ? `Print QR: ${selected.name}` : 'Print All QR Codes'}
              </h3>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Print preview content wrapper */}
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-4" ref={printRef}>
              {selected ? (
                /* Print Single Table content layout */
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-md">
                    <QRCode value={getURL(selected)} size={160} level="H" fgColor="#0F286B" />
                  </div>
                  <h2 className="text-lg font-black text-slate-800 mt-4 mb-1">{selected.name}</h2>
                  <p className="text-xs text-slate-450 font-bold">Capacity: {selected.capacity} guests</p>
                  <p className="text-[9px] text-slate-400 font-mono break-all max-w-[240px] mt-2">
                    {getURL(selected)}
                  </p>
                </div>
              ) : (
                /* Print All Tables list layout */
                <div className="space-y-6 max-h-[300px] overflow-y-auto w-full p-1 scrollbar-thin">
                  {tables.map(table => (
                    <div key={getTableId(table)} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-150 text-left">
                      <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                        <QRCode value={getURL(table)} size={55} level="H" fgColor="#0F286B" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{table.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Capacity: {table.capacity} guests</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-3 bg-[#0F286B] hover:bg-[#1e3a8a] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
              >
                Print Now 🖨️
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default QRManagement;
