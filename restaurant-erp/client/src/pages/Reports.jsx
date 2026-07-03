import React, { useState, useEffect } from 'react';

const Reports = () => {
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  // Compute metrics dynamically from all orders
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0;
  
  // Item sales map
  const itemSales = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      if (!itemSales[i.name]) itemSales[i.name] = { qty: 0, revenue: 0 };
      itemSales[i.name].qty += i.qty;
      itemSales[i.name].revenue += (i.price * i.qty);
    });
  });

  const topItems = Object.entries(itemSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const maxRevenueItem = topItems.length > 0 ? topItems[0].revenue : 1;

  // Hourly sales map (mocking today's timeline based on timestamps)
  const hourlyData = [
    { label: '10 AM', value: 12 },
    { label: '12 PM', value: 45 },
    { label: '2 PM', value: 85 },
    { label: '4 PM', value: 30 },
    { label: '6 PM', value: 65 },
    { label: '8 PM', value: 95 },
    { label: '10 PM', value: 50 },
  ];
  const maxHourly = Math.max(...hourlyData.map(d => d.value));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Reports & Analytics</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time revenue tracking and performance insights.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors shadow-sm">
             Export CSV 📊
           </button>
           <button className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-750 transition-colors shadow-md shadow-indigo-600/10">
             Download Report 📄
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Revenue</p>
             <h3 className="text-3xl font-black text-slate-800">₹{totalRevenue.toLocaleString()}</h3>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
             💰
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Orders</p>
             <h3 className="text-3xl font-black text-slate-800">{orderCount}</h3>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
             🛒
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Order Value</p>
             <h3 className="text-3xl font-black text-slate-800">₹{avgOrderValue}</h3>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
             📈
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales Chart (CSS Mock) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
           <div>
             <h3 className="text-lg font-bold text-slate-800">Today's Sales Trend</h3>
             <p className="text-xs text-slate-500 font-medium">Hourly breakdown of order volume.</p>
           </div>
           
           <div className="h-64 flex items-end justify-between space-x-2 pt-6 border-b-2 border-slate-100 pb-2">
              {hourlyData.map((d, i) => {
                const heightPercentage = Math.max((d.value / maxHourly) * 100, 5);
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                     {/* Tooltip */}
                     <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded mb-2 shadow-lg">
                       {d.value}
                     </span>
                     {/* Bar */}
                     <div 
                       className="w-full max-w-[40px] bg-indigo-500 rounded-t-xl group-hover:bg-indigo-600 transition-all duration-500 relative overflow-hidden"
                       style={{ height: `${heightPercentage}%` }}
                     >
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent"></div>
                     </div>
                     {/* Label */}
                     <span className="text-[10px] font-bold text-slate-400 mt-3 block whitespace-nowrap">{d.label}</span>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Top Selling Items (Horizontal Bar Chart) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
           <div>
             <h3 className="text-lg font-bold text-slate-800">Top Performing Items</h3>
             <p className="text-xs text-slate-500 font-medium">Items generating the most revenue.</p>
           </div>

           <div className="space-y-5">
             {topItems.length === 0 && <p className="text-sm text-slate-400 py-10 text-center font-medium">No sales data available yet.</p>}
             {topItems.map((item, i) => {
               const widthPercent = Math.max((item.revenue / maxRevenueItem) * 100, 5);
               return (
                 <div key={i} className="space-y-2">
                   <div className="flex justify-between text-xs font-bold text-slate-700">
                     <span>{item.name} <span className="text-slate-400 font-semibold">({item.qty} sold)</span></span>
                     <span>₹{item.revenue}</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                     <div 
                       className="bg-emerald-500 h-full rounded-full transition-all duration-1000 relative"
                       style={{ width: `${widthPercent}%` }}
                     >
                       <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/30 to-transparent"></div>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
