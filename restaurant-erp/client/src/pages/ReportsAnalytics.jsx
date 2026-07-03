import React, { useState } from 'react';

const ReportsAnalytics = () => {
  const [activeTab, setActiveTab] = useState('Sales Report');

  const tabs = [
    { name: 'Sales Report', icon: '📈' },
    { name: 'Best Selling Items', icon: '🍗' },
    { name: 'Profit & Revenue', icon: '💰' },
    { name: 'Order Report', icon: '📋' },
    { name: 'Inventory Report', icon: '📦' },
    { name: 'Staff Report', icon: '👥' }
  ];

  const salesData = [
    { label: '01 May', value: 45000 },
    { label: '08 May', value: 58000 },
    { label: '15 May', value: 72000 },
    { label: '22 May', value: 65000 },
    { label: '29 May', value: 89000 }
  ];

  const maxVal = Math.max(...salesData.map(d => d.value));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Reports & Analytics</h2>
        <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3.5 py-2 rounded-xl">
          May 2026 - Jun 2026
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side Tab Selector */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 h-fit space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all ${
                activeTab === tab.name
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Right Side Stats & Chart */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Sales</p>
              <h4 className="text-xl font-bold text-slate-800">₹2,45,680</h4>
              <span className="text-[10px] text-green-500 font-bold">↑ 15.2%</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Orders</p>
              <h4 className="text-xl font-bold text-slate-800">1,245</h4>
              <span className="text-[10px] text-green-500 font-bold">↑ 10.3%</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Customers</p>
              <h4 className="text-xl font-bold text-slate-800">980</h4>
              <span className="text-[10px] text-green-500 font-bold">↑ 8.1%</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Average Order</p>
              <h4 className="text-xl font-bold text-slate-800">₹525</h4>
              <span className="text-[10px] text-green-500 font-bold">↑ 5.6%</span>
            </div>
          </div>

          {/* Chart Display */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Sales Overview</h3>
            
            {/* Custom Bar Graph */}
            <div className="flex items-end justify-between h-64 px-4 border-b border-slate-100 pb-2">
              {salesData.map((d, idx) => {
                const heightPercent = (d.value / maxVal) * 80; // Scale to fit container
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group">
                    <span className="text-xs font-bold text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                      ₹{(d.value / 1000).toFixed(1)}k
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-10 sm:w-14 bg-indigo-600 rounded-t-xl transition-all duration-500 group-hover:bg-indigo-700 shadow-md shadow-indigo-600/10"
                    ></div>
                    <span className="text-xs font-semibold text-slate-400 mt-3">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
