import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon, subtitle, colorClass }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-extrabold text-slate-900">{value}</h3>
      {subtitle && <p className="text-[9px] text-slate-400 font-semibold">{subtitle}</p>}
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200 group-hover:scale-105 ${colorClass}`}>
      {icon}
    </div>
  </div>
);

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  // Compute live stats
  const activeOrders = orders.filter(o => o.status !== 'Completed');
  const todaySales = orders
    .filter(o => o.status === 'Completed')
    .reduce((sum, o) => sum + o.total, 0);

  const activeTablesCount = new Set(
    orders.filter(o => o.status !== 'Completed' && o.table !== 'N/A').map(o => o.table)
  ).size;

  const pendingCount = orders.filter(o => o.status === 'Pending').length;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-[#f97316] to-orange-600 text-white p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-36 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[60px]" />
        <div className="space-y-1 z-10">
          <h2 className="text-2xl font-extrabold">System Overview</h2>
          <p className="text-white/80 text-xs font-medium">Real-time status of your restaurant ERP environment.</p>
        </div>
        <div className="z-10 flex gap-2">
          <button
            onClick={() => navigate('/orders')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold rounded-xl transition-all border border-white/30"
          >
            Open Order Intake POS
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={`₹${todaySales}`} icon="💰" subtitle="Completed orders" colorClass="bg-emerald-50 text-emerald-600" />
        <StatCard title="Active Tables" value={`${activeTablesCount} / 32`} icon="🪑" subtitle="Tables in service" colorClass="bg-[#f97316]/10 text-[#f97316]" />
        <StatCard title="Kitchen Queue" value={pendingCount} icon="🍳" subtitle="Pending preparation" colorClass="bg-amber-50 text-amber-600" />
        <StatCard title="Total Transactions" value={orders.length} icon="🧾" subtitle="Dine-in & Takeaway" colorClass="bg-blue-50 text-blue-600" />
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Active Orders queue */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="text-base font-bold text-slate-800">Live Active Queue</h3>
              <p className="text-[10px] text-slate-400 font-medium">Orders currently being processed or waiting checkout</p>
            </div>
            <span className="text-[9px] font-bold text-[#f97316] bg-[#f97316]/10 px-2 py-1 rounded-full animate-pulse border border-[#f97316]/20">
              Live Monitoring
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-[9px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-2 font-semibold">Order ID</th>
                  <th className="pb-2 font-semibold">Type/Table</th>
                  <th className="pb-2 font-semibold">Items</th>
                  <th className="pb-2 font-semibold">Amount</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {activeOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-slate-400 py-10 font-medium">
                      No active orders in the queue right now.
                    </td>
                  </tr>
                ) : (
                  activeOrders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                      <td className="py-3 font-bold text-slate-800">{o.id}</td>
                      <td className="py-3 text-slate-500 font-semibold">
                        {o.type} {o.table !== 'N/A' && `(${o.table})`}
                      </td>
                      <td className="py-3 text-slate-500 font-medium max-w-xs truncate">
                        {o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </td>
                      <td className="py-3 font-bold text-slate-800">₹{o.total}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          o.status === 'Ready' ? 'bg-green-50 text-green-700 border border-green-200' :
                          o.status === 'Preparing' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
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

        {/* Quick Operations Guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-0.5">Operational Guides</h3>
            <p className="text-[10px] text-slate-400 font-medium">Learn how to simulate ERP workflows:</p>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-gradient-to-br from-[#f97316]/5 to-orange-50 border border-[#f97316]/20 rounded-xl space-y-1 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#f97316] text-white text-[9px] font-black flex items-center justify-center">1</span>
                <p className="text-xs font-bold text-slate-800">Take Orders (Waiter)</p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium pl-7">Log in as Waiter, place orders in the POS cart to send them directly to the kitchen queue.</p>
            </div>
            
            <div className="p-3 bg-gradient-to-br from-blue-50/50 to-blue-50 border border-blue-200 rounded-xl space-y-1 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">2</span>
                <p className="text-xs font-bold text-slate-800">Kitchen Prep (Chef)</p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium pl-7">Log in as Chef to see incoming order queues, start cooking, and mark them as ready.</p>
            </div>

            <div className="p-3 bg-gradient-to-br from-emerald-50/50 to-emerald-50 border border-emerald-200 rounded-xl space-y-1 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">3</span>
                <p className="text-xs font-bold text-slate-800">Checkout (Cashier)</p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium pl-7">Log in as Cashier, apply discounts or bill splitting, print receipt, and accept payments.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
