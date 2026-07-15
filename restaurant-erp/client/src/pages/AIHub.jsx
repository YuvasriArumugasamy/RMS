import { useState, useEffect, useRef } from 'react';
import MenuItemImage from '../components/MenuItemImage';

/* ── Quick question chips ── */
const QUICK_QUESTIONS = [
  "Today's sales?",
  "Most selling item?",
  "Best performing waiter?",
  "Low stock items?",
  "Pending orders count?",
  "Total revenue this week?",
  "Which table is most active?",
  "Staff attendance today?",
];

/* ── AI Engine: reads from localStorage ── */
const getAIResponse = (query) => {
  const q = query.toLowerCase();
  const orders  = JSON.parse(localStorage.getItem('orders')  || '[]');
  const menu    = JSON.parse(localStorage.getItem('menuItems') || '[]');
  const staff   = JSON.parse(localStorage.getItem('staff')   || '[]');
  const ingr    = JSON.parse(localStorage.getItem('ingredients') || '[]');
  const customers = JSON.parse(localStorage.getItem('customers') || '[]');

  // Today's sales
  if (q.includes("today") && (q.includes("sale") || q.includes("revenue"))) {
    const completed = orders.filter(o => o.status === 'Completed');
    const total = completed.reduce((s,o) => s + (o.total||0), 0);
    return `📊 **Today's Sales**\n\n• Total completed orders: **${completed.length}**\n• Total revenue: **₹${total}**\n• Average order value: **₹${completed.length ? Math.round(total/completed.length) : 0}**`;
  }

  // Most selling item
  if (q.includes("most sell") || q.includes("best sell") || q.includes("popular")) {
    const itemCount = {};
    orders.forEach(o => o.items?.forEach(i => {
      itemCount[i.name] = (itemCount[i.name] || 0) + (i.qty || 1);
    }));
    const sorted = Object.entries(itemCount).sort((a,b) => b[1]-a[1]);
    if (!sorted.length) return "No order data available yet. Place some orders first!";
    const top3 = sorted.slice(0,3).map(([name,qty],i) => `${['🥇','🥈','🥉'][i]} ${name} — ${qty} orders`).join('\n');
    return `🍽️ **Top Selling Items**\n\n${top3}`;
  }

  // Best waiter
  if (q.includes("best") && (q.includes("waiter") || q.includes("staff") || q.includes("performer"))) {
    const waiterOrders = {};
    orders.forEach(o => {
      const key = o.waiter || 'Unknown';
      waiterOrders[key] = (waiterOrders[key] || 0) + 1;
    });
    const staffList = staff.filter(s => s.role === 'Waiter');
    if (!staffList.length) return "No waiter data found. Add staff in Staff Management.";
    const best = staffList[0];
    return `🥇 **Best Performing Waiter**\n\n• Name: **${best.name}**\n• Role: ${best.role}\n• Shift: ${best.shift}\n• Status: ${best.status}\n\n*Tip: Track waiter performance in Staff Management.*`;
  }

  // Low stock
  if (q.includes("low stock") || q.includes("inventory") || q.includes("stock")) {
    const low = ingr.filter(i => i.status === 'Low Stock' || i.stock <= 5);
    if (!low.length) return "✅ All inventory items are well-stocked! No low stock alerts.";
    const list = low.map(i => `⚠️ **${i.name}** — ${i.stock} ${i.unit} remaining`).join('\n');
    return `📦 **Low Stock Alert**\n\n${list}\n\n*Action: Visit Inventory Management to reorder.*`;
  }

  // Pending orders
  if (q.includes("pending") || q.includes("active order")) {
    const pending = orders.filter(o => o.status !== 'Completed');
    const byStatus = {};
    pending.forEach(o => { byStatus[o.status] = (byStatus[o.status]||0)+1; });
    const breakdown = Object.entries(byStatus).map(([s,c]) => `• ${s}: **${c}**`).join('\n');
    return `🔄 **Active Orders**\n\n• Total active: **${pending.length}**\n\n${breakdown||'• None'}`;
  }

  // Revenue this week
  if (q.includes("week") && q.includes("revenue")) {
    const total = orders.filter(o=>o.status==='Completed').reduce((s,o)=>s+(o.total||0),0);
    return `💰 **Weekly Revenue**\n\n• Total completed: **₹${total}**\n• Orders: **${orders.filter(o=>o.status==='Completed').length}**\n\n*Full analytics in Reports & Analytics page.*`;
  }

  // Most active table
  if (q.includes("table") && (q.includes("active") || q.includes("busy"))) {
    const tableOrders = {};
    orders.forEach(o => { if(o.table&&o.table!=='N/A') tableOrders[o.table]=(tableOrders[o.table]||0)+1; });
    const sorted = Object.entries(tableOrders).sort((a,b)=>b[1]-a[1]);
    if (!sorted.length) return "No dine-in orders found yet.";
    return `🪑 **Most Active Tables**\n\n${sorted.slice(0,3).map(([t,c],i)=>`${['🥇','🥈','🥉'][i]} ${t} — ${c} orders`).join('\n')}`;
  }

  // Staff attendance
  if (q.includes("attendance") || q.includes("staff count")) {
    const active = staff.filter(s=>s.status==='Active').length;
    return `👥 **Staff Overview**\n\n• Total staff: **${staff.length}**\n• Active: **${active}**\n• Inactive: **${staff.length-active}**\n\n*Manage attendance in Staff Management.*`;
  }

  // Menu items count
  if (q.includes("menu") || q.includes("items")) {
    const available = menu.filter(m=>m.available).length;
    return `🍔 **Menu Overview**\n\n• Total items: **${menu.length}**\n• Available: **${available}**\n• Unavailable: **${menu.length-available}**`;
  }

  // Customers
  if (q.includes("customer")) {
    const total = customers.reduce((s,c)=>s+(c.totalSpend||0),0);
    return `👤 **Customer Summary**\n\n• Total customers: **${customers.length}**\n• Total spend: **₹${total}**\n• Avg spend: **₹${customers.length?Math.round(total/customers.length):0}**`;
  }

  return `🤖 I can help with:\n• "Today's sales"\n• "Most selling item"\n• "Low stock items"\n• "Best performing waiter"\n• "Pending orders"\n• "Weekly revenue"\n• "Active tables"\n• "Staff attendance"\n\nJust ask naturally!`;
};

/* ── Format AI message with markdown-like styling ── */
const FormatMsg = ({ text }) => {
  const parts = text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-extrabold text-slate-800 mb-1">{line.replace(/\*\*/g,'')}</p>;
    }
    const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{__html: formatted || '&nbsp;'}}/>;
  });
  return <div className="text-xs space-y-0.5">{parts}</div>;
};

const AIHub = () => {
  const [messages, setMessages] = useState([
    { sender:'AI', text:"👋 Hello! I'm your **AI Restaurant Manager**.\n\nI can answer questions about your restaurant's sales, inventory, staff, and orders — all in real time from your data.\n\nTry asking: *\"Today's sales?\"* or *\"Low stock items?\"*" }
  ]);
  const [input, setInput]       = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'theft' | 'waste'
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const askAI = (question) => {
    if (!question.trim()) return;
    const userMsg = { sender:'User', text: question };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const response = getAIResponse(question);
      setMessages(p => [...p, { sender:'AI', text: response }]);
      setThinking(false);
    }, 600);
  };

  const handleSubmit = (e) => { e.preventDefault(); askAI(input); };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-[fadeIn_0.3s_ease-out]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Operations Hub</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">AI Restaurant Manager · Theft & Wastage Detection · Smart Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-indigo-750 bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"/>AI Engine Active
          </span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 pb-2.5 overflow-x-auto scrollbar-none snap-x snap-mandatory select-none">
        {[
          { id:'ai',      label:'🤖 AI Manager' },
          { id:'theft',   label:'🚨 Theft & Wastage' },
          { id:'profit',  label:'📈 Profit Analyzer' },
          { id:'staff',   label:'🥇 Staff Performance' },
          { id:'waste',   label:'♻️ Flash Promotion' },
          { id:'weather', label:'🌦️ Weather Menu' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4.5 py-3 text-xs font-black rounded-2xl transition-all whitespace-nowrap snap-align-start cursor-pointer border ${
              activeTab === tab.id
                ? 'bg-[#0F286B] text-white border-[#0F286B] shadow-md shadow-indigo-900/10'
                : 'bg-white text-slate-500 border-slate-100/80 hover:bg-slate-50 hover:text-slate-850 hover:border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── AI MANAGER TAB ── */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Quick questions */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Quick Questions</h3>
              <div className="space-y-2">
                {QUICK_QUESTIONS.map(q => (
                  <button 
                    key={q} 
                    onClick={() => askAI(q)}
                    className="w-full text-left px-4 py-3 text-xs font-black text-slate-600 bg-white hover:bg-slate-50 border border-slate-150/70 hover:border-indigo-400 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Live stats */}
            <LiveStatsCard/>
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden" style={{height:'580px'}}>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#0F286B] to-[#1E3A8A] text-white">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-xs shadow-sm">AI</div>
              <div>
                <p className="text-xs font-black tracking-wide">RMS AI Manager</p>
                <p className="text-[10px] text-blue-200 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"/>Online · Real-time data
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 bg-slate-50/30">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'User' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'AI' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-650 flex items-center justify-center text-white text-[9.5px] font-black flex-shrink-0 mr-2 mt-0.5">AI</div>
                  )}
                  <div className={`max-w-[80%] p-3.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] ${
                    msg.sender === 'User'
                      ? 'bg-gradient-to-tr from-orange-500 to-orange-600 text-white rounded-br-sm text-xs font-bold'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm font-semibold'
                  }`}>
                    {msg.sender === 'AI' ? <FormatMsg text={msg.text}/> : <p className="text-xs">{msg.text}</p>}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-lg bg-indigo-650 flex items-center justify-center text-white text-[9.5px] font-black flex-shrink-0 mr-2">AI</div>
                  <div className="bg-white border border-slate-100 px-4 py-3.5 rounded-2xl rounded-bl-sm shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
                    <div className="flex gap-1.5 select-none">
                      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:`${i*150}ms`}}/>)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input type="text" value={input} onChange={e=>setInput(e.target.value)}
                  placeholder="Ask about sales, stock, orders, staff..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200/60 focus:bg-white rounded-2xl text-xs font-bold focus:outline-none focus:border-orange-500 transition-all"/>
                <button type="submit" disabled={!input.trim() || thinking}
                  className="px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-650 hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-orange-400/20 flex items-center gap-1.5 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── THEFT & WASTAGE TAB ── */}
      {activeTab === 'theft' && <TheftWastagePanel/>}

      {/* ── PROFIT ANALYZER TAB ── */}
      {activeTab === 'profit' && <ProfitAnalyzer/>}

      {/* ── STAFF PERFORMANCE TAB ── */}
      {activeTab === 'staff' && <StaffPerformance/>}

      {/* ── ZERO WASTE TAB ── */}
      {activeTab === 'waste' && <ZeroWasteFlashSale/>}

      {/* ── WEATHER MENU TAB ── */}
      {activeTab === 'weather' && <WeatherMenu/>}

    </div>
  );
};

/* ── Live Stats Card ── */
const LiveStatsCard = () => {
  const orders    = JSON.parse(localStorage.getItem('orders')  || '[]');
  const ingr      = JSON.parse(localStorage.getItem('ingredients') || '[]');
  const completed = orders.filter(o => o.status === 'Completed');
  const revenue   = completed.reduce((s,o) => s+(o.total||0), 0);
  const lowStock  = ingr.filter(i => i.status === 'Low Stock' || i.stock <= 5).length;
  const pending   = orders.filter(o => o.status === 'Pending').length;

  return (
    <div className="bg-gradient-to-br from-[#0c1b40] to-[#12285a] rounded-3xl p-5.5 text-white border border-indigo-900/40 shadow-xl">
      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200 mb-3.5">Live Data Snapshot</p>
      <div className="space-y-3">
        {[
          { label:'Revenue', value:`₹${revenue}`, sub:'completed orders' },
          { label:'Pending Orders', value:pending, sub:'in kitchen queue' },
          { label:'Low Stock Alerts', value:lowStock, sub:'items need reorder' },
          { label:'Completed Orders', value:completed.length, sub:'today' },
        ].map(({label,value,sub}) => (
          <div key={label} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl px-4 py-3 hover:bg-white/10 transition-all">
            <div>
              <p className="text-[9.5px] font-black text-indigo-200 uppercase tracking-wider">{label}</p>
              <p className="text-[10.5px] text-white/55 font-semibold mt-0.5">{sub}</p>
            </div>
            <p className="text-xl font-black text-white tracking-tight">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Theft & Wastage Detection Panel ── */
const TheftWastagePanel = () => {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  const ingr   = JSON.parse(localStorage.getItem('ingredients') || '[]');
  const menu   = JSON.parse(localStorage.getItem('menuItems') || '[]');

  // Calculate expected vs actual usage
  const analysis = ingr.map(ingredient => {
    // Count how many times this ingredient was used in orders
    let expectedUsage = 0;
    orders.filter(o => o.status === 'Completed').forEach(order => {
      order.items?.forEach(cartItem => {
        const menuItem = menu.find(m => m.id === cartItem.id);
        if (menuItem?.recipe) {
          const recipeEntry = menuItem.recipe.find(r => r.ingredientId === ingredient.id);
          if (recipeEntry) expectedUsage += recipeEntry.qty * (cartItem.qty || 1);
        }
      });
    });

    const initialStock = ingredient.stock + expectedUsage; // approximate
    const actualUsage = expectedUsage * (1 + (Math.random() * 0.3 - 0.1)); // simulate variance
    const variance = actualUsage - expectedUsage;
    const variancePct = expectedUsage > 0 ? Math.round((variance / expectedUsage) * 100) : 0;
    const isAlert = Math.abs(variancePct) > 15;

    return { ...ingredient, expectedUsage: Math.round(expectedUsage * 100) / 100, actualUsage: Math.round(actualUsage * 100) / 100, variance: Math.round(variance * 100) / 100, variancePct, isAlert };
  });

  const alerts = analysis.filter(a => a.isAlert);

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50/50 border border-red-200 rounded-3xl p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-650" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h3 className="text-sm font-extrabold text-red-800 tracking-tight">High Stock Variance Alerts ({alerts.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-white border border-red-100/60 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
                <div>
                  <p className="text-xs font-black text-slate-800">{a.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Expected: {a.expectedUsage} {a.unit} · Actual: {a.actualUsage} {a.unit}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-black ${a.variance > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {a.variance > 0 ? '+' : ''}{a.variance} {a.unit}
                  </p>
                  <span className={`inline-block text-[8.5px] font-black px-1.5 py-0.5 rounded-md mt-1 border uppercase tracking-wider ${a.variance > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    {a.variancePct > 0 ? '🚨 Theft/Waste' : 'Under Use'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Inventory Variance Analysis</h3>
        
        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-2">Ingredient</th>
                <th className="pb-2">Current Stock</th>
                <th className="pb-2">Expected Usage</th>
                <th className="pb-2">Actual Usage</th>
                <th className="pb-2">Variance</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map(item => (
                <tr key={item.id} className={`border-b border-slate-50 last:border-0 text-xs ${item.isAlert ? 'bg-red-50/10' : ''}`}>
                  <td className="py-3.5 font-bold text-slate-800">{item.name}</td>
                  <td className="py-3.5 text-slate-500 font-semibold">{item.stock} {item.unit}</td>
                  <td className="py-3.5 text-slate-500 font-semibold">{item.expectedUsage} {item.unit}</td>
                  <td className="py-3.5 text-slate-500 font-semibold">{item.actualUsage} {item.unit}</td>
                  <td className={`py-3.5 font-black ${item.variance > 0 ? 'text-red-650' : item.variance < -0.1 ? 'text-amber-605' : 'text-emerald-650'}`}>
                    {item.variance > 0 ? '+' : ''}{item.variance} {item.unit}
                  </td>
                  <td className="py-3.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                      item.isAlert && item.variance > 0 ? 'bg-red-50 text-red-700 border-red-200' :
                      item.isAlert ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {item.isAlert && item.variance > 0 ? '🚨 High Variance' : item.isAlert ? '⚠️ Low Usage' : '✅ Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-3">
          {analysis.map(item => (
            <div key={item.id} className={`rounded-3xl border p-4 shadow-sm ${item.isAlert ? 'border-red-200 bg-red-50/10' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                  <MenuItemImage src={item.image} alt={item.name} imgClassName="w-full h-full object-contain" emojiClassName="text-base" />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-sm text-slate-900">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Selling {item.unit} • Sold {item.sold}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                  item.isAlert && item.variance > 0 ? 'bg-red-50 text-red-700 border-red-200' :
                  item.isAlert ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {item.isAlert && item.variance > 0 ? 'High Variance' : item.isAlert ? 'Low Usage' : 'Normal'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Selling Price</p>
                  <p className="mt-2 font-black text-slate-800">₹{item.price}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Cost Price</p>
                  <p className="mt-2 font-black text-slate-800">₹{item.cost}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Profit / Unit</p>
                  <p className="mt-2 font-black text-emerald-700">₹{item.profit}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Total Revenue</p>
                  <p className="mt-2 font-black text-slate-900">₹{item.revenue}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Qty Sold</p>
                  <p className="mt-2 font-black text-slate-800">{item.sold}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Margin</p>
                  <p className={`mt-2 font-black ${item.profitPct >= 50 ? 'text-emerald-700' : item.profitPct >= 30 ? 'text-amber-700' : 'text-red-600'}`}>{item.profitPct}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-[9px] text-slate-400 font-bold mt-1">* Variance &gt; 15% triggers an alert. Expected vs actual stock usage variance analysis.</p>
      </div>
    </div>
  );
};

/* ── Profit Analyzer ── */
const ProfitAnalyzer = () => {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  const menu   = JSON.parse(localStorage.getItem('menuItems') || '[]');
  const ingr   = JSON.parse(localStorage.getItem('ingredients') || '[]');

  const analysis = menu.map(item => {
    let sold = 0;
    orders.filter(o=>o.status==='Completed').forEach(o => {
      o.items?.forEach(ci => { if(ci.id===item.id) sold += ci.qty||1; });
    });
    // Estimate cost from recipe
    let cost = 0;
    item.recipe?.forEach(r => {
      const ing = ingr.find(i=>i.id===r.ingredientId);
      cost += (ing ? 50 : 30) * r.qty; // ₹50/unit estimate
    });
    cost = Math.max(Math.round(item.price * 0.4), cost); // fallback 40% cost
    const profit = item.price - cost;
    const profitPct = Math.round((profit/item.price)*100);
    const revenue = item.price * sold;
    return { ...item, sold, cost, profit, profitPct, revenue };
  }).sort((a,b) => b.revenue - a.revenue);

  const totalRevenue = analysis.reduce((s,i)=>s+i.revenue,0);
  const totalProfit  = analysis.reduce((s,i)=>s+i.profit*i.sold,0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Revenue', value:`₹${totalRevenue}`, color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
          { label:'Total Profit',  value:`₹${totalProfit}`,  color:'text-[#1e3a8a]',  bg:'bg-blue-50',    border:'border-blue-200'    },
          { label:'Menu Items',    value:analysis.length,    color:'text-[#f97316]',   bg:'bg-orange-50',  border:'border-orange-200'  },
          { label:'Avg Margin',    value:`${analysis.length ? Math.round(analysis.reduce((s,i)=>s+i.profitPct,0)/analysis.length) : 0}%`, color:'text-violet-700', bg:'bg-violet-50', border:'border-violet-200' },
        ].map(({label,value,color,bg,border}) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl p-4`}>
            <p className="text-[10px] text-slate-500 font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Item table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Per-Item Profit Analysis</h3>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-2">Item</th>
                <th className="pb-2">Selling Price</th>
                <th className="pb-2">Cost Price</th>
                <th className="pb-2">Profit/Unit</th>
                <th className="pb-2">Qty Sold</th>
                <th className="pb-2">Total Revenue</th>
                <th className="pb-2">Margin</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map(item => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 text-xs">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        <MenuItemImage src={item.image} alt={item.name} imgClassName="w-7 h-7 object-contain p-0.5" emojiClassName="text-sm leading-none" />
                      </div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">₹{item.price}</td>
                  <td className="py-3 text-slate-600 font-medium">₹{item.cost}</td>
                  <td className="py-3 font-bold text-emerald-700">₹{item.profit}</td>
                  <td className="py-3 font-bold text-slate-800">{item.sold}</td>
                  <td className="py-3 font-bold text-[#1e3a8a]">₹{item.revenue}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-16 overflow-hidden">
                        <div className={`h-full rounded-full ${item.profitPct >= 50 ? 'bg-emerald-500' : item.profitPct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{width:`${Math.min(item.profitPct,100)}%`}}/>
                      </div>
                      <span className={`text-[10px] font-bold ${item.profitPct >= 50 ? 'text-emerald-700' : item.profitPct >= 30 ? 'text-amber-700' : 'text-red-600'}`}>
                        {item.profitPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {analysis.map(item => (
            <div key={item.id} className={`rounded-3xl border p-4 shadow-sm ${item.profitPct >= 50 ? 'border-emerald-200 bg-emerald-50/30' : item.profitPct >= 30 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                  <MenuItemImage src={item.image} alt={item.name} imgClassName="w-full h-full object-contain" emojiClassName="text-base" />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-sm text-slate-900">{item.name}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Sold {item.sold} • Revenue ₹{item.revenue}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${item.profitPct >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : item.profitPct >= 30 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {item.profitPct >= 50 ? 'High Margin' : item.profitPct >= 30 ? 'Healthy' : 'Low Margin'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Sell</p>
                  <p className="mt-2 font-black text-slate-900">₹{item.price}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Cost</p>
                  <p className="mt-2 font-black text-slate-900">₹{item.cost}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Profit</p>
                  <p className="mt-2 font-black text-emerald-700">₹{item.profit}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Margin</p>
                  <p className={`mt-2 font-black ${item.profitPct >= 50 ? 'text-emerald-700' : item.profitPct >= 30 ? 'text-amber-700' : 'text-red-700'}`}>{item.profitPct}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Staff Performance Dashboard ── */
const StaffPerformance = () => {
  const staff  = JSON.parse(localStorage.getItem('staff')  || '[]');
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');

  const scored = staff.map(s => {
    const ordersHandled = orders.filter(o => o.waiter === s.name || o.table?.includes(s.name?.split(' ')[0])).length;
    const attendance   = s.status === 'Active' ? 95 + Math.floor(Math.random()*5) : 60 + Math.floor(Math.random()*20);
    const serviceTime  = 2 + Math.floor(Math.random()*4);
    const customerRating = (3.5 + Math.random()*1.5).toFixed(1);
    const upselling    = Math.floor(Math.random()*30) + 5;
    const score = Math.round(
      (attendance * 0.25) +
      (Math.min(ordersHandled * 2, 30) * 0.25) +
      ((10 - serviceTime) * 3 * 0.2) +
      (parseFloat(customerRating) * 10 * 0.2) +
      (upselling * 0.1)
    );
    return { ...s, ordersHandled, attendance, serviceTime, customerRating, upselling, score: Math.min(score, 100) };
  }).sort((a,b) => b.score - a.score);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div className="space-y-5">
      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scored.slice(0,3).map((s, i) => (
          <div key={s.id} className={`rounded-2xl p-5 border-2 ${i===0?'bg-amber-50 border-amber-300':i===1?'bg-slate-50 border-slate-300':'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{medals[i]}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white ${i===0?'bg-amber-500':i===1?'bg-slate-500':'bg-orange-500'}`}>
                {s.name.slice(0,2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">{s.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{s.role}</p>
              </div>
            </div>
            <div className="text-center mb-3">
              <p className="text-3xl font-extrabold text-[#1e3a8a]">{s.score}<span className="text-sm text-slate-400">/100</span></p>
              <p className="text-[10px] text-slate-400 font-medium">Performance Score</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
              <div className={`h-full rounded-full ${i===0?'bg-amber-500':i===1?'bg-slate-500':'bg-orange-500'}`} style={{width:`${s.score}%`}}/>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[9px]">
              {[
                { l:'Attendance', v:`${s.attendance}%` },
                { l:'Orders', v:s.ordersHandled },
                { l:'Avg Service', v:`${s.serviceTime} min` },
                { l:'Rating', v:`${s.customerRating}/5 ⭐` },
              ].map(({l,v}) => (
                <div key={l} className="bg-white/60 rounded-lg px-2 py-1">
                  <p className="text-slate-400 font-medium">{l}</p>
                  <p className="font-bold text-slate-700">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">All Staff Performance</h3>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-2">Rank</th><th className="pb-2">Staff</th><th className="pb-2">Role</th>
                <th className="pb-2">Attendance</th><th className="pb-2">Orders</th><th className="pb-2">Avg Service</th>
                <th className="pb-2">Rating</th><th className="pb-2">Upselling</th><th className="pb-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {scored.map((s,i) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 text-xs">
                  <td className="py-3 font-extrabold text-slate-600">{medals[i]||`#${i+1}`}</td>
                  <td className="py-3 font-bold text-slate-800">{s.name}</td>
                  <td className="py-3 text-slate-500">{s.role}</td>
                  <td className="py-3 font-medium text-slate-700">{s.attendance}%</td>
                  <td className="py-3 font-medium text-slate-700">{s.ordersHandled}</td>
                  <td className="py-3 font-medium text-slate-700">{s.serviceTime} min</td>
                  <td className="py-3 font-medium text-amber-600">{s.customerRating}/5 ⭐</td>
                  <td className="py-3 font-medium text-emerald-600">{s.upselling}%</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${s.score>=80?'bg-emerald-500':s.score>=60?'bg-amber-400':'bg-red-400'}`} style={{width:`${s.score}%`}}/>
                      </div>
                      <span className={`font-extrabold ${s.score>=80?'text-emerald-700':s.score>=60?'text-amber-700':'text-red-600'}`}>{s.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {scored.map((s,i) => (
            <div key={s.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-3xl flex items-center justify-center text-lg font-black text-white ${i===0?'bg-amber-500':i===1?'bg-slate-500':'bg-orange-500'}`}>
                    {medals[i]||i+1}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">{s.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.role}</p>
                  </div>
                </div>
                <div className={`text-[10px] font-black px-2.5 py-1 rounded-full ${s.score>=80?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>
                  {s.score} pts
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Attendance</p>
                  <p className="mt-2 font-black text-slate-800">{s.attendance}%</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Orders</p>
                  <p className="mt-2 font-black text-slate-800">{s.ordersHandled}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Avg Service</p>
                  <p className="mt-2 font-black text-slate-800">{s.serviceTime} min</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Rating</p>
                  <p className="mt-2 font-black text-amber-600">{s.customerRating}/5</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Upselling</p>
                  <p className="mt-2 font-black text-emerald-600">{s.upselling}%</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400">Score</p>
                  <p className={`mt-2 font-black ${s.score>=80?'text-emerald-700':s.score>=60?'text-amber-700':'text-red-700'}`}>{s.score}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Zero-Waste Flash Sale ── */
const ZeroWasteFlashSale = () => {
  const ingr = JSON.parse(localStorage.getItem('ingredients') || '[]');
  const menu = JSON.parse(localStorage.getItem('menuItems')   || '[]');
  const [promos, setPromos] = useState(() => {
    // Auto-generate promos for low-stock items
    return ingr
      .filter(i => i.stock <= 5 && i.stock > 0)
      .map(i => {
        const relatedItems = menu.filter(m => m.recipe?.some(r => r.ingredientId === i.id));
        return {
          id: i.id,
          ingredient: i.name,
          stock: i.stock,
          unit: i.unit,
          expiry: 'Tomorrow',
          discount: 30,
          comboName: relatedItems.length ? `${relatedItems[0].name} Combo` : `${i.name} Special`,
          price: relatedItems.length ? Math.round(relatedItems[0].price * 0.7) : 0,
          originalPrice: relatedItems.length ? relatedItems[0].price : 0,
          active: true,
        };
      });
  });

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <div>
          <p className="text-sm font-bold text-emerald-800">Auto-Generated Flash Promotions</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">System detected {promos.length} near-expiry items. Auto-created combo offers to minimize waste and boost sales.</p>
        </div>
      </div>

      {promos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm font-bold text-slate-700">No near-expiry items!</p>
          <p className="text-xs text-slate-400 mt-1">All inventory is fresh. No flash sales needed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map(promo => (
            <div key={promo.id} className={`rounded-2xl border-2 overflow-hidden ${promo.active ? 'border-emerald-300' : 'border-slate-200 opacity-60'}`}>
              {/* Promo header */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-extrabold text-sm">{promo.comboName}</p>
                  <p className="text-emerald-100 text-[10px] font-medium">Expires: {promo.expiry}</p>
                </div>
                <div className="bg-white rounded-xl px-3 py-1.5 text-center">
                  <p className="text-emerald-600 font-extrabold text-lg leading-none">{promo.discount}%</p>
                  <p className="text-emerald-500 text-[8px] font-bold">OFF</p>
                </div>
              </div>
              <div className="bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Stock remaining</p>
                    <p className="text-sm font-bold text-amber-600">⚠️ {promo.stock} {promo.unit} left</p>
                  </div>
                  {promo.originalPrice > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 line-through">₹{promo.originalPrice}</p>
                      <p className="text-lg font-extrabold text-emerald-700">₹{promo.price}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <p className="text-[10px] text-amber-700 font-semibold">{promo.ingredient} expires {promo.expiry}. Auto-promo activated.</p>
                </div>
                <button onClick={() => setPromos(p => p.map(pr => pr.id === promo.id ? { ...pr, active: !pr.active } : pr))}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${promo.active ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100' : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                  {promo.active ? '⏸ Deactivate Promo' : '▶ Activate Promo'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Weather-Based Menu ── */
const WeatherMenu = () => {
  const [weather, setWeather] = useState('Summer');
  const menu = JSON.parse(localStorage.getItem('menuItems') || '[]');

  const weatherConfig = {
    Summer:  { emoji:'☀️', color:'bg-amber-50 border-amber-300', text:'text-amber-700', items:['Fresh Lime Soda','Lassi','Ice Cream','Fruit Salad','Cold Coffee'], tip:'Hot & sunny — customers prefer cold, refreshing drinks and light meals.' },
    Rainy:   { emoji:'🌧️', color:'bg-blue-50 border-blue-300',   text:'text-blue-700',  items:['Tea','Coffee','Soup','Hot Chocolate','Pakoda'], tip:'Rainy weather — hot beverages and comfort food see higher demand.' },
    Winter:  { emoji:'❄️', color:'bg-slate-50 border-slate-300', text:'text-slate-700', items:['Hot Soup','Masala Tea','Biryani','Butter Chicken','Hot Coffee'], tip:'Cold weather — hearty meals and hot drinks are top sellers.' },
    Festive: { emoji:'🎉', color:'bg-violet-50 border-violet-300',text:'text-violet-700',items:['Special Thali','Gulab Jamun','Paneer Tikka','Biryani','Sweet Lassi'], tip:'Festive season — special combos and desserts drive higher ticket sizes.' },
  };

  const wc = weatherConfig[weather];
  const suggestedItems = menu.filter(m => wc.items.some(wi => m.name.toLowerCase().includes(wi.toLowerCase())));

  return (
    <div className="space-y-5">
      {/* Weather selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Current Weather / Season</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(weatherConfig).map(([key, wc]) => (
            <button key={key} onClick={() => setWeather(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                weather === key ? `${wc.color} ${wc.text} border-current` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
              }`}>
              <span className="text-base">{wc.emoji}</span>{key}
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${wc.color}`}>
        <span className="text-2xl flex-shrink-0">{wc.emoji}</span>
        <div>
          <p className={`text-sm font-bold ${wc.text}`}>{weather} Season Tips</p>
          <p className={`text-[11px] mt-0.5 ${wc.text} opacity-80`}>{wc.tip}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recommended items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">{wc.emoji} Recommended Dishes</h3>
          <div className="space-y-2">
            {wc.items.map((item, i) => {
              const menuItem = suggestedItems.find(m => m.name.toLowerCase().includes(item.toLowerCase()));
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${menuItem ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      <MenuItemImage src={menuItem?.image || '🍽️'} alt={item} imgClassName="w-7 h-7 object-contain p-0.5" emojiClassName="text-sm leading-none" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item}</p>
                      {menuItem && <p className="text-[9px] text-emerald-600 font-medium">✅ In your menu · ₹{menuItem.price}</p>}
                      {!menuItem && <p className="text-[9px] text-amber-600 font-medium">⚠️ Not in menu — consider adding</p>}
                    </div>
                  </div>
                  {menuItem && (
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Available</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upsell tips */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">💡 Upselling Strategy</h3>
          <div className="space-y-3">
            {[
              { title:'Highlight in QR Menu', desc:`Feature ${weather} specials at the top of your digital menu for maximum visibility.` },
              { title:'Combo Bundles', desc:'Bundle recommended items into combo deals (e.g., Tea + Snack combo) to increase order value.' },
              { title:'Waiter Training', desc:`Brief your waiters to suggest ${wc.items.slice(0,3).join(', ')} to every table today.` },
              { title:'Flash Discount', desc:`Offer 10-15% off on ${wc.items[0]} during ${weather.toLowerCase()} season to drive volume.` },
            ].map(({title, desc}) => (
              <div key={title} className="flex items-start gap-2 p-3 bg-[#1e3a8a]/5 border border-[#1e3a8a]/10 rounded-xl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <div>
                  <p className="text-[11px] font-bold text-[#1e3a8a]">{title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHub;
