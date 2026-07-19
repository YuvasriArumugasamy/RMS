import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Billing = () => {
  const { on, connected } = useSocket();
  const gstRatePercent = parseFloat(localStorage.getItem('rms_gst_rate') || '5');
  const gstRate = gstRatePercent / 100;
  const gstinNumber = localStorage.getItem('rms_gstin') || '33AAAAA1111A1Z1';
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [activeInvoice, setActiveInvoice] = useState(null);

  // ── Payment Method Modal state ─────────────────────────────────────
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingOrder, setPayingOrder] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('Cash');
  const [payModalPhone, setPayModalPhone] = useState('');
  const [sendWaCheckbox, setSendWaCheckbox] = useState(true);

  // ── Coupon state ────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, finalTotal }
  const [couponLoading, setCouponLoading] = useState(false);
  const [activeCouponOrder, setActiveCouponOrder] = useState(null);

  const PAYMENT_METHODS = [
    { id: 'Cash',   icon: '💵', label: 'Cash',        color: 'emerald' },
    { id: 'Card',   icon: '💳', label: 'Card / POS',  color: 'blue'    },
    { id: 'UPI',    icon: '📲', label: 'UPI / QR',    color: 'violet'  },
    { id: 'Wallet', icon: '👜', label: 'Wallet',      color: 'amber'   },
    { id: 'Other',  icon: '🔖', label: 'Other',       color: 'slate'   },
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders');
        if (data.success) setOrders(data.data);
      } catch {
        const saved = localStorage.getItem('orders');
        if (saved) setOrders(JSON.parse(saved));
      }
    };
    fetchOrders();
  }, []);

  // 🔌 Live billing updates via socket
  useEffect(() => {
    const handleBillingUpdate = (update) => {
      setOrders(prev => prev.map(o =>
        (o._id || o.id) === (update.id || update._id)
          ? { ...o, billingStatus: 'Paid', status: 'Completed', paymentMethod: update.paymentMethod || 'Cash', paidAt: update.paidAt }
          : o
      ));
    };
    const handleNewOrder = (order) => {
      setOrders(prev => {
        if (prev.find(o => (o._id || o.id) === (order._id || order.id))) return prev;
        toast.info(`🆕 New order arrived: ${order.orderId || order.id} — ${order.table}`);
        return [order, ...prev];
      });
    };
    const c1 = on?.('billing-update', handleBillingUpdate);
    const c2 = on?.('new-order', handleNewOrder);
    return () => { c1?.(); c2?.(); };
  }, [on]);

  const toggleOrderSelection = (id) => {
    setSelectedOrders(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  // Opens payment method picker before marking paid
  const openPayModal = (order) => {
    setPayingOrder(order);
    setSelectedMethod('Cash');
    setAppliedCoupon(null);
    setCouponCode('');
    setActiveCouponOrder(order);
    setPayModalPhone(order.customerPhone || '');
    setSendWaCheckbox(true);
    setShowPayModal(true);
  };

  // ── Apply coupon ──────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponCode.trim() || !payingOrder) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/coupons/apply', {
        code: couponCode.trim(),
        orderTotal: payingOrder.total,
      });
      if (data.success) {
        setAppliedCoupon(data.data);
        toast.success(`🎫 Coupon "${data.data.code}" applied! Discount: ₹${data.data.discount}`);
      }
    } catch (err) {
      toast.error(`❌ ${err?.response?.data?.message || 'Invalid coupon'}`);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const confirmPayment = async () => {
    if (!payingOrder) return;
    const id = payingOrder._id || payingOrder.id;
    const finalTotal = appliedCoupon ? appliedCoupon.finalTotal : payingOrder.total;
    const discount   = appliedCoupon ? appliedCoupon.discount   : 0;
    setShowPayModal(false);
    try {
      await api.put(`/orders/${id}/billing`, {
        paymentMethod: selectedMethod,
        discount,
        finalTotal,
        customerPhone: payModalPhone.trim() || undefined,
      });
      // Redeem coupon usage count
      if (appliedCoupon) {
        try { await api.post('/coupons/redeem', { code: appliedCoupon.code }); } catch {}
      }
      setOrders(prev => prev.map(o =>
        (o._id || o.id) === id
          ? { ...o, billingStatus: 'Paid', status: 'Completed', paymentMethod: selectedMethod,
              paidAt: new Date().toISOString(), discount, total: finalTotal, customerPhone: payModalPhone.trim() }
          : o
      ));
      const methodEmoji = PAYMENT_METHODS.find(m => m.id === selectedMethod)?.icon || '💵';
      toast.success(`${methodEmoji} Paid via ${selectedMethod}${discount > 0 ? ` · Saved ₹${discount}` : ''} — ${payingOrder.orderId || id}`);
      
      // WhatsApp share redirect
      if (sendWaCheckbox && payModalPhone.trim()) {
        const rawPhone = payModalPhone.replace(/\D/g, '');
        const phone = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
        if (phone) {
          const itemsMsg = payingOrder.items.map(i => `${i.qty}x ${i.name} ₹${i.price * i.qty}`).join('\n');
          const msg = `🧾 *Invoice from RMS Restaurant*\n\nOrder: *#${(payingOrder.orderId || id).substring((payingOrder.orderId || id).length - 8).toUpperCase()}*\nTable: ${payingOrder.table || 'N/A'}\n\n${itemsMsg}\n\n*Total: ₹${finalTotal}*\n\nThank you for dining with us! 🙏`;
          const encoded = encodeURIComponent(msg);
          window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
        }
      }
    } catch {
      setOrders(prev => {
        const updated = prev.map(o =>
          (o._id || o.id) === id
            ? { ...o, billingStatus: 'Paid', paymentMethod: selectedMethod, discount, total: finalTotal, customerPhone: payModalPhone.trim() }
            : o
        );
        localStorage.setItem('orders', JSON.stringify(updated));
        return updated;
      });
      toast.warning('⚠️ Offline payment recorded locally');
    }
  };

  // ── Merge selected bills into a single invoice ──────────────────
  const mergeBills = async () => {
    if (selectedOrders.length < 2) return;
    try {
      const { data } = await api.post('/orders/merge', { orderIds: selectedOrders });
      if (data.success) {
        toast.success(`🔗 Orders merged into Invoice #${data.data.orderId.substring(16)}`);
        // Remove individual merged orders and insert new one
        setOrders(prev => {
          const filtered = prev.filter(o => !selectedOrders.includes(o._id || o.id));
          return [data.data, ...filtered];
        });
        setSelectedOrders([]);
      }
    } catch (err) {
      toast.error(`❌ Merge failed: ${err.response?.data?.message || 'Check connection'}`);
    }
  };

  // ── Construct active invoice details for preview ──────────────────
  const openInvoice = (order) => {
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discount = order.discount || 0;
    const total = order.total || subtotal;
    const gst = subtotal * gstRate;

    setActiveInvoice({
      id: order._id || order.id,
      orderId: order.orderId || order.id,
      date: new Date(order.createdAt).toLocaleDateString('en-IN'),
      timestamp: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: order.type,
      table: order.table,
      items: order.items,
      billingStatus: order.billingStatus,
      paymentMethod: order.paymentMethod,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      gst: gst.toFixed(2),
      total: total.toFixed(2),
    });
    setShowInvoiceModal(true);
  };

  // ── Generate & Download Receipt PDF ───────────────────────────────
  const downloadPDF = (order) => {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const orderId = order.orderId || order._id || order.id;
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');
    const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const restaurantName = 'RMS RESTAURANT';
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const gst = subtotal * gstRate;
    const discount = order.discount || 0;
    const total = order.total || (subtotal + gst - discount);

    const pageW = doc.internal.pageSize.width;

    // Header styling
    doc.setFillColor(30, 40, 107);
    doc.rect(0, 0, pageW, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(restaurantName, 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('TAX RECEIPT & INVOICE', pageW - 14, 16, { align: 'right' });

    // Meta details block
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.text(`Order Ref: ${orderId}`, 14, 35);
    doc.text(`Date: ${orderDate} ${orderTime}`, 14, 40);
    doc.text(`Service Type: ${order.type} ${order.table !== 'N/A' ? `(Table: ${order.table})` : ''}`, 14, 45);

    // Auto-table body formatting
    const columns = [
      { header: 'No.', dataKey: 'no' },
      { header: 'Item Name', dataKey: 'name' },
      { header: 'Qty', dataKey: 'qty' },
      { header: 'Rate', dataKey: 'rate' },
      { header: 'Amount', dataKey: 'amount' }
    ];

    const rows = order.items.map((item, idx) => ({
      no: idx + 1,
      name: item.name,
      qty: item.qty,
      rate: `₹ ${item.price.toFixed(2)}`,
      amount: `₹ ${(item.qty * item.price).toFixed(2)}`
    }));

    autoTable(doc, {
      columns: columns,
      body: rows,
      startY: 52,
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [30, 40, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid'
    });

    let ty = doc.lastAutoTable.finalY + 10;
    const boxW = 80;
    const boxX = pageW - 14 - boxW;
    const lineH = 5.5;

    // Subtotals pricing box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(boxX, ty - 4, boxW, (discount > 0 ? 4 : 3) * lineH + 5, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);

    doc.text('Subtotal:',          boxX + 2, ty);
    doc.text(`₹ ${subtotal.toFixed(2)}`, boxX + boxW - 2, ty, { align: 'right' });
    ty += lineH;

    if (discount > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text('Discount:',       boxX + 2, ty);
      doc.text(`- ₹ ${discount.toFixed(2)}`, boxX + boxW - 2, ty, { align: 'right' });
      ty += lineH;
    }

    doc.setTextColor(71, 85, 105);
    doc.text(`GST (${gstRatePercent}%):`,        boxX + 2, ty);
    doc.text(`₹ ${gst.toFixed(2)}`, boxX + boxW - 2, ty, { align: 'right' });
    ty += lineH;

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(boxX, ty, boxX + boxW, ty);
    ty += 5;

    // Grand total box
    doc.setFillColor(30, 40, 107);
    doc.roundedRect(boxX, ty - 4, boxW, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', boxX + 4, ty + 4);
    doc.text(`₹ ${total.toFixed(2)}`, boxX + boxW - 4, ty + 4, { align: 'right' });

    ty += 16;

    // Payment method row
    if (order.paymentMethod) {
      const pmColors = {
        Cash:   [22, 163, 74],
        Card:   [37, 99, 235],
        UPI:    [124, 58, 237],
        Wallet: [217, 119, 6],
        Other:  [100, 116, 139],
      };
      const pmColor = pmColors[order.paymentMethod] || [100, 116, 139];
      doc.setFillColor(...pmColor);
      doc.roundedRect(boxX, ty - 3, boxW, 8, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Paid via: ${order.paymentMethod}`, pageW / 2, ty + 2.5, { align: 'center' });
      ty += 12;
    } else {
      ty += 4;
    }

    // Thank you banner
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, ty, pageW - 28, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text('Thank you for dining with us! 🙏', pageW / 2, ty + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Please visit us again. For queries, contact us at the above details.', pageW / 2, ty + 10, { align: 'center' });

    // Page footer layout
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 285, pageW - 14, 285);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${restaurantName} · Tax Invoice · ${orderId}`, 14, 290);
      doc.text(`Page ${i} of ${pageCount}`, pageW - 14, 290, { align: 'right' });
    }

    const fileName = `Invoice_${orderId.substring(orderId.length - 8).toUpperCase()}_${orderDate.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    toast.success(`📥 Invoice downloaded: ${fileName}`);
  };

  const handleWhatsAppSend = (e) => {
    e.preventDefault();
    if (!whatsappNumber || !activeInvoice) return;
    const orderId = activeInvoice.orderId || activeInvoice.id || '';
    const items = (activeInvoice.items || []).map(i => `${i.qty}x ${i.name} ₹${i.price * i.qty}`).join('\n');
    const total = activeInvoice.total || 0;
    const msg = `🧾 *Invoice from RMS Restaurant*\n\nOrder: *${orderId}*\nTable: ${activeInvoice.table || 'N/A'}\n\n${items}\n\n*Total: ₹${total}*\n\nThank you for dining with us! 🙏`;
    const encoded = encodeURIComponent(msg);
    const phone = whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    toast.success(`📱 WhatsApp opened for ${whatsappNumber}`);
    setShowWhatsAppModal(false);
    setWhatsappNumber('');
  };

  const unpaidOrders = orders.filter(o => o.billingStatus !== 'Paid' && o.status !== 'Pending');
  const paidOrders   = orders.filter(o => o.billingStatus === 'Paid');

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out] font-sans pb-12">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Billing & Invoicing</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage payments, merge bills, and share invoices.</p>
        </div>
        <button
          onClick={mergeBills}
          disabled={selectedOrders.length < 2}
          className="px-5 py-3.5 bg-[#0F286B] disabled:bg-slate-200 hover:bg-[#1e3a8a] text-white disabled:text-slate-400 font-bold rounded-xl text-xs shadow-md disabled:shadow-none transition-all cursor-pointer shrink-0"
        >
          Merge Selected Bills 🔗
        </button>
      </div>

      {/* ── SECTIONS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-100 space-y-4 shadow-sm min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
             <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>Unpaid Bills
             </h3>
             <span className="bg-red-50 text-red-650 font-black px-2.5 py-0.5 rounded-lg border border-red-100 text-[10px] uppercase">
               {unpaidOrders.length} Pending
             </span>
          </div>
          
          <div className="space-y-3.5">
            {unpaidOrders.length === 0 ? (
              <p className="text-center text-slate-450 text-xs font-bold py-16">No pending unpaid bills.</p>
            ) : (
              unpaidOrders.map(o => {
                const id = o._id || o.id;
                const isSelected = selectedOrders.includes(id);
                const isDineIn = o.type?.toLowerCase() === 'dine-in';
                const formattedTable = o.table !== 'N/A' ? (o.table.toUpperCase().includes('TABLE') ? o.table : `Table ${o.table}`) : '';

                return (
                  <div 
                    key={id} 
                    className={`p-5 border rounded-3xl transition-all duration-350 relative flex flex-col gap-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.03)] ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/15 ring-1 ring-indigo-500/25' 
                        : 'border-slate-100/80 bg-white hover:bg-slate-50/40'
                    }`}
                  >
                    {/* Top Row: Order ID, Type Badge and Price */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <label className="relative flex items-center justify-center shrink-0 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrderSelection(id)}
                            className="peer sr-only"
                          />
                          <span className="w-5 h-5 rounded-full border-2 border-slate-200 peer-checked:border-indigo-650 peer-checked:bg-indigo-650 flex items-center justify-center transition-all shadow-sm">
                            <svg className="w-3 h-3 text-white scale-0 peer-checked:scale-100 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </span>
                        </label>
                        
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-800 text-sm block tracking-tight">#{id.substring(id.length - 8).toUpperCase()}</span>
                          <div className="flex items-center gap-1.5">
                            {isDineIn ? (
                              <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1">
                                🍽️ Dine-in {formattedTable && `· ${formattedTable}`}
                              </span>
                            ) : (
                              <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1">
                                🛍️ Takeaway
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-850 text-base block tracking-tight">₹{o.total}</span>
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5 block">Total Bill</span>
                      </div>
                    </div>
                    
                    {/* Items List: Rendered as clean tag pills */}
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {o.items.map((i, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-100/70 text-slate-600 text-[9.5px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm hover:scale-[1.01] transition-transform">
                          <span className="text-[#f97316] font-black">{i.qty}x</span> 
                          <span>{i.name}</span>
                        </span>
                      ))}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex gap-2.5 pt-2 border-t border-slate-50">
                      <button 
                        onClick={() => openPayModal(o)} 
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 text-white font-black rounded-xl text-[10px] uppercase shadow-md shadow-emerald-500/10 transition-all cursor-pointer tracking-wider flex items-center justify-center gap-1"
                      >
                        <span>Collect Payment</span> 💵
                      </button>
                      <button 
                        onClick={() => openInvoice(o)} 
                        className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black rounded-xl text-[10px] uppercase transition-all cursor-pointer tracking-wider flex items-center justify-center gap-1"
                      >
                        <span>Invoice</span> 📄
                      </button>
                      <button
                        onClick={() => downloadPDF(o)}
                        title="Download PDF directly"
                        className="w-9.5 h-9.5 flex items-center justify-center bg-indigo-50 hover:bg-indigo-650 hover:text-white text-indigo-600 border border-indigo-100 rounded-xl cursor-pointer transition-all active:scale-90 shadow-sm shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Paid History Column card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 space-y-4 shadow-sm min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
             <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500"/>Paid History
             </h3>
             <span className="bg-emerald-50 text-emerald-700 font-black px-2.5 py-0.5 rounded-lg border border-emerald-100 text-[10px] uppercase">
               Settled
             </span>
          </div>
          
          <div className="space-y-3">
            {paidOrders.length === 0 ? (
              <p className="text-center text-slate-450 text-xs font-bold py-16">No paid receipts logged yet.</p>
            ) : (
              paidOrders.map(o => {
                const id = o._id || o.id;
                return (
                  <div key={id} className="p-4.5 border border-slate-100/70 bg-white hover:bg-slate-50/20 rounded-3xl transition-all duration-300 flex justify-between items-center group shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.025)]">
                    <div className="space-y-1.5 min-w-0">
                      <span className="font-extrabold text-slate-800 text-sm block tracking-tight">#{id.substring(id.length - 8).toUpperCase()}</span>
                      <div className="flex items-center gap-2">
                        {o.type?.toLowerCase() === 'dine-in' ? (
                          <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                            🍽️ Dine-in
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                            🛍️ Takeaway
                          </span>
                        )}
                        
                        {o.paymentMethod && (
                          <span className={`text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 leading-none ${
                            o.paymentMethod === 'Cash'   ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            o.paymentMethod === 'Card'   ? 'bg-blue-50    text-blue-700    border-blue-100'    :
                            o.paymentMethod === 'UPI'    ? 'bg-violet-50  text-violet-700  border-violet-100'  :
                            o.paymentMethod === 'Wallet' ? 'bg-amber-50   text-amber-700   border-amber-100'   :
                            'bg-slate-50 text-slate-650 border-slate-200'
                          }`}>
                            {PAYMENT_METHODS.find(m => m.id === o.paymentMethod)?.icon} {o.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="font-black text-slate-850 block text-sm tracking-tight">₹{o.total}</span>
                        <span className="text-[9px] text-emerald-600 font-extrabold tracking-wide uppercase flex items-center justify-end gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Settled
                        </span>
                      </div>
                      
                      {/* Action hover buttons */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openInvoice(o)} 
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-900 text-slate-600 hover:text-white rounded-xl cursor-pointer transition-all active:scale-90 shadow-sm" 
                          title="View Invoice"
                        >
                          📄
                        </button>
                        <button 
                          onClick={() => downloadPDF(o)} 
                          className="w-8 h-8 flex items-center justify-center bg-indigo-50 hover:bg-indigo-650 text-indigo-600 hover:text-white rounded-xl cursor-pointer transition-all active:scale-90 shadow-sm" 
                          title="Download Receipt"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ── MODAL: INVOICE DETAILS PREVIEW ── */}
      {showInvoiceModal && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)} />
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative z-10 p-6 space-y-4 animate-[fadeInScale_0.25s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-black text-slate-850 tracking-tight">🧾 Tax Invoice Receipt</h3>
              <button 
                onClick={() => setShowInvoiceModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="text-center py-2">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">RMS RESTAURANT</h2>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">GSTIN: {gstinNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 text-[10px] font-bold text-slate-500 border-y border-slate-100 py-3">
              <div>Ref ID: <span className="text-slate-800 font-black">#{activeInvoice.orderId.substring(activeInvoice.orderId.length - 8).toUpperCase()}</span></div>
              <div className="text-right">Type: <span className="text-slate-800 font-black uppercase">{activeInvoice.type}</span></div>
              <div>Date: <span className="text-slate-800 font-black">{activeInvoice.date} {activeInvoice.timestamp}</span></div>
              <div className="text-right">Table: <span className="text-slate-800 font-black">{activeInvoice.table}</span></div>
            </div>

            {/* Receipt Table Items */}
            <div className="max-h-[160px] overflow-y-auto pr-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-left">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="font-bold text-slate-700">
                  {activeInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5">{item.name}</td>
                      <td className="py-2.5 text-center">{item.qty}</td>
                      <td className="py-2.5 text-right">₹{item.price * item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations summaries */}
            <div className="border-t border-slate-100 pt-3 space-y-1 text-xs font-bold text-slate-500 text-right">
              <p>Subtotal: <span className="text-slate-800">₹{activeInvoice.subtotal}</span></p>
              {Number(activeInvoice.discount) > 0 && (
                <p className="text-green-600">Discount: <span>- ₹{activeInvoice.discount}</span></p>
              )}
              <p>GST ({gstRatePercent}%): <span className="text-slate-800">₹{activeInvoice.gst}</span></p>
              <p className="text-base font-black text-slate-850 pt-2 border-t border-slate-100">
                Total: ₹{activeInvoice.total}
              </p>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-50">
              <button
                onClick={() => downloadPDF(activeInvoice)}
                className="flex-1 py-3 bg-[#0F286B] hover:bg-[#1e3a8a] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                Download PDF
              </button>
              <button 
                onClick={() => { setShowInvoiceModal(false); setShowWhatsAppModal(true); }} 
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex justify-center items-center gap-2 cursor-pointer shadow-sm"
              >
                WhatsApp Share
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: WHATSAPP SHARE ── */}
      {showWhatsAppModal && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWhatsAppModal(false)} />
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full relative z-10 p-6 space-y-4 animate-[fadeInScale_0.25s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-black text-slate-800 tracking-tight">📱 Share Receipt</h3>
              <button 
                onClick={() => setShowWhatsAppModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWhatsAppSend} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Customer WhatsApp No.</label>
                <input 
                  type="tel" 
                  required
                  placeholder="e.g. +91 9988776655"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                Open WhatsApp & Send 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: COLLECT PAYMENT METHOD ── */}
      {showPayModal && payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowPayModal(false); setPayingOrder(null); }} />
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full relative z-10 p-6 space-y-4 animate-[fadeInScale_0.25s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-black text-slate-800 tracking-tight">Collect Payment</h3>
              <button 
                onClick={() => { setShowPayModal(false); setPayingOrder(null); }}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Order Total Amount</span>
              <h4 className="text-2xl font-black text-slate-850 mt-1">
                ₹{appliedCoupon ? appliedCoupon.finalTotal : payingOrder.total}
              </h4>
            </div>

            {/* Coupons Redesign inside pay Modal */}
            <div className="space-y-2 border-y border-slate-100 py-3.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">🎫 Redemptions & Coupons</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter coupon code..."
                  value={couponCode}
                  disabled={!!appliedCoupon}
                  onChange={e => setCouponCode(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
                {appliedCoupon ? (
                  <button 
                    type="button" 
                    onClick={removeCoupon}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 font-bold rounded-xl text-[10px] uppercase border border-red-100 cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-3.5 py-2 bg-[#0F286B] hover:bg-[#1e3a8a] disabled:opacity-60 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>
              {appliedCoupon && (
                <p className="text-[10px] text-green-600 font-bold">
                  Discount applied: - ₹{appliedCoupon.discount} ({appliedCoupon.code})
                </p>
              )}
            </div>

            {/* Payment Method grids */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Select Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      selectedMethod === m.id
                        ? 'bg-slate-50/80 border-slate-350 font-bold shadow-inner'
                        : 'border-slate-100 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg block mb-1">{m.icon}</span>
                    <span className="text-[10px] font-bold text-slate-700">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* WhatsApp Receipt Fields */}
            <div className="space-y-2 border-t border-slate-100 pt-3.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">📞 Customer Phone (for WhatsApp Receipt)</label>
              <input 
                type="tel" 
                placeholder="Enter phone number (e.g. 9876543210)"
                value={payModalPhone}
                onChange={e => setPayModalPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
              />
              {payModalPhone.trim() && (
                <label className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-bold cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={sendWaCheckbox}
                    onChange={e => setSendWaCheckbox(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Send receipt via WhatsApp</span>
                </label>
              )}
            </div>

            {/* Actions confirm */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-50">
              <button 
                onClick={() => { setShowPayModal(false); setPayingOrder(null); }}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={confirmPayment}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                Settle Invoice 💳
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Billing;
