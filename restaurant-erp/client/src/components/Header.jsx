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

      {/* Left: Page title with Hamburger menu on Mobile */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button 
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all active:scale-95 text-slate-600 cursor-pointer flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-800 truncate leading-tight">{meta.title}</h2>
          <p className="text-[10px] text-slate-400 font-semibold truncate">{meta.sub}</p>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3 flex-shrink-0">

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

        {/* User role badge - compact on mobile */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 sm:px-3 rounded-xl border text-[11px] font-bold ${roleBadge}`}>
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
