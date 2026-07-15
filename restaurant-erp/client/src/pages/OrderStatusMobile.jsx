import React, { useState, useEffect } from 'react';

const Step = ({ title, subtitle, active }) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center">
      <div className={`w-3.5 h-3.5 rounded-full ${active ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-white border border-slate-200'}`}></div>
      <div className="w-px h-full bg-slate-200 mt-2" />
    </div>
    <div className={`flex-1 rounded-xl px-4 py-3 ${active ? 'bg-orange-50 border border-orange-100' : 'bg-white/60 border border-slate-100 text-slate-400'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-extrabold ${active ? 'text-slate-800' : 'text-slate-400'}`}>{title}</p>
          {subtitle && <p className="text-[11px] mt-1 text-slate-400">{subtitle}</p>}
        </div>
        {active && (
          <div className="text-xs font-black text-white bg-orange-500 px-2 py-1 rounded-md">ACTIVE</div>
        )}
      </div>
    </div>
  </div>
);

const OrderStatusMobile = () => {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentOrder');
      if (raw) setOrder(JSON.parse(raw));
      else setOrder({ id: 'ORD-QR-545587', status: 'Order Received' });
    } catch (e) {
      setOrder({ id: 'ORD-QR-545587', status: 'Order Received' });
    }
  }, []);

  const steps = [
    { key: 'Order Received', title: 'Order Received', subtitle: 'Your order has been received' },
    { key: 'Preparing', title: 'Preparing', subtitle: 'Pending status' },
    { key: 'Ready', title: 'Ready', subtitle: 'Ready to serve' },
    { key: 'Served', title: 'Served', subtitle: 'Enjoy your meal' },
  ];

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen bg-slate-50">
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">Order Status</h3>
            <p className="text-xs text-slate-400">Track your order in real time</p>
          </div>
          <div className="text-xs text-orange-600 font-black bg-orange-50 border border-orange-100 px-3 py-1 rounded-xl">Need Help?</div>
        </div>

        <div className="mt-2 mb-4 flex items-center gap-3">
          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2 flex items-center justify-between">
            <div className="text-xs text-slate-400">ID:</div>
            <div className="text-sm font-black text-orange-600">{order?.id}</div>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <Step key={s.key} title={s.title} subtitle={s.subtitle} active={order?.status === s.key} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={() => window.history.back()} className="px-4 py-2 rounded-2xl bg-white border border-slate-100 text-slate-700 font-bold">Back</button>
          <button onClick={() => alert('Help requested') } className="px-4 py-2 rounded-2xl bg-orange-500 text-white font-black">Contact Support</button>
        </div>
      </div>
    </div>
  );
}

export default OrderStatusMobile;
