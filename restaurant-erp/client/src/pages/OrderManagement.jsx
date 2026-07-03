import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const OrderManagement = () => {
  const { on, connected } = useSocket();
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history'
  
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [orderType, setOrderType] = useState('Dine-in');
  const [selectedTable, setSelectedTable] = useState('Table 01');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));

    const savedMenu = localStorage.getItem('menuItems');
    if (savedMenu) {
      const parsedMenu = JSON.parse(savedMenu).filter(m => m.available);
      setMenuItems(parsedMenu);
      
      const cats = new Set(parsedMenu.map(m => m.category));
      setCategories(['All', ...Array.from(cats)]);
    }
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

  const addToCart = (item) => {    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const updateQty = (id, change) => {
    setCart(cart.map(i => {
      if (i.id === id) {
        const newQty = i.qty + change;
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;

    const sub = cartTotal;
    const newOrder = {
      type: orderType,
      table: orderType === 'Dine-in' ? selectedTable : 'N/A',
      items: cart.map(i => ({ ...i, menuItemId: i.id })),
      subtotal: sub,
      gst: Math.round(sub * 0.05),
      total: Math.round(sub * 1.05),
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
      // Fallback to localStorage
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
    }
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
        </div>
      </div>

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
                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="w-1/2 flex items-center space-x-2">
                        <span className="text-xl">{item.image}</span>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs truncate max-w-[120px]">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">₹{item.price}</span>
                        </div>
                      </div>
                      
                      <div className="w-1/4 flex items-center justify-center space-x-2 bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl">
                        <button onClick={() => updateQty(item.id, -1)} className="text-slate-400 hover:text-indigo-600 font-bold text-sm px-1">-</button>
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
                    onClick={() => setCart([])}
                    className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={placeOrder}
                    className="flex-2 py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
                  >
                    Place Order (₹{Math.round(cartTotal * 1.05)})
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
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-slate-400 py-12 font-semibold">
                      No order history available.
                    </td>
                  </tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                      <td className="py-4 font-bold text-slate-800">{o.id}</td>
                      <td className="py-4 font-semibold text-slate-500 text-xs">{o.date} {o.timestamp}</td>
                      <td className="py-4 font-semibold text-slate-500 text-xs">{o.type} {o.table !== 'N/A' && `(${o.table})`}</td>
                      <td className="py-4 font-medium text-slate-500 text-xs max-w-xs truncate">
                        {o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
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
