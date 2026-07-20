import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import { api } from '../context/AuthContext';
import { getOrderTypeConfig } from '../utils/orderType';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [chefNotes, setChefNotes] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const { on, connected } = useSocket();

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders');
      if (data.success) {
        const active = data.data.filter(o => ['Pending', 'Preparing', 'Ready'].includes(o.status));
        setOrders(active);
      }
    } catch {
      // Fallback local storage
      const saved = localStorage.getItem('orders');
      if (saved) {
        const parsed = JSON.parse(saved).filter(o => ['Pending', 'Preparing', 'Ready'].includes(o.status));
        setOrders(parsed);
      }
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

  // Real-time listeners
  useEffect(() => {
    const handleNewOrder = (order) => {
      setOrders(prev => {
        if (prev.find(o => (o._id || o.id) === (order._id || order.id))) return prev;
        return [order, ...prev];
      });
      toast.info(`🆕 New Order: ${order.orderId || order.id} — ${order.table}`, {
        autoClose: 5000,
      });
      
      // Play alert tone
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch {}
    };

    const handleStatusUpdate = (update) => {
      setOrders(prev => prev.map(o => {
        if ((o._id || o.id) === (update.id || update._id)) {
          return { ...o, status: update.status };
        }
        return o;
      }).filter(o => ['Pending','Preparing','Ready'].includes(o.status)));
    };

    const cleanupNew = on?.('new-order', handleNewOrder);
    const cleanupStatus = on?.('order-status-update', handleStatusUpdate);

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
        Preparing: { msg: `👨‍🍳 Cooking Order #${(order.orderId || id).substring(16)}`, type: 'info' },
        Ready: { msg: `✅ Order ready for Table ${order.table}`, type: 'success' },
      };
      if (messages[newStatus]) toast[messages[newStatus].type](messages[newStatus].msg);
    } catch {
      // localstorage update fallback
      const all = JSON.parse(localStorage.getItem('orders') || '[]');
      const updated = all.map(o => o.id === id
        ? { ...o, status: newStatus, chefNote: note, prepStartTime: newStatus === 'Preparing' ? Date.now() : o.prepStartTime }
        : o);
      localStorage.setItem('orders', JSON.stringify(updated));
      setOrders(prev => prev.map(o => (o._id || o.id) === id
        ? { ...o, status: newStatus, chefNote: note }
        : o
      ).filter(o => ['Pending','Preparing','Ready'].includes(o.status)));
      toast.warning('⚠️ Saved status locally');
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
    <div className="flex items-center justify-center py-28">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs font-bold text-slate-400">Loading KDS Orders Queue...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out] font-sans pb-12">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kitchen Display Screen (KDS)</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage live food preparation stages and track active timers.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Socket live monitor status */}
          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-all ${
            connected ? 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-500/5' : 'text-red-500 bg-red-50 border-red-100'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`}/>
            {connected ? 'Live Monitor Active' : 'Reconnecting...'}
          </span>
          <button 
            onClick={fetchOrders}
            className="text-[10px] font-black uppercase text-slate-500 bg-white border border-slate-100 px-4 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer shadow-sm transition-all"
          >
            Refresh 🔄
          </button>
        </div>
      </div>

      {/* ── KDS COLUMNS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Column 1: New Orders (Pending) */}
        <div className="bg-slate-50/50 border border-slate-100/70 rounded-3xl p-5 flex flex-col space-y-4 shadow-sm min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"/>New Orders
            </h3>
            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-100">{pendingOrders.length}</span>
          </div>
          
          <div className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-bold leading-normal">
                No pending orders 🎉<br/>
                <span className="font-semibold text-[10px] text-slate-400 opacity-60">Ready for incoming requests</span>
              </div>
            ) : (
              pendingOrders.map((o) => {
                const id = o._id || o.id;
                return (
                  <div key={id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"/>
                    <div className="flex justify-between items-start border-b border-slate-50 pb-2.5">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{o.orderId || id.substring(id.length - 8).toUpperCase()}</h4>
                        <span className={`text-[8.5px] font-black uppercase tracking-wider inline-flex items-center gap-1 px-2 py-0.5 rounded-full border mt-1 ${getOrderTypeConfig(o.type).badgeBg}`}>
                          {getOrderTypeConfig(o.type).icon} {o.type} {o.table !== 'N/A' && `(Table ${o.table})`}
                        </span>
                        {o.waiterName && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[8.5px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                            👤 {o.waiterName}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        {o.timestamp || new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Order Items list */}
                    <div className="space-y-2">
                      {o.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                          <span className="font-extrabold text-slate-800">
                            {item.qty}x <span className="font-bold text-slate-600 ml-1.5">{item.name}</span>
                          </span>
                          {item.specialNote && (
                            <span className="text-orange-600 font-extrabold text-[9px] bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100 animate-pulse">
                              📝 {item.specialNote}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Chef notes input + CTA */}
                    <div className="space-y-3 pt-2.5 border-t border-slate-50">
                      <input 
                        type="text" 
                        placeholder="Add chef notes..."
                        value={chefNotes[id] || ''}
                        onChange={(e) => handleNoteChange(id, e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 focus:bg-white font-bold"
                      />
                      <button 
                        onClick={() => updateStatus(o, 'Preparing')}
                        className="w-full py-2.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-500/10 cursor-pointer"
                      >
                        Accept & Cook 🍳
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="bg-slate-50/50 border border-slate-100/70 rounded-3xl p-5 flex flex-col space-y-4 shadow-sm min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse"/>Preparing
            </h3>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-100">{preparingOrders.length}</span>
          </div>

          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-bold leading-normal">
                Nothing cooking yet 👨‍🍳<br/>
                <span className="font-semibold text-[10px] text-slate-400 opacity-60">Ready to prepare next meal</span>
              </div>
            ) : (
              preparingOrders.map((o) => {
                const id = o._id || o.id;
                return (
                  <div key={id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 animate-pulse"/>
                    <div className="flex justify-between items-start border-b border-slate-50 pb-2.5">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{o.orderId || id.substring(id.length - 8).toUpperCase()}</h4>
                        <span className={`text-[8.5px] font-black uppercase tracking-wider inline-flex items-center gap-1 px-2 py-0.5 rounded-full border mt-1 ${getOrderTypeConfig(o.type).badgeBg}`}>
                          {getOrderTypeConfig(o.type).icon} {o.type} {o.table !== 'N/A' && `(Table ${o.table})`}
                        </span>
                        {o.waiterName && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[8.5px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                            👤 {o.waiterName}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100 shadow-sm animate-pulse flex items-center gap-1">
                        ⏱️ {getPrepTime(o.prepStartTime)}
                      </span>
                    </div>

                    {/* Order Items list */}
                    <div className="space-y-2">
                      {o.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                          <span className="font-extrabold text-slate-800">
                            {item.qty}x <span className="font-bold text-slate-600 ml-1.5">{item.name}</span>
                          </span>
                          {item.specialNote && (
                            <span className="text-orange-600 font-extrabold text-[9px] bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                              📝 {item.specialNote}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Chef notes display */}
                    {(o.chefNote || chefNotes[id]) && (
                      <div className="p-3 bg-amber-50/50 border border-amber-100/50 rounded-xl text-[10px] font-bold text-amber-700 leading-relaxed">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Instruction Notes</span>
                        "{o.chefNote || chefNotes[id]}"
                      </div>
                    )}

                    <button 
                      onClick={() => updateStatus(o, 'Ready')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                    >
                      Mark as Ready ✅
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div className="bg-slate-50/50 border border-slate-100/70 rounded-3xl p-5 flex flex-col space-y-4 shadow-sm min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"/>Ready for Pickup
            </h3>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">{readyOrders.length}</span>
          </div>

          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-bold leading-normal">
                No ready orders 🍽️<br/>
                <span className="font-semibold text-[10px] text-slate-400 opacity-60">Awaiting waiter pickup/delivery</span>
              </div>
            ) : (
              readyOrders.map((o) => {
                const id = o._id || o.id;
                return (
                  <div key={id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 space-y-4 relative overflow-hidden opacity-90 hover:opacity-100">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"/>
                    <div className="flex justify-between items-start border-b border-slate-50 pb-2.5">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{o.orderId || id.substring(id.length - 8).toUpperCase()}</h4>
                        <span className={`text-[8.5px] font-black uppercase tracking-wider inline-flex items-center gap-1 px-2 py-0.5 rounded-full border mt-1 ${getOrderTypeConfig(o.type).badgeBg}`}>
                          {getOrderTypeConfig(o.type).icon} {o.type} {o.table !== 'N/A' && `(Table ${o.table})`}
                        </span>
                        {o.waiterName && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[8.5px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                            👤 {o.waiterName}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        {o.timestamp || new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Order Items list */}
                    <div className="space-y-2">
                      {o.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                          <span className="font-extrabold text-slate-800">
                            {item.qty}x <span className="font-bold text-slate-600 ml-1.5">{item.name}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={async () => {
                        try {
                          await api.put(`/orders/${id}/status`, { status: 'Served' });
                          setOrders(prev => prev.filter(order => (order._id || order.id) !== id));
                          toast.success(`🍽️ Order marked as served!`);
                        } catch {
                          toast.error("Failed to update status.");
                        }
                      }}
                      className="w-full text-center py-2.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-[#10B981] text-[10px] uppercase tracking-wider font-black rounded-xl border border-emerald-200 shadow-sm transition-all cursor-pointer select-none"
                    >
                      🛎️ Mark as Served
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default KitchenDisplay;
