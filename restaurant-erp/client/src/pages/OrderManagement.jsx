import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { SkeletonTableRow } from '../components/LoadingSkeleton';
import { useVoiceOrder } from '../hooks/useVoiceOrder';
import MenuItemImage from '../components/MenuItemImage';

const OrderManagement = () => {
  const { on, connected } = useSocket();
  const [activeTab, setActiveTab]       = useState('pos');
  const [loading, setLoading]           = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [menuItems, setMenuItems]         = useState([]);
  const [categories, setCategories]       = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [tables, setTables]               = useState([]);   // ✅ API from
  const [staffList, setStaffList]         = useState([]);   // ✅ API from
  const [orderType, setOrderType]         = useState('Dine-in');
  const [selectedTable, setSelectedTable] = useState('');
  const [guestCount, setGuestCount]       = useState(4);
  const [waiterName, setWaiterName]       = useState('');
  const [cart, setCart]                   = useState([]);
  const [orders, setOrders]               = useState([]);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // ── Edit / Cancel modal state ──────────────────────────────
  const [editOrder, setEditOrder]         = useState(null);  // order being edited
  const [editCart, setEditCart]           = useState([]);    // edit modal cart
  const [savingEdit, setSavingEdit]       = useState(false);
  const [cancellingId, setCancellingId]   = useState(null);

  // ── Load menu, tables, staff, orders on mount ────────────
  useEffect(() => {
    const loadMenu = async () => {
      const savedMenu = localStorage.getItem('menuItems');
      if (savedMenu) {
        const parsed = JSON.parse(savedMenu).filter(m => m.available);
        setMenuItems(parsed);
        setCategories(['All', ...Array.from(new Set(parsed.map(m => m.category)))]);
      }
      try {
        const { data } = await api.get('/menu?available=true');
        if (data.success && data.data.length > 0) {
          const items = data.data.map(i => ({ ...i, id: i._id }));
          setMenuItems(items);
          setCategories(['All', ...Array.from(new Set(items.map(m => m.category)))]);
          localStorage.setItem('menuItems', JSON.stringify(items));
        }
      } catch { /* already loaded from localStorage */ }
    };

    // ✅ Fix 1: Tables from API, not localStorage
    const loadTables = async () => {
      try {
        const { data } = await api.get('/tables');
        if (data.success) {
          setTables(data.data);
          if (data.data.length > 0 && !selectedTable) {
            setSelectedTable(data.data[0].name);
          }
        }
      } catch {
        // fallback to localStorage if API fails
        const saved = localStorage.getItem('tables');
        if (saved) {
          const parsed = JSON.parse(saved);
          setTables(parsed);
          if (parsed.length > 0 && !selectedTable) setSelectedTable(parsed[0].name);
        }
      }
    };

    // ✅ Fix 2: Staff from API, not localStorage
    const loadStaff = async () => {
      try {
        const { data } = await api.get('/staff');
        if (data.success) {
          setStaffList(data.data);
          localStorage.setItem('staff', JSON.stringify(data.data));
        }
      } catch {
        const saved = localStorage.getItem('staff');
        if (saved) setStaffList(JSON.parse(saved));
      }
    };

    const loadOrders = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/orders');
        if (data.success) setOrders(data.data);
      } catch {
        const saved = localStorage.getItem('orders');
        if (saved) setOrders(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
    loadTables();
    loadStaff();
    loadOrders();
  }, []);

  // 🔌 Live order status updates via socket
  useEffect(() => {
    const handleStatusUpdate = (update) => {
      setOrders(prev => prev.map(o =>
        (o._id || o.id) === (update.id || update._id) ? { ...o, status: update.status } : o
      ));
      if (update.status === 'Ready') {
        toast.success(`🔔 Order ${update.orderId} is READY — ${update.table}!`, { autoClose: 8000 });
      }
    };
    const cleanup = on?.('order-status-update', handleStatusUpdate);
    return () => cleanup?.();
  }, [on]);

  // ── Cart helpers ──────────────────────────────────────────
  const addToCart = useCallback((item, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => (i._id || i.id) === (item._id || item.id));
      if (existing) return prev.map(i => (i._id || i.id) === (item._id || item.id) ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...item, id: item._id || item.id, qty }];
    });
  }, []);

  const removeFromCartByItem = useCallback((item) => {
    setCart(prev => prev.filter(i => (i._id || i.id) !== (item._id || item.id)));
    toast.info(`🗑️ ${item.name} removed from cart`);
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const updateQty = (id, change) => {
    setCart(prev => prev.map(i => {
      if ((i._id || i.id) === id) {
        const newQty = i.qty + change;
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  // ── Place Order ───────────────────────────────────────────
  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    const sub = cartTotal;
    const newOrder = {
      type: orderType,
      table: orderType === 'Dine-in' ? selectedTable : 'N/A',
      items: cart.map(i => ({ ...i, menuItemId: i.id })),
      subtotal: sub,
      gst: Math.round(sub * 0.05),
      total: Math.round(sub * 1.05),
      guestCount,
      waiterName,
    };
    try {
      const { data } = await api.post('/orders', newOrder);
      if (data.success) {
        setOrders(prev => [data.data, ...prev]);
        setCart([]);
        toast.success(`✅ Order ${data.data.orderId} placed! Kitchen notified.`, { autoClose: 4000 });
      }
    } catch {
      const fallback = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        ...newOrder,
        status: 'Pending',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
      };
      setOrders(prev => {
        const updated = [fallback, ...prev];
        localStorage.setItem('orders', JSON.stringify(updated));
        return updated;
      });
      setCart([]);
      toast.warning(`⚠️ Offline mode — Order ${fallback.id} saved locally`);
    } finally {
      setPlacingOrder(false);
    }
  };

  // ✅ Fix 3: Cancel Order ─────────────────────────────────
  const cancelOrder = async (order) => {
    const id = order._id || order.id;
    if (!window.confirm(`Cancel order ${order.orderId || id}? Inventory will be restored.`)) return;
    setCancellingId(id);
    try {
      const { data } = await api.patch(`/orders/${id}/cancel`);
      if (data.success) {
        setOrders(prev => prev.map(o => (o._id || o.id) === id ? { ...o, status: 'Cancelled' } : o));
        toast.success(`🚫 Order ${order.orderId || id} cancelled. Stock restored.`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Cancel failed';
      toast.error(`❌ ${msg}`);
    } finally {
      setCancellingId(null);
    }
  };

  // ✅ Fix 4: Edit Order (Pending only) ─────────────────────
  const openEditModal = (order) => {
    setEditOrder(order);
    setEditCart(order.items.map(i => ({ ...i, id: i.menuItemId || i._id || i.id })));
  };

  const closeEditModal = () => { setEditOrder(null); setEditCart([]); };

  const editUpdateQty = (id, change) => {
    setEditCart(prev => prev.map(i => {
      if ((i.menuItemId || i.id) === id) {
        const newQty = i.qty + change;
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean));
  };

  const editAddItem = (item) => {
    setEditCart(prev => {
      const key = item._id || item.id;
      const existing = prev.find(i => (i.menuItemId || i.id) === key);
      if (existing) return prev.map(i => (i.menuItemId || i.id) === key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, id: item._id || item.id, menuItemId: item._id || item.id, qty: 1 }];
    });
  };

  const saveEditedOrder = async () => {
    if (!editOrder || editCart.length === 0) return;
    setSavingEdit(true);
    const id = editOrder._id || editOrder.id;
    const sub = editCart.reduce((s, i) => s + i.price * i.qty, 0);
    try {
      const { data } = await api.put(`/orders/${id}/items`, {
        items: editCart.map(i => ({ ...i, menuItemId: i.menuItemId || i.id })),
        subtotal: sub,
        gst: Math.round(sub * 0.05),
        total: Math.round(sub * 1.05),
      });
      if (data.success) {
        setOrders(prev => prev.map(o => (o._id || o.id) === id ? data.data : o));
        toast.success(`✏️ Order ${editOrder.orderId || id} updated!`);
        closeEditModal();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Edit failed';
      toast.error(`❌ ${msg}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Voice Order Hook ──────────────────────────────────────
  const voice = useVoiceOrder({
    menuItems,
    onAddItem: (item, qty) => {
      addToCart(item, qty);
      toast.success(`🎤 Added ${qty}x ${item.name} via voice!`, { autoClose: 2500 });
    },
    onRemoveItem: removeFromCartByItem,
    onClearCart: clearCart,
    onPlaceOrder: placeOrder,
  });

  const filteredItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  // ── Status color helper ───────────────────────────────────
  const statusClass = (s) => ({
    Completed: 'bg-slate-100 text-slate-600',
    Ready:     'bg-green-50 text-green-700',
    Preparing: 'bg-yellow-50 text-yellow-700',
    Cancelled: 'bg-red-50 text-red-600',
    Pending:   'bg-blue-50 text-blue-700',
  }[s] || 'bg-slate-50 text-slate-500');

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Order Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Take tableside POS orders and view historical records.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
            connected ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-50 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}/>
            {connected ? 'Live' : 'Offline'}
          </span>
          <div className="flex space-x-2 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
            {['pos', 'history'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {tab === 'pos' ? '🛒 POS Terminal' : '📋 Order History'}
              </button>
            ))}
          </div>
          {voice.supported && (
            <button onClick={() => setShowVoicePanel(v => !v)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border shadow-sm ${
                showVoicePanel
                  ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-500'
              }`}>
              🎤 Voice Order
            </button>
          )}
        </div>
      </div>

      {/* ── Voice Panel ── */}
      {showVoicePanel && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                🎤 Voice Order Assistant
                <span className="text-[9px] font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">Web Speech API</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Say: <span className="text-slate-200">"2 biryani and 1 mango lassi"</span> or <span className="text-slate-200">"clear cart"</span>
              </p>
            </div>
            <button onClick={() => setShowVoicePanel(false)} className="text-slate-500 hover:text-slate-300 text-lg font-bold">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center gap-3">
              <button onClick={voice.isListening ? voice.stopListening : voice.startListening}
                className={`relative w-20 h-20 rounded-full font-bold text-3xl transition-all shadow-2xl ${
                  voice.isListening ? 'bg-rose-500 hover:bg-rose-600 animate-pulse' : 'bg-indigo-500 hover:bg-indigo-600'
                }`}>
                {voice.isListening ? '⏹' : '🎤'}
                {voice.isListening && <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-60"/>}
              </button>
              <p className="text-[10px] font-bold text-slate-400">{voice.isListening ? 'Tap to stop' : 'Tap to speak'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Transcript</p>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 min-h-[64px] flex items-center">
                <p className={`text-sm font-medium ${voice.transcript ? 'text-white' : 'text-slate-600 italic'}`}>
                  {voice.transcript || 'Waiting for speech...'}
                </p>
              </div>
              <p className={`text-xs font-semibold ${voice.statusMsg?.startsWith('✅') ? 'text-emerald-400' : voice.statusMsg?.startsWith('❌') ? 'text-rose-400' : 'text-slate-400'}`}>
                {voice.statusMsg || 'Ready'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Commands</p>
              {[['Add', '"2 biryani and 1 lassi"'], ['Remove', '"remove biryani"'], ['Clear', '"clear cart"'], ['Place', '"place order"']].map(([l, c]) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 font-bold w-14">{l}</span>
                  <span className="text-[10px] text-indigo-300 font-mono bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── POS TAB ── */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Cart */}
          <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-100/80 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">Active Bill</h3>
              <div className="flex space-x-2">
                {['Dine-in', 'Takeaway'].map(type => (
                  <button key={type} onClick={() => setOrderType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      orderType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}>{type}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* ✅ Fix 1: Table from API */}
              {orderType === 'Dine-in' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Table</label>
                  <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold">
                    {tables.length === 0
                      ? <option>Loading tables...</option>
                      : tables.map(t => (
                          <option key={t._id} value={t.name}>{t.name} ({t.status})</option>
                        ))
                    }
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">No. of Guests</label>
                <input type="number" min="1" value={guestCount} onChange={e => setGuestCount(parseInt(e.target.value) || 1)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold"/>
              </div>
            </div>

            {/* ✅ Fix 2: Staff from API */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Assigned Waiter <span className="text-slate-300">(optional)</span>
              </label>
              <select value={waiterName} onChange={e => setWaiterName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold">
                <option value="">— No waiter assigned —</option>
                {staffList
                  .filter(s => ['Waiter', 'Manager', 'Admin'].includes(s.role))
                  .map(s => (
                    <option key={s._id} value={s.name}>{s.name} ({s.role})</option>
                  ))
                }
              </select>
            </div>

            {/* Cart items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Price</span>
              </div>
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">Cart is empty. Select items to checkout.</div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item._id || item.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="w-1/2 flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50 shrink-0">
                          <MenuItemImage src={item.image} alt={item.name}
                            imgClassName="w-8 h-8 object-cover"
                            emojiClassName="text-xl" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs truncate max-w-[120px]">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">₹{item.price}</span>
                        </div>
                      </div>
                      <div className="w-1/4 flex items-center justify-center space-x-2 bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl">
                        <button onClick={() => updateQty(item._id || item.id, -1)} className="text-slate-400 hover:text-indigo-600 font-bold text-sm px-1">-</button>
                        <span className="font-bold text-slate-800 text-xs w-4 text-center">{item.qty}</span>
                        <button onClick={() => addToCart(item)} className="text-slate-400 hover:text-indigo-600 font-bold text-sm px-1">+</button>
                      </div>
                      <span className="w-1/4 text-right font-bold text-slate-800 text-xs">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals & Place */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="flex justify-between text-xs font-semibold text-slate-500"><span>Subtotal</span><span>₹{cartTotal}</span></div>
                <div className="flex justify-between text-xs font-semibold text-slate-500"><span>GST (5%)</span><span>₹{Math.round(cartTotal * 0.05)}</span></div>
                <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-100 pt-3 text-slate-800"><span>Total</span><span>₹{Math.round(cartTotal * 1.05)}</span></div>
                <div className="flex space-x-3 pt-3">
                  <button onClick={clearCart} className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs transition-all">Cancel</button>
                  <button onClick={placeOrder} disabled={placingOrder}
                    className="flex-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2">
                    {placingOrder
                      ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Placing...</>
                      : `Place Order (₹${Math.round(cartTotal * 1.05)})`
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Menu grid */}
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-100/80 p-6 space-y-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {categories.map(c => (
                <button key={c} onClick={() => setActiveCategory(c)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredItems.length === 0 && <p className="col-span-3 text-center text-sm text-slate-400 py-10">No items available.</p>}
              {filteredItems.map(item => (
                <div key={item.id} onClick={() => addToCart(item)}
                  className="bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-500/50 rounded-3xl p-4 flex flex-col justify-between items-center text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group">
                  <div className="h-16 w-full flex items-center justify-center mb-3 overflow-hidden rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <MenuItemImage src={item.image} alt={item.name}
                      imgClassName="h-16 w-full object-cover rounded-2xl"
                      emojiClassName="text-4xl" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">₹{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-800">Historical & Active Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Waiter</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                  {/* ✅ Fix 3 & 4: Actions column */}
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)
                ) : orders.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-slate-400 py-12 font-semibold">No order history available.</td></tr>
                ) : (
                  orders.map(o => {
                    const id = o._id || o.id;
                    const canEdit   = o.status === 'Pending';
                    const canCancel = !['Completed', 'Cancelled'].includes(o.status);
                    return (
                      <tr key={id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                        <td className="py-4 font-bold text-slate-800">{o.orderId || id}</td>
                        <td className="py-4 font-semibold text-slate-500 text-xs">{o.date} {o.timestamp || new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-4 font-semibold text-slate-500 text-xs">{o.type} {o.table !== 'N/A' && `(${o.table})`}</td>
                        <td className="py-4 font-medium text-slate-500 text-xs max-w-xs truncate">{o.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
                        <td className="py-4 text-xs">
                          {o.waiterName
                            ? <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">👤 {o.waiterName}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-4 font-bold text-slate-800 text-xs">₹{o.total}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusClass(o.status)}`}>{o.status}</span>
                        </td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            {/* ✅ Edit button — Pending only */}
                            {canEdit && (
                              <button onClick={() => openEditModal(o)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition-all">
                                ✏️ Edit
                              </button>
                            )}
                            {/* ✅ Cancel button */}
                            {canCancel && (
                              <button onClick={() => cancelOrder(o)}
                                disabled={cancellingId === id}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-all disabled:opacity-50">
                                {cancellingId === id ? '...' : '🚫 Cancel'}
                              </button>
                            )}
                            {!canEdit && !canCancel && (
                              <span className="text-[10px] text-slate-300 font-medium">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit Order Modal ── */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeEditModal}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800">✏️ Edit Order</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{editOrder.orderId} · {editOrder.table} · Only Pending orders can be edited</p>
              </div>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current items in edit cart */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Items</h4>
                {editCart.length === 0
                  ? <p className="text-xs text-slate-400 italic">No items — cancel order instead.</p>
                  : editCart.map(item => {
                      const key = item.menuItemId || item.id;
                      return (
                        <div key={key} className="flex justify-between items-center bg-slate-50 rounded-2xl p-3 border border-slate-100">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400">₹{item.price} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => editUpdateQty(key, -1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-500 font-bold text-sm flex items-center justify-center">-</button>
                            <span className="text-sm font-bold text-slate-800 w-5 text-center">{item.qty}</span>
                            <button onClick={() => editUpdateQty(key, 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-500 font-bold text-sm flex items-center justify-center">+</button>
                          </div>
                        </div>
                      );
                    })
                }
                {/* Running total */}
                <div className="border-t border-slate-100 pt-3 space-y-1">
                  {(() => {
                    const sub = editCart.reduce((s, i) => s + i.price * i.qty, 0);
                    return (
                      <>
                        <div className="flex justify-between text-xs font-semibold text-slate-400"><span>Subtotal</span><span>₹{sub}</span></div>
                        <div className="flex justify-between text-xs font-semibold text-slate-400"><span>GST (5%)</span><span>₹{Math.round(sub * 0.05)}</span></div>
                        <div className="flex justify-between text-sm font-bold text-slate-800"><span>Total</span><span>₹{Math.round(sub * 1.05)}</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Add more items from menu */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add More Items</h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {menuItems.map(item => (
                    <button key={item.id} onClick={() => editAddItem(item)}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl p-3 transition-all group">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.image}</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">₹{item.price}</p>
                        </div>
                      </div>
                      <span className="text-indigo-400 group-hover:text-indigo-600 font-bold text-lg">+</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={closeEditModal} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-2xl text-xs hover:bg-slate-100 transition-all">Discard Changes</button>
              <button onClick={saveEditedOrder} disabled={savingEdit || editCart.length === 0}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2">
                {savingEdit
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>
                  : '💾 Save Changes'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
