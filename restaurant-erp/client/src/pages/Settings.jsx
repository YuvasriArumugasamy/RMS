import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';

const Settings = () => {
  const { requestNotificationPermission } = useSocket();
  const [activeTab, setActiveTab] = useState('General Settings');
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('settings');
    return saved ? JSON.parse(saved) : {
      name: 'Foodies Restaurant',
      email: 'info@foodies.com',
      phone: '9876543210',
      address: '123, Main Street, Chennai, Tamil Nadu - 600001',
      currency: 'INR (₹)',
    };
  });

  const tabs = [
    'General Settings',
    'Notifications',
    'Business Settings',
    'Payment Settings',
    'Printer Settings',
    'Users & Roles',
    'Backup & Restore',
  ];

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('settings', JSON.stringify(settings));
    toast.success('✅ Settings saved!');
  };

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      toast.success('🔔 Push notifications enabled!');
      // Send a test notification
      new Notification('RMS Notifications Active 🎉', {
        body: 'You will now receive alerts for new orders, low stock, and reservations.',
        icon: '/favicon.png',
      });
    } else if (result === 'denied') {
      toast.error('🚫 Permission denied. Enable in browser settings.');
    } else if (result === 'unsupported') {
      toast.warning('⚠️ Your browser does not support notifications.');
    }
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
          ) : activeTab === 'Notifications' ? (
            <div className="space-y-6 max-w-xl">
              {/* Browser Push Notifications */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Browser Push Notifications</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Receive alerts for new orders, kitchen updates, low stock &amp; reservations.
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ml-3 ${
                    notifPermission === 'granted'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    notifPermission === 'denied'    ? 'bg-red-50     text-red-600     border-red-200'     :
                    notifPermission === 'default'   ? 'bg-amber-50   text-amber-700   border-amber-200'   :
                    'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {notifPermission === 'granted'     ? '🔔 Enabled'      :
                     notifPermission === 'denied'      ? '🚫 Blocked'      :
                     notifPermission === 'unsupported' ? '❌ Unsupported'  :
                     '⚠️ Not Enabled'}
                  </span>
                </div>

                {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                  <button onClick={handleEnableNotifications}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10">
                    🔔 Enable Push Notifications
                  </button>
                )}

                {notifPermission === 'granted' && (
                  <button onClick={() => new Notification('Test Notification 🧪', { body: 'RMS notifications are working!', icon: '/favicon.png' })}
                    className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-sm transition-all border border-emerald-200">
                    🧪 Send Test Notification
                  </button>
                )}

                {notifPermission === 'denied' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                    🚫 Notifications are blocked. To enable: click the 🔒 lock icon in your browser's address bar → Notifications → Allow.
                  </div>
                )}
              </div>

              {/* What triggers notifications */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notification Triggers</p>
                {[
                  { icon:'🆕', label:'New Order',        desc:'When a new order is placed by waiter or QR scan',      active: true  },
                  { icon:'✅', label:'Order Ready',       desc:'When kitchen marks an order as Ready',                 active: true  },
                  { icon:'📅', label:'New Reservation',   desc:'When a table reservation is created',                  active: true  },
                  { icon:'⚠️', label:'Low Stock Alert',   desc:'When an ingredient falls below threshold',             active: true  },
                  { icon:'💰', label:'Payment Received',  desc:'When a bill is marked as paid',                        active: false },
                ].map(({ icon, label, desc, active }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{label}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{desc}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {active ? 'Active' : 'Coming soon'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
