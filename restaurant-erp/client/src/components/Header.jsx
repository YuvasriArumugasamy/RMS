import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

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

const Header = ({ onOpenMobileSidebar }) => {
  const { user } = useAuth();
  const { on } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [now, setNow] = useState(new Date());

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
        return;
      }
    } catch {
      // fallback localStorage
      const saved = localStorage.getItem('orders');
      if (saved) {
        const orders = JSON.parse(saved);
        setPendingCount(orders.filter(o => !['Completed', 'Cancelled'].includes(o.status)).length);
      }
    }
  };

  useEffect(() => {
    fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 15000); // refresh every 15s
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
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shadow-sm flex-shrink-0">

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

        {/* Active orders badge - Desktop/tablet only */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          {pendingCount} Active
        </div>

        {/* New Order button - Desktop/tablet only */}
        {['Admin', 'Manager', 'Waiter'].includes(user?.role) && (
          <button
            onClick={() => navigate('/orders')}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-[#f97316] hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-400/20 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Order
          </button>
        )}

        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* Notification Bell with Badge Count - Mobile Only */}
        <button className="md:hidden uiverse-bell-btn select-none">
          <svg viewBox="0 0 448 512" className="uiverse-bell-icon">
            <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-[#f97316] text-white text-[7.5px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-md border border-white/20">
            {pendingCount || 7}
          </span>
        </button>

        {/* User role badge - compact on mobile */}
        <div className={`flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-1.5 rounded-full border text-[11px] font-bold ${roleBadge} flex-shrink-0`}>
          <div className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-black opacity-80">
            {user?.username?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <span className="hidden sm:inline">{user?.username}</span>
          <span className="opacity-60 hidden sm:inline">·</span>
          <span className="hidden sm:inline">{user?.role}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
