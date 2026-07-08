import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PageLoader, SkeletonTableRow, LoadingButton } from '../components/LoadingSkeleton';
import { useVoiceOrder } from '../hooks/useVoiceOrder';

const OrderManagement = () => {
  const { on, connected } = useSocket();
  const [activeTab, setActiveTab] = useState('pos');
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [orderType, setOrderType] = useState('Dine-in');
  const [selectedTable, setSelectedTable] = useState('Table 01');
  const [waiterName, setWaiterName] = useState('');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  useEffect(() => {
    // Load menu from localStorage and API
    const loadMenu = async () => {
      // First try localStorage for instant display
      const savedMenu = localStorage.getItem('menuItems');
      if (savedMenu) {
        const parsedMenu = JSON.parse(savedMenu).filter(m => m.available);
        setMenuItems(parsedMenu);
        const cats = new Set(parsedMenu.map(m => m.category));
        setCategories(['All', ...Array.from(cats)]);
      }
      // Then fetch from API (always up-to-date)
      try {
        const { data } = await api.get('/menu?available=true');
        if (data.success && data.data.length > 0) {
          const items = data.data.map(i => ({ ...i, id: i._id }));
          setMenuItems(items);
          const cats = new Set(items.map(m => m.category));
          setCategories(['All', ...Array.from(cats)]);
          localStorage.setItem('menuItems', JSON.stringify(items));
        }
      } catch {
        // already loaded from localStorage above
      }
    };
    loadMenu();

    // Load orders from API first, fallback to localStorage
    const loadOrders = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/orders');
        if (data.success) {
          setOrders(data.data);
        }
      } catch {
        // API unavailable — use localStorage
        const savedOrders = localStorage.getItem('orders');
        if (savedOrders) setOrders(JSON.parse(savedOrders));
      } finally {
        setLoading(false);
      }
    };
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

  const addToCart = useCallback((item, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => (i._id || i.id) === (item._id || item.id));
      if (existing) {
        return prev.map(i => (i._id || i.id) === (item._id || item.id) ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { ...item, id: item._id || item.id, qty }];
    });
  }, []);

  const removeFromCartByItem = useCallback((item) => {
    setCart(prev => prev.filter(i => (i._id || i.id) !== (item._id || item.id)));
    toast.info(`🗑️ ${item.name} removed from cart`);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

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
      waiterName,
    };
    try {
      const { data } = await api.post('/orders', newOrder);
      if (data.success) {
        const placed = data.data;
        setOrders(prev => [placed, ...prev]);
        setCart([]);
        toast.success(`✅ Order ${placed.orderId} placed! Kitchen notified.`, { autoClose: 4000 });
      }
    } catch {
      const fallbackOrder = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        ...newOrder,
        status: 'Pending',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
      };
      const updated = [fallbackOrder, ...orders];
      setOrders(updated);
      localStorage.setItem('orders', JSON.stringify(updated));
      setCart([]);
      toast.warning(`⚠️ Offline mode — Order ${fallbackOrder.id} saved locally`);
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Voice Order Hook ──────────────────────────────────────────
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

  const updateQty = (id, change) => {
    setCart(cart.map(i => {
      if ((i._id || i.id) === id) {
        const newQty = i.qty + change;
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean));
  };

  const filteredItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Order Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Take tableside POS orders and view historical records.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
            connected ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-50 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}/>
            {connected ? 'Live' : 'Offline'}
          </span>
          <div className="flex space-x-2 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'pos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🛒 POS Terminal
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            📋 Order History
          </button>
        </div>
        {/* Voice Order Button */}
        {voice.supported && (
          <button
            onClick={() => setShowVoicePanel(v => !v)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border shadow-sm ${
              showVoicePanel
                ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-500'
            }`}
          >
            🎤 Voice Order
          </button>
        )}
        </div>
      </div>

      {/* ── Voice Order Panel ── */}
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
            <button onClick={() => setShowVoicePanel(false)} className="text-slate-500 hover:text-slate-300 text-lg font-bold transition-colors">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mic button */}
            <div className="flex flex-col items-center justify-center gap-3">
              <button
                onClick={voice.isListening ? voice.stopListening : voice.startListening}
                className={`relative w-20 h-20 rounded-full font-bold text-3xl transition-all shadow-2xl ${
                  voice.isListening
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/40 animate-pulse'
                    : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30'
                }`}
              >
                {voice.isListening ? '⏹' : '🎤'}
                {voice.isListening && (
                  <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-60"/>
                )}
              </button>
              <p className="text-[10px] font-bold text-slate-400 text-center">
                {voice.isListening ? 'Tap to stop' : 'Tap to speak'}
              </p>
            </div>

            {/* Live transcript */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Transcript</p>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 min-h-[64px] flex items-center">
                <p className={`text-sm font-medium ${voice.transcript ? 'text-white' : 'text-slate-600 italic'}`}>
                  {voice.transcript || 'Waiting for speech...'}
                </p>
              </div>
              <p className={`text-xs font-semibold ${voice.statusMsg.startsWith('✅') ? 'text-emerald-400' : voice.statusMsg.startsWith('❌') || voice.statusMsg.startsWith('❓') ? 'text-rose-400' : 'text-slate-400'}`}>
                {voice.statusMsg || 'Ready to listen'}
              </p>
            </div>

            {/* Quick commands reference */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Example Commands</p>
              <div className="space-y-1.5">
                {[
                  ['Add items',    '"2 biryani and 1 lassi"'],
                  ['Single item',  '"one masala dosa"'],
                  ['Remove item',  '"remove biryani"'],
                  ['Clear cart',   '"clear cart"'],
                  ['Place order',  '"place order"'],
                ].map(([label, cmd]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-bold w-20 flex-shrink-0">{label}</span>
                    <span className="text-[10px] text-indigo-300 font-mono bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg truncate">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Last parsed actions */}
          {voice.lastActions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last Parsed Actions</p>
              <div className="flex flex-wrap gap-2">
                {voice.lastActions.map((a, i) => (
                  <span key={i} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                    a.type === 'ADD_ITEM'    ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700' :
                    a.type === 'REMOVE_ITEM' ? 'bg-red-900/40     text-red-400     border-red-700'     :
                    a.type === 'CLEAR_CART'  ? 'bg-amber-900/40   text-amber-400   border-amber-700'   :
                    'bg-blue-900/40 text-blue-400 border-blue-700'
                  }`}>
                    {a.type === 'ADD_ITEM'    && `+${a.qty}x ${a.item?.name}`}
                    {a.type === 'REMOVE_ITEM' && `Remove: ${a.item?.name}`}
                    {a.type === 'CLEAR_CART'  && 'Clear Cart'}
                    {a.type === 'PLACE_ORDER' && 'Place Order'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Cart Checkout */}
          <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-100/80 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">Active Bill</h3>
              <div className="flex space-x-2">
                {['Dine-in', 'Takeaway'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      orderType === type
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {orderType === 'Dine-in' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Table</label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold"
                  >
                    {JSON.parse(localStorage.getItem('tables') || '[]').map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">No. of Guests</label>
                <input
                  type="number"
                  defaultValue={4}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Waiter Assignment */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Assigned Waiter <span className="text-slate-300">(optional)</span>
              </label>
              <select
                value={waiterName}
                onChange={e => setWaiterName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold"
              >
                <option value="">— No waiter assigned —</option>
                {JSON.parse(localStorage.getItem('staff') || '[]')
                  .filter(s => ['Waiter', 'Manager', 'Admin'].includes(s.role))
                  .map(s => (
                    <option key={s._id || s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))
                }
              </select>
            </div>

            {/* Cart Table list */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Price</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  Cart is empty. Select items to checkout.
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item._id || item.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="w-1/2 flex items-center space-x-2">
                        <span className="text-xl">{item.image}</span>
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

                      <span className="w-1/4 text-right font-bold text-slate-800 text-xs">
                        ₹{item.price * item.qty}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout pricing details */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>GST (5%)</span>
                  <span>₹{Math.round(cartTotal * 0.05)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-100 pt-3 text-slate-800">
                  <span>Total</span>
                  <span>₹{Math.round(cartTotal * 1.05)}</span>
                </div>

                <div className="flex space-x-3 pt-3">
                  <button
                    onClick={() => clearCart()}
                    className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={placeOrder}
                    disabled={placingOrder}
                    className="flex-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
                  >
                    {placingOrder ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Placing Order...
                      </>
                    ) : `Place Order (₹${Math.round(cartTotal * 1.05)})`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Grid of Food Items */}
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-100/80 p-6 space-y-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === c
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredItems.length === 0 && (
                <p className="col-span-3 text-center text-sm font-medium text-slate-400 py-10">No items available.</p>
              )}
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-500/50 rounded-3xl p-4 flex flex-col justify-between items-center text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group"
                >
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{item.image}</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs tracking-tight">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">₹{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB: ORDER HISTORY */}
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
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonTableRow key={i} cols={6} />
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-slate-400 py-12 font-semibold">
                      No order history available.
                    </td>
                  </tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                      <td className="py-4 font-bold text-slate-800">{o.orderId || o.id}</td>
                      <td className="py-4 font-semibold text-slate-500 text-xs">{o.date} {o.timestamp}</td>
                      <td className="py-4 font-semibold text-slate-500 text-xs">{o.type} {o.table !== 'N/A' && `(${o.table})`}</td>
                      <td className="py-4 font-medium text-slate-500 text-xs max-w-xs truncate">
                        {o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </td>
                      <td className="py-4 text-xs">
                        {o.waiterName
                          ? <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">👤 {o.waiterName}</span>
                          : <span className="text-slate-300 font-medium">—</span>}
                      </td>
                      <td className="py-4 font-bold text-slate-800 text-xs">₹{o.total}</td>
                      <td className="py-4">
                         <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            o.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
                            o.status === 'Ready' ? 'bg-green-50 text-green-700' :
                            o.status === 'Preparing' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {o.status}
                          </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
