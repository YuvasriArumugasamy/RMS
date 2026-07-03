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
    <div className="max-w-[1600px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"/>
            Restaurant Digital Twin
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">Live floor map — real-time status of every table</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>Live Monitor
          </span>
          <button onClick={reload} className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Delay Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 animate-pulse">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p className="text-xs font-bold text-red-700">⚠️ Delay Alert — Order {a.id} ({a.table}) is preparing for {a.elapsed} min. Expected: 20 min.</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Status Legend + Counts ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(STATUS).map(([key, sc]) => (
          <div key={key} className={`${sc.bg} border ${sc.border} rounded-xl px-3 py-2.5 flex items-center gap-2`}>
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold ${sc.text} leading-none truncate`}>{sc.label}</p>
              <p className="text-xl font-extrabold text-slate-800 leading-tight">{counts[key] || 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Floor Map ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">Live Floor Map</h3>
          <p className="text-[10px] text-slate-400 font-medium">Click any table to update its status</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map(table => {
            const st = table.dineTwinStatus || 'Available';
            const sc = STATUS[st] || STATUS.Available;
            const elapsed = getElapsed(table.statusChangedAt);
            const activeOrder = orders.find(o => o.table === table.name && o.status !== 'Completed');

            return (
              <div key={table.id}
                onClick={() => setSelected(selected?.id === table.id ? null : table)}
                className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${sc.bg} ${sc.border} ${selected?.id === table.id ? 'ring-2 ring-offset-1 ring-[#f97316]' : ''}`}>

                {/* Status dot */}
                <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${sc.dot} ${st !== 'Available' ? 'animate-pulse' : ''}`}/>

                {/* Table icon */}
                <div className="mb-2"><TABLE_ICON color={sc.color}/></div>

                <h4 className="text-sm font-extrabold text-slate-800">{table.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium mb-2">Cap: {table.capacity}</p>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${sc.bg} ${sc.border} ${sc.text}`}>
                  {sc.emoji} {sc.label}
                </span>

                {/* Timer */}
                {st !== 'Available' && (
                  <p className={`text-[10px] font-mono font-bold mt-1.5 ${elapsed > 1200 ? 'text-red-500' : 'text-slate-400'}`}>
                    ⏱ {formatTimer(elapsed)}
                    {elapsed > 1200 && <span className="ml-1 text-red-500">⚠️</span>}
                  </p>
                )}

                {/* Active order info */}
                {activeOrder && (
                  <p className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                    {activeOrder.id} · ₹{activeOrder.total}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Status change panel */}
        {selected && (
          <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-800">Update: {selected.name}</p>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FLOW.map(s => {
                const sc = STATUS[s];
                const isCurrent = selected.dineTwinStatus === s;
                return (
                  <button key={s} onClick={() => updateTableStatus(selected.id, s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                      isCurrent ? `${sc.bg} ${sc.border} ${sc.text} ring-2 ring-offset-1 ${sc.border}` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${sc.dot}`}/>
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h3 className="text-sm font-bold text-slate-800">Smart Dining Timer</h3>
          <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Live</span>
        </div>

        {orders.filter(o => ['Pending','Preparing','Ready'].includes(o.status)).length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-4 text-center">No active orders in the kitchen.</p>
        ) : (
          <div className="space-y-2">
            {orders.filter(o => ['Pending','Preparing','Ready'].includes(o.status)).map(order => {
              const elapsed = order.prepStartTime ? Math.floor((Date.now() - order.prepStartTime) / 1000) : 0;
              const elapsedMin = Math.floor(elapsed / 60);
              const isDelayed = order.status === 'Preparing' && elapsedMin >= 20;
              const progress = order.status === 'Preparing' ? Math.min((elapsedMin / 20) * 100, 100) : 0;

              return (
                <div key={order.id} className={`flex items-center gap-4 p-3 rounded-xl border ${isDelayed ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  {/* Order info */}
                  <div className="min-w-[120px]">
                    <p className="text-xs font-extrabold text-slate-800">{order.id}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{order.table}</p>
                  </div>
                  {/* Status */}
                  <div className="w-20">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      order.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      order.status === 'Preparing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>{order.status}</span>
                  </div>
                  {/* Timer */}
                  <div className="flex-1">
                    {order.status === 'Preparing' && order.prepStartTime ? (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-mono font-bold ${isDelayed ? 'text-red-600' : 'text-slate-600'}`}>
                            {formatTimer(elapsed)} elapsed
                          </span>
                          <span className="text-[9px] text-slate-400">Expected: 20 min</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isDelayed ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{width:`${progress}%`}}/>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {order.status === 'Pending' ? 'Waiting for chef...' : 'Ready to serve'}
                      </span>
                    )}
                  </div>
                  {isDelayed && (
                    <div className="flex-shrink-0">
                      <span className="text-[9px] font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">⚠️ Delayed</span>
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
        </svg>
        <h3 className="text-sm font-bold text-slate-800">Kitchen Load Balancer</h3>
        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Batch Cooking</span>
      </div>

      {batches.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium py-4 text-center">No active orders to batch.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {batches.map(batch => {
            const isMultiTable = batch.tables.length > 1;
            return (
              <div key={batch.name} className={`p-4 rounded-xl border-2 ${isMultiTable ? 'border-[#1e3a8a] bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{batch.image || '🍽️'}</span>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{batch.name}</p>
                    {isMultiTable && (
                      <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Batch Cook</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-[#1e3a8a]">{batch.totalQty}x</p>
                    <p className="text-[9px] text-slate-400 font-medium">total qty</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-600 mb-0.5">Tables:</p>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {batch.tables.map(t => (
                        <span key={t} className="text-[8px] font-bold bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {isMultiTable && (
                  <p className="mt-2 text-[9px] text-blue-700 font-bold bg-blue-100 rounded-lg px-2 py-1 text-center">
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
