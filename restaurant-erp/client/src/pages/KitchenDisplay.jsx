import React, { useState, useEffect } from 'react';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [chefNotes, setChefNotes] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const loadOrders = () => {
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
    };
    loadOrders();
    
    // Poll orders every 3s
    const orderInterval = setInterval(loadOrders, 3000);
    // Update timer every second
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    
    return () => {
      clearInterval(orderInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const updateStatus = (id, newStatus) => {
    const updated = orders.map(o => {
      if (o.id === id) {
        return {
          ...o,
          status: newStatus,
          chefNote: chefNotes[id] || o.chefNote || '',
          prepStartTime: newStatus === 'Preparing' ? Date.now() : o.prepStartTime
        };
      }
      return o;
    });
    setOrders(updated);
    localStorage.setItem('orders', JSON.stringify(updated));
  };

  const handleNoteChange = (id, text) => {
    setChefNotes({ ...chefNotes, [id]: text });
  };

  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const readyOrders = orders.filter(o => o.status === 'Ready');

  const getPrepTime = (startTime) => {
    if (!startTime) return '00:00';
    const diff = Math.floor((currentTime - startTime) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kitchen Display Screen (KDS)</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage live food preparation stages and track active timers.</p>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1.5 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Monitor Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: New Orders (Pending) */}
        <div className="bg-slate-50 border border-slate-200/55 rounded-3xl p-5 flex flex-col space-y-4 shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> New Orders
            </h3>
            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-lg border border-red-200">{pendingOrders.length}</span>
          </div>

          <div className="space-y-4">
            {pendingOrders.map((o) => (
              <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{o.id}</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{o.type} {o.table !== 'N/A' && `(${o.table})`}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{o.timestamp}</span>
                </div>

                <div className="space-y-2">
                  {o.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.qty}x <span className="font-semibold text-slate-500 ml-1">{item.name}</span></span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5 pt-2">
                  <input
                    type="text"
                    placeholder="Add chef notes..."
                    value={chefNotes[o.id] || ''}
                    onChange={(e) => handleNoteChange(o.id, e.target.value)}
                    className="w-full text-[11px] p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 font-semibold"
                  />
                  <button
                    onClick={() => updateStatus(o.id, 'Preparing')}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-500/20"
                  >
                    Accept & Cook
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="bg-slate-50 border border-slate-200/55 rounded-3xl p-5 flex flex-col space-y-4 shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Preparing
            </h3>
            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">{preparingOrders.length}</span>
          </div>

          <div className="space-y-4">
            {preparingOrders.map((o) => (
              <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse"></div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{o.id}</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{o.type} {o.table !== 'N/A' && `(${o.table})`}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      ⏱ {getPrepTime(o.prepStartTime)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {o.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.qty}x <span className="font-semibold text-slate-500 ml-1">{item.name}</span></span>
                    </div>
                  ))}
                </div>

                {o.chefNote && (
                  <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-700">
                    Note: {o.chefNote}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => updateStatus(o.id, 'Ready')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
                  >
                    Mark as Ready
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div className="bg-slate-50 border border-slate-200/55 rounded-3xl p-5 flex flex-col space-y-4 shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ready for Pickup
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">{readyOrders.length}</span>
          </div>

          <div className="space-y-4">
            {readyOrders.map((o) => (
              <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 space-y-4 opacity-80 hover:opacity-100 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{o.id}</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{o.type} {o.table !== 'N/A' && `(${o.table})`}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{o.timestamp}</span>
                </div>

                <div className="space-y-2">
                  {o.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.qty}x <span className="font-semibold text-slate-500 ml-1">{item.name}</span></span>
                    </div>
                  ))}
                </div>

                <div className="text-center py-2.5 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-bold rounded-xl border border-emerald-100 shadow-inner">
                  Awaiting Delivery / Pickup
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplay;
