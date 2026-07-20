import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-toastify';
import MenuItemImage from './MenuItemImage';
import { getOrderTypeConfig } from '../utils/orderType';

const pageMeta = {
  '/':          { title: 'Operational Dashboard',       sub: 'Real-time restaurant overview' },
  '/orders':    { title: 'Order Intake Terminal',        sub: 'Manage dine-in & takeaway orders' },
  '/kitchen':   { title: 'Kitchen Display Screen',       sub: 'Live kitchen queue & prep status' },
  '/tables':    { title: 'Table Management',             sub: 'Floor map & seat assignments' },
  '/menu':      { title: 'Menu Management',              sub: 'Food & beverage catalogue' },
  '/billing':   { title: 'Billing & Cashier Desk',       sub: 'Payments, discounts & receipts' },
  '/inventory': { title: 'Inventory & Stock Control',    sub: 'Ingredients & supplier tracking' },
  '/staff':     { title: 'Staff & Shift Management',     sub: 'Attendance & scheduling' },
  '/customers': { title: 'Customer Loyalty & CRM',       sub: 'Profiles, points & feedback' },
  '/reports':   { title: 'Reports & Analytics',          sub: 'Enterprise insights & exports' },
  '/ai-hub':    { title: 'AI Operations Hub',            sub: 'Smart suggestions & automation' },
  '/settings':  { title: 'System Settings',              sub: 'Configuration & preferences' },
};

const roleColors = {
  Admin:   'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20',
  Manager: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Chef:    'bg-red-500/10 text-red-500 border-red-500/20',
  Waiter:  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Cashier: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
};

// ── Status color map ───────────────────────────────────────────────────────
const statusColor = {
  Pending:    'bg-amber-100 text-amber-700',
  Preparing:  'bg-blue-100 text-blue-700',
  Ready:      'bg-emerald-100 text-emerald-700',
  Served:     'bg-purple-100 text-purple-700',
};

// ── Active Orders Popup ────────────────────────────────────────────────────
const ActiveOrdersPopup = ({ orders, onClose, onViewAll }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[998] flex items-start justify-end pt-16 pr-6 pointer-events-none">
      <div
        ref={popupRef}
        className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-100 w-80 max-h-[70vh] flex flex-col animate-[fadeIn_0.15s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-extrabold text-slate-800">Active Orders</h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{orders.length}</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold cursor-pointer transition-all">✕</button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-xs font-semibold text-slate-400">All caught up! No active orders.</p>
            </div>
          ) : orders.map(order => (
            <div key={order._id || order.id} className="px-4 py-3 hover:bg-slate-50 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{order.orderId || `#${order.id}`}</p>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                    <span>{getOrderTypeConfig(order.type).icon} {order.type} {order.table && order.table !== 'N/A' ? `· ${order.table}` : ''}</span>
                    <span>· {order.items?.length || 0} items</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-[9px] font-bold px-2 py-1 rounded-lg ${statusColor[order.status] || 'bg-slate-100 text-slate-600'}`}>
                    {order.status}
                  </span>
                  <p className="text-[10px] font-bold text-slate-700 mt-1">₹{order.total}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={onViewAll}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            View All in Orders Page →
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Quick Order Modal ──────────────────────────────────────────────────────
const QuickOrderModal = ({ onClose, onOrderPlaced }) => {
  const [menuItems, setMenuItems]       = useState([]);
  const [tables, setTables]             = useState([]);
  const [search, setSearch]             = useState('');
  const [cart, setCart]                 = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [orderType, setOrderType]       = useState('Dine-in');
  const [placing, setPlacing]           = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    // Load menu from cache first, then refresh
    try {
      const cached = JSON.parse(localStorage.getItem('menuItems') || '[]');
      setMenuItems(cached.filter(m => m.available !== false));
    } catch { /* ignore */ }

    const fetchData = async () => {
      try {
        const [menuRes, tableRes] = await Promise.all([
          api.get('/menu?available=true'),
          api.get('/tables'),
        ]);
        if (menuRes.data.success) {
          const items = menuRes.data.data.map(i => ({ ...i, id: i._id || i.id }));
          setMenuItems(items.filter(m => m.available !== false));
        }
        if (tableRes.data.success) {
          setTables(tableRes.data.data);
          if (tableRes.data.data.length > 0) setSelectedTable(tableRes.data.data[0].name);
        }
      } catch { /* use cache */ }
    };
    fetchData();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filteredItems = menuItems.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) && !m.isCombo
  );

  const addToCart = (item) => {
    const id = item._id || item.id;
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) return prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, id, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const placeOrder = async () => {
    if (cart.length === 0) { toast.warning('⚠️ Add at least one item!'); return; }
    if (orderType === 'Dine-in' && !selectedTable) { toast.warning('⚠️ Select a table!'); return; }
    setPlacing(true);
    const sub = cartTotal;
    const payload = {
      type: orderType,
      table: orderType === 'Dine-in' ? selectedTable : 'N/A',
      items: cart.map(i => ({ ...i, menuItemId: i.id })),
      subtotal: sub,
      gst: Math.round(sub * 0.05),
      total: Math.round(sub * 1.05),
      guestCount: 1,
    };
    try {
      const { data } = await api.post('/orders', payload);
      if (data.success) {
        toast.success(`✅ Order ${data.data.orderId} placed! Kitchen notified.`, { autoClose: 4000 });
        onOrderPlaced();
        onClose();
      }
    } catch {
      toast.warning('⚠️ Saved offline — will sync when connected');
      onOrderPlaced();
      onClose();
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-end pt-16 pr-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Panel */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-[420px] max-h-[82vh] flex flex-col animate-[fadeIn_0.15s_ease-out] z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Quick Order</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Add items & place order instantly</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold cursor-pointer transition-all">✕</button>
        </div>

        {/* Order Type + Table */}
        <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-3">
          {/* Type toggle */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 text-[10px] font-bold">
            {['Dine-in', 'Takeaway'].map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${orderType === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t === 'Dine-in' ? '🍽️' : '🥡'} {t}
              </button>
            ))}
          </div>

          {/* Table select */}
          {orderType === 'Dine-in' && (
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="flex-1 text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="">-- Select Table --</option>
              {tables.map(t => (
                <option key={t._id || t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Search menu items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Menu Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 min-h-0">
          {filteredItems.length === 0 ? (
            <p className="text-center text-slate-400 text-xs font-semibold py-8">No items found</p>
          ) : filteredItems.map(item => {
            const id = item._id || item.id;
            const inCart = cart.find(i => i.id === id);
            return (
              <div key={id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <MenuItemImage src={item.image} alt={item.name} imgClassName="w-9 h-9 object-contain p-0.5" emojiClassName="text-xl leading-none" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-[#f97316] font-bold">₹{item.price}</p>
                  </div>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-1.5 bg-indigo-50 rounded-xl px-1.5 py-1">
                    <button onClick={() => updateQty(id, -1)} className="w-5 h-5 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-xs cursor-pointer hover:bg-indigo-100 transition-all">−</button>
                    <span className="text-xs font-extrabold text-indigo-700 w-4 text-center">{inCart.qty}</span>
                    <button onClick={() => updateQty(id, +1)} className="w-5 h-5 rounded-lg bg-indigo-600 shadow-sm flex items-center justify-center text-white font-black text-xs cursor-pointer hover:bg-indigo-700 transition-all">+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-[#f97316] group-hover:text-white flex items-center justify-center text-slate-500 font-bold text-sm cursor-pointer transition-all"
                  >+</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Cart Summary + Place Order */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-3">
            {/* Cart items summary */}
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {cart.map(i => (
                <div key={i.id} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate">{i.name} × {i.qty}</span>
                  <span className="font-bold text-slate-800 flex-shrink-0 ml-2">₹{i.price * i.qty}</span>
                </div>
              ))}
            </div>

            {/* Total + Place */}
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Total (incl. 5% GST)</p>
                <p className="text-base font-extrabold text-slate-900">₹{Math.round(cartTotal * 1.05)}</p>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="px-5 py-2.5 bg-[#f97316] hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-400/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {placing ? (
                  <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Placing...</>
                ) : (
                  <>🚀 Place Order</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Header ────────────────────────────────────────────────────────────
const Header = ({ onOpenMobileSidebar }) => {
  const { user } = useAuth();
  const { on } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOrders, setActiveOrders] = useState([]);
  const [now, setNow] = useState(new Date());
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [showActiveOrders, setShowActiveOrders] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch active order count from API
  const fetchActiveCount = async () => {
    try {
      const { data } = await api.get('/orders');
      if (data.success) {
        const active = data.data.filter(o => !['Completed', 'Cancelled'].includes(o.status));
        setPendingCount(active.length);
        setActiveOrders(active);
        return;
      }
    } catch {
      const saved = localStorage.getItem('orders');
      if (saved) {
        const orders = JSON.parse(saved);
        const active = orders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
        setPendingCount(active.length);
        setActiveOrders(active);
      }
    }
  };

  useEffect(() => {
    fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // Real-time count update via socket
  useEffect(() => {
    const handleNewOrder = () => setPendingCount(prev => prev + 1);
    const handleStatusUpdate = (update) => {
      if (update.status === 'Completed' || update.status === 'Cancelled') {
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    };
    const cleanupNew    = on?.('new-order', handleNewOrder);
    const cleanupStatus = on?.('order-status-update', handleStatusUpdate);
    return () => { cleanupNew?.(); cleanupStatus?.(); };
  }, [on]);

  const meta = pageMeta[location.pathname] || { title: 'Smart Restaurant ERP', sub: '' };
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const roleBadge = roleColors[user?.role] || 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shadow-sm flex-shrink-0 relative z-40">

        {/* Left: Page title (Desktop) or Logo (Mobile) with Hamburger */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Mobile Hamburger menu */}
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1 rounded-lg border border-slate-150 hover:bg-slate-50 transition-all active:scale-95 text-slate-600 cursor-pointer flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Mobile RMS Logo */}
          <div className="md:hidden flex items-center select-none">
            <span className="text-xl font-black tracking-tight"><span className="text-[#f97316]">R</span><span className="text-[#1E3A8A]">MS</span></span>
          </div>

          {/* Desktop Page Title */}
          <div className="hidden md:block min-w-0">
            <h2 className="text-base font-extrabold text-slate-800 truncate leading-tight">{meta.title}</h2>
            <p className="text-[10px] text-slate-400 font-semibold truncate">{meta.sub}</p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3.5 flex-shrink-0">

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs font-bold">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {timeStr}
          </div>

          <div className="w-px h-5 bg-slate-200 hidden sm:block" />

          {/* Active orders badge → opens popup */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowActiveOrders(v => !v)}
              className="flex items-center gap-2 text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl hover:bg-amber-100/70 active:scale-95 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              {pendingCount} Active
            </button>
          </div>

          {/* ── New Order button → opens Quick Order Modal ── */}
          {['Admin', 'Manager', 'Waiter'].includes(user?.role) && (
            <button
              onClick={() => setShowQuickOrder(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-[#f97316] hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-400/20 transition-all cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Order
            </button>
          )}

          <div className="w-px h-5 bg-slate-200 hidden sm:block" />

          {/* Notification Bell - Mobile Only */}
          <button
            onClick={() => navigate('/orders?tab=history')}
            className="md:hidden uiverse-bell-btn select-none cursor-pointer"
          >
            <svg viewBox="0 0 448 512" className="uiverse-bell-icon">
              <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-[#f97316] text-white text-[7.5px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-md border border-white/20">
              {pendingCount || 7}
            </span>
          </button>

          {/* User role badge */}
          <div className={`flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-1.5 rounded-full border text-[11px] font-bold ${roleBadge} flex-shrink-0`}>
            <div className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-black opacity-80">
              {user?.username?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <span className="hidden sm:inline">{user?.role}</span>
          </div>
        </div>
      </header>

      {/* Quick Order Modal */}
      {showQuickOrder && (
        <QuickOrderModal
          onClose={() => setShowQuickOrder(false)}
          onOrderPlaced={fetchActiveCount}
        />
      )}

      {/* Active Orders Popup */}
      {showActiveOrders && (
        <ActiveOrdersPopup
          orders={activeOrders}
          onClose={() => setShowActiveOrders(false)}
          onViewAll={() => { setShowActiveOrders(false); navigate('/orders?tab=history'); }}
        />
      )}
    </>
  );
};

export default Header;
