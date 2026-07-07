import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import { api } from '../context/AuthContext';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [chefNotes, setChefNotes] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const { on, off, connected } = useSocket();

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders?status=Pending,Preparing,Ready');
      if (data.success) setOrders(data.data);
    } catch {
      // fallback to localStorage if API unavailable
      const saved = localStorage.getItem('orders');
      if (saved) setOrders(JSON.parse(saved).filter(o => ['Pending','Preparing','Ready'].includes(o.status)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Update timer every second
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timerInterval);
  }, [fetchOrders]);

  // 🔌 Socket.io — listen for new orders & status updates in real-time
  useEffect(() => {
    const handleNewOrder = (order) => {
      setOrders(prev => {
        // avoid duplicates
        if (prev.find(o => (o._id || o.id) === (order._id || order.id))) return prev;
        return [order, ...prev];
      });
      toast.info(`🆕 New Order: ${order.orderId || order.id} — ${order.table}`, {
        autoClose: 6000,
        style: { background: '#1e3a8a', color: 'white' }
      });
      // Play notification sound
      try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...').play(); } catch {}
    };

    const handleStatusUpdate = (update) => {
      setOrders(prev => prev.map(o => {
        if ((o._id || o.id) === (update.id || update._id)) {
          return { ...o, status: update.status };
        }
        return o;
      }).filter(o => ['Pending','Preparing','Ready'].includes(o.status)));
    };

    const cleanupNew = on('new-order', handleNewOrder);
    const cleanupStatus = on('order-status-update', handleStatusUpdate);

    return () => {
      cleanupNew?.();
      cleanupStatus?.();
    };
  }, [on]);

  const updateStatus = async (order, newStatus) => {
    const id = order._id || order.id;
    const note = chefNotes[id] || '';
    try {
      await api.put(`/orders/${id}/status`, { status: newStatus, chefNote: note });
      setOrders(prev => prev.map(o => (o._id || o.id) === id
        ? { ...o, status: newStatus, chefNote: note, prepStartTime: newStatus === 'Preparing' ? Date.now() : o.prepStartTime }
        : o
      ).filter(o => ['Pending','Preparing','Ready'].includes(o.status)));

      const messages = {
        Preparing: { msg: `👨‍🍳 Cooking: ${order.orderId || id}`, type: 'warning' },
        Ready: { msg: `✅ Ready: ${order.orderId || id} — ${order.table}`, type: 'success' },
      };
      if (messages[newStatus]) toast[messages[newStatus].type](messages[newStatus].msg);
    } catch {
      // fallback localStorage update
      const all = JSON.parse(localStorage.getItem('orders') || '[]');
      const updated = all.map(o => o.id === id
        ? { ...o, status: newStatus, chefNote: note, prepStartTime: newStatus === 'Preparing' ? Date.now() : o.prepStartTime }
        : o);
      localStorage.setItem('orders', JSON.stringify(updated));
      setOrders(prev => prev.map(o => (o._id || o.id) === id
        ? { ...o, status: newStatus, chefNote: note }
        : o
      ).filter(o => ['Pending','Preparing','Ready'].includes(o.status)));
      toast.warning('⚠️ Offline mode — status saved locally');
    }
  };

  const handleNoteChange = (id, text) => setChefNotes(p => ({ ...p, [id]: text }));

  const getPrepTime = (startTime) => {
    if (!startTime) return '00:00';
    const diff = Math.floor((currentTime - new Date(startTime).getTime()) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const pendingOrders   = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const readyOrders     = orders.filter(o => o.status === 'Ready');

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
        <p className="text-sm font-bold text-slate-400">Loading Kitchen Orders...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kitchen Display Screen (KDS)</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage live food preparation stages and track active timers.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Socket connection indicator */}
          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
            connected
              ? 'text-emerald-600 bg-emerald-50 border-emerald-100 animate-pulse'
              : 'text-red-500 bg-red-50 border-red-100'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-400'}`}/>
            {connected ? 'Live Monitor Active' : 'Reconnecting...'}
          </span>
          <button onClick={fetchOrders}
            className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: New Orders (Pending) */}
        <div className="bg-slate-50 border border-slate-200/55 rounded-3xl p-5 flex flex-col space-y-4 shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"/>New Orders
            </h3>
            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-lg border border-red-200">{pendingOrders.length}</span>
          </div>
          <div className="space-y-4">
            {pendingOrders.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">No pending orders 🎉</div>
            )}
            {pendingOrders.map((o) => {
              const id = o._id || o.id;
              return (
                <div key={id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"/>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{o.orderId || id}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{o.type} {o.table !== 'N/A' && `(${o.table})`}</span>
                      {o.waiterName && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg">
                          👤 {o.waiterName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                      {o.timestamp || new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {o.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="font-bold text-slate-800">{item.qty}x <span className="font-semibold text-slate-500 ml-1">{item.name}</span></span>
                        {item.specialNote && <span className="text-orange-600 font-bold text-[10px] bg-orange-50 px-1.5 py-0.5 rounded-lg">📝 {item.specialNote}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2.5 pt-2">
                    <input type="text" placeholder="Add chef notes..."
                      value={chefNotes[id] || ''}
                      onChange={(e) => handleNoteChange(id, e.target.value)}
                      className="w-full text-[11px] p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 font-semibold"/>
                    <button onClick={() => updateStatus(o, 'Preparing')}
                      className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-500/20">
                      Accept & Cook 🍳
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="bg-slate-50 border border-slate-200/55 rounded-3xl p-5 flex flex-col space-y-4 shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"/>Preparing
            </h3>
            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">{preparingOrders.length}</span>
          </div>
          <div className="space-y-4">
            {preparingOrders.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">Nothing cooking yet</div>
            )}
            {preparingOrders.map((o) => {
              const id = o._id || o.id;
              return (
                <div key={id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse"/>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{o.orderId || id}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{o.type} {o.table !== 'N/A' && `(${o.table})`}</span>
                      {o.waiterName && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg">
                          👤 {o.waiterName}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      ⏱ {getPrepTime(o.prepStartTime)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {o.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="font-bold text-slate-800">{item.qty}x <span className="font-semibold text-slate-500 ml-1">{item.name}</span></span>
                        {item.specialNote && <span className="text-orange-600 font-bold text-[10px] bg-orange-50 px-1.5 py-0.5 rounded-lg">📝 {item.specialNote}</span>}
                      </div>
                    ))}
                  </div>
                  {(o.chefNote || chefNotes[id]) && (
                    <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-700">
                      Note: {o.chefNote || chefNotes[id]}
                    </div>
                  )}
                  <button onClick={() => updateStatus(o, 'Ready')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20">
                    Mark as Ready ✅
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div className="bg-slate-50 border border-slate-200/55 rounded-3xl p-5 flex flex-col space-y-4 shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"/>Ready for Pickup
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">{readyOrders.length}</span>
          </div>
          <div className="space-y-4">
            {readyOrders.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">No ready orders</div>
            )}
            {readyOrders.map((o) => {
              const id = o._id || o.id;
              return (
                <div key={id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 space-y-4 opacity-80 hover:opacity-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"/>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{o.orderId || id}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{o.type} {o.table !== 'N/A' && `(${o.table})`}</span>
                      {o.waiterName && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg">
                          👤 {o.waiterName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                      {o.timestamp || new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {o.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="font-bold text-slate-800">{item.qty}x <span className="font-semibold text-slate-500 ml-1">{item.name}</span></span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center py-2.5 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-bold rounded-xl border border-emerald-100 shadow-inner">
                    🛎️ Awaiting Delivery / Pickup
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplay;
