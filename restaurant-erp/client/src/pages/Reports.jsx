import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register all Chart.js components once
ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

// ── Shared chart defaults ────────────────────────────────────────────────────
const FONT_FAMILY = "'Inter', 'Helvetica Neue', sans-serif";

const baseTooltip = {
  backgroundColor: '#0f172a',
  titleColor: '#f8fafc',
  bodyColor: '#cbd5e1',
  borderColor: '#1e293b',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  titleFont: { family: FONT_FAMILY, weight: 'bold', size: 12 },
  bodyFont:  { family: FONT_FAMILY, size: 11 },
};

const baseLegend = {
  labels: {
    font: { family: FONT_FAMILY, size: 11, weight: '600' },
    usePointStyle: true,
    padding: 16,
    color: '#64748b',
  },
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon, colorClass, trend }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <h3 className="text-2xl font-extrabold text-slate-900">{value}</h3>
      {sub && <p className="text-[10px] text-slate-400 font-semibold">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-[10px] font-bold flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs prev period
        </p>
      )}
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform duration-200 group-hover:scale-110 ${colorClass}`}>
      {icon}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Reports = () => {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [activeChart, setActiveChart] = useState('bar'); // bar | line for sales trend

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders');
      if (data.success) setOrders(data.data);
    } catch {
      const saved = localStorage.getItem('orders');
      if (saved) setOrders(JSON.parse(saved));
      toast.warning('⚠️ Showing cached data (offline mode)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Date filter ──────────────────────────────────────────────────────────
  const applyDateFilter = (list, filter) => list.filter(o => {
    if (filter === 'all') return true;
    // Prefer createdAt (ISO string from DB), fallback to date field
    const raw = o.createdAt || o.date;
    if (!raw) return filter === 'all';
    // Parse safely — handle both ISO strings and locale strings
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    if (filter === 'today') return d.toDateString() === now.toDateString();
    if (filter === 'week')  return d >= new Date(now - 7 * 86400000);
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const filteredOrders = applyDateFilter(orders, dateFilter);

  // ── KPI Metrics ──────────────────────────────────────────────────────────
  const totalRevenue   = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
  const orderCount     = filteredOrders.length;
  const avgOrderValue  = orderCount > 0 ? (totalRevenue / orderCount).toFixed(0) : 0;
  const completedCount = filteredOrders.filter(o => o.billingStatus === 'Paid').length;
  const pendingCount   = filteredOrders.filter(o => o.status === 'Pending').length;
  const conversionRate = orderCount > 0 ? ((completedCount / orderCount) * 100).toFixed(0) : 0;

  // ── Chart 1: Hourly Sales (Bar / Line toggle) ────────────────────────────
  const hourlyMap = {};
  filteredOrders.forEach(o => {
    const hr  = new Date(o.createdAt || Date.now()).getHours();
    const lbl = `${hr % 12 || 12}${hr < 12 ? 'AM' : 'PM'}`;
    hourlyMap[lbl] = (hourlyMap[lbl] || 0) + (o.total || 0);
  });

  // Always show full day skeleton if no real data
  const DEFAULT_HOURS = ['8AM','10AM','12PM','2PM','4PM','6PM','8PM','10PM'];
  const hourlyLabels = Object.keys(hourlyMap).length > 0
    ? Object.entries(hourlyMap)
        .sort((a, b) => {
          const toH = s => { const [h, p] = [parseInt(s), s.slice(-2)]; return p === 'AM' ? h % 12 : (h % 12) + 12; };
          return toH(a[0]) - toH(b[0]);
        })
        .map(e => e[0])
    : DEFAULT_HOURS;

  const hourlyValues = Object.keys(hourlyMap).length > 0
    ? hourlyLabels.map(l => hourlyMap[l] || 0)
    : [800, 1200, 3500, 2800, 1500, 4200, 5100, 2300];

  const salesTrendData = {
    labels: hourlyLabels,
    datasets: [{
      label: 'Revenue (₹)',
      data: hourlyValues,
      backgroundColor: activeChart === 'bar'
        ? 'rgba(99, 102, 241, 0.85)'
        : 'rgba(99, 102, 241, 0.15)',
      borderColor: '#6366f1',
      borderWidth: activeChart === 'line' ? 2.5 : 0,
      borderRadius: activeChart === 'bar' ? 8 : 0,
      fill: activeChart === 'line',
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointRadius: activeChart === 'line' ? 4 : 0,
      pointHoverRadius: 6,
    }],
  };

  const salesTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...baseTooltip,
        callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString()}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: FONT_FAMILY, size: 10, weight: '600' }, color: '#94a3b8' },
        border: { display: false },
      },
      y: {
        grid: { color: '#f1f5f9', lineWidth: 1 },
        ticks: {
          font: { family: FONT_FAMILY, size: 10 },
          color: '#94a3b8',
          callback: v => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`,
        },
        border: { display: false },
      },
    },
  };

  // ── Chart 2: Top Items horizontal bar ────────────────────────────────────
  const itemSales = {};
  filteredOrders.forEach(o =>
    (o.items || []).forEach(i => {
      if (!itemSales[i.name]) itemSales[i.name] = { qty: 0, revenue: 0 };
      itemSales[i.name].qty     += i.qty;
      itemSales[i.name].revenue += i.price * i.qty;
    })
  );

  const topItems = Object.entries(itemSales)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const ITEM_COLORS = [
    'rgba(16,185,129,0.85)',  // emerald
    'rgba(99,102,241,0.85)',  // indigo
    'rgba(249,115,22,0.85)',  // orange
    'rgba(59,130,246,0.85)',  // blue
    'rgba(168,85,247,0.85)',  // purple
    'rgba(245,158,11,0.85)',  // amber
  ];

  const topItemsData = {
    labels: topItems.map(i => i.name),
    datasets: [{
      label: 'Revenue (₹)',
      data: topItems.map(i => i.revenue),
      backgroundColor: ITEM_COLORS,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const topItemsOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...baseTooltip,
        callbacks: {
          label: ctx => ` ₹${ctx.parsed.x.toLocaleString()}`,
          afterLabel: ctx => ` Qty sold: ${topItems[ctx.dataIndex]?.qty}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: FONT_FAMILY, size: 10 },
          color: '#94a3b8',
          callback: v => `₹${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`,
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: FONT_FAMILY, size: 10, weight: '600' }, color: '#334155' },
        border: { display: false },
      },
    },
  };

  // ── Chart 3: Order type Doughnut ─────────────────────────────────────────
  const typeMap = {};
  filteredOrders.forEach(o => { typeMap[o.type || 'Dine-in'] = (typeMap[o.type || 'Dine-in'] || 0) + 1; });
  const typeLabels = Object.keys(typeMap).length > 0 ? Object.keys(typeMap) : ['Dine-in', 'Takeaway', 'QR'];
  const typeValues = Object.keys(typeMap).length > 0 ? Object.values(typeMap) : [60, 25, 15];

  const orderTypeDoughnut = {
    labels: typeLabels,
    datasets: [{
      data: typeValues,
      backgroundColor: ['rgba(99,102,241,0.9)', 'rgba(249,115,22,0.9)', 'rgba(16,185,129,0.9)', 'rgba(59,130,246,0.9)'],
      borderColor: '#fff',
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { ...baseLegend, position: 'bottom' },
      tooltip: {
        ...baseTooltip,
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
            return ` ${ctx.label}: ${ctx.parsed} orders (${pct}%)`;
          },
        },
      },
    },
  };

  // ── Chart 4: Payment method Doughnut ─────────────────────────────────────
  const payMap = {};
  filteredOrders.forEach(o => {
    if (o.billingStatus === 'Paid') {
      const m = o.paymentMethod || 'Cash';
      payMap[m] = (payMap[m] || 0) + (o.total || 0);
    }
  });

  const payLabels = Object.keys(payMap).length > 0 ? Object.keys(payMap) : ['Cash', 'UPI', 'Card'];
  const payValues = Object.keys(payMap).length > 0 ? Object.values(payMap) : [4500, 3200, 1800];

  const payMethodDoughnut = {
    labels: payLabels,
    datasets: [{
      data: payValues,
      backgroundColor: [
        'rgba(16,185,129,0.9)',   // Cash — emerald
        'rgba(124,58,237,0.9)',   // UPI  — violet
        'rgba(37,99,235,0.9)',    // Card — blue
        'rgba(245,158,11,0.9)',   // Wallet — amber
        'rgba(100,116,139,0.9)',  // Other — slate
      ],
      borderColor: '#fff',
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };

  const payDoughnutOptions = {
    ...doughnutOptions,
    plugins: {
      ...doughnutOptions.plugins,
      tooltip: {
        ...baseTooltip,
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
            return ` ${ctx.label}: ₹${ctx.parsed.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  // ── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['Order ID', 'Date', 'Type', 'Table', 'Items', 'Subtotal', 'GST', 'Total', 'Payment Method', 'Status']];
    filteredOrders.forEach(o => {
      rows.push([
        o.orderId || o.id,
        o.date || new Date(o.createdAt).toLocaleDateString(),
        o.type,
        o.table,
        (o.items || []).map(i => `${i.qty}x ${i.name}`).join(' | '),
        o.subtotal || '',
        o.gst || '',
        o.total,
        o.paymentMethod || '',
        o.billingStatus || o.status,
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `RMS_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📥 CSV exported!');
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs font-bold text-slate-400">Loading Reports...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">

      {/* ── Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Reports & Analytics</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time revenue tracking and performance insights.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date filter pills */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            {[['all','All Time'],['today','Today'],['week','This Week'],['month','This Month']].map(([val, label]) => (
              <button key={val} onClick={() => setDateFilter(val)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateFilter === val ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5">
            📥 Export CSV
          </button>
          <button onClick={fetchOrders}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Grid (5 cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard label="Total Revenue"     value={`₹${totalRevenue.toLocaleString()}`}  icon="💰" colorClass="bg-emerald-50 text-emerald-600"  sub={`${completedCount} paid orders`}/>
        <KPICard label="Total Orders"      value={orderCount}                            icon="🛒" colorClass="bg-blue-50 text-blue-600"          sub="All order types"/>
        <KPICard label="Avg Order Value"   value={`₹${avgOrderValue}`}                  icon="📈" colorClass="bg-amber-50 text-amber-600"         sub="Per transaction"/>
        <KPICard label="Conversion Rate"   value={`${conversionRate}%`}                 icon="✅" colorClass="bg-indigo-50 text-indigo-600"       sub="Paid vs total"/>
        <KPICard label="Pending Orders"    value={pendingCount}                          icon="⏳" colorClass="bg-rose-50 text-rose-600"           sub="In kitchen queue"/>
      </div>

      {/* ── Row 1: Sales Trend + Top Items ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sales Trend Chart — Bar or Line */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Sales Trend</h3>
              <p className="text-xs text-slate-400 font-medium">Revenue breakdown by hour</p>
            </div>
            {/* Chart type toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              <button onClick={() => setActiveChart('bar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeChart === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                ▮▮ Bar
              </button>
              <button onClick={() => setActiveChart('line')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeChart === 'line' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                ∿ Line
              </button>
            </div>
          </div>
          <div className="h-64">
            {activeChart === 'bar'
              ? <Bar  data={salesTrendData} options={salesTrendOptions}/>
              : <Line data={salesTrendData} options={salesTrendOptions}/>
            }
          </div>
        </div>

        {/* Order Type Doughnut */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Order Split</h3>
            <p className="text-xs text-slate-400 font-medium">By order type</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={orderTypeDoughnut} options={doughnutOptions}/>
          </div>
        </div>
      </div>

      {/* ── Row 2: Top Items + Payment Methods ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Items Horizontal Bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Top Performing Items</h3>
            <p className="text-xs text-slate-400 font-medium">Items generating the most revenue</p>
          </div>
          <div className="h-64">
            {topItems.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-slate-400 font-medium">No sales data yet. Place some orders first!</p>
              </div>
            ) : (
              <Bar data={topItemsData} options={topItemsOptions}/>
            )}
          </div>
        </div>

        {/* Payment Method Revenue Doughnut */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Payment Methods</h3>
            <p className="text-xs text-slate-400 font-medium">Revenue by payment type</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={payMethodDoughnut} options={payDoughnutOptions}/>
          </div>
        </div>
      </div>

      {/* ── Row 3: Summary Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Item Sales Summary</h3>
            <p className="text-xs text-slate-400 font-medium">All items sorted by revenue</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
            {Object.keys(itemSales).length} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-3 w-8">#</th>
                <th className="pb-3">Item Name</th>
                <th className="pb-3 text-center">Qty Sold</th>
                <th className="pb-3 text-right">Revenue</th>
                <th className="pb-3 text-right w-40">Share</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(itemSales)
                .map(([name, d]) => ({ name, ...d }))
                .sort((a, b) => b.revenue - a.revenue)
                .map((item, idx) => {
                  const share = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : 0;
                  return (
                    <tr key={item.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 text-sm font-bold text-slate-800">{item.name}</td>
                      <td className="py-3 text-center">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{item.qty}</span>
                      </td>
                      <td className="py-3 text-right text-sm font-extrabold text-slate-800">₹{item.revenue.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${share}%` }}/>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {Object.keys(itemSales).length === 0 && (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400 text-sm font-medium">
                    No sales data available. Place some orders first!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Reports;
