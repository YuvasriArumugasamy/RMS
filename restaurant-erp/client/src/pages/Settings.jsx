import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import { api, useAuth } from '../context/AuthContext';

const Settings = () => {
  const { requestNotificationPermission } = useSocket();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [activeTab, setActiveTab] = useState('General Settings');
  const [saving, setSaving] = useState(false);

  // Tax settings (Admin configurable)
  const [gstRate, setGstRate] = useState(() => {
    const saved = localStorage.getItem('rms_gst_rate');
    return saved ? parseFloat(saved) : 5;
  });
  const [gstin, setGstin] = useState(() => {
    return localStorage.getItem('rms_gstin') || '33AAAAA1111A1Z1';
  });
  const [paymentSettings, setPaymentSettings] = useState(() => {
    const saved = localStorage.getItem('rms_payment_settings');
    return saved ? JSON.parse(saved) : {
      provider: 'razorpay',
      mode: 'test',
      razorpayKeyId: '',
      razorpayKeySecret: '',
      stripePublishableKey: '',
      stripeSecretKey: '',
    };
  });
  const [printerSettings, setPrinterSettings] = useState(() => {
    const saved = localStorage.getItem('rms_printer_settings');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      type: 'local',
      name: '',
      ip: '',
      port: 9100,
    };
  });
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Waiter', phone: '', email: '' });
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
          if (data.data.gstRate !== undefined) {
            setGstRate(data.data.gstRate);
            localStorage.setItem('rms_gst_rate', data.data.gstRate.toString());
          }
          if (data.data.gstin !== undefined) {
            setGstin(data.data.gstin);
            localStorage.setItem('rms_gstin', data.data.gstin);
          }
                  if (data.data.payment !== undefined) {
                    setPaymentSettings(data.data.payment);
                    localStorage.setItem('rms_payment_settings', JSON.stringify(data.data.payment));
                  }
                  if (data.data.printer !== undefined) {
                    setPrinterSettings(data.data.printer);
                    localStorage.setItem('rms_printer_settings', JSON.stringify(data.data.printer));
                  }
                  // load users list if authorized
                  try {
                    const usersRes = await api.get('/users');
                    if (usersRes.data && usersRes.data.success) setUsers(usersRes.data.data || []);
                  } catch (e) {
                    // ignore — may not have permissions in demo
                  }
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
          ) : activeTab === 'Business Settings' ? (
            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
              {isAdmin ? (
                <>
                  {/* Tax Configuration */}
                  <div className="bg-slate-50 border border-slate-150/60 rounded-3xl p-5 space-y-5">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                        📊 Tax Configuration
                        <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">Admin Only</span>
                      </h4>
                      <p className="text-[10.5px] text-slate-400 font-bold mt-0.5 leading-relaxed">
                        Set the GST percentage applied to all orders, invoices, and receipts.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">GST Rate (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="28"
                            step="0.5"
                            value={gstRate}
                            onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-xs font-bold pr-10"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold">Common: 5% (Food) · 12% (Non-AC) · 18% (AC/Premium)</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">GSTIN Number</label>
                        <input
                          type="text"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase())}
                          placeholder="e.g. 33AAAAA1111A1Z1"
                          maxLength={15}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-xs font-bold tracking-wider"
                        />
                        <p className="text-[9px] text-slate-400 font-semibold">15-digit GST Identification Number for invoices</p>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Invoice Preview</p>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Subtotal</span><span>₹1,000.00</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-[#f97316] mt-1">
                        <span>GST ({gstRate}%)</span><span>₹{(1000 * gstRate / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-extrabold text-slate-800 mt-2 pt-2 border-t border-dashed border-slate-150">
                        <span>Total</span><span>₹{(1000 + 1000 * gstRate / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        localStorage.setItem('rms_gst_rate', gstRate.toString());
                        localStorage.setItem('rms_gstin', gstin);
                        try {
                          await api.put('/settings', {
                            ...settings,
                            gstRate,
                            gstin
                          });
                          toast.success(`✅ Tax settings saved! GST: ${gstRate}% · GSTIN: ${gstin}`);
                        } catch (err) {
                          toast.warning(`⚠️ Saved locally (server offline). GST: ${gstRate}%`);
                        }
                      }}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-[#0F286B] text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95"
                    >
                      💾 Save Tax Settings
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <span className="text-5xl select-none block">🔒</span>
                  <h4 className="text-sm font-extrabold text-slate-800">Admin Access Required</h4>
                  <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                    Only Admin users can modify GST rate and business tax settings.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'Payment Settings' ? (
            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
              {isAdmin ? (
                <div className="bg-slate-50 border border-slate-150/60 rounded-3xl p-5 space-y-5">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Payment Gateway</h4>
                    <p className="text-[10.5px] text-slate-400 font-bold mt-0.5 leading-relaxed">Configure your payment provider and credentials.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Provider</label>
                      <select
                        value={paymentSettings.provider}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, provider: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
                      >
                        <option value="razorpay">Razorpay</option>
                        <option value="stripe">Stripe</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Mode</label>
                      <select
                        value={paymentSettings.mode}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, mode: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-xs font-bold cursor-pointer"
                      >
                        <option value="test">Test</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                  </div>

                  {paymentSettings.provider === 'razorpay' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Razorpay Key ID</label>
                        <input
                          type="text"
                          value={paymentSettings.razorpayKeyId}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeyId: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Razorpay Key Secret</label>
                        <input
                          type="password"
                          value={paymentSettings.razorpayKeySecret}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeySecret: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {paymentSettings.provider === 'stripe' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Stripe Publishable Key</label>
                        <input
                          type="text"
                          value={paymentSettings.stripePublishableKey}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, stripePublishableKey: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Stripe Secret Key</label>
                        <input
                          type="password"
                          value={paymentSettings.stripeSecretKey}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, stripeSecretKey: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-505 text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      localStorage.setItem('rms_payment_settings', JSON.stringify(paymentSettings));
                      try {
                        await api.put('/settings', {
                          ...settings,
                          payment: paymentSettings,
                        });
                        toast.success('✅ Payment settings saved!');
                      } catch (err) {
                        toast.warning('⚠️ Saved locally (server offline)');
                      }
                    }}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-[#0F286B] text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95"
                  >
                    💾 Save Payment Settings
                  </button>
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <span className="text-5xl select-none block">🔒</span>
                  <h4 className="text-sm font-extrabold text-slate-800">Admin Access Required</h4>
                  <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                    Only Admin users can configure payment integrations.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'Printer Settings' ? (
            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
              {isAdmin ? (
                <div className="bg-slate-50 border border-slate-150/60 rounded-3xl p-5 space-y-5">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Printer Settings</h4>
                    <p className="text-[10.5px] text-slate-400 font-bold mt-0.5 leading-relaxed">Configure local or network printers used for receipts and kitchen slips.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={printerSettings.enabled} onChange={(e) => setPrinterSettings({ ...printerSettings, enabled: e.target.checked })} />
                      <span className="text-xs font-black text-slate-700">Enable Printing</span>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Printer Type</label>
                        <select value={printerSettings.type} onChange={(e) => setPrinterSettings({ ...printerSettings, type: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold">
                          <option value="local">Local (Browser / Connected)</option>
                          <option value="network">Network (IP)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Printer Name</label>
                        <input type="text" value={printerSettings.name} onChange={(e) => setPrinterSettings({ ...printerSettings, name: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold" />
                      </div>
                    </div>

                    {printerSettings.type === 'network' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Printer IP</label>
                          <input type="text" value={printerSettings.ip} onChange={(e) => setPrinterSettings({ ...printerSettings, ip: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Port</label>
                          <input type="number" value={printerSettings.port} onChange={(e) => setPrinterSettings({ ...printerSettings, port: parseInt(e.target.value || '0', 10) })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold" />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={async () => {
                        localStorage.setItem('rms_printer_settings', JSON.stringify(printerSettings));
                        try {
                          await api.put('/settings', { ...settings, printer: printerSettings });
                          toast.success('✅ Printer settings saved!');
                        } catch (err) {
                          toast.warning('⚠️ Saved locally (server offline)');
                        }
                      }} className="py-3.5 px-4 bg-indigo-600 hover:bg-[#0F286B] text-white font-extrabold rounded-2xl text-xs transition-all shadow-md">💾 Save Printer Settings</button>

                      <button onClick={() => { toast.info('🖨️ Test print simulated (browser demo)'); }} className="py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-2xl text-xs transition-all border border-emerald-200">🧪 Test Print</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <span className="text-5xl select-none block">🔒</span>
                  <h4 className="text-sm font-extrabold text-slate-800">Admin Access Required</h4>
                  <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                    Only Admin users can configure printer integrations.
                  </p>
                </div>
              )}
            </div>
          ) : (
            activeTab === 'Users & Roles' ? (
            <div className="space-y-6 max-w-3xl animate-[fadeIn_0.2s_ease-out]">
              {isAdmin ? (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-sm font-black text-slate-800">Users & Roles</h4>
                  <p className="text-xs text-slate-400">Create and manage user accounts and roles.</p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <input className="px-3 py-2 border rounded-2xl text-xs" placeholder="Username" value={newUser.username} onChange={(e)=>setNewUser({...newUser, username:e.target.value})} />
                    <input className="px-3 py-2 border rounded-2xl text-xs" placeholder="Password" type="password" value={newUser.password} onChange={(e)=>setNewUser({...newUser, password:e.target.value})} />
                    <select className="px-3 py-2 border rounded-2xl text-xs" value={newUser.role} onChange={(e)=>setNewUser({...newUser, role:e.target.value})}>
                      <option>Admin</option><option>Manager</option><option>Chef</option><option>Waiter</option><option>Cashier</option>
                    </select>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-xs" onClick={async ()=>{
                      try{
                        const res = await api.post('/users', newUser);
                        if(res.data && res.data.success){
                          setUsers([res.data.data,...users]);
                          setNewUser({ username:'', password:'', role:'Waiter', phone:'', email:'' });
                          toast.success('✅ User created');
                        }
                      }catch(err){toast.error(err?.response?.data?.message || 'Could not create user');}
                    }}>➕ Add User</button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left text-slate-500">
                        <tr><th className="pb-2">Username</th><th>Role</th><th>Phone</th><th>Email</th><th>Active</th><th></th></tr>
                      </thead>
                      <tbody>
                        {users.map(u=> (
                          <tr key={u._id} className="border-t">
                            <td className="py-2 font-bold">{u.username}</td>
                            <td>
                              <select className="text-xs px-2 py-1 border rounded-2xl" value={u.role} onChange={async (e)=>{
                                try{ const {data} = await api.put(`/users/${u._id}`, { role: e.target.value }); if(data.success){ setUsers(users.map(x=> x._id===u._id? data.data: x)); toast.success('Role updated'); }}catch(err){toast.error('Could not update');}
                              }}>
                                <option>Admin</option><option>Manager</option><option>Chef</option><option>Waiter</option><option>Cashier</option>
                              </select>
                            </td>
                            <td><input className="text-xs px-2 py-1 border rounded-2xl" value={u.phone||''} onChange={(e)=> setUsers(users.map(x=> x._id===u._id? {...x, phone: e.target.value}: x))} onBlur={async ()=>{ try{ await api.put(`/users/${u._id}`, { phone: users.find(x=>x._id===u._id).phone }); toast.success('Saved'); }catch{toast.error('Save failed')} }} /></td>
                            <td><input className="text-xs px-2 py-1 border rounded-2xl" value={u.email||''} onChange={(e)=> setUsers(users.map(x=> x._id===u._id? {...x, email: e.target.value}: x))} onBlur={async ()=>{ try{ await api.put(`/users/${u._id}`, { email: users.find(x=>x._id===u._id).email }); toast.success('Saved'); }catch{toast.error('Save failed')} }} /></td>
                            <td>
                              <input type="checkbox" checked={!!u.isActive} onChange={async (e)=>{ try{ const {data} = await api.put(`/users/${u._id}`, { isActive: e.target.checked }); if(data.success) setUsers(users.map(x=> x._id===u._id? data.data: x)); }catch{toast.error('Could not update active state')} }} />
                            </td>
                            <td className="text-right">
                              <button className="text-red-600 text-xs" onClick={async ()=>{ if(!confirm('Delete user?')) return; try{ await api.delete(`/users/${u._id}`); setUsers(users.filter(x=> x._id!==u._id)); toast.success('Deleted'); }catch{toast.error('Delete failed')} }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <span className="text-5xl select-none block">🔒</span>
                  <h4 className="text-sm font-extrabold text-slate-800">Admin Access Required</h4>
                  <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">Only Admin users can manage users and roles.</p>
                </div>
              )}
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
