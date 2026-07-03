import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/* ─── helpers ─── */
const GST_RATE = 0.05;
const gst = (n) => Math.round(n * GST_RATE);
const total = (n) => Math.round(n * (1 + GST_RATE));
const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = () => new Date().toLocaleDateString();

const PREP_TIMES = { 'Main Course': 20, Starters: 12, Beverages: 5, Bread: 8, default: 15 };
const estimatedTime = (items) => {
  if (!items.length) return 0;
  return Math.max(...items.map(i => PREP_TIMES[i.category] ?? PREP_TIMES.default));
};

const LANGS = {
  en: { title: 'Digital Menu', guests: 'Guests', browse: 'Browse Menu', cart: 'Cart', order: 'My Order',
        status: 'Order Status', callWaiter: 'Call Waiter', requestBill: 'Request Bill', water: 'Water Refill',
        extras: 'Extra Items', feedback: 'Feedback', placeOrder: 'Place Order', addNote: 'Add special instructions...',
        guestsQ: 'How many guests?', categories: 'Categories', repeat: 'Repeat Last Order',
        estimatedTime: 'Est. Prep Time', mins: 'min', welcome: 'Welcome!', tableLabel: 'Table' },
  ta: { title: 'டிஜிட்டல் மெனு', guests: 'விருந்தினர்கள்', browse: 'மெனு பார்', cart: 'கார்ட்', order: 'என் ஆர்டர்',
        status: 'ஆர்டர் நிலை', callWaiter: 'வெயிட்டர் அழை', requestBill: 'பில் கேள்', water: 'தண்ணீர் நிரப்பு',
        extras: 'கூடுதல் பொருட்கள்', feedback: 'கருத்து', placeOrder: 'ஆர்டர் போடு', addNote: 'சிறப்பு குறிப்பு சேர்...',
        guestsQ: 'எத்தனை பேர்?', categories: 'வகைகள்', repeat: 'கடைசி ஆர்டர் மீண்டும்',
        estimatedTime: 'தயாரிக்கும் நேரம்', mins: 'நிமிடம்', welcome: 'வரவேற்கிறோம்!', tableLabel: 'மேசை' },
  hi: { title: 'डिजिटल मेनू', guests: 'मेहमान', browse: 'मेनू देखें', cart: 'कार्ट', order: 'मेरा ऑर्डर',
        status: 'ऑर्डर स्थिति', callWaiter: 'वेटर बुलाएं', requestBill: 'बिल मांगें', water: 'पानी मंगाएं',
        extras: 'अतिरिक्त सामान', feedback: 'प्रतिक्रिया', placeOrder: 'ऑर्डर दें', addNote: 'विशेष निर्देश...',
        guestsQ: 'कितने मेहमान?', categories: 'श्रेणियाँ', repeat: 'पिछला ऑर्डर दोहराएं',
        estimatedTime: 'तैयारी समय', mins: 'मिनट', welcome: 'स्वागत है!', tableLabel: 'टेबल' },
};

const STATUS_META = {
  Pending:   { label: 'Order Received',  color: 'bg-blue-500',   light: 'bg-blue-50 text-blue-700',   step: 1 },
  Preparing: { label: 'Preparing...',    color: 'bg-amber-500',  light: 'bg-amber-50 text-amber-700', step: 2 },
  Ready:     { label: 'Ready to Serve',  color: 'bg-green-500',  light: 'bg-green-50 text-green-700', step: 3 },
  Served:    { label: 'Served!',         color: 'bg-slate-400',  light: 'bg-slate-50 text-slate-600', step: 4 },
  Completed: { label: 'Served!',         color: 'bg-slate-400',  light: 'bg-slate-50 text-slate-600', step: 4 },
};

const CustomerMenu = () => {
  const { tableId } = useParams();
  const [lang, setLang] = useState('en');
  const t = LANGS[lang];

  // States
  const [stage, setStage] = useState('guests'); // guests | menu | cart | order | status | feedback
  const [guestCount, setGuestCount] = useState(null);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState({});
  const [placedOrders, setPlacedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [waterRequested, setWaterRequested] = useState(false);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);

  // Get table info
  const tableInfo = (() => {
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    return tables.find(t => String(t.id) === String(tableId)) || { id: tableId, name: `Table ${tableId}` };
  })();

  // 🔌 Socket.io for this customer — join table room for live status updates
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('join-table', tableInfo.name);
    });

    socket.on('order-status-update', (update) => {
      setPlacedOrders(prev => prev.map(o =>
        (o._id || o.id) === (update.id || update._id) ? { ...o, status: update.status } : o
      ));
      // Show status notification to customer
      const msgs = {
        Preparing: `👨‍🍳 Your order is being prepared!`,
        Ready:     `✅ Your order is READY! Waiter is on the way 🛎️`,
        Served:    `🎉 Enjoy your meal!`,
      };
      if (msgs[update.status]) {
        // Simple in-app notification — no toast library needed in customer page
        setVoiceResult({ notification: msgs[update.status] });
        setTimeout(() => setVoiceResult(null), 5000);
      }
    });

    return () => socket.disconnect();
  }, [tableInfo.name]);

  // Load menu
  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('menuItems') || '[]').filter(m => m.available);
    setMenu(items);
    const cats = ['All', ...new Set(items.map(i => i.category))];
    setCategories(cats);
  }, []);

  // Poll placed orders for live status
  useEffect(() => {
    if (placedOrders.length === 0) return;
    const interval = setInterval(() => {
      const all = JSON.parse(localStorage.getItem('orders') || '[]');
      const ids = placedOrders.map(o => o.id);
      const updated = all.filter(o => ids.includes(o.id));
      if (updated.length) setPlacedOrders(updated);
    }, 3000);
    return () => clearInterval(interval);
  }, [placedOrders]);

  // Cart helpers
  const addToCart = (item) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      return ex ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
                : [...prev, { ...item, qty: 1 }];
    });
  };
  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const sendRequest = (type, setter) => {
    const requestOrder = {
      id: `REQ-${type.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      type: 'Request',
      requestType: type,
      table: tableInfo.name,
      items: [{ id: 0, name: type, qty: 1, price: 0 }],
      subtotal: 0, gst: 0, total: 0,
      status: 'Pending',
      timestamp: fmtTime(), date: fmtDate(),
    };
    const all = JSON.parse(localStorage.getItem('orders') || '[]');
    localStorage.setItem('orders', JSON.stringify([requestOrder, ...all]));
    setter(true);
    setTimeout(() => setter(false), 30000);
  };

  const placeOrder = () => {
    if (!cart.length) return;
    const sub = cartSubtotal;
    const newOrder = {
      id: `ORD-QR-${Date.now().toString().slice(-4)}`,
      type: 'Dine-in (QR)',
      table: tableInfo.name,
      items: cart.map(i => ({ ...i, specialNote: specialInstructions[i.id] || '' })),
      subtotal: sub, gst: gst(sub), total: total(sub),
      status: 'Pending',
      timestamp: fmtTime(), date: fmtDate(),
      guestCount,
    };
    const all = JSON.parse(localStorage.getItem('orders') || '[]');
    localStorage.setItem('orders', JSON.stringify([newOrder, ...all]));
    // Mark table occupied
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    localStorage.setItem('tables', JSON.stringify(tables.map(tb =>
      String(tb.id) === String(tableId) && tb.status === 'Available' ? { ...tb, status: 'Occupied' } : tb
    )));
    setPlacedOrders(prev => [newOrder, ...prev]);
    setSelectedOrder(newOrder);
    setCart([]);
    setSpecialInstructions({});
    setStage('status');
  };

  const repeatLastOrder = () => {
    const all = JSON.parse(localStorage.getItem('orders') || '[]');
    const last = all.find(o => o.table === tableInfo.name && o.type === 'Dine-in (QR)');
    if (last) { last.items.forEach(item => addToCart(item)); setStage('cart'); }
  };

  const submitFeedback = () => {
    if (!rating) return;
    const feedbacks = JSON.parse(localStorage.getItem('customerFeedbacks') || '[]');
    feedbacks.unshift({ table: tableInfo.name, rating, comment: feedbackText, date: fmtDate(), time: fmtTime() });
    localStorage.setItem('customerFeedbacks', JSON.stringify(feedbacks));
    setRating(0); setFeedbackText('');
    alert('Thank you for your feedback! 🙏');
    setStage('status');
  };

  /* ── VOICE ORDERING ── */
  const VOICE_LANGS = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };

  // Parse "add 2 butter chicken" / "2 biryani" / "remove naan" style commands
  const parseVoiceCommand = useCallback((transcript) => {
    const text = transcript.toLowerCase().trim();

    // detect quantity
    const numWords = { one:1, two:2, three:3, four:4, five:5, oru:1, rendu:2, moonu:3, ek:1, do:2, teen:3 };
    let qty = 1;
    const numMatch = text.match(/\b(\d+)\b/);
    if (numMatch) qty = parseInt(numMatch[1]);
    else { for (const [word, val] of Object.entries(numWords)) { if (text.includes(word)) { qty = val; break; } } }

    // detect action
    const isRemove = /\b(remove|cancel|delete|drop|hatao|thega|edukama|vendam)\b/.test(text);

    // match menu item by fuzzy name search
    const matched = menu.find(item => {
      const itemName = item.name.toLowerCase();
      const words = itemName.split(' ');
      return words.some(w => w.length > 3 && text.includes(w)) || text.includes(itemName);
    });

    return { matched, qty, isRemove, text };
  }, [menu]);

  const startVoiceOrder = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice ordering not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = VOICE_LANGS[lang] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    setIsListening(true);
    setVoiceTranscript('');
    setVoiceResult(null);
    setShowVoiceModal(true);

    recognition.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setVoiceTranscript(final || interim);
      if (final) {
        const parsed = parseVoiceCommand(final);
        setVoiceResult(parsed);
      }
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') alert('Microphone permission denied. Please allow mic access.');
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, [lang, parseVoiceCommand]);

  const confirmVoiceOrder = () => {
    if (!voiceResult?.matched) return;
    const { matched, qty, isRemove } = voiceResult;
    if (isRemove) {
      setCart(prev => prev.filter(i => i.id !== matched.id));
    } else {
      for (let i = 0; i < qty; i++) addToCart(matched);
    }
    setShowVoiceModal(false);
    setVoiceTranscript('');
    setVoiceResult(null);
  };

  const filteredMenu = activeCategory === 'All' ? menu : menu.filter(i => i.category === activeCategory);
  /* ── STAGE: GUESTS ── */
  const GuestStage = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-white px-6 py-10">
      <div className="w-16 h-16 bg-[#1e3a8a] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
        <span className="text-white font-black text-2xl">R</span>
      </div>
      <h1 className="text-2xl font-black text-slate-800 mb-1">{t.welcome}</h1>
      <p className="text-sm text-slate-500 font-medium mb-1">{t.tableLabel}: <span className="font-bold text-[#1e3a8a]">{tableInfo.name}</span></p>
      <p className="text-sm text-slate-500 font-medium mb-8">{t.guestsQ}</p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 'More'].map(n => (
          <button key={n} onClick={() => { setGuestCount(n === 'More' ? 10 : n); setStage('menu'); }}
            className="py-4 rounded-2xl font-black text-lg bg-white border-2 border-slate-200 hover:border-[#f97316] hover:bg-orange-50 text-slate-700 transition-all shadow-sm">
            {n}
          </button>
        ))}
      </div>
      {/* Language selector */}
      <div className="flex gap-2 mt-4">
        {Object.keys(LANGS).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${lang === l ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            {l === 'en' ? 'EN' : l === 'ta' ? 'தமிழ்' : 'हिंदी'}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── BOTTOM NAV ── */
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 flex z-40 safe-bottom">
      {[
        { id: 'menu', icon: '🍽️', label: t.browse },
        { id: 'cart', icon: '🛒', label: t.cart, badge: cartCount },
        { id: 'order', icon: '📋', label: t.order, badge: placedOrders.length },
        { id: 'status', icon: '📍', label: t.status },
        { id: 'feedback', icon: '⭐', label: t.feedback },
      ].map(item => (
        <button key={item.id} onClick={() => setStage(item.id)}
          className={`flex-1 flex flex-col items-center py-2 text-[10px] font-bold relative transition-colors ${stage === item.id ? 'text-[#f97316]' : 'text-slate-400'}`}>
          <span className="text-lg leading-tight">{item.icon}</span>
          {item.badge > 0 && (
            <span className="absolute top-1 right-3 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{item.badge}</span>
          )}
          <span className="leading-tight mt-0.5">{item.label}</span>
        </button>
      ))}
    </div>
  );

  /* ── STAGE: MENU ── */
  const MenuStage = () => (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <div className="bg-[#1e3a8a] text-white px-4 pt-10 pb-4 sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">{tableInfo.name}</p>
            <h1 className="text-lg font-black">{t.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="bg-white/20 text-white text-xs font-bold rounded-lg px-2 py-1 border-none outline-none">
              <option value="en">EN</option><option value="ta">தமிழ்</option><option value="hi">हिंदी</option>
            </select>
            <button onClick={startVoiceOrder}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black shadow-md transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/20 hover:bg-white/30'}`}>
              🎤 {isListening
                ? (lang === 'ta' ? 'கேட்கிறேன்' : lang === 'hi' ? 'सुन...' : 'Listening')
                : (lang === 'ta' ? 'பேசு' : lang === 'hi' ? 'बोलें' : 'Voice')}
            </button>
            <button onClick={() => setStage('cart')}
              className="relative bg-[#f97316] text-white px-3 py-1.5 rounded-full text-xs font-black shadow-md">
              🛒 {cartCount > 0 && <span className="ml-1">({cartCount})</span>}
            </button>
          </div>
        </div>
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === c ? 'bg-[#f97316] text-white' : 'bg-white/20 text-white/80 hover:bg-white/30'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Repeat last order banner */}
      {(() => {
        const all = JSON.parse(localStorage.getItem('orders') || '[]');
        const last = all.find(o => o.table === tableInfo.name && o.type === 'Dine-in (QR)');
        if (!last) return null;
        return (
          <div className="mx-4 mt-4 p-3 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">🔁 {t.repeat}</span>
            <button onClick={repeatLastOrder} className="text-xs font-black text-white bg-[#f97316] px-3 py-1 rounded-full">Add</button>
          </div>
        );
      })()}

      {/* Menu grid */}
      <div className="p-4 pb-24 grid grid-cols-2 gap-3">
        {filteredMenu.map(item => {
          const inCart = cart.find(i => i.id === item.id);
          return (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="bg-slate-50 flex items-center justify-center py-5 text-5xl">{item.image}</div>
              <div className="p-3 flex flex-col flex-1">
                <p className="text-xs font-black text-slate-800 leading-tight">{item.name}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-black text-[#1e3a8a]">₹{item.price}</span>
                  {inCart ? (
                    <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-1">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 font-black text-orange-600 text-sm flex items-center justify-center">−</button>
                      <span className="text-xs font-black text-orange-700 w-4 text-center">{inCart.qty}</span>
                      <button onClick={() => addToCart(item)} className="w-6 h-6 font-black text-orange-600 text-sm flex items-center justify-center">+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)}
                      className="w-8 h-8 rounded-full bg-[#f97316] text-white font-black text-lg flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors">+</button>
                  )}
                </div>
                {inCart && (
                  <input value={specialInstructions[item.id] || ''} onChange={e => setSpecialInstructions(p => ({ ...p, [item.id]: e.target.value }))}
                    placeholder={t.addNote} className="mt-2 w-full text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-400"/>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating service buttons */}
      <div className="fixed top-1/2 right-0 -translate-y-1/2 flex flex-col gap-2 pr-2 z-30">
        {[
          { icon: '🙋', label: 'Waiter', fn: () => sendRequest('Call Waiter', setWaiterCalled), active: waiterCalled, color: 'bg-blue-600' },
          { icon: '💧', label: 'Water', fn: () => sendRequest('Water Refill', setWaterRequested), active: waterRequested, color: 'bg-cyan-500' },
          { icon: '🍴', label: 'Extras', fn: () => setShowExtrasModal(true), active: false, color: 'bg-purple-600' },
          { icon: '🧾', label: 'Bill', fn: () => sendRequest('Request Bill', setBillRequested), active: billRequested, color: 'bg-green-600' },
        ].map(btn => (
          <button key={btn.label} onClick={btn.fn}
            className={`w-11 h-11 rounded-xl ${btn.active ? 'bg-slate-400' : btn.color} text-white shadow-lg flex flex-col items-center justify-center transition-all`}>
            <span className="text-base leading-none">{btn.icon}</span>
            <span className="text-[8px] font-black leading-none mt-0.5">{btn.label}</span>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );

  /* ── STAGE: CART ── */
  const CartStage = () => (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">
      <div className="bg-[#1e3a8a] text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">{tableInfo.name}</p>
            <h1 className="text-xl font-black">{t.cart}</h1>
          </div>
          <button onClick={startVoiceOrder}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-md transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/20 hover:bg-white/30'}`}>
            🎤 {lang === 'ta' ? 'பேசி சேர்' : lang === 'hi' ? 'बोलकर जोड़ें' : 'Voice Add'}
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 pb-36 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-5xl mb-3">🛒</span>
            <p className="font-bold text-sm">Cart is empty</p>
            <button onClick={() => setStage('menu')} className="mt-4 px-6 py-2.5 bg-[#f97316] text-white font-black rounded-full text-sm shadow-md">Browse Menu</button>
          </div>
        ) : cart.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{item.image}</span>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400 font-bold">₹{item.price} each</p>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-2 py-1">
                <button onClick={() => updateQty(item.id, -1)} className="text-orange-600 font-black text-base w-5 text-center">−</button>
                <span className="text-sm font-black text-orange-700 w-5 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="text-orange-600 font-black text-base w-5 text-center">+</button>
              </div>
              <span className="text-sm font-black text-[#1e3a8a] w-14 text-right">₹{item.price * item.qty}</span>
            </div>
            <input value={specialInstructions[item.id] || ''} onChange={e => setSpecialInstructions(p => ({ ...p, [item.id]: e.target.value }))}
              placeholder={t.addNote} className="mt-2 w-full text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-400"/>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 p-4 z-40">
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Subtotal</span><span>₹{cartSubtotal}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
            <span>GST (5%)</span><span>₹{gst(cartSubtotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-800 mb-3 border-t border-slate-100 pt-2">
            <span>Total</span><span>₹{total(cartSubtotal)}</span>
          </div>
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            <span>⏱</span><span className="font-bold">{t.estimatedTime}: ~{estimatedTime(cart)} {t.mins}</span>
          </div>
          <button onClick={placeOrder} className="w-full py-4 bg-[#f97316] hover:bg-orange-600 text-white font-black rounded-2xl text-sm shadow-lg transition-all">
            {t.placeOrder} · ₹{total(cartSubtotal)}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );

  /* ── STAGE: ORDER HISTORY ── */
  const OrderStage = () => (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">
      <div className="bg-[#1e3a8a] text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">{tableInfo.name}</p>
        <h1 className="text-xl font-black">{t.order}</h1>
      </div>
      <div className="flex-1 p-4 pb-24 space-y-3">
        {placedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-5xl mb-3">📋</span>
            <p className="font-bold text-sm">No orders yet</p>
          </div>
        ) : placedOrders.map(order => {
          const sm = STATUS_META[order.status] || STATUS_META.Pending;
          return (
            <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-black text-slate-800">{order.id}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{order.date} · {order.timestamp}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${sm.light}`}>{sm.label}</span>
              </div>
              <div className="space-y-1 mb-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">{item.qty}x {item.name}</span>
                    <span className="font-bold text-slate-500">₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between">
                <span className="text-xs font-bold text-slate-500">Total</span>
                <span className="text-sm font-black text-[#1e3a8a]">₹{order.total}</span>
              </div>
              {/* Status progress */}
              <div className="mt-3 flex items-center gap-1">
                {['Pending','Preparing','Ready','Served'].map((s, i) => {
                  const cur = (STATUS_META[order.status]?.step ?? 1);
                  const step = i + 1;
                  return (
                    <React.Fragment key={s}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${step <= cur ? 'bg-[#f97316] text-white' : 'bg-slate-200 text-slate-400'}`}>{step}</div>
                      {i < 3 && <div className={`flex-1 h-1 rounded-full ${step < cur ? 'bg-[#f97316]' : 'bg-slate-200'}`}/>}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                {['Received','Preparing','Ready','Served'].map(s => (
                  <span key={s} className="text-[8px] text-slate-400 font-bold">{s}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );

  /* ── STAGE: STATUS (post-order) ── */
  const StatusStage = () => {
    const order = selectedOrder || placedOrders[0];
    const latest = order ? (() => {
      const all = JSON.parse(localStorage.getItem('orders') || '[]');
      return all.find(o => o.id === order.id) || order;
    })() : null;
    const sm = latest ? (STATUS_META[latest.status] || STATUS_META.Pending) : null;
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
        <div className="bg-[#1e3a8a] text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">{tableInfo.name}</p>
          <h1 className="text-xl font-black">{t.status}</h1>
        </div>
        <div className="flex-1 p-4 pb-24">
          {!latest ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="text-5xl mb-3">📍</span>
              <p className="font-bold text-sm">No active order</p>
              <button onClick={() => setStage('menu')} className="mt-4 px-6 py-2.5 bg-[#f97316] text-white font-black rounded-full text-sm shadow-md">Start Ordering</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
                <div className={`w-16 h-16 rounded-full ${sm.color} mx-auto flex items-center justify-center mb-3 shadow-lg`}>
                  <span className="text-2xl">{latest.status === 'Ready' ? '✅' : latest.status === 'Preparing' ? '👨‍🍳' : latest.status === 'Served' || latest.status === 'Completed' ? '🎉' : '📥'}</span>
                </div>
                <h2 className="text-xl font-black text-slate-800">{sm.label}</h2>
                <p className="text-xs text-slate-400 font-bold mt-1">{latest.id}</p>
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2">
                  <span>⏱</span><span className="font-bold">~{estimatedTime(latest.items)} {t.mins} {t.estimatedTime.toLowerCase()}</span>
                </div>
              </div>
              {/* Items summary */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Order Summary</p>
                {latest.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-slate-700">{item.qty}x {item.name}</span>
                    <span className="font-bold text-slate-500">₹{item.price * item.qty}</span>
                  </div>
                ))}
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-sm font-black text-slate-700">Total</span>
                  <span className="text-sm font-black text-[#1e3a8a]">₹{latest.total}</span>
                </div>
              </div>
              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStage('menu')} className="py-3 bg-[#1e3a8a] text-white font-black rounded-2xl text-xs shadow-md">+ Add More</button>
                <button onClick={() => sendRequest('Request Bill', setBillRequested)} className="py-3 bg-green-500 text-white font-black rounded-2xl text-xs shadow-md">🧾 Request Bill</button>
                <button onClick={() => sendRequest('Call Waiter', setWaiterCalled)} className="py-3 bg-blue-500 text-white font-black rounded-2xl text-xs shadow-md">🙋 Call Waiter</button>
                <button onClick={() => setStage('feedback')} className="py-3 bg-orange-400 text-white font-black rounded-2xl text-xs shadow-md">⭐ Feedback</button>
              </div>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  };

  /* ── STAGE: FEEDBACK ── */
  const FeedbackStage = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="bg-[#1e3a8a] text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">{tableInfo.name}</p>
        <h1 className="text-xl font-black">{t.feedback}</h1>
      </div>
      <div className="flex-1 p-4 pb-24">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
          <p className="text-sm font-bold text-slate-700 mb-4">How was your experience?</p>
          <div className="flex justify-center gap-2 mb-6">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)}
                className={`text-3xl transition-transform ${rating >= n ? 'scale-110' : 'opacity-40'}`}>⭐</button>
            ))}
          </div>
          <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
            placeholder="Tell us more about your experience..."
            className="w-full p-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-orange-400 resize-none" rows="4"/>
          <button onClick={submitFeedback} disabled={!rating}
            className="w-full mt-4 py-4 bg-[#f97316] disabled:bg-slate-300 text-white font-black rounded-2xl text-sm shadow-lg transition-all">Submit Feedback 🙏</button>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  /* ── EXTRAS MODAL ── */
  const ExtrasModal = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative animate-[fadeIn_0.2s_ease-out]">
        <button onClick={() => setShowExtrasModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        <h3 className="text-lg font-black text-slate-800 mb-1">{t.extras}</h3>
        <p className="text-xs text-slate-500 font-medium mb-4">Request additional items</p>
        <div className="space-y-2">
          {[
            { icon: '🍽️', label: 'Extra Plate' },
            { icon: '🥄', label: 'Extra Spoon' },
            { icon: '🍴', label: 'Fork' },
            { icon: '🧻', label: 'Tissues' },
            { icon: '🧂', label: 'Salt & Pepper' },
          ].map(item => (
            <button key={item.label} onClick={() => { sendRequest(item.label, () => {}); setShowExtrasModal(false); }}
              className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-2xl text-left transition-all">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-bold text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── VOICE MODAL ── */
  const VoiceModal = () => (    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-[fadeIn_0.2s_ease-out]">
        <button onClick={() => { setShowVoiceModal(false); setIsListening(false); }} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        
        <div className="text-center mb-6">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-200'}`}>
            <span className="text-3xl">{isListening ? '🎤' : '🔇'}</span>
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-1">
            {isListening ? (lang === 'ta' ? 'கேட்கிறேன்...' : lang === 'hi' ? 'सुन रहा हूँ...' : 'Listening...') : 'Voice Order'}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {lang === 'ta' ? 'உங்கள் ஆர்டரை சொல்லுங்கள்' : lang === 'hi' ? 'अपना ऑर्डर बोलें' : 'Say your order'}
          </p>
        </div>

        {/* Transcript display */}
        {voiceTranscript && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">You said:</p>
            <p className="text-sm font-bold text-blue-900">{voiceTranscript}</p>
          </div>
        )}

        {/* Parsed result */}
        {voiceResult && (
          <div className={`mb-4 p-4 rounded-2xl border ${voiceResult.matched ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {voiceResult.matched ? (
              <>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Detected:</p>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{voiceResult.matched.image}</span>
                  <div>
                    <p className="text-sm font-black text-slate-800">{voiceResult.qty}x {voiceResult.matched.name}</p>
                    <p className="text-xs font-bold text-slate-500">₹{voiceResult.matched.price * voiceResult.qty}</p>
                  </div>
                </div>
                {voiceResult.isRemove && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <span>🚫</span> Will remove from cart
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">❌ Not Found</p>
                <p className="text-xs text-red-700 font-medium">Try saying the dish name clearly</p>
              </>
            )}
          </div>
        )}

        {/* Examples */}
        {!voiceTranscript && (
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Examples:</p>
            <div className="space-y-1 text-xs text-slate-600 font-medium">
              <p>• {lang === 'ta' ? '"ரெண்டு பிரியாணி போடு"' : lang === 'hi' ? '"दो बिरयानी डालो"' : '"Add 2 Biryani"'}</p>
              <p>• {lang === 'ta' ? '"பட்டர் சிக்கன்"' : lang === 'hi' ? '"बटर चिकन"' : '"Butter Chicken"'}</p>
              <p>• {lang === 'ta' ? '"நான் தேவை இல்லை"' : lang === 'hi' ? '"नान हटाओ"' : '"Remove Naan"'}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!isListening && !voiceResult && (
            <button onClick={startVoiceOrder}
              className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl text-sm shadow-lg transition-all flex items-center justify-center gap-2">
              🎤 Start Speaking
            </button>
          )}
          {voiceResult?.matched && (
            <>
              <button onClick={() => { setVoiceTranscript(''); setVoiceResult(null); }}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-sm transition-all">
                Try Again
              </button>
              <button onClick={confirmVoiceOrder}
                className="flex-1 py-3 bg-[#f97316] hover:bg-orange-600 text-white font-black rounded-2xl text-sm shadow-lg transition-all">
                Confirm ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <>
      {/* 🔔 Live order status notification banner */}
      {voiceResult?.notification && (
        <div className="fixed top-4 left-4 right-4 z-[100] bg-[#1e3a8a] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
          <span className="text-xl">🔔</span>
          <p className="text-sm font-black flex-1">{voiceResult.notification}</p>
          <button onClick={() => setVoiceResult(null)} className="text-white/60 hover:text-white font-black text-lg">✕</button>
        </div>
      )}
      {stage === 'guests' && <GuestStage />}
      {stage === 'menu' && <MenuStage />}
      {stage === 'cart' && <CartStage />}
      {stage === 'order' && <OrderStage />}
      {stage === 'status' && <StatusStage />}
      {stage === 'feedback' && <FeedbackStage />}
      {showExtrasModal && <ExtrasModal />}
      {showVoiceModal && <VoiceModal />}
    </>
  );
};

export default CustomerMenu;
