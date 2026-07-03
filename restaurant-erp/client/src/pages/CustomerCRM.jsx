import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';

const CustomerCRM = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, ordRes] = await Promise.all([
          api.get('/customers'),
          api.get('/orders'),
        ]);
        if (custRes.data.success) setCustomers(custRes.data.data);
        if (ordRes.data.success) setOrders(ordRes.data.data);
      } catch {
        const saved = localStorage.getItem('customers');
        if (saved) setCustomers(JSON.parse(saved));
        const savedOrders = localStorage.getItem('orders');
        if (savedOrders) setOrders(JSON.parse(savedOrders));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCustomerHistory = (customerId) => {
    return orders.slice(0, 3);
  };

  const openCustomerDetails = (customer) => {
    setSelectedCustomer({
      ...customer,
      history: getCustomerHistory(customer._id || customer.id)
    });
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const id = selectedCustomer._id || selectedCustomer.id;
    const newFeedback = {
      date: new Date().toLocaleDateString(),
      rating: feedbackRating,
      comment: feedbackComment
    };
    try {
      const { data } = await api.post(`/customers/${id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment
      });
      if (data.success) {
        setCustomers(prev => prev.map(c => (c._id || c.id) === id ? data.data : c));
        setSelectedCustomer(prev => ({
          ...prev,
          feedback: [newFeedback, ...(prev.feedback || [])]
        }));
        toast.success('⭐ Feedback saved!');
      }
    } catch {
      // fallback local
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Customer CRM</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Track loyalty points, order history, and customer feedback.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Customer List */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Customer Directory</h3>
          <div className="space-y-3">
            {customers.map(c => (
              <div 
                key={c.id} 
                onClick={() => openCustomerDetails(c)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                  selectedCustomer?.id === c.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'
                }`}
              >
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{c.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold">{c.phone}</p>
                </div>
                <div className="text-right">
                   <span className="block text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                     {c.points} pts
                   </span>
                </div>
              </div>
            ))}
            {customers.length === 0 && <p className="text-center text-slate-400 text-sm py-6">No customers found.</p>}
          </div>
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2">
           {selectedCustomer ? (
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                   <div>
                     <h3 className="text-2xl font-black text-slate-800">{selectedCustomer.name}</h3>
                     <p className="text-sm font-bold text-slate-500 mt-1">📞 {selectedCustomer.phone} | ✉️ {selectedCustomer.email}</p>
                   </div>
                   <div className="text-center bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                     <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Loyalty Points</span>
                     <span className="block text-2xl font-black text-amber-600">{selectedCustomer.points}</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Order History */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Recent Orders (Mock)</h4>
                    <div className="space-y-3">
                       {selectedCustomer.history.map(o => (
                         <div key={o.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50">
                           <div className="flex justify-between items-center mb-1">
                             <span className="font-bold text-slate-800 text-xs">{o.id}</span>
                             <span className="text-[10px] font-bold text-slate-500">{o.date}</span>
                           </div>
                           <p className="text-[10px] text-slate-500 font-medium truncate">{o.items.map(i => i.name).join(', ')}</p>
                           <p className="text-xs font-black text-slate-800 mt-1 text-right">₹{o.total}</p>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Feedback & Actions */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                       <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Feedback & Notes</h4>
                       <button 
                         onClick={() => setShowFeedbackModal(true)}
                         className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100"
                       >
                         + Add Feedback
                       </button>
                    </div>
                    
                    <div className="space-y-3">
                       {(selectedCustomer.feedback || []).length === 0 ? (
                         <p className="text-xs text-slate-400 font-medium py-4 text-center border border-dashed border-slate-200 rounded-xl">No feedback recorded.</p>
                       ) : (
                         selectedCustomer.feedback.map((f, idx) => (
                           <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                             <div className="flex justify-between items-center mb-2">
                               <div className="flex space-x-1">
                                 {[1,2,3,4,5].map(star => (
                                   <span key={star} className={`text-xs ${star <= f.rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
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
             </div>
           ) : (
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center text-center space-y-3 min-h-[400px]">
                <span className="text-5xl">👤</span>
                <h3 className="text-lg font-bold text-slate-800">Select a Customer</h3>
                <p className="text-sm text-slate-400 font-medium max-w-xs">Click on any customer from the directory to view their purchase history, loyalty points, and feedback.</p>
             </div>
           )}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative animate-[fadeIn_0.2s_ease-out]">
             <button onClick={() => setShowFeedbackModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
             <h3 className="text-lg font-bold text-slate-800 mb-1">Add Customer Feedback</h3>
             <p className="text-xs text-slate-500 font-medium mb-6">Record feedback for {selectedCustomer.name}</p>
             
             <form onSubmit={submitFeedback} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Rating (1-5)</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-200'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Comments</label>
                  <textarea
                    required
                    rows="3"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold resize-none"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="What did the customer say?"
                  ></textarea>
                </div>
                <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 text-xs">
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
