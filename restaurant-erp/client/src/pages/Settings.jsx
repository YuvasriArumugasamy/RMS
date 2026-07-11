import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import { api } from '../context/AuthContext';

const Settings = () => {
  const { requestNotificationPermission } = useSocket();
  const [activeTab, setActiveTab] = useState('General Settings');
  const [saving, setSaving] = useState(false);
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

  // Load settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data.success && data.data) {
          const s = {
            name:     data.data.name,
            email:    data.data.email,
            phone:    data.data.phone,
            address:  data.data.address,
            currency: data.data.currency,
          };
          setSettings(s);
          localStorage.setItem('settings', JSON.stringify(s));
        }
      } catch {
        // offline — keep localStorage values
      }
    };
    loadSettings();
  }, []);

  const tabs = [
    'General Settings',
    'Notifications',
    'Business Settings',
    'Payment Settings',
    'Printer Settings',
    'Users & Roles',
    'Backup & Restore',
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Always save to localStorage for offline/invoice use
    localStorage.setItem('settings', JSON.stringify(settings));
    try {
      await api.put('/settings', settings);
      toast.success('✅ Settings saved!');
    } catch {
      toast.warning('⚠️ Saved locally (server offline)');
    } finally {
      setSaving(false);
    }
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

  const tabConfig = {
    'General Settings': { label: 'General Settings', icon: '⚙️' },
    'Notifications':    { label: 'Notifications',    icon: '🔔' },
    'Business Settings':{ label: 'Business Settings', icon: '🏢' },
    'Payment Settings': { label: 'Payment Settings', icon: '💳' },
    'Printer Settings': { label: 'Printer Settings', icon: '🖨️' },
    'Users & Roles':    { label: 'Users & Roles',    icon: '👥' },
    'Backup & Restore': { label: 'Backup & Restore', icon: '💾' },
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out] pb-12">
      
      {/* Header */}
      <div className="border-b border-slate-50 pb-5">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Settings</h2>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage business profile, notifications, local printer integrations, and roles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Tabs */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100/80 h-fit space-y-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] select-none">
          {tabs.map((tab) => {
            const conf = tabConfig[tab] || { label: tab, icon: '⚙️' };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0F286B] text-white shadow-md shadow-indigo-900/10'
                    : 'text-slate-550 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="text-base">{conf.icon}</span>
                {conf.label}
              </button>
            );
          })}
        </div>

        {/* Right Settings Form */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-850 border-b border-slate-50 pb-4 mb-6 tracking-tight flex items-center gap-2">
            <span className="text-xl">{tabConfig[activeTab]?.icon}</span>
            {activeTab}
          </h3>
          
          {activeTab === 'General Settings' ? (
            <form onSubmit={handleSave} className="space-y-6 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Phone</label>
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold cursor-pointer"
                  >
                    <option>INR (₹)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Address</label>
                <textarea
                  required
                  rows={3}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-550 text-xs font-bold resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-[#0F286B] disabled:opacity-60 text-white font-extrabold rounded-2xl transition-all shadow-md shadow-indigo-600/10 text-xs flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Saving...</span></>
                ) : 'Save Changes'}
              </button>
            </form>
          ) : activeTab === 'Notifications' ? (
            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
              {/* Browser Push Notifications */}
              <div className="bg-slate-50 border border-slate-150/60 rounded-3xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Browser Push Notifications</h4>
                    <p className="text-[10.5px] text-slate-400 font-bold mt-0.5 leading-relaxed">
                      Receive alerts for new orders, kitchen updates, low stock &amp; reservations.
                    </p>
                  </div>
                  <span className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border shrink-0 ml-3 ${
                    notifPermission === 'granted'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    notifPermission === 'denied'    ? 'bg-red-50     text-red-650     border-red-200'     :
                    notifPermission === 'default'   ? 'bg-amber-50   text-amber-700   border-amber-200'   :
                    'bg-slate-100 text-slate-550 border-slate-200'
                  }`}>
                    {notifPermission === 'granted'     ? '🔔 Enabled'      :
                     notifPermission === 'denied'      ? '🚫 Blocked'      :
                     notifPermission === 'unsupported' ? '❌ Unsupported'  :
                     '⚠️ Not Enabled'}
                  </span>
                </div>

                {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                  <button onClick={handleEnableNotifications}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-[#0F286B] text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95">
                    🔔 Enable Push Notifications
                  </button>
                )}

                {notifPermission === 'granted' && (
                  <button onClick={() => new Notification('Test Notification 🧪', { body: 'RMS notifications are working!', icon: '/favicon.png' })}
                    className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-2xl text-xs transition-all border border-emerald-200 cursor-pointer active:scale-95">
                    🧪 Send Test Notification
                  </button>
                )}

                {notifPermission === 'denied' && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-[10px] text-red-750 font-bold leading-relaxed">
                    🚫 Notifications are blocked. To enable: click the 🔒 lock icon in your browser's address bar → Notifications → Allow.
                  </div>
                )}
              </div>

              {/* What triggers notifications */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Notification Triggers</p>
                {[
                  { icon:'🆕', label:'New Order',        desc:'When a new order is placed by waiter or QR scan',      active: true  },
                  { icon:'✅', label:'Order Ready',       desc:'When kitchen marks an order as Ready',                 active: true  },
                  { icon:'📅', label:'New Reservation',   desc:'When a table reservation is created',                  active: true  },
                  { icon:'⚠️', label:'Low Stock Alert',   desc:'When an ingredient falls below threshold',             active: true  },
                  { icon:'💰', label:'Payment Received',  desc:'When a bill is marked as paid',                        active: false },
                ].map(({ icon, label, desc, active }) => (
                  <div key={label} className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-start gap-3">
                      <span className="text-lg select-none">{icon}</span>
                      <div>
                        <p className="text-xs font-black text-slate-700 leading-none">{label}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5">{desc}</p>
                      </div>
                    </div>
                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md select-none border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {active ? 'Active' : 'Coming soon'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 animate-[fadeIn_0.2s_ease-out]">
              <span className="text-5xl select-none block animate-pulse">🔒</span>
              <h4 className="text-sm font-extrabold text-slate-800">Locked in Demo Mode</h4>
              <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                The {activeTab} panel settings are currently preset for local testing and read-only in demo mode.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
