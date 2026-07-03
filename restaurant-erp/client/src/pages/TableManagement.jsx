import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  Available:   { dot:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-200',  card:'border-emerald-200 bg-emerald-50/40',  icon:'text-emerald-600' },
  Reserved:    { dot:'bg-amber-400',   badge:'bg-amber-50  text-amber-700   border-amber-200',    card:'border-amber-200  bg-amber-50/40',    icon:'text-amber-600'   },
  Maintenance: { dot:'bg-slate-400',   badge:'bg-slate-50  text-slate-600   border-slate-200',    card:'border-slate-200  bg-slate-50/40',    icon:'text-slate-500'   },
  Occupied:    { dot:'bg-red-500',     badge:'bg-red-50    text-red-700     border-red-200',      card:'border-red-200    bg-red-50/40',      icon:'text-red-500'     },
};

const TableIcon = ({ color = 'currentColor' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="9" width="18" height="2" rx="1"/>
    <line x1="8" y1="11" x2="8" y2="20"/>
    <line x1="16" y1="11" x2="16" y2="20"/>
    <line x1="5" y1="20" x2="19" y2="20"/>
    <line x1="12" y1="3" x2="12" y2="9"/>
  </svg>
);

const QRIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const TableManagement = () => {
  const [tables, setTables]             = useState([]);
  const [reserveName, setReserveName]   = useState('');
  const [reserveTime, setReserveTime]   = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount]     = useState('6');
  const [autoMessage, setAutoMessage]   = useState('');
  const [editTable, setEditTable] = useState(null);
  const [activeQRTable, setActiveQRTable] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('tables');
    if (saved) {
      setTables(JSON.parse(saved));
    } else {
      const defaults = [
        { id:1, name:'Table 01', capacity:2, status:'Available',   reservation:null },
        { id:2, name:'Table 02', capacity:4, status:'Available',   reservation:null },
        { id:3, name:'Table 03', capacity:6, status:'Available',   reservation:null },
        { id:4, name:'Table 04', capacity:8, status:'Available',   reservation:null },
        { id:5, name:'Table 05', capacity:4, status:'Available',   reservation:null },
      ];
      setTables(defaults);
      localStorage.setItem('tables', JSON.stringify(defaults));
    }
  }, []);

  const saveTables = (updated) => { setTables(updated); localStorage.setItem('tables', JSON.stringify(updated)); };

  const handleReserve = (e) => {
    e.preventDefault();
    if (!selectedTable) return;
    saveTables(tables.map(t => t.id === selectedTable.id ? { ...t, status:'Reserved', reservation:{ name:reserveName, time:reserveTime } } : t));
    setSelectedTable(null); setReserveName(''); setReserveTime('');
  };

  const handleAutoAssign = () => {
    const guests = parseInt(guestCount);
    if (isNaN(guests) || guests <= 0) { setAutoMessage('Please enter a valid guest count.'); return; }
    const best = tables.filter(t => t.status === 'Available' && t.capacity >= guests).sort((a,b) => a.capacity - b.capacity)[0];
    if (best) {
      saveTables(tables.map(t => t.id === best.id ? { ...t, status:'Occupied' } : t));
      setAutoMessage(`Assigned to ${best.name} (Capacity: ${best.capacity})`);
    } else {
      setAutoMessage('No suitable table available.');
    }
  };

  const cancelReservation = (id) => saveTables(tables.map(t => t.id === id ? { ...t, status:'Available', reservation:null } : t));

  const freeTable = (id) => saveTables(tables.map(t => t.id === id ? { ...t, status:'Available', reservation:null } : t));

  const resetAllTables = () => { saveTables(tables.map(t => ({ ...t, status:'Available', reservation:null }))); setAutoMessage(''); };

  const counts = { total:tables.length, available:tables.filter(t=>t.status==='Available').length, reserved:tables.filter(t=>t.status==='Reserved').length, maintenance:tables.filter(t=>t.status==='Maintenance').length };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT ── */}
        <div className="space-y-4">

          {/* Edit table status card */}
          {editTable && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-800">Edit {editTable.name}</h3>
                <button onClick={()=>setEditTable(null)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 rounded-full text-xs font-bold transition">✕</button>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Change Status</p>
              <div className="space-y-2">
                {['Available','Reserved','Occupied','Maintenance'].map(s => {
                  const sc = STATUS_COLORS[s] || STATUS_COLORS.Available;
                  return (
                    <button key={s} type="button"
                      onClick={() => {
                        saveTables(tables.map(t => t.id === editTable.id ? { ...t, status: s, reservation: s !== 'Reserved' ? null : t.reservation } : t));
                        setEditTable(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${editTable.status === s ? `${sc.card} border-current font-bold` : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
                      <span className={`text-sm font-semibold ${editTable.status === s ? '' : 'text-slate-600'}`}>{s}</span>
                      {editTable.status === s && <span className="ml-auto text-[10px] font-bold text-slate-400">Current</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reserve card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {selectedTable ? `Reserve ${selectedTable.name}` : 'Select a table to reserve'}
            </h3>
            {!selectedTable ? (
              <>
                <p className="text-xs text-slate-400 font-medium mb-4">Click on any 'Available' table on the map to reserve it.</p>
                {/* Legend */}
                <div className="flex flex-wrap gap-3">
                  {['Available','Reserved','Maintenance'].map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s].dot}`}/>
                      <span className="text-xs text-slate-500 font-medium">{s}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handleReserve} className="space-y-3 mt-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Name</label>
                  <input type="text" required value={reserveName} onChange={e=>setReserveName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-400/20"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Time</label>
                  <input type="time" required value={reserveTime} onChange={e=>setReserveTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-400/20"/>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2.5 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-400/20">
                    Confirm
                  </button>
                  <button type="button" onClick={()=>setSelectedTable(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Auto assign */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-3">Auto Table Assignment</h3>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Number of Guests</label>
              <div className="relative mb-3">
                <input type="number" min="1" value={guestCount} onChange={e=>setGuestCount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-400/20 pr-10"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
              </div>
              <button onClick={handleAutoAssign}
                className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="2" rx="1"/><line x1="8" y1="11" x2="8" y2="20"/><line x1="16" y1="11" x2="16" y2="20"/><line x1="5" y1="20" x2="19" y2="20"/><line x1="12" y1="3" x2="12" y2="9"/></svg>
                Find & Occupy Table
              </button>
              {autoMessage && (
                <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-[11px] font-semibold text-blue-700">{autoMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-800">Interactive Table Map</h3>
            <div className="flex items-center gap-2">
              <button onClick={resetAllTables}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-full transition-all">
                Reset All
              </button>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 flex items-center gap-1">
                Click <QRIcon/> to view QR
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label:'Total Tables',  val:counts.total,       icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="2" rx="1"/><line x1="8" y1="11" x2="8" y2="20"/><line x1="16" y1="11" x2="16" y2="20"/><line x1="5" y1="20" x2="19" y2="20"/><line x1="12" y1="3" x2="12" y2="9"/></svg>, bg:'bg-indigo-50', text:'text-indigo-700' },
              { label:'Available',     val:counts.available,   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>, bg:'bg-emerald-50', text:'text-emerald-700' },
              { label:'Reserved',      val:counts.reserved,    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, bg:'bg-amber-50', text:'text-amber-700' },
              { label:'Maintenance',   val:counts.maintenance, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>, bg:'bg-slate-50', text:'text-slate-600' },
            ].map(({label,val,icon,bg,text}) => (
              <div key={label} className={`${bg} rounded-xl p-3 flex items-center gap-2`}>
                <div>{icon}</div>
                <div>
                  <p className={`text-xl font-extrabold ${text} leading-none`}>{val}</p>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {tables.map(table => {
              const sc = STATUS_COLORS[table.status] || STATUS_COLORS.Available;
              return (
                <div key={table.id}
                  onClick={() => table.status === 'Available' && setSelectedTable(table)}
                  className={`relative p-4 rounded-2xl border-2 transition-all ${sc.card} ${table.status === 'Available' ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}`}>
                  {/* QR button */}
                  <button onClick={e => { e.stopPropagation(); setActiveQRTable(table); }}
                    className="absolute top-3 right-3 text-slate-400 hover:text-[#1e3a8a] transition-colors">
                    <QRIcon/>
                  </button>
                  {/* Table icon */}
                  <div className={`mb-2 ${sc.icon}`}>
                    <TableIcon color="currentColor"/>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">{table.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mb-2">Capacity: {table.capacity}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${sc.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                    {table.status}
                  </span>
                  {table.reservation && (
                    <div className="mt-2 pt-2 border-t border-dashed border-amber-300 text-[10px] text-amber-800">
                      <p><span className="font-bold">By:</span> {table.reservation.name}</p>
                      <p><span className="font-bold">At:</span> {table.reservation.time}</p>
                      <button onClick={e => { e.stopPropagation(); cancelReservation(table.id); }}
                        className="mt-1 text-red-600 font-bold hover:underline text-[9px] uppercase tracking-wider">
                        Cancel
                      </button>
                    </div>
                  )}
                  {(table.status === 'Occupied' || table.status === 'Maintenance') && (
                    <button onClick={e => { e.stopPropagation(); freeTable(table.id); }}
                      className="mt-2 w-full py-1 text-[9px] font-bold bg-white/70 hover:bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-all">
                      Free Table
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feature icons */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100">
            {[
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:'Easy Reservation', sub:'Quick and simple table booking' },
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label:'Group Friendly', sub:'Perfect for small and large groups' },
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:'Real-time Status', sub:'Live table availability updates' },
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label:'Digital Experience', sub:'QR enabled for modern dining' },
            ].map(({icon,label,sub}) => (
              <div key={label} className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">{icon}</div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700">{label}</p>
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {activeQRTable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center relative">
            <button onClick={()=>setActiveQRTable(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full font-bold transition-colors text-sm">✕</button>
            <h3 className="text-lg font-extrabold text-slate-800 mb-1">{activeQRTable.name}</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">Scan to view menu & order instantly</p>
            <div className="w-44 h-44 border-4 border-slate-900 rounded-2xl mb-5 flex items-center justify-center relative overflow-hidden p-3">
              <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center flex-col gap-1">
                <span className="text-3xl opacity-60">🍽️</span>
                <span className="text-[9px] font-bold text-slate-400 text-center px-2">Scan to order</span>
              </div>
              <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-[#1e3a8a] rounded-tl-xl m-2"/>
              <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-[#1e3a8a] rounded-tr-xl m-2"/>
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-[#1e3a8a] rounded-bl-xl m-2"/>
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-[#1e3a8a] rounded-br-xl m-2"/>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 break-all text-center">
              {window.location.origin}/qr-order/{activeQRTable.id}
            </p>
            <div className="flex w-full gap-3">
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/qr-order/${activeQRTable.id}`)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors">
                Copy URL
              </button>
              <a href={`/qr-order/${activeQRTable.id}`} target="_blank" rel="noreferrer"
                className="flex-1 py-2.5 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center">
                Open Menu
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;

