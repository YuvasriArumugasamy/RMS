import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getOrderTypeConfig, getChartColorsForLabels } from '../utils/orderType';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

// ── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, subtitle, colorClass, trend }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-extrabold text-slate-900">{value}</h3>
      {subtitle && <p className="text-[9px] text-slate-400 font-semibold">{subtitle}</p>}
      {trend !== undefined && (
        <p className={`text-[9px] font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs yesterday
        </p>
      )}
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200 group-hover:scale-105 ${colorClass}`}>
      {icon}
    </div>
  </div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { on, connected } = useSocket();

  const [orders,      setOrders]      = useState([]);
  const [tables,      setTables]      = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch all data ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [ordRes, tblRes, ingRes, stfRes] = await Promise.allSettled([
        api.get('/orders'),
        api.get('/tables'),
        api.get('/inventory'),
        api.get('/staff'),
      ]);

      if (ordRes.status === 'fulfilled' && ordRes.value.data.success)
        setOrders(ordRes.value.data.data);
      else {
        const saved = localStorage.getItem('orders');
        if (saved) setOrders(JSON.parse(saved));
      }

      if (tblRes.status === 'fulfilled' && tblRes.value.data.success)
        setTables(tblRes.value.data.data);
      else {
        const saved = localStorage.getItem('tables');
        if (saved) setTables(JSON.parse(saved));
      }

      if (ingRes.status === 'fulfilled' && ingRes.value.data.success)
        setIngredients(ingRes.value.data.data);

      if (stfRes.status === 'fulfilled' && stfRes.value.data.success)
        setStaff(stfRes.value.data.data);

      setLastUpdated(new Date());
    } catch {
      toast.warning('⚠️ Some data could not be fetched');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Real-time socket updates ────────────────────────────────────────────
  useEffect(() => {
    const handleNewOrder = (order) => {
      setOrders(prev => {
        if (prev.find(o => (o._id || o.id) === (order._id || order.id))) return prev;
        toast.info(`🆕 New Order: ${order.orderId || order.id} — ${order.table}`, { autoClose: 5000 });
        return [order, ...prev];
      });
    };
    const handleStatusUpdate = (update) => {
      setOrders(prev => prev.map(o =>
        (o._id || o.id) === (update.id || update._id) ? { ...o, status: update.status } : o
      ));
    };
    const handleTableUpdate = (update) => {
      setTables(prev => prev.map(t =>
        t.name === update.table ? { ...t, status: update.status } : t
      ));
    };
    const c1 = on?.('new-order',          handleNewOrder);
    const c2 = on?.('order-status-update', handleStatusUpdate);
    const c3 = on?.('table-update',        handleTableUpdate);
    return () => { c1?.(); c2?.(); c3?.(); };
  }, [on]);

  // ── Computed KPIs ───────────────────────────────────────────────────────
  const today = new Date();
  const isToday = (d) => new Date(d).toDateString() === today.toDateString();

  const todayOrders    = orders.filter(o => isToday(o.createdAt || o.date));
  const todayRevenue   = todayOrders.filter(o => o.billingStatus === 'Paid').reduce((s, o) => s + (o.total || 0), 0);
  const activeOrders   = orders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
  const pendingCount   = orders.filter(o => o.status === 'Pending').length;
  const preparingCount = orders.filter(o => o.status === 'Preparing').length;
  const occupiedTables = tables.filter(t => t.status === 'Occupied').length;
  const lowStockItems  = ingredients.filter(i => i.status === 'Low Stock');
  const totalRevenue   = orders.filter(o => o.billingStatus === 'Paid').reduce((s, o) => s + (o.total || 0), 0);
  const avgOrderValue  = orders.length > 0 ? Math.round(totalRevenue / orders.filter(o => o.billingStatus === 'Paid').length || 0) : 0;

  // ── Hourly revenue chart (today) ────────────────────────────────────────
  const hourlyMap = {};
  todayOrders.filter(o => o.billingStatus === 'Paid').forEach(o => {
    const hr = new Date(o.createdAt || Date.now()).getHours();
    const lbl = `${hr % 12 || 12}${hr < 12 ? 'am' : 'pm'}`;
    hourlyMap[lbl] = (hourlyMap[lbl] || 0) + (o.total || 0);
  });
  const hourLabels = Object.keys(hourlyMap).length > 0
    ? Object.entries(hourlyMap).sort((a, b) => {
        const toH = s => { const h = parseInt(s); const pm = s.endsWith('pm'); return pm ? (h % 12) + 12 : h % 12; };
        return toH(a[0]) - toH(b[0]);
      }).map(e => e[0])
    : ['8am','10am','12pm','2pm','4pm','6pm','8pm','10pm'];
  const hourValues = Object.keys(hourlyMap).length > 0
    ? hourLabels.map(l => hourlyMap[l] || 0)
    : [0, 0, 0, 0, 0, 0, 0, 0];

  const revenueChartData = {
    labels: hourLabels,
    datasets: [{
      label: "Today's Revenue (₹)",
      data: hourValues,
      backgroundColor: 'rgba(249,115,22,0.85)',
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const revenueChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString()}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' }, border: { display: false } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', callback: v => `₹${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}` }, border: { display: false } },
    },
  };

  // ── Top items (all time) ────────────────────────────────────────────────
  const itemMap = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    itemMap[i.name] = (itemMap[i.name] || 0) + (i.qty || 1);
  }));
  const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topItemsData = {
    labels: topItems.map(([name]) => name),
    datasets: [{
      data: topItems.map(([, qty]) => qty),
      backgroundColor: ['rgba(249,115,22,0.9)','rgba(99,102,241,0.9)','rgba(16,185,129,0.9)','rgba(59,130,246,0.9)','rgba(245,158,11,0.9)'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 10, weight: '600' }, usePointStyle: true, padding: 12, color: '#64748b' } },
      tooltip: {
        backgroundColor: '#0f172a',
        bodyColor: '#cbd5e1',
        callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} orders` },
      },
    },
  };

  // ── Order type split ────────────────────────────────────────────────────
  const typeMap = {};
  orders.forEach(o => { 
    const t = o.type || 'Dine-in';
    typeMap[t] = (typeMap[t] || 0) + 1; 
  });

  const splitLabels = Object.keys(typeMap).length > 0 
    ? Object.keys(typeMap) 
    : ['Dine-in (QR)', 'Dine-in', 'Takeaway'];

  const orderSplitData = {
    labels: splitLabels,
    datasets: [{
      data: Object.keys(typeMap).length > 0 ? Object.values(typeMap) : [0, 0, 0],
      backgroundColor: getChartColorsForLabels(splitLabels),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs font-bold text-slate-400">Loading Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">

      {/* ── Welcome Banner ── */}
      <div className="bg-gradient-to-br from-[#f97316] to-orange-600 text-white p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[60px]"/>
        <div className="z-10 space-y-1">
          <h2 className="text-2xl font-extrabold">Live Dashboard</h2>
          <p className="text-white/80 text-xs font-medium">
            Real-time restaurant overview · Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
        </div>
        <div className="z-10 flex flex-wrap gap-2">
          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
            connected ? 'bg-white/20 text-white border-white/30' : 'bg-red-500/30 text-white border-red-400/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-white animate-pulse' : 'bg-red-300'}`}/>
            {connected ? 'Live' : 'Offline'}
          </span>
          <button onClick={() => navigate('/orders')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold rounded-xl transition-all border border-white/30">
            + New Order
          </button>
          <button onClick={fetchAll}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold rounded-xl transition-all border border-white/30">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Today's Revenue"  value={`₹${todayRevenue.toLocaleString()}`} icon="💰" subtitle={`${todayOrders.filter(o=>o.billingStatus==='Paid').length} paid today`}   colorClass="bg-emerald-50 text-emerald-600"/>
        <StatCard title="Total Revenue"    value={`₹${totalRevenue.toLocaleString()}`} icon="📈" subtitle="All time"                                                                  colorClass="bg-blue-50 text-blue-600"/>
        <StatCard title="Active Orders"    value={activeOrders.length}                 icon="🛒" subtitle={`${pendingCount} pending · ${preparingCount} cooking`}                    colorClass="bg-[#f97316]/10 text-[#f97316]"/>
        <StatCard title="Tables Occupied"  value={`${occupiedTables}/${tables.length}`} icon="🪑" subtitle="Currently in service"                                                    colorClass="bg-amber-50 text-amber-600"/>
        <StatCard title="Avg Order Value"  value={`₹${avgOrderValue || '—'}`}          icon="🧾" subtitle="Per transaction"                                                          colorClass="bg-indigo-50 text-indigo-600"/>
        <StatCard title="Low Stock Items"  value={lowStockItems.length}                icon="⚠️" subtitle={lowStockItems.length > 0 ? lowStockItems.slice(0,2).map(i=>i.name).join(', ') : 'All good!'} colorClass={lowStockItems.length > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}/>
      </div>

      {/* ── Row 2: Revenue Chart + Order Split + Top Items ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Revenue by Hour */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Today's Revenue by Hour</h3>
              <p className="text-[10px] text-slate-400 font-medium">Paid orders only</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
              ₹{todayRevenue.toLocaleString()} today
            </span>
          </div>
          <div className="h-48">
            <Bar data={revenueChartData} options={revenueChartOpts}/>
          </div>
        </div>

        {/* Order Type Split */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Order Type Split</h3>
            <p className="text-[10px] text-slate-400 font-medium">All time distribution</p>
          </div>
          <div className="h-48 flex items-center justify-center">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No orders yet</p>
            ) : (
              <Doughnut data={orderSplitData} options={doughnutOpts}/>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Live Queue + Top Items + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Live Active Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Live Active Queue</h3>
              <p className="text-[10px] text-slate-400 font-medium">Orders being processed or awaiting checkout</p>
            </div>
            <span className="text-[9px] font-bold text-[#f97316] bg-[#f97316]/10 px-2 py-1 rounded-full animate-pulse border border-[#f97316]/20">
              {activeOrders.length} Active
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center text-slate-400 py-10 font-medium text-xs">
              🎉 No active orders right now
            </div>
          ) : (
            <>
              {/* ── MOBILE: Card list ── */}
              <div className="sm:hidden space-y-2 max-h-72 overflow-y-auto pr-0.5" style={{scrollbarWidth:'none'}}>
                {activeOrders.slice(0, 15).map(o => {
                  const statusStyle =
                    o.status === 'Ready'     ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    o.status === 'Preparing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    o.status === 'Served'    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    'bg-blue-50 text-blue-700 border-blue-200';
                  return (
                    <div key={o._id || o.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                      {/* Left: Order info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-black text-slate-800 truncate">{o.orderId || o.id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 ${statusStyle}`}>{o.status}</span>
                        </div>
                        <p className="text-[10px] font-semibold truncate flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold border ${getOrderTypeConfig(o.type).badgeBg}`}>
                            {getOrderTypeConfig(o.type).icon} {o.type}
                          </span>
                          {o.table !== 'N/A' && <span className="text-slate-500">· {o.table}</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                      {/* Right: Amount */}
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-black text-slate-800">₹{o.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP: Table ── */}
              <div className="hidden sm:block overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-slate-400 text-[9px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-2">Order ID</th>
                      <th className="pb-2">Type / Table</th>
                      <th className="pb-2">Items</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {activeOrders.slice(0, 15).map(o => {
                      const typeCfg = getOrderTypeConfig(o.type);
                      return (
                        <tr key={o._id || o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                          <td className="py-2.5 font-bold text-slate-800">{o.orderId || o.id}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${typeCfg.badgeBg}`}>
                              {typeCfg.icon} {o.type} {o.table !== 'N/A' && `(${o.table})`}
                            </span>
                          </td>
                        <td className="py-2.5 text-slate-500 font-medium max-w-[160px] truncate">
                          {(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
                        </td>
                        <td className="py-2.5 font-bold text-slate-800">₹{o.total}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            o.status === 'Ready'     ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            o.status === 'Preparing' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            o.status === 'Served'    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Right column: Top Items + Alerts */}
        <div className="space-y-4">

          {/* Top Selling Items Doughnut */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Top Selling Items</h3>
              <p className="text-[10px] text-slate-400 font-medium">By quantity sold</p>
            </div>
            <div className="h-40 flex items-center justify-center">
              {topItems.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No sales data yet</p>
              ) : (
                <Doughnut data={topItemsData} options={doughnutOpts}/>
              )}
            </div>
          </div>

          {/* Low Stock + Staff Alert */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Alerts</h3>

            {lowStockItems.length === 0 && staff.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-4">✅ All systems normal</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 4).map(item => (
                  <div key={item._id || item.id} className="flex items-center gap-2.5 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <span className="text-base">⚠️</span>
                    <div>
                      <p className="text-xs font-bold text-red-700">{item.name}</p>
                      <p className="text-[10px] text-red-500 font-medium">{item.stock} {item.unit} left · threshold: {item.threshold}</p>
                    </div>
                  </div>
                ))}
                {/* Tables status quick view */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Table Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tables.slice(0, 10).map(t => (
                      <span key={t._id || t.id} className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border ${
                        t.status === 'Available'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        t.status === 'Occupied'    ? 'bg-red-50 text-red-700 border-red-200' :
                        t.status === 'Reserved'    ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {t.name}
                      </span>
                    ))}
                    {tables.length > 10 && (
                      <span className="text-[9px] font-bold text-slate-400">+{tables.length - 10} more</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>


    </div>
  );
};

export default Dashboard;
