import React, { useState } from 'react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('General Settings');
  const [settings, setSettings] = useState({
    name: 'Foodies Restaurant',
    email: 'info@foodies.com',
    phone: '9876543210',
    address: '123, Main Street, Chennai, Tamil Nadu - 600001',
    currency: 'INR (₹)'
  });

  const tabs = [
    'General Settings',
    'Business Settings',
    'Payment Settings',
    'Printer Settings',
    'Users & Roles',
    'Backup & Restore'
  ];

  const handleSave = (e) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 h-fit space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl text-left text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right Settings Form */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">{activeTab}</h3>
          
          {activeTab === 'General Settings' ? (
            <form onSubmit={handleSave} className="space-y-6 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  >
                    <option>INR (₹)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</label>
                <textarea
                  required
                  rows={3}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 text-sm"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              Configuration panel for {activeTab} is currently disabled in Demo mode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
