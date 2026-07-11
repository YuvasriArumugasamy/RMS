import { useState, useEffect, useCallback } from 'react';

/* ── Status Config ── */
const STATUS = {
  Available:      { color:'#22c55e', bg:'bg-emerald-50',  border:'border-emerald-200', text:'text-emerald-700', dot:'bg-emerald-500',  label:'Available',      emoji:'🟢' },
  Ordered:        { color:'#eab308', bg:'bg-yellow-50',   border:'border-yellow-300',  text:'text-yellow-700', dot:'bg-yellow-400',   label:'Ordered',        emoji:'🟡' },
  Preparing:      { color:'#3b82f6', bg:'bg-blue-50',     border:'border-blue-300',    text:'text-blue-700',   dot:'bg-blue-500',     label:'Preparing',      emoji:'🔵' },
  Served:         { color:'#8b5cf6', bg:'bg-violet-50',   border:'border-violet-300',  text:'text-violet-700', dot:'bg-violet-500',   label:'Served',         emoji:'🟣' },
  Eating:         { color:'#f97316', bg:'bg-orange-50',   border:'border-orange-300',  text:'text-orange-700', dot:'bg-orange-500',   label:'Eating',         emoji:'🍽️' },
  'Bill Requested':{ color:'#ef4444',bg:'bg-red-50',      border:'border-red-300',     text:'text-red-700',    dot:'bg-red-500',      label:'Bill Requested', emoji:'🔴' },
  Cleaning:       { color:'#6b7280', bg:'bg-slate-100',   border:'border-slate-300',   text:'text-slate-600',  dot:'bg-slate-400',    label:'Cleaning',       emoji:'⚫' },
};

const STATUS_FLOW = ['Available','Ordered','Preparing','Served','Eating','Bill Requested','Cleaning'];

const TABLE_ICON = ({ color = '#64748b' }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="9" width="18" height="2" rx="1"/>
    <line x1="8" y1="11" x2="8" y2="20"/>
    <line x1="16" y1="11" x2="16" y2="20"/>
    <line x1="5" y1="20" x2="19" y2="20"/>
    <line x1="12" y1="3" x2="12" y2="9"/>
  </svg>
);

const formatTimer = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2,'0');
  const s = (seconds % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
};

const DigitalTwin = () => {
  const [tables, setTables]   = useState([]);
  const [orders, setOrders]   = useState([]);
  const [tick, setTick]       = useState(0);
  const [alerts, setAlerts]   = useState([]);
  const [selected, setSelected] = useState(null);

  // Tick every second
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Load & sync tables + orders from localStorage
  const reload = useCallback(() => {
    const savedTables = localStorage.getItem('tables');
    const savedOrders = localStorage.getItem('orders');
    const t = savedTables ? JSON.parse(savedTables) : [];
    const o = savedOrders ? JSON.parse(savedOrders) : [];

    // Seed tables if empty
    if (!t.length) {
      const defaults = Array.from({length:8},(_,i)=>({ id:i+1, name:`Table 0${i+1}`, capacity:[2,4,4,6,6,8,2,4][i], status:'Available', reservation:null, dineTwinStatus:'Available', statusChangedAt: Date.now() }));
      localStorage.setItem('tables', JSON.stringify(defaults));
      setTables(defaults);
    } else {
      // Ensure every table has dineTwinStatus
      const enriched = t.map(tbl => ({
        ...tbl,
        dineTwinStatus: tbl.dineTwinStatus || (tbl.status === 'Occupied' ? 'Eating' : 'Available'),
        statusChangedAt: tbl.statusChangedAt || Date.now(),
      }));
      setTables(enriched);
    }
    setOrders(o);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const interval = setInterval(reload, 4000);
    return () => clearInterval(interval);
  }, [reload]);

  // Check delay alerts
  useEffect(() => {
    const newAlerts = orders
      .filter(o => o.status === 'Preparing' && o.prepStartTime)
      .map(o => {
        const elapsed = Math.floor((Date.now() - o.prepStartTime) / 60000);
        return elapsed >= 20 ? { id:o.id, table:o.table, elapsed } : null;
      })
      .filter(Boolean);
    setAlerts(newAlerts);
  }, [tick, orders]);

  const updateTableStatus = (tableId, newStatus) => {
    const updated = tables.map(t => t.id === tableId
      ? { ...t, dineTwinStatus: newStatus, statusChangedAt: Date.now(), status: newStatus === 'Available' || newStatus === 'Cleaning' ? 'Available' : 'Occupied' }
      : t
    );
    setTables(updated);
    localStorage.setItem('tables', JSON.stringify(updated));
    setSelected(null);
  };

  const counts = Object.fromEntries(
    Object.keys(STATUS).map(s => [s, tables.filter(t => t.dineTwinStatus === s).length])
  );

  const getElapsed = (changedAt) => {
    if (!changedAt) return 0;
    return Math.floor((Date.now() - changedAt) / 1000);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"/>
            Restaurant Digital Twin
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Live floor map — real-time status of every table</p>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50/50 border border-emerald-200 px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>Live Monitor
          </span>
          <button onClick={reload} className="px-4.5 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-150/70 hover:border-slate-300 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer select-none">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Delay Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-red-50/50 border border-red-200 rounded-2xl px-4.5 py-3 animate-pulse">
              <svg className="w-4 h-4 text-red-550 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-xs font-bold text-red-700">Delay Alert — Order {a.id} ({a.table}) is preparing for {a.elapsed} min. Expected: 20 min.</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Status Legend + Counts ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(STATUS).map(([key, sc]) => (
          <div key={key} className={`${sc.bg} border-2 ${sc.border} rounded-2xl px-3.5 py-3 flex items-center gap-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.005)] hover:scale-[1.03] transition-all duration-200`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot} ${key !== 'Available' && key !== 'Cleaning' ? 'animate-pulse' : ''}`}/>
            <div className="min-w-0">
              <p className={`text-[9.5px] font-black uppercase tracking-wider ${sc.text} leading-none truncate`}>{sc.label}</p>
              <p className="text-lg font-black text-slate-800 leading-none mt-1.5">{counts[key] || 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Floor Map ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-850 tracking-tight">Live Floor Map</h3>
          <p className="text-[10px] text-slate-400 font-bold">Click any table to update its status</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map(table => {
            const st = table.dineTwinStatus || 'Available';
            const sc = STATUS[st] || STATUS.Available;
            const elapsed = getElapsed(table.statusChangedAt);
            const activeOrder = orders.find(o => o.table === table.name && o.status !== 'Completed');
            const isSelected = selected?.id === table.id;

            return (
              <div key={table.id}
                onClick={() => setSelected(isSelected ? null : table)}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${sc.bg} ${sc.border} ${
                  isSelected 
                    ? 'ring-2 ring-indigo-600/70 border-indigo-400/80' 
                    : 'shadow-[0_8px_30px_rgba(0,0,0,0.005)]'
                }`}
              >
                {/* Status dot */}
                <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${sc.dot} ${st !== 'Available' ? 'animate-pulse' : ''}`}/>

                {/* Table icon */}
                <div className="mb-3 shrink-0"><TABLE_ICON color={sc.color}/></div>

                <h4 className="text-xs font-black text-slate-800 tracking-tight">{table.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Capacity: {table.capacity} guests</p>

                {/* Status badge */}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider leading-none ${sc.bg} ${sc.border} ${sc.text}`}>
                    {sc.emoji} {sc.label}
                  </span>
                </div>

                {/* Timer */}
                {st !== 'Available' && (
                  <p className={`text-[9.5px] font-mono font-black mt-2 flex items-center gap-1 ${elapsed > 1200 ? 'text-red-500' : 'text-slate-400'}`}>
                    ⏱️ {formatTimer(elapsed)}
                    {elapsed > 1200 && <span className="text-red-550 animate-bounce">⚠️</span>}
                  </p>
                )}

                {/* Active order info */}
                {activeOrder && (
                  <p className="text-[9.5px] text-slate-500 font-bold mt-1 bg-white/70 border border-slate-100 rounded px-1.5 py-0.5 truncate w-fit">
                    Order {activeOrder.id?.substring(0,6).toUpperCase()} · ₹{activeOrder.total}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Status change panel */}
        {selected && (
          <div className="mt-5 p-5 bg-slate-50 border border-slate-200/60 rounded-3xl space-y-3.5 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-slate-800">Update Status: {selected.name}</p>
              <button 
                onClick={() => setSelected(null)} 
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {STATUS_FLOW.map(s => {
                const sc = STATUS[s];
                const isCurrent = selected.dineTwinStatus === s;
                return (
                  <button key={s} onClick={() => updateTableStatus(selected.id, s)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[10.5px] font-black border transition-all cursor-pointer ${
                      isCurrent 
                        ? `${sc.bg} ${sc.border} ${sc.text} ring-2 ring-indigo-600/35 border-current` 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                    {sc.emoji} {sc.label}
                    {isCurrent && <span className="ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Smart Dining Timer ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Smart Dining Timer</h3>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">Live Status</span>
        </div>

        {orders.filter(o => ['Pending','Preparing','Ready'].includes(o.status)).length === 0 ? (
          <p className="text-xs text-slate-400 font-bold py-6 text-center">No active orders in the kitchen.</p>
        ) : (
          <div className="space-y-3">
            {orders.filter(o => ['Pending','Preparing','Ready'].includes(o.status)).map(order => {
              const elapsed = order.prepStartTime ? Math.floor((Date.now() - order.prepStartTime) / 1000) : 0;
              const elapsedMin = Math.floor(elapsed / 60);
              const isDelayed = order.status === 'Preparing' && elapsedMin >= 20;
              const progress = order.status === 'Preparing' ? Math.min((elapsedMin / 20) * 100, 100) : 0;

              return (
                <div key={order.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border ${isDelayed ? 'bg-red-50/50 border-red-200' : 'bg-slate-50/40 border-slate-100'}`}>
                  {/* Order info */}
                  <div className="shrink-0">
                    <p className="text-xs font-black text-slate-800">Order #{order.id?.substring(0,8).toUpperCase()}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">🛋️ Table {order.table}</p>
                  </div>
                  {/* Status */}
                  <div className="shrink-0 select-none">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      order.status === 'Pending' ? 'bg-yellow-50 text-yellow-750 border-yellow-200' :
                      order.status === 'Preparing' ? 'bg-blue-50 text-blue-750 border-blue-200' :
                      'bg-emerald-50 text-emerald-750 border-emerald-250'
                    }`}>{order.status}</span>
                  </div>
                  {/* Timer progress bar */}
                  <div className="flex-1 w-full">
                    {order.status === 'Preparing' && order.prepStartTime ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9.5px] font-bold">
                          <span className={`font-mono font-black ${isDelayed ? 'text-red-650' : 'text-slate-650'}`}>
                            {formatTimer(elapsed)} elapsed
                          </span>
                          <span className="text-slate-400">Expected limit: 20 min</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${isDelayed ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{width:`${progress}%`}}/>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10.5px] text-slate-400 font-bold">
                        {order.status === 'Pending' ? '👨‍🍳 Waiting for kitchen acceptance...' : '🍽️ Prepared & ready to serve!'}
                      </span>
                    )}
                  </div>
                  {isDelayed && (
                    <div className="shrink-0 select-none">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md animate-pulse">Delayed</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Kitchen Load Balancer ── */}
      <KitchenLoadBalancer orders={orders}/>
    </div>
  );
};

/* ── Kitchen Load Balancer Component ── */
const KitchenLoadBalancer = ({ orders }) => {
  const activeOrders = orders.filter(o => ['Pending','Preparing'].includes(o.status));

  // Group identical items across tables
  const itemMap = {};
  activeOrders.forEach(order => {
    order.items?.forEach(item => {
      const key = item.name;
      if (!itemMap[key]) itemMap[key] = { name:item.name, image:item.image, totalQty:0, tables:[] };
      itemMap[key].totalQty += item.qty;
      if (!itemMap[key].tables.includes(order.table)) itemMap[key].tables.push(order.table);
    });
  });

  const batches = Object.values(itemMap).filter(b => b.tables.length >= 1).sort((a,b) => b.totalQty - a.totalQty);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-750" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Kitchen Load Balancer</h3>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">Batch Cooking</span>
      </div>

      {batches.length === 0 ? (
        <p className="text-xs text-slate-400 font-bold py-6 text-center">No active orders to batch.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(batch => {
            const isMultiTable = batch.tables.length > 1;
            return (
              <div key={batch.name} className={`p-4 rounded-2xl border-2 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.01)] ${isMultiTable ? 'border-[#0F286B]/70 bg-indigo-50/15' : 'border-slate-150/70 bg-slate-50/40'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl select-none">{batch.image || '🍽️'}</span>
                  <div>
                    <p className="text-xs font-black text-slate-800 leading-snug">{batch.name}</p>
                    {isMultiTable && (
                      <span className="inline-block text-[8px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-0.5">Batch Cook</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-indigo-650 tracking-tight">{batch.totalQty}x</p>
                    <p className="text-[9.5px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">total qty</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">Tables</p>
                    <div className="flex flex-wrap gap-1 justify-end select-none">
                      {batch.tables.map(t => (
                        <span key={t} className="text-[8.5px] font-black bg-white border border-slate-200 text-slate-650 px-2 py-0.5 rounded-md shadow-sm">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {isMultiTable && (
                  <p className="mt-3 text-[9.5px] text-indigo-850 font-bold bg-indigo-50 border border-indigo-100/50 rounded-xl px-2.5 py-1.5 text-center">
                    🍳 Cook {batch.totalQty} {batch.name} together · {batch.tables.length} tables
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DigitalTwin;
