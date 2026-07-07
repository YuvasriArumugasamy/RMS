import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';

const CustomerCRM = () => {
  const [customers, setCustomers]           = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders]   = useState([]);
  const [loadingOrders, setLoadingOrders]     = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');

  // Add customer modal
  const [showAddModal, setShowAddModal]       = useState(false);
  const [addForm, setAddForm]                 = useState({ name:'', phone:'', email:'' });
  const [savingCustomer, setSavingCustomer]   = useState(false);

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating]       = useState(5);
  const [feedbackComment, setFeedbackComment]     = useState('');

  // ── Load customers ──────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/customers');
        if (data.success) setCustomers(data.data);
      } catch {
        const saved = localStorage.getItem('customers');
        if (saved) setCustomers(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Fetch real order history for selected customer ──────────
  const fetchCustomerOrders = useCallback(async (customer) => {
    setLoadingOrders(true);
    const id = customer._id || customer.id;
    try {
      const { data } = await api.get(`/customers/${id}/orders`);
      if (data.success) setCustomerOrders(data.data);
    } catch {
      // Fallback: filter localStorage orders by phone
      const saved = localStorage.getItem('orders');
      if (saved) {
        const all = JSON.parse(saved);
        setCustomerOrders(all.filter(o => o.customerPhone === customer.phone).slice(0, 10));
      } else {
        setCustomerOrders([]);
      }
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const openCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer);
  };

  // ── Recalculate loyalty points ──────────────────────────────
  const recalcLoyalty = async (customer) => {
    const id = customer._id || customer.id;
    try {
      const { data } = await api.post(`/customers/${id}/recalculate`);
      if (data.success) {
        setCustomers(prev => prev.map(c => (c._id || c.id) === id ? data.data : c));
        setSelectedCustomer(data.data);
        toast.success('🏆 Loyalty points recalculated!');
      }
    } catch {
      toast.warning('⚠️ Could not recalculate (offline)');
    }
  };

  // ── Add new customer ────────────────────────────────────────
  const addCustomer = async (e) => {
    e.preventDefault();
    setSavingCustomer(true);
    try {
      const { data } = await api.post('/customers', addForm);
      if (data.success) {
        setCustomers(prev => [data.data, ...prev]);
        toast.success(`✅ ${addForm.name} added to CRM!`);
        setShowAddModal(false);
        setAddForm({ name:'', phone:'', email:'' });
      }
    } catch (err) {
      toast.error(`❌ ${err?.response?.data?.message || 'Failed to add customer'}`);
    } finally {
      setSavingCustomer(false);
    }
  };

  // ── Submit feedback ─────────────────────────────────────────
  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const id = selectedCustomer._id || selectedCustomer.id;
    const newFeedback = { date: new Date().toLocaleDateString(), rating: feedbackRating, comment: feedbackComment };
    try {
      const { data } = await api.post(`/customers/${id}/feedback`, { rating: feedbackRating, comment: feedbackComment });
      if (data.success) {
        setCustomers(prev => prev.map(c => (c._id || c.id) === id ? data.data : c));
        setSelectedCustomer(prev => ({ ...prev, feedback: [newFeedback, ...(prev.feedback || [])] }));
        toast.success('⭐ Feedback saved!');
      }
    } catch {
      setCustomers(prev => prev.map(c => {
        if ((c._id || c.id) !== id) return c;
        return { ...c, feedback: [newFeedback, ...(c.feedback || [])] };
      }));
      toast.warning('⚠️ Feedback saved locally (offline)');
    }
    setShowFeedbackModal(false);
    setFeedbackRating(5);
    setFeedbackComment('');
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  // ── Tier badge ──────────────────────────────────────────────
  const getTier = (points) => {
    if (points >= 500) return { label:'Platinum', color:'bg-slate-100 text-slate-700', icon:'💎' };
    if (points >= 200) return { label:'Gold',     color:'bg-amber-50 text-amber-700',  icon:'🥇' };
    if (points >= 100) return { label:'Silver',   color:'bg-slate-50 text-slate-600',  icon:'🥈' };
    return { label:'Bronze', color:'bg-orange-50 text-orange-700', icon:'🥉' };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Customer CRM</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Track loyalty points, real order history, and customer feedback.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md transition-all">
          + Add Customer
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Customers', val: customers.length,                                                       icon:'👤', color:'bg-blue-50    text-blue-600'    },
          { label:'Total Revenue',   val:`₹${customers.reduce((s,c)=>s+(c.totalSpend||0),0).toLocaleString()}`,   icon:'💰', color:'bg-emerald-50 text-emerald-600' },
          { label:'Avg Spend',       val:`₹${customers.length ? Math.round(customers.reduce((s,c)=>s+(c.totalSpend||0),0)/customers.length) : 0}`, icon:'📊', color:'bg-amber-50 text-amber-600' },
          { label:'Loyalty Members', val: customers.filter(c=>(c.loyaltyPoints||0)>0).length,                     icon:'🏆', color:'bg-violet-50  text-violet-600'  },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{val}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${color}`}>{icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Customer List ── */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-xs font-semibold text-slate-700 focus:outline-none bg-transparent"/>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8 font-medium">No customers found.</p>
            )}
            {filteredCustomers.map(c => {
              const tier = getTier(c.loyaltyPoints || 0);
              return (
                <div key={c._id || c.id} onClick={() => openCustomerDetails(c)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${(selectedCustomer?._id || selectedCustomer?.id) === (c._id || c.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                        {c.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{c.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${tier.color}`}>{tier.icon} {tier.label}</span>
                      <p className="text-xs font-black text-amber-600 mt-0.5">{c.loyaltyPoints || 0} pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Customer Detail ── */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
              {/* Profile header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl">
                    {selectedCustomer.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{selectedCustomer.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold">📞 {selectedCustomer.phone}{selectedCustomer.email ? ` · ✉️ ${selectedCustomer.email}` : ''}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Member since {new Date(selectedCustomer.createdAt).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {(() => { const tier = getTier(selectedCustomer.loyaltyPoints||0); return (
                    <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${tier.color}`}>{tier.icon} {tier.label}</span>
                  ); })()}
                  <button onClick={() => recalcLoyalty(selectedCustomer)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-all">
                    🔄 Recalculate Points
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'Total Spend',   val:`₹${(selectedCustomer.totalSpend||0).toLocaleString()}`,  color:'text-emerald-600 bg-emerald-50' },
                  { label:'Total Orders',  val: selectedCustomer.totalOrders || 0,                       color:'text-blue-600    bg-blue-50'    },
                  { label:'Loyalty Points',val: selectedCustomer.loyaltyPoints || 0,                     color:'text-amber-600   bg-amber-50'   },
                ].map(({ label, val, color }) => (
                  <div key={label} className={`${color} rounded-2xl p-4 text-center`}>
                    <p className="text-xl font-extrabold">{val}</p>
                    <p className="text-[10px] font-bold opacity-70 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Real order history */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-700">Real Order History</h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">{customerOrders.length} orders</span>
                </div>

                {loadingOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-xs text-slate-400 font-medium">No orders linked to this customer yet.</p>
                    <p className="text-[10px] text-slate-300 font-medium mt-1">Orders with matching phone will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {customerOrders.map(o => (
                      <div key={o._id || o.orderId} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{o.orderId || o.id}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {o.date || new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.type} · {o.table}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[240px]">
                            {(o.items||[]).map(i=>`${i.qty}x ${i.name}`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-extrabold text-slate-800">₹{o.total}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${o.billingStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                            {o.billingStatus || o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-700">Feedback & Reviews</h4>
                  <button onClick={() => setShowFeedbackModal(true)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100">
                    + Add Feedback
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {(selectedCustomer.feedback || []).length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium text-center py-4 border border-dashed border-slate-200 rounded-xl">No feedback recorded.</p>
                  ) : (
                    selectedCustomer.feedback.map((f, idx) => (
                      <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex space-x-0.5">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={`text-sm ${star <= f.rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{f.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium italic">"{f.comment}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-5xl">👤</span>
              <h3 className="text-lg font-bold text-slate-800">Select a Customer</h3>
              <p className="text-sm text-slate-400 font-medium max-w-xs">Click any customer to view real order history, loyalty points, and feedback.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Customer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative space-y-5">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">Add New Customer</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Register customer in CRM</p>
            </div>
            <form onSubmit={addCustomer} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                <input required type="text" placeholder="e.g. Raj Kumar" value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone (unique)</label>
                <input required type="tel" placeholder="+91 9999999999" value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email (optional)</label>
                <input type="email" placeholder="customer@example.com" value={addForm.email} onChange={e => setAddForm(f => ({...f, email: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={savingCustomer} className="flex-1 py-3 bg-[#f97316] hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-orange-400/20">
                  {savingCustomer ? 'Adding...' : '✅ Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setShowFeedbackModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Add Customer Feedback</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">Record feedback for {selectedCustomer.name}</p>
            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Rating (1-5)</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => setFeedbackRating(star)}
                      className={`text-3xl transition-transform hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-200'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Comments</label>
                <textarea required rows="3" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold resize-none"
                  value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="What did the customer say?"/>
              </div>
              <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 text-xs">
                Save Feedback
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCRM;
