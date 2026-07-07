import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Billing = () => {
  const { on, connected } = useSocket();
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

  const saveOrders = (updated) => {
    setOrders(updated);
    localStorage.setItem('orders', JSON.stringify(updated));
  };

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
      });
      // Redeem coupon usage count
      if (appliedCoupon) {
        try { await api.post('/coupons/redeem', { code: appliedCoupon.code }); } catch {}
      }
      setOrders(prev => prev.map(o =>
        (o._id || o.id) === id
          ? { ...o, billingStatus: 'Paid', status: 'Completed', paymentMethod: selectedMethod,
              paidAt: new Date().toISOString(), discount, total: finalTotal }
          : o
      ));
      const methodEmoji = PAYMENT_METHODS.find(m => m.id === selectedMethod)?.icon || '💵';
      toast.success(`${methodEmoji} Paid via ${selectedMethod}${discount > 0 ? ` · Saved ₹${discount}` : ''} — ${payingOrder.orderId || id}`);
    } catch {
      setOrders(prev => {
        const updated = prev.map(o =>
          (o._id || o.id) === id
            ? { ...o, billingStatus: 'Paid', paymentMethod: selectedMethod, discount, total: finalTotal }
            : o
        );
        localStorage.setItem('orders', JSON.stringify(updated));
        return updated;
      });
      toast.warning('⚠️ Offline mode — marked paid locally');
    }
    setPayingOrder(null);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const mergeBills = () => {
    if (selectedOrders.length < 2) {
      toast.warning('Select at least 2 unpaid orders to merge.');
      return;
    }
    const ordersToMerge = orders.filter(o => selectedOrders.includes(o._id || o.id));
    let mergedItems = [];
    ordersToMerge.forEach(o => {
      o.items.forEach(item => {
        const existing = mergedItems.find(i => (i._id || i.id) === (item._id || item.id));
        if (existing) existing.qty += item.qty;
        else mergedItems.push({ ...item });
      });
    });
    const mergedSubtotal = ordersToMerge.reduce((sum, o) => sum + o.subtotal, 0);
    const mergedGst = Math.round(mergedSubtotal * 0.05);
    const mergedOrder = {
      id: `ORD-MRG-${Date.now().toString().slice(-4)}`,
      type: 'Merged Bill', table: 'Multiple', items: mergedItems,
      subtotal: mergedSubtotal, gst: mergedGst, total: mergedSubtotal + mergedGst,
      status: 'Completed', billingStatus: 'Unpaid',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(), mergedFrom: selectedOrders,
    };
    const remaining = orders.filter(o => !selectedOrders.includes(o._id || o.id));
    saveOrders([mergedOrder, ...remaining]);
    setSelectedOrders([]);
    toast.success('🔗 Bills merged successfully!');
  };

  const openInvoice = (order) => {
    setActiveInvoice(order);
    setShowInvoiceModal(true);
  };

  // ── Real PDF Invoice Generator ──────────────────────────────────────────────
  const downloadPDF = (invoice) => {
    // Read restaurant info from Settings (localStorage fallback)
    const savedSettings = localStorage.getItem('settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : {};
    const restaurantName = settings.name    || 'RestoERP Restaurant';
    const restaurantAddr = settings.address || '123, Main Street, Chennai, Tamil Nadu';
    const restaurantPhone= settings.phone   || '9876543210';
    const restaurantEmail= settings.email   || 'info@restaurant.com';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Brand color strip (header background) ─────────────────────────
    doc.setFillColor(249, 115, 22); // orange-500
    doc.rect(0, 0, pageW, 38, 'F');

    // ── Restaurant name ───────────────────────────────────────────────
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(restaurantName, 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(restaurantAddr, 14, 22);
    doc.text(`📞 ${restaurantPhone}   ✉  ${restaurantEmail}`, 14, 28);

    // TAX INVOICE badge (right side of header)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('TAX INVOICE', pageW - 14, 16, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const orderId   = invoice.orderId || invoice.id  || '—';
    const orderDate = invoice.date    || new Date(invoice.createdAt).toLocaleDateString('en-IN') || '—';
    const orderTime = invoice.timestamp || (invoice.createdAt ? new Date(invoice.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

    doc.text(`Invoice # : ${orderId}`,      pageW - 14, 23, { align: 'right' });
    doc.text(`Date       : ${orderDate}`,   pageW - 14, 27, { align: 'right' });
    doc.text(`Time       : ${orderTime}`,   pageW - 14, 31, { align: 'right' });

    // ── Order meta info bar ───────────────────────────────────────────
    doc.setFillColor(249, 250, 251); // slate-50
    doc.rect(0, 38, pageW, 18, 'F');

    doc.setTextColor(71, 85, 105);   // slate-500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    const metaY = 45;
    doc.text('ORDER TYPE',     14,  metaY);
    doc.text('TABLE',          70,  metaY);
    doc.text('STATUS',         120, metaY);
    doc.text('PAYMENT METHOD', 158, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // slate-900

    const tableVal      = (invoice.table && invoice.table !== 'N/A') ? invoice.table : '—';
    const statusVal     = invoice.billingStatus === 'Paid' ? 'PAID' : 'UNPAID';
    const payMethodVal  = invoice.paymentMethod || 'Cash';
    const payColor      = invoice.billingStatus === 'Paid' ? [22, 163, 74] : [220, 38, 38];

    // Payment method color mapping
    const methodColors = {
      Cash:   [22, 163, 74],   // green
      Card:   [37, 99, 235],   // blue
      UPI:    [124, 58, 237],  // violet
      Wallet: [217, 119, 6],   // amber
      Other:  [100, 116, 139], // slate
    };
    const methodColor = methodColors[payMethodVal] || [100, 116, 139];

    doc.text(invoice.type || 'Dine-in', 14,  metaY + 6);
    doc.text(tableVal,                  70,  metaY + 6);

    // Status badge
    doc.setFillColor(...payColor);
    doc.roundedRect(117, metaY + 1, 20, 7, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(statusVal, 127, metaY + 6, { align: 'center' });

    // Payment method badge
    doc.setFillColor(...methodColor);
    doc.roundedRect(155, metaY + 1, 26, 7, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.text(payMethodVal, 168, metaY + 6, { align: 'center' });

    // ── Items table ───────────────────────────────────────────────────
    const tableBody = invoice.items.map((item, idx) => [
      idx + 1,
      item.name,
      item.category || '—',
      `₹ ${Number(item.price).toFixed(2)}`,
      item.qty,
      `₹ ${(item.price * item.qty).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 62,
      head: [['#', 'Item Description', 'Category', 'Unit Price', 'Qty', 'Amount']],
      body: tableBody,
      headStyles: {
        fillColor: [30, 58, 138],   // indigo-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 65 },
        2: { cellWidth: 30 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'center', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 28 },
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [15, 23, 42],
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { overflow: 'linebreak', font: 'helvetica' },
      margin: { left: 14, right: 14 },
    });

    // ── Totals section ────────────────────────────────────────────────
    const finalY = doc.lastAutoTable.finalY + 6;

    // Right-aligned totals box
    const boxX  = pageW - 14 - 72;
    const boxW  = 72;
    const lineH = 8;

    const subtotal = Number(invoice.subtotal || 0);
    const gst      = Number(invoice.gst      || 0);
    const total    = Number(invoice.total    || 0);
    const discount = Number(invoice.discount || 0);

    let ty = finalY;

    // Subtotal row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:',        boxX + 2, ty);
    doc.text(`₹ ${subtotal.toFixed(2)}`, boxX + boxW - 2, ty, { align: 'right' });
    ty += lineH;

    if (discount > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text('Discount:',       boxX + 2, ty);
      doc.text(`- ₹ ${discount.toFixed(2)}`, boxX + boxW - 2, ty, { align: 'right' });
      ty += lineH;
    }

    doc.setTextColor(71, 85, 105);
    doc.text('GST (5%):',        boxX + 2, ty);
    doc.text(`₹ ${gst.toFixed(2)}`, boxX + boxW - 2, ty, { align: 'right' });
    ty += lineH;

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(boxX, ty, boxX + boxW, ty);
    ty += 5;

    // Grand total
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(boxX, ty - 4, boxW, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', boxX + 4, ty + 4);
    doc.text(`₹ ${total.toFixed(2)}`, boxX + boxW - 4, ty + 4, { align: 'right' });

    ty += 16;

    // Payment method row (below grand total)
    if (invoice.paymentMethod) {
      const pmColors = {
        Cash:   [22, 163, 74],
        Card:   [37, 99, 235],
        UPI:    [124, 58, 237],
        Wallet: [217, 119, 6],
        Other:  [100, 116, 139],
      };
      const pmColor = pmColors[invoice.paymentMethod] || [100, 116, 139];
      doc.setFillColor(...pmColor);
      doc.roundedRect(boxX, ty - 3, boxW, 8, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Paid via: ${invoice.paymentMethod}`, pageW / 2, ty + 2.5, { align: 'center' });
      ty += 12;
    } else {
      ty += 4;
    }

    // ── Thank you note & footer ───────────────────────────────────────
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(14, ty, pageW - 28, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('Thank you for dining with us! 🙏', pageW / 2, ty + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Please visit us again. For queries, contact us at the above details.', pageW / 2, ty + 10, { align: 'center' });

    // Page number & footer line
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

    // ── Save ──────────────────────────────────────────────────────────
    const fileName = `Invoice_${orderId}_${orderDate.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    toast.success(`📥 Invoice downloaded: ${fileName}`);
  };
  // ────────────────────────────────────────────────────────────────────────────

  const handleWhatsAppSend = (e) => {
    e.preventDefault();
    if (!whatsappNumber) return;
    toast.success(`📱 Invoice sent to ${whatsappNumber}!`);
    setShowWhatsAppModal(false);
    setWhatsappNumber('');
  };

  const unpaidOrders = orders.filter(o => o.billingStatus !== 'Paid' && o.status !== 'Pending');
  const paidOrders   = orders.filter(o => o.billingStatus === 'Paid');

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
                  <button onClick={() => openPayModal(o)} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs transition-colors">Collect Payment 💵</button>
                  <button onClick={() => openInvoice(o)} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors">Invoice 📄</button>
                  <button
                    onClick={() => downloadPDF(o)}
                    title="Download PDF directly"
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 font-bold rounded-xl text-xs transition-all"
                  >
                    ⬇
                  </button>
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
                <div className="flex items-center gap-3">
                  {/* Payment method badge */}
                  {o.paymentMethod && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      o.paymentMethod === 'Cash'   ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      o.paymentMethod === 'Card'   ? 'bg-blue-50    text-blue-700    border-blue-100'    :
                      o.paymentMethod === 'UPI'    ? 'bg-violet-50  text-violet-700  border-violet-100'  :
                      o.paymentMethod === 'Wallet' ? 'bg-amber-50   text-amber-700   border-amber-100'   :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {PAYMENT_METHODS.find(m => m.id === o.paymentMethod)?.icon} {o.paymentMethod}
                    </span>
                  )}
                  <div className="text-right">
                    <span className="font-black text-slate-800 block">₹{o.total}</span>
                    <span className="text-[10px] text-green-600 font-bold">PAID</span>
                  </div>
                  <button onClick={() => openInvoice(o)} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-indigo-50 rounded-xl" title="View Invoice">
                    📄
                  </button>
                  <button onClick={() => downloadPDF(o)} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-slate-100 rounded-xl" title="Download PDF">
                    ⬇
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
                  <p>Order: <span className="text-slate-900">{activeInvoice.orderId || activeInvoice.id}</span></p>
                  <p>Date: <span className="text-slate-900">{activeInvoice.date} {activeInvoice.timestamp}</span></p>
               </div>
               <div className="text-right space-y-1">
                  <p>Type: <span className="text-slate-900">{activeInvoice.type}</span></p>
                  <p>Status: <span className={activeInvoice.billingStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}>{activeInvoice.billingStatus || 'Unpaid'}</span></p>
                  {activeInvoice.paymentMethod && (
                    <p>Payment: <span className="text-slate-900">
                      {PAYMENT_METHODS.find(m => m.id === activeInvoice.paymentMethod)?.icon} {activeInvoice.paymentMethod}
                    </span></p>
                  )}
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
               <button
                 onClick={() => downloadPDF(activeInvoice)}
                 className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                   <polyline points="7 10 12 15 17 10"/>
                   <line x1="12" y1="15" x2="12" y2="3"/>
                 </svg>
                 Download PDF
               </button>
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

      {/* Payment Method Modal */}
      {showPayModal && payingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => { setShowPayModal(false); setPayingOrder(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl"
            >✕</button>

            {/* Header */}
            <div className="mb-5">
              <h3 className="text-lg font-extrabold text-slate-800">Collect Payment</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {payingOrder.orderId || payingOrder.id} &nbsp;·&nbsp;
                {payingOrder.table !== 'N/A' ? payingOrder.table : 'Takeaway'} &nbsp;·&nbsp;
                <span className="font-black text-slate-700">₹{payingOrder.total}</span>
              </p>
            </div>

            {/* Payment method grid */}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Select Payment Method</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                    selectedMethod === method.id
                      ? method.id === 'Cash'   ? 'border-emerald-500 bg-emerald-50'
                      : method.id === 'Card'   ? 'border-blue-500    bg-blue-50'
                      : method.id === 'UPI'    ? 'border-violet-500  bg-violet-50'
                      : method.id === 'Wallet' ? 'border-amber-500   bg-amber-50'
                      : 'border-slate-400 bg-slate-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className={`text-[10px] font-extrabold ${
                    selectedMethod === method.id
                      ? method.id === 'Cash'   ? 'text-emerald-700'
                      : method.id === 'Card'   ? 'text-blue-700'
                      : method.id === 'UPI'    ? 'text-violet-700'
                      : method.id === 'Wallet' ? 'text-amber-700'
                      : 'text-slate-600'
                      : 'text-slate-500'
                  }`}>{method.label}</span>
                </button>
              ))}
            </div>

            {/* Amount summary */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-5 flex justify-between items-center border border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Amount to collect</p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {appliedCoupon ? (
                    <>
                      <span className="line-through text-slate-400 text-base mr-2">₹{payingOrder.total}</span>
                      <span className="text-emerald-600">₹{appliedCoupon.finalTotal}</span>
                    </>
                  ) : `₹${payingOrder.total}`}
                </p>
                {appliedCoupon && (
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                    🎫 {appliedCoupon.code} — Saved ₹{appliedCoupon.discount}
                  </p>
                )}
              </div>
              <div className={`text-3xl p-3 rounded-2xl ${
                selectedMethod === 'Cash'   ? 'bg-emerald-50' :
                selectedMethod === 'Card'   ? 'bg-blue-50'    :
                selectedMethod === 'UPI'    ? 'bg-violet-50'  :
                selectedMethod === 'Wallet' ? 'bg-amber-50'   : 'bg-slate-100'
              }`}>
                {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.icon}
              </div>
            </div>

            {/* Coupon code */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Coupon / Discount Code</p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎫</span>
                    <div>
                      <p className="text-xs font-extrabold text-emerald-700">{appliedCoupon.code}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Discount: ₹{appliedCoupon.discount}</p>
                    </div>
                  </div>
                  <button onClick={removeCoupon} className="text-emerald-600 hover:text-red-500 font-bold text-sm transition-colors">✕</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code (e.g. FLAT50)"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 tracking-widest"
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Confirm button */}
            <button
              onClick={confirmPayment}
              className={`w-full py-3.5 text-white font-bold rounded-2xl text-sm transition-all shadow-md ${
                selectedMethod === 'Cash'   ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' :
                selectedMethod === 'Card'   ? 'bg-blue-600    hover:bg-blue-700    shadow-blue-600/20'    :
                selectedMethod === 'UPI'    ? 'bg-violet-600  hover:bg-violet-700  shadow-violet-600/20'  :
                selectedMethod === 'Wallet' ? 'bg-amber-500   hover:bg-amber-600   shadow-amber-500/20'   :
                'bg-slate-700 hover:bg-slate-800 shadow-slate-700/20'
              }`}
            >
              Confirm — {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.icon} {selectedMethod} Payment
            </button>
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
