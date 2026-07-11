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
    if (points >= 200) return { label:'Gold',     color:'bg-amber-50 text-amber-800',  icon:'🥇' };
    if (points >= 100) return { label:'Silver',   color:'bg-slate-50 text-slate-650',  icon:'🥈' };
    return { label:'Bronze', color:'bg-orange-50 text-orange-700', icon:'🥉' };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out] pb-12">

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-55 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Customer CRM</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Track loyalty points, real order history, and customer feedback.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-650 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-orange-500/10 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <span className="text-sm font-black">+</span> Add Customer
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
          <div key={label} className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100/80 flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-black text-[#0F286B] mt-0.5 tracking-tight">{val}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${color} shadow-sm`}>{icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Customer List ── */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4.5">
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/60 rounded-2xl px-3.5 py-3 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 focus-within:bg-white transition-all">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none bg-transparent"/>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-10 font-bold">No customers found.</p>
            )}
            {filteredCustomers.map(c => {
              const tier = getTier(c.loyaltyPoints || 0);
              const isSelected = (selectedCustomer?._id || selectedCustomer?.id) === (c._id || c.id);
              return (
                <div key={c._id || c.id} onClick={() => openCustomerDetails(c)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.01)] ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/15 ring-1 ring-indigo-500/20' 
                      : 'border-slate-100 hover:border-slate-350 hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        {c.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 truncate leading-snug">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{c.phone}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider leading-none ${tier.color}`}>
                        {tier.icon} {tier.label}
                      </span>
                      <p className="text-[11px] font-black text-amber-600 mt-1">{c.loyaltyPoints || 0} pts</p>
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
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              {/* Profile header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100/70 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                    {selectedCustomer.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-850 tracking-tight leading-snug">{selectedCustomer.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">📞 {selectedCustomer.phone}{selectedCustomer.email ? ` · ✉️ ${selectedCustomer.email}` : ''}</p>
                    <p className="text-[10px] text-slate-450 font-bold mt-1">
                      Member since {new Date(selectedCustomer.createdAt).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                  {(() => { const tier = getTier(selectedCustomer.loyaltyPoints||0); return (
                    <span className={`text-xs font-black px-3 py-1 rounded-xl border uppercase tracking-wider ${tier.color}`}>{tier.icon} {tier.label}</span>
                  ); })()}
                  <button onClick={() => recalcLoyalty(selectedCustomer)} className="text-[9.5px] font-black text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 rounded-xl px-3 py-1.5 cursor-pointer transition-all active:scale-95">
                    🔄 Recalculate Points
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label:'Total Spend',   val:`₹${(selectedCustomer.totalSpend||0).toLocaleString()}`,  color:'text-emerald-700 bg-emerald-50/50 border border-emerald-100/50' },
                  { label:'Total Orders',  val: selectedCustomer.totalOrders || 0,                       color:'text-indigo-700  bg-indigo-50/50  border border-indigo-100/50'  },
                  { label:'Loyalty Points',val: selectedCustomer.loyaltyPoints || 0,                     color:'text-amber-700   bg-amber-50/50   border border-amber-100/50'   },
                ].map(({ label, val, color }) => (
                  <div key={label} className={`${color} rounded-2xl p-4 text-center shadow-sm`}>
                    <p className="text-lg font-black tracking-tight">{val}</p>
                    <p className="text-[9.5px] font-black opacity-80 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Real order history */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h4 className="text-sm font-extrabold text-slate-700 tracking-tight">Real Order History</h4>
                  <span className="text-[9.5px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">{customerOrders.length} orders</span>
                </div>

                {loadingOrders ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-xs text-slate-400 font-bold">No orders linked to this customer yet.</p>
                    <p className="text-[10px] text-slate-300 font-bold mt-1">Orders with matching phone will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {customerOrders.map(o => (
                      <div key={o._id || o.orderId} className="flex items-center justify-between p-3.5 border border-slate-100 bg-white hover:bg-slate-50/30 rounded-2xl shadow-sm transition-all duration-200">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800">#{o.orderId?.substring(o.orderId.length - 8).toUpperCase() || o.id?.substring(0,8).toUpperCase()}</p>
                          <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                            {o.date || new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.type} {o.table !== 'N/A' && `· Table ${o.table}`}
                          </p>
                          <p className="text-[9.5px] text-slate-500 font-bold mt-1 truncate max-w-[280px] bg-slate-50/70 border border-slate-100/50 px-2 py-0.5 rounded-lg w-fit">
                            {(o.items||[]).map(i=>`${i.qty}x ${i.name}`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-slate-800">₹{o.total}</p>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg leading-none border block mt-1 ${
                            o.billingStatus === 'Paid' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-red-50 text-red-500 border-red-100 animate-pulse'
                          }`}>
                            {o.billingStatus || o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <h4 className="text-sm font-extrabold text-slate-700 tracking-tight">Feedback & Reviews</h4>
                  <button onClick={() => setShowFeedbackModal(true)} className="text-[9.5px] font-black text-indigo-650 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 rounded-xl px-2.5 py-1.5 cursor-pointer transition-all active:scale-95">
                    + Add Feedback
                  </button>
                </div>
                <div className="space-y-3.5 max-h-40 overflow-y-auto pr-1">
                  {(selectedCustomer.feedback || []).length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-6 border border-dashed border-slate-200 rounded-2xl">No feedback recorded.</p>
                  ) : (
                    selectedCustomer.feedback.map((f, idx) => (
                      <div key={idx} className="p-4 border border-slate-100/80 bg-white hover:bg-slate-50/20 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.01)] transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex space-x-0.5 select-none">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={`text-base ${star <= f.rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{f.date}</span>
                        </div>
                        <p className="text-xs text-slate-650 font-bold italic leading-relaxed">"{f.comment}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 min-h-[450px] flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-6xl animate-bounce">👥</span>
              <h3 className="text-base font-extrabold text-slate-800">Select a Customer Profile</h3>
              <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed">Click any customer from the list to view real-time order history, loyalty points, levels, and feedback.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Customer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative space-y-5 animate-[scaleUp_0.2s_ease-out] border border-slate-100">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer">✕</button>
            <div>
              <h3 className="text-base font-extrabold text-slate-850 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-sm font-black">+</span>
                Add New Customer
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Register customer in CRM</p>
            </div>
            
            <form onSubmit={addCustomer} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                <input required type="text" placeholder="e.g. Raj Kumar" value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Phone (unique)</label>
                <input required type="tel" placeholder="+91 9999999999" value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Email (optional)</label>
                <input type="email" placeholder="customer@example.com" value={addForm.email} onChange={e => setAddForm(f => ({...f, email: e.target.value}))}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"/>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-extrabold rounded-xl text-xs cursor-pointer transition-all border border-slate-100">
                  Cancel
                </button>
                <button type="submit" disabled={savingCustomer} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-650 hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-orange-400/20 cursor-pointer">
                  {savingCustomer ? 'Adding...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative space-y-4.5 animate-[scaleUp_0.2s_ease-out] border border-slate-100">
            <button onClick={() => setShowFeedbackModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer">✕</button>
            <div>
              <h3 className="text-base font-extrabold text-slate-850">Add Customer Feedback</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Record feedback for {selectedCustomer.name}</p>
            </div>
            
            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Rating (1-5)</label>
                <div className="flex space-x-2 select-none">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => setFeedbackRating(star)}
                      className={`text-3xl transition-transform hover:scale-110 cursor-pointer ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-200'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Comments</label>
                <textarea required rows="3" className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-xs font-bold resize-none"
                  value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="What did the customer say?"/>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-extrabold rounded-xl text-xs cursor-pointer transition-all border border-slate-100">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20 cursor-pointer">
                  Save Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCRM;
