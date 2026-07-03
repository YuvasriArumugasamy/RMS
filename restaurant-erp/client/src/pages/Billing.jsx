import React, { useState, useEffect } from 'react';

const Billing = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  const saveOrders = (updated) => {
    setOrders(updated);
    localStorage.setItem('orders', JSON.stringify(updated));
  };

  const toggleOrderSelection = (id) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(o => o !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const markAsPaid = (id) => {
    saveOrders(orders.map(o => o.id === id ? { ...o, billingStatus: 'Paid' } : o));
  };

  const mergeBills = () => {
    if (selectedOrders.length < 2) {
      alert("Select at least 2 unpaid orders to merge.");
      return;
    }

    const ordersToMerge = orders.filter(o => selectedOrders.includes(o.id));
    
    // Combine items
    let mergedItems = [];
    ordersToMerge.forEach(o => {
      o.items.forEach(item => {
        const existing = mergedItems.find(i => i.id === item.id);
        if (existing) {
          existing.qty += item.qty;
        } else {
          mergedItems.push({ ...item });
        }
      });
    });

    const mergedSubtotal = ordersToMerge.reduce((sum, o) => sum + o.subtotal, 0);
    const mergedGst = Math.round(mergedSubtotal * 0.05);
    const mergedTotal = mergedSubtotal + mergedGst;

    const mergedOrder = {
      id: `ORD-MRG-${Date.now().toString().slice(-4)}`,
      type: 'Merged Bill',
      table: 'Multiple',
      items: mergedItems,
      subtotal: mergedSubtotal,
      gst: mergedGst,
      total: mergedTotal,
      status: 'Completed',
      billingStatus: 'Unpaid',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      mergedFrom: selectedOrders
    };

    // Remove the old orders and add the merged one
    const remainingOrders = orders.filter(o => !selectedOrders.includes(o.id));
    saveOrders([mergedOrder, ...remainingOrders]);
    setSelectedOrders([]);
    alert("Bills merged successfully!");
  };

  const openInvoice = (order) => {
    setActiveInvoice(order);
    setShowInvoiceModal(true);
  };

  const handleWhatsAppSend = (e) => {
    e.preventDefault();
    if (!whatsappNumber) return;
    alert(`Mock WhatsApp sent to ${whatsappNumber} for Invoice ${activeInvoice?.id}!`);
    setShowWhatsAppModal(false);
    setWhatsappNumber('');
  };

  const unpaidOrders = orders.filter(o => o.billingStatus !== 'Paid' && o.status !== 'Pending');
  const paidOrders = orders.filter(o => o.billingStatus === 'Paid');

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Billing & Invoicing</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage payments, merge bills, and share invoices.</p>
        </div>
        <div className="flex gap-3">
           <button
            onClick={mergeBills}
            disabled={selectedOrders.length < 2}
            className="px-4 py-2 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition-all shadow-md"
          >
            Merge Selected Bills 🔗
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unpaid Bills */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
             <h3 className="text-lg font-bold text-slate-800">Unpaid Bills</h3>
             <span className="bg-red-50 text-red-600 font-bold px-3 py-1 rounded-full text-xs">{unpaidOrders.length} Pending</span>
          </div>
          
          <div className="space-y-3">
            {unpaidOrders.length === 0 && <p className="text-center text-slate-400 text-sm py-10 font-medium">No unpaid bills.</p>}
            {unpaidOrders.map(o => (
              <div key={o.id} className={`p-4 border rounded-2xl transition-all ${selectedOrders.includes(o.id) ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={selectedOrders.includes(o.id)}
                      onChange={() => toggleOrderSelection(o.id)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="font-extrabold text-slate-800 text-sm block">{o.id}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{o.type} {o.table !== 'N/A' && `(${o.table})`}</span>
                    </div>
                  </div>
                  <span className="font-black text-slate-800">₹{o.total}</span>
                </div>
                
                <div className="text-xs text-slate-500 font-medium mb-3 truncate max-w-[280px]">
                  {o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => markAsPaid(o.id)} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs transition-colors">Mark Paid 💵</button>
                  <button onClick={() => openInvoice(o.id === activeInvoice?.id ? activeInvoice : o)} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors">Invoice 📄</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Paid History */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
             <h3 className="text-lg font-bold text-slate-800">Paid Bills History</h3>
             <span className="bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full text-xs">Recently Settled</span>
          </div>
          
          <div className="space-y-3">
            {paidOrders.length === 0 && <p className="text-center text-slate-400 text-sm py-10 font-medium">No paid bills yet.</p>}
            {paidOrders.map(o => (
              <div key={o.id} className="p-4 border border-slate-100 bg-white hover:bg-slate-50 rounded-2xl transition-all flex justify-between items-center group">
                <div>
                  <span className="font-extrabold text-slate-800 text-sm block">{o.id}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{o.type}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-black text-slate-800 block">₹{o.total}</span>
                    <span className="text-[10px] text-green-600 font-bold">PAID</span>
                  </div>
                  <button onClick={() => openInvoice(o)} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-indigo-50 rounded-xl" title="View Invoice">
                    📄
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && activeInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <button onClick={() => setShowInvoiceModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900">RestoERP</h2>
              <p className="text-xs text-slate-500 font-medium">Tax Invoice</p>
            </div>

            <div className="flex justify-between items-start text-xs font-bold text-slate-600 mb-6 border-b border-slate-100 pb-4">
               <div>
                  <p>Order: <span className="text-slate-900">{activeInvoice.id}</span></p>
                  <p>Date: <span className="text-slate-900">{activeInvoice.date} {activeInvoice.timestamp}</span></p>
               </div>
               <div className="text-right">
                  <p>Type: <span className="text-slate-900">{activeInvoice.type}</span></p>
                  <p>Status: <span className={activeInvoice.billingStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}>{activeInvoice.billingStatus || 'Unpaid'}</span></p>
               </div>
            </div>

            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500 font-bold text-left">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-800">
                {activeInvoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-center">{item.qty}</td>
                    <td className="py-2 text-right">₹{item.price * item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 border-slate-200 pt-4 space-y-2 text-sm font-bold text-slate-600 text-right">
              <p>Subtotal: <span className="text-slate-900">₹{activeInvoice.subtotal}</span></p>
              <p>GST (5%): <span className="text-slate-900">₹{activeInvoice.gst}</span></p>
              <p className="text-lg font-black text-slate-900 pt-2 border-t border-slate-100">Total: ₹{activeInvoice.total}</p>
            </div>

            <div className="mt-8 flex gap-3">
               <button onClick={() => {
                 alert("Downloading PDF...");
               }} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all">Download PDF</button>
               <button onClick={() => {
                 setShowInvoiceModal(false);
                 setShowWhatsAppModal(true);
               }} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs transition-all flex justify-center items-center gap-2">
                 WhatsApp Share
               </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && activeInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative animate-[fadeIn_0.2s_ease-out]">
             <button onClick={() => setShowWhatsAppModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
             <div className="text-center mb-6">
                <span className="text-4xl">📱</span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">Send via WhatsApp</h3>
                <p className="text-xs text-slate-500 font-medium">Send invoice {activeInvoice.id}</p>
             </div>
             
             <form onSubmit={handleWhatsAppSend} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Customer Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9999999999"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <button type="submit" className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-md shadow-green-500/20 text-xs">
                  Send Invoice 🚀
                </button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Billing;
