import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { SkeletonTableRow } from '../components/LoadingSkeleton';
import { useVoiceOrder } from '../hooks/useVoiceOrder';
import MenuItemImage from '../components/MenuItemImage';

const OrderManagement = () => {
  const { on, connected } = useSocket();
  const [searchParams] = useSearchParams();
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
  const [mobileActiveView, setMobileActiveView] = useState('menu'); // 'menu' | 'cart'


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

    // Auto-switch tab from URL query param (?tab=history)
    const tabParam = searchParams.get('tab');
    if (tabParam === 'history') setActiveTab('history');
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
    toast.success(`🛒 Added ${item.name} to bill!`, { autoClose: 1000, toastId: `add-${item.id || item._id}` });
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

  // ── Status color helper ──
  const statusClass = (s) => ({
    Completed: 'bg-slate-100 text-slate-600 border border-slate-200/50',
    Ready:     'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
    Preparing: 'bg-amber-50 text-amber-700 border border-amber-250/50 animate-pulse',
    Cancelled: 'bg-rose-50 text-rose-600 border border-rose-250/50',
    Pending:   'bg-indigo-50 text-indigo-700 border border-indigo-250/50',
  }[s] || 'bg-slate-50 text-slate-550 border border-slate-200/50');

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out] pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Order Intake Terminal</h2>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Take tableside POS orders and view historical records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-2xl flex items-center gap-1.5 border transition-all ${
            connected ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-450 bg-slate-50 border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`}/>
            {connected ? 'Live Sync' : 'Offline'}
          </span>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-sm shrink-0">
            {['pos', 'history'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-sm font-black' : 'text-slate-550 hover:bg-slate-200/40 hover:text-indigo-650'
                }`}>
                {tab === 'pos' ? '🛒 POS Terminal' : '📋 Order History'}
              </button>
            ))}
          </div>
          {voice.supported && (
            <button onClick={() => setShowVoicePanel(v => !v)}
              className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center gap-1.5 border shadow-sm cursor-pointer ${
                showVoicePanel
                  ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/20'
                  : 'bg-white text-slate-655 border-slate-200 hover:border-rose-350 hover:text-rose-500'
              }`}>
              🎤 Voice Order
            </button>
          )}
        </div>
      </div>

      {/* ── Voice Panel ── */}
      {showVoicePanel && (
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 border border-slate-800/80 shadow-[0_15px_40px_rgba(0,0,0,0.4)] transition-all animate-[slideDown_0.2s_ease-out]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-wide uppercase">
                🎤 Smart Voice Assistant
                <span className="text-[9px] font-black text-indigo-400 bg-indigo-950/65 px-2.5 py-0.5 rounded-full border border-indigo-900/40">Active</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Speak directly into your mic. We support English, Tamil, and Hindi transliterations!
              </p>
            </div>
            <button onClick={() => setShowVoicePanel(false)} className="text-slate-500 hover:text-white transition-colors text-lg font-bold p-1 cursor-pointer">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center gap-3 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <button onClick={voice.isListening ? voice.stopListening : voice.startListening}
                className={`relative w-20 h-20 rounded-full font-bold text-3xl transition-all active:scale-95 shadow-2xl flex items-center justify-center cursor-pointer ${
                  voice.isListening 
                    ? 'bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-500/25 animate-pulse text-white' 
                    : 'bg-gradient-to-tr from-indigo-500 to-indigo-600 hover:from-indigo-650 hover:to-indigo-700 shadow-indigo-600/10 text-white'
                }`}>
                {voice.isListening ? '⏹' : '🎤'}
                {voice.isListening && <span className="absolute inset-0 rounded-full border-4 border-rose-450 animate-ping opacity-60"/>}
              </button>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{voice.isListening ? 'Tap to stop' : 'Tap to speak'}</p>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Live Transcript</p>
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 min-h-[85px] flex items-center shadow-inner">
                <p className={`text-xs font-bold ${voice.transcript ? 'text-slate-100' : 'text-slate-655 italic'}`}>
                  {voice.transcript || 'Speak now... (e.g. "two paneer tikka and one coke")'}
                </p>
              </div>
              <p className={`text-xs font-black ${voice.statusMsg?.startsWith('✅') ? 'text-emerald-450' : voice.statusMsg?.startsWith('❌') ? 'text-rose-455' : 'text-slate-400'}`}>
                {voice.statusMsg || 'Voice Engine Online'}
              </p>
            </div>
            <div className="space-y-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
              <p className="text-[10px] font-black text-slate-555 uppercase tracking-wider">Example Commands</p>
              <div className="space-y-2">
                {[
                  ['Add Items', '"2 biryani and 1 lassi"'],
                  ['Remove', '"remove biryani"'],
                  ['Clear All', '"clear cart"'],
                  ['Checkout', '"place order"']
                ].map(([l, c]) => (
                  <div key={l} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="text-slate-400 font-bold">{l}</span>
                    <span className="text-indigo-300 font-mono bg-indigo-950/40 border border-indigo-900/35 px-2 py-0.5 rounded-lg select-all">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POS TAB ── */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          {/* Mobile-only switcher */}
          <div className="lg:hidden flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
            <button 
              type="button"
              onClick={() => setMobileActiveView('menu')}
              className={`flex-1 py-3.5 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                mobileActiveView === 'menu'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-black'
                  : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              🍽️ Browse Menu
            </button>
            <button 
              type="button"
              onClick={() => setMobileActiveView('cart')}
              className={`flex-1 py-3.5 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 relative cursor-pointer ${
                mobileActiveView === 'cart'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-black'
                  : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              🛒 Active Bill
              {cart.length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-md animate-bounce">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Cart (Active Bill) */}
            <div className={`lg:col-span-5 bg-white rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.012)] border border-slate-100 p-5 space-y-6 ${
              mobileActiveView === 'cart' ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-base font-extrabold text-slate-800">Active Bill</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                  {['Dine-in', 'Takeaway'].map(type => (
                    <button key={type} onClick={() => setOrderType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                        orderType === type 
                          ? 'bg-indigo-600 text-white shadow-sm font-black' 
                          : 'text-slate-500 hover:text-indigo-600'
                      }`}>{type}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {orderType === 'Dine-in' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">Select Table</label>
                    <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)}
                      className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-650 text-xs font-extrabold text-slate-700 transition-all cursor-pointer">
                      {tables.length === 0
                        ? <option>Loading tables...</option>
                        : tables.map(t => (
                            <option key={t._id} value={t.name}>{t.name} ({t.status})</option>
                          ))
                      }
                    </select>
                  </div>
                )}
                <div className={orderType !== 'Dine-in' ? 'col-span-2' : ''}>
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">No. of Guests</label>
                  <input type="number" min="1" value={guestCount} onChange={e => setGuestCount(parseInt(e.target.value) || 1)}
                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-650 text-xs font-extrabold text-slate-750 transition-all"/>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">
                  Assigned Waiter <span className="text-slate-350">(optional)</span>
                </label>
                <select value={waiterName} onChange={e => setWaiterName(e.target.value)}
                  className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-650 text-xs font-extrabold text-slate-700 transition-all cursor-pointer">
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
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  <span className="w-1/2">Item</span>
                  <span className="w-1/4 text-center">Qty</span>
                  <span className="w-1/4 text-right">Price</span>
                </div>
                {cart.length === 0 ? (
                  <div className="py-14 text-center text-slate-405 text-xs font-bold bg-slate-50/40 border border-dashed border-slate-200 rounded-2xl">
                    <span className="text-2xl block mb-2">🛒</span>
                    Cart is empty.<br/>Browse menu to add dishes.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div key={item._id || item.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                        <div className="w-1/2 flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-slate-150 shrink-0">
                            <MenuItemImage src={item.image} alt={item.name}
                              imgClassName="w-9 h-9 object-contain p-1"
                              emojiClassName="text-xl" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-800 block text-xs truncate max-w-[130px]" title={item.name}>{item.name}</span>
                            <span className="text-[10px] text-slate-450 font-extrabold">₹{item.price}</span>
                          </div>
                        </div>
                        <div className="w-1/4 flex items-center justify-center space-x-2 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-xl">
                          <button onClick={() => updateQty(item._id || item.id, -1)} className="text-slate-550 hover:text-indigo-650 font-black text-sm px-1.5 cursor-pointer">-</button>
                          <span className="font-extrabold text-slate-800 text-xs w-4 text-center select-none">{item.qty}</span>
                          <button onClick={() => addToCart(item)} className="text-slate-550 hover:text-indigo-650 font-black text-sm px-1.5 cursor-pointer">+</button>
                        </div>
                        <span className="w-1/4 text-right font-extrabold text-slate-800 text-xs">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals & Place */}
              {cart.length > 0 && (
                <div className="border-t border-slate-100 pt-5 space-y-3.5">
                  <div className="flex justify-between text-xs font-extrabold text-slate-450"><span>Subtotal</span><span>₹{cartTotal}</span></div>
                  <div className="flex justify-between text-xs font-extrabold text-slate-450"><span>GST (5%)</span><span>₹{Math.round(cartTotal * 0.05)}</span></div>
                  <div className="flex justify-between text-sm font-black border-t border-dashed border-slate-150 pt-3.5 text-slate-800"><span>Total</span><span>₹{Math.round(cartTotal * 1.05)}</span></div>
                  <div className="flex space-x-3 pt-2">
                    <button onClick={clearCart} className="flex-1 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold rounded-2xl text-xs transition-all cursor-pointer text-center">Clear</button>
                    <button onClick={placeOrder} disabled={placingOrder}
                      className="flex-2 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-750 disabled:opacity-60 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer">
                      {placingOrder
                        ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Placing...</>
                        : `Place Order (₹${Math.round(cartTotal * 1.05)})`
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Menu catalog */}
            <div className={`lg:col-span-7 bg-white rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.012)] border border-slate-100 p-5 space-y-6 ${
              mobileActiveView === 'menu' ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-55">
                {categories.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap border-2 ${
                      activeCategory === c 
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-750 text-white border-transparent shadow-md' 
                        : 'bg-slate-50/50 text-slate-550 border-slate-100 hover:border-slate-200 hover:bg-slate-100'
                    }`}>{c}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4.5">
                {filteredItems.length === 0 && <p className="col-span-3 text-center text-sm text-slate-455 py-14 font-bold bg-slate-50/50 rounded-2xl border border-slate-100">No items available.</p>}
                {filteredItems.map(item => {
                  const isNonVeg = ['chicken', 'biryani', 'fish', 'prawn', 'meat', 'mutton', 'egg'].some(keyword => item.name.toLowerCase().includes(keyword));
                  return (
                    <div key={item.id} onClick={() => addToCart(item)}
                      className="bg-slate-50/40 hover:bg-white border border-slate-100 hover:border-indigo-500/40 rounded-3xl p-3.5 flex flex-col justify-between items-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative overflow-hidden select-none">
                      
                      {/* Veg / Non-veg dot label */}
                      <span className={`absolute top-2.5 left-2.5 w-3 h-3 rounded-full border border-white flex items-center justify-center ${isNonVeg ? 'bg-red-500' : 'bg-emerald-500'}`} title={isNonVeg ? 'Non-Veg' : 'Veg'}>
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      </span>
                      
                      <div className="h-20 w-full flex items-center justify-center mb-3.5 overflow-hidden rounded-2xl bg-white border border-slate-100/50 group-hover:scale-105 transition-transform duration-300">
                        <MenuItemImage src={item.image} alt={item.name}
                          imgClassName="h-20 w-full object-contain rounded-2xl p-1 bg-white"
                          emojiClassName="text-4xl" />
                      </div>
                      <div className="space-y-1.5 w-full">
                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[130px] mx-auto" title={item.name}>{item.name}</h4>
                        <p className="text-[10.5px] text-slate-500 font-extrabold">₹{item.price}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
            <h3 className="text-base font-extrabold text-slate-850">Historical & Active Orders</h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-105 px-3 py-1.5 rounded-xl">
              Total: {orders.length}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-150 rounded w-1/3" />
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-150 rounded w-3/4" />
                    <div className="h-3 bg-slate-150 rounded w-1/2" />
                  </div>
                  <div className="h-8 bg-slate-150 rounded-2xl w-full" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-slate-400 py-16 font-extrabold bg-white rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.012)]">
              <span className="text-3xl block mb-2">📋</span>
              No order history available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {orders.map(o => {
                const id = o._id || o.id;
                const canEdit   = o.status === 'Pending';
                const canCancel = !['Completed', 'Cancelled'].includes(o.status);
                return (
                  <div key={id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.012)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group">
                    {/* Top status bar & ID */}
                    <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                      <div>
                        <span className="text-[10px] font-black text-indigo-650 bg-indigo-50/50 px-2.5 py-1 rounded-lg uppercase border border-indigo-100/50 tracking-wider">
                          {o.orderId || id.slice(-8).toUpperCase()}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                          📅 {o.date} {o.timestamp || new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${statusClass(o.status)}`}>
                        {o.status}
                      </span>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-3.5 flex-1">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Type</span>
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 bg-slate-50/80 p-2 rounded-xl border border-slate-100 w-fit">
                          <span>🍽️</span>
                          <span>{o.type} {o.table !== 'N/A' && `(Table ${o.table.match(/\d+/)?.[0] || o.table})`}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Items ({o.items?.reduce((s, i) => s + i.qty, 0) || 0})</span>
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {o.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-650 bg-slate-50/40 p-2 rounded-xl border border-slate-100/50">
                              <span className="truncate max-w-[170px]" title={item.name}>{item.name}</span>
                              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">x{item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Waiter Assigned */}
                      {o.waiterName && (
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Assigned Waiter</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-650 bg-indigo-50/40 px-2.5 py-1 rounded-xl border border-indigo-100/30">
                            👤 {o.waiterName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Total Amount & Actions */}
                    <div className="border-t border-slate-50 pt-3.5 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-450">Total Bill</span>
                        <span className="text-base font-black text-slate-800">₹{o.total}</span>
                      </div>

                      {/* Action buttons */}
                      {(o.status === 'Ready' || canEdit || canCancel) ? (
                        <div className="flex gap-2 w-full pt-1">
                          {/* Serve button */}
                          {o.status === 'Ready' && (
                            <button onClick={async () => {
                              try {
                                await api.put(`/orders/${id}/status`, { status: 'Served' });
                                setOrders(prev => prev.map(order => (order._id || order.id) === id ? { ...order, status: 'Served' } : order));
                                toast.success(`🍽️ Order marked as served!`);
                              } catch {
                                toast.error("Failed to update status.");
                              }
                            }}
                              className="flex-1 text-[10px] font-black py-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-150 hover:bg-emerald-100 transition-all cursor-pointer text-center">
                              🛎️ Serve
                            </button>
                          )}
                          {/* Edit button */}
                          {canEdit && (
                            <button onClick={() => openEditModal(o)}
                              className="flex-1 text-[10px] font-black py-2.5 rounded-xl bg-amber-50 text-amber-650 border border-amber-155 hover:bg-amber-100 transition-all cursor-pointer text-center">
                              ✏️ Edit
                            </button>
                          )}
                          {/* Cancel button */}
                          {canCancel && (
                            <button onClick={() => cancelOrder(o)}
                              disabled={cancellingId === id}
                              className="flex-1 text-[10px] font-black py-2.5 rounded-xl bg-red-50 text-red-500 border border-red-155 hover:bg-red-100 transition-all disabled:opacity-50 cursor-pointer text-center">
                              {cancellingId === id ? '...' : '🚫 Cancel'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-[10px] font-bold text-slate-350 bg-slate-50 border border-slate-100 rounded-xl uppercase tracking-wider select-none">
                          No actions available
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          <MenuItemImage src={item.image} alt={item.name} imgClassName="w-8 h-8 object-contain p-0.5" emojiClassName="text-base leading-none" />
                        </div>
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
