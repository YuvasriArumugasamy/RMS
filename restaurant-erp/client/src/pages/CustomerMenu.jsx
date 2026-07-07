import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── helpers ─── */
const GST_RATE = 0.05;
const SERVICE_CHARGE_RATE = 0.02;
const gst = (n) => Math.round(n * GST_RATE);
const serviceCharge = (n) => Math.round(n * SERVICE_CHARGE_RATE);
const totalAmt = (n) => Math.round(n * (1 + GST_RATE + SERVICE_CHARGE_RATE));
const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = () => new Date().toLocaleDateString();

const PREP_TIMES = { 'Main Course': 20, Starters: 12, Beverages: 5, Bread: 8, default: 15 };
const estimatedTime = (items) => {
  if (!items?.length) return 0;
  return Math.max(...items.map(i => PREP_TIMES[i.category] ?? PREP_TIMES.default));
};

const LANGS = {
  en: { title: 'Our Menu', welcome: 'Welcome!', subtitle: 'Thank you for choosing us',
        tableLabel: 'Table Number', scanSuccess: 'Scan successful',
        startOrdering: 'START ORDERING', searchPlaceholder: 'Search for dishes...',
        all: 'All', addToCart: 'ADD TO CART', myCart: 'My Cart', edit: 'Edit',
        itemTotal: 'Item Total', total: 'Total', placeOrder: 'PLACE ORDER',
        confirmOrder: 'Confirm Order', orderType: 'Order Type', dineIn: 'Dine In',
        takeAway: 'Take Away', specialInstructions: 'Special Instructions (if any)',
        siPlaceholder: 'Ex: No onion, Less spicy...',
        billDetails: 'Bill Details', subtotal: 'Subtotal', gstLabel: 'GST (5%)',
        serviceChargeLabel: 'Service Charge (2%)', confirmOrderBtn: 'CONFIRM ORDER',
        orderStatus: 'Order Status', orderReceived: 'Order Received', preparing: 'Preparing',
        preparingNote: 'Your order is being prepared', readyToServe: 'Ready to Serve',
        readyNote: 'Almost ready!', served: 'Served', servedNote: 'Enjoy your meal',
        callWaiter: 'CALL WAITER', billSummary: 'Bill Summary', payAtCashier: 'Please pay at the cashier',
        thankYou: 'Thank you!', offersForYou: 'Offers for You', apply: 'APPLY',
        todaysSpecial: "Today's Special", freeItem: 'Free Dessert on orders above ₹900',
        feedback: 'We Value Your Feedback', howWasExp: 'How was your experience?',
        foodQuality: 'Food Quality', service: 'Service', ambience: 'Ambience',
        comments: 'Your Comments (Optional)', commentsPlaceholder: 'Write your feedback...',
        submitFeedback: 'SUBMIT FEEDBACK', backToMenu: 'BACK TO MENU',
        thankYouTitle: 'Thank You!', thankYouMsg: 'We appreciate your feedback. Visit us again!',
        needAssistance: 'Need Assistance?', waiterNote: 'Our waiter will be there shortly.',
        menu: 'Menu', cart: 'Cart', orders: 'Orders', profile: 'Profile',
        customize: 'Customize (Optional)', extraCheese: 'Extra Cheese',
        noOnion: 'No Onion', spicy: 'Spicy', addNote: 'Add special note...',
        qty: 'Quantity', veryGood: 'Very Good' },
  ta: { title: 'எங்கள் மெனு', welcome: 'வரவேற்கிறோம்!', subtitle: 'எங்களை தேர்ந்தெடுத்தற்கு நன்றி',
        tableLabel: 'மேசை எண்', scanSuccess: 'ஸ்கேன் வெற்றி',
        startOrdering: 'ஆர்டர் தொடங்கு', searchPlaceholder: 'உணவு தேடுங்கள்...',
        all: 'அனைத்தும்', addToCart: 'கார்ட்டில் சேர்', myCart: 'என் கார்ட்', edit: 'திருத்து',
        itemTotal: 'மொத்தம்', total: 'மொத்தம்', placeOrder: 'ஆர்டர் போடு',
        confirmOrder: 'ஆர்டர் உறுதி', orderType: 'ஆர்டர் வகை', dineIn: 'உள்ளே சாப்பிட',
        takeAway: 'வெளியே கொண்டு செல்', specialInstructions: 'சிறப்பு அறிவுறுத்தல்கள்',
        siPlaceholder: 'எ.கா: வெங்காயம் வேண்டாம், குறைவான காரம்...',
        billDetails: 'பில் விவரங்கள்', subtotal: 'உப மொத்தம்', gstLabel: 'GST (5%)',
        serviceChargeLabel: 'சேவை கட்டணம் (2%)', confirmOrderBtn: 'ஆர்டர் உறுதிப்படுத்து',
        orderStatus: 'ஆர்டர் நிலை', orderReceived: 'ஆர்டர் பெறப்பட்டது', preparing: 'தயாரிக்கிறோம்',
        preparingNote: 'உங்கள் ஆர்டர் தயாராகிறது', readyToServe: 'பரிமாற தயார்',
        readyNote: 'கிட்டத்தட்ட தயார்!', served: 'பரிமாறப்பட்டது', servedNote: 'மகிழ்ச்சியாக சாப்பிடுங்கள்',
        callWaiter: 'வெயிட்டர் அழை', billSummary: 'பில் சுருக்கம்', payAtCashier: 'கேஷியரிடம் பணம் செலுத்துங்கள்',
        thankYou: 'நன்றி!', offersForYou: 'உங்களுக்கான சலுகைகள்', apply: 'பயன்படுத்து',
        todaysSpecial: 'இன்றைய சிறப்பு', freeItem: '₹900க்கு மேல் ஆர்டரில் இலவச இனிப்பு',
        feedback: 'உங்கள் கருத்து', howWasExp: 'உங்கள் அனுபவம் எப்படி?',
        foodQuality: 'உணவு தரம்', service: 'சேவை', ambience: 'சூழல்',
        comments: 'கருத்துகள் (விரும்பினால்)', commentsPlaceholder: 'உங்கள் கருத்தை எழுதுங்கள்...',
        submitFeedback: 'கருத்து சமர்ப்பி', backToMenu: 'மெனுவுக்கு திரும்பு',
        thankYouTitle: 'நன்றி!', thankYouMsg: 'மீண்டும் வாருங்கள்!',
        needAssistance: 'உதவி வேண்டுமா?', waiterNote: 'வெயிட்டர் உடனே வருவார்.',
        menu: 'மெனு', cart: 'கார்ட்', orders: 'ஆர்டர்கள்', profile: 'சுயவிவரம்',
        customize: 'தனிப்பயனாக்கு', extraCheese: 'கூடுதல் சீஸ்',
        noOnion: 'வெங்காயம் வேண்டாம்', spicy: 'காரம்', addNote: 'சிறப்பு குறிப்பு...',
        qty: 'அளவு', veryGood: 'மிகவும் நல்லது' },
  hi: { title: 'हमारा मेनू', welcome: 'स्वागत है!', subtitle: 'हमें चुनने के लिए धन्यवाद',
        tableLabel: 'टेबल नंबर', scanSuccess: 'स्कैन सफल',
        startOrdering: 'ऑर्डर शुरू करें', searchPlaceholder: 'व्यंजन खोजें...',
        all: 'सभी', addToCart: 'कार्ट में डालें', myCart: 'मेरा कार्ट', edit: 'संपादित',
        itemTotal: 'कुल', total: 'कुल', placeOrder: 'ऑर्डर दें',
        confirmOrder: 'ऑर्डर कन्फर्म', orderType: 'ऑर्डर प्रकार', dineIn: 'यहाँ खाएं',
        takeAway: 'ले जाएं', specialInstructions: 'विशेष निर्देश',
        siPlaceholder: 'जैसे: प्याज नहीं, कम मसाला...',
        billDetails: 'बिल विवरण', subtotal: 'उप-कुल', gstLabel: 'GST (5%)',
        serviceChargeLabel: 'सेवा शुल्क (2%)', confirmOrderBtn: 'ऑर्डर कन्फर्म करें',
        orderStatus: 'ऑर्डर स्थिति', orderReceived: 'ऑर्डर मिला', preparing: 'तैयार हो रहा है',
        preparingNote: 'आपका ऑर्डर बन रहा है', readyToServe: 'परोसने के लिए तैयार',
        readyNote: 'लगभग तैयार!', served: 'परोसा गया', servedNote: 'खाने का आनंद लें',
        callWaiter: 'वेटर बुलाएं', billSummary: 'बिल सारांश', payAtCashier: 'कैशियर को भुगतान करें',
        thankYou: 'धन्यवाद!', offersForYou: 'आपके लिए ऑफर', apply: 'लागू करें',
        todaysSpecial: 'आज का विशेष', freeItem: '₹900 से अधिक के ऑर्डर पर मुफ्त मिठाई',
        feedback: 'आपकी प्रतिक्रिया', howWasExp: 'आपका अनुभव कैसा था?',
        foodQuality: 'खाने की गुणवत्ता', service: 'सेवा', ambience: 'माहौल',
        comments: 'टिप्पणियां (वैकल्पिक)', commentsPlaceholder: 'अपनी प्रतिक्रिया लिखें...',
        submitFeedback: 'प्रतिक्रिया दें', backToMenu: 'मेनू पर वापस जाएं',
        thankYouTitle: 'धन्यवाद!', thankYouMsg: 'फिर से आएं!',
        needAssistance: 'सहायता चाहिए?', waiterNote: 'हमारा वेटर जल्द आएगा।',
        menu: 'मेनू', cart: 'कार्ट', orders: 'ऑर्डर', profile: 'प्रोफाइल',
        customize: 'कस्टमाइज़ करें', extraCheese: 'अतिरिक्त पनीर',
        noOnion: 'प्याज नहीं', spicy: 'मसालेदार', addNote: 'विशेष नोट...',
        qty: 'मात्रा', veryGood: 'बहुत अच्छा' },
};

const STATUS_META = {
  Pending:   { label: 'Order Received',  color: 'bg-emerald-500',  step: 1, icon: '✅', desc: 'Your order has been received' },
  Preparing: { label: 'Preparing',       color: 'bg-blue-500',     step: 2, icon: '👨‍🍳', desc: 'Chef is preparing your order' },
  Ready:     { label: 'Ready to Serve',  color: 'bg-amber-500',    step: 3, icon: '🍽️', desc: 'Your order is ready' },
  Served:    { label: 'Served',          color: 'bg-slate-400',    step: 4, icon: '✨', desc: 'Enjoy your meal!' },
  Completed: { label: 'Served',          color: 'bg-slate-400',    step: 4, icon: '✨', desc: 'Enjoy your meal!' },
};

const CustomerMenu = () => {
  const { tableId } = useParams();
  const [lang, setLang] = useState('en');
  const t = LANGS[lang];

  // States
  const [stage, setStage] = useState('welcome'); // welcome | menu | foodDetails | cart | confirm | tracking | bill | callWaiter | offers | feedback | thankYou
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [customizations, setCustomizations] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderType, setOrderType] = useState('Dine In');
  const [placedOrders, setPlacedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [ratings, setRatings] = useState({ foodQuality: 0, service: 0, ambience: 0 });
  const [feedbackText, setFeedbackText] = useState('');
  const [tableInfo, setTableInfo] = useState({ id: tableId, name: `Table ${tableId}` });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Get table info
  useEffect(() => {
    const fetchTable = async () => {
      try {
        const res = await axios.get(`${API_URL}/tables/${tableId}`);
        if (res.data.success) {
          setTableInfo({ id: res.data.data._id, name: res.data.data.name });
          return;
        }
      } catch {}
      const tables = JSON.parse(localStorage.getItem('tables') || '[]');
      const found = tables.find(t => String(t.id || t._id) === String(tableId));
      if (found) setTableInfo({ id: found.id || found._id, name: found.name });
    };
    fetchTable();
  }, [tableId]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!tableInfo.name) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => socket.emit('join-table', tableInfo.name));

    socket.on('order-status-update', (update) => {
      setPlacedOrders(prev => prev.map(o =>
        String(o._id || o.id) === String(update.id || update._id) ? { ...o, status: update.status } : o
      ));
    });

    return () => socket.disconnect();
  }, [tableInfo.name]);

  // Load menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get(`${API_URL}/menu?available=true`);
        if (res.data.success && res.data.data.length > 0) {
          const items = res.data.data.map(item => ({
            ...item,
            id: item._id,
            menuItemId: item._id,
          }));
          setMenu(items);
          setCategories(['All', ...new Set(items.map(i => i.category))]);
          return;
        }
      } catch {}
      const items = JSON.parse(localStorage.getItem('menuItems') || '[]').filter(m => m.available);
      setMenu(items);
      setCategories(['All', ...new Set(items.map(i => i.category))]);
    };
    fetchMenu();
  }, []);

  // Load coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await axios.get(`${API_URL}/coupons`);
        if (res.data.success) setCoupons(res.data.data.filter(c => c.isActive));
      } catch {}
    };
    fetchCoupons();
  }, []);

  // Poll placed orders for status
  useEffect(() => {
    if (placedOrders.length === 0 || !tableInfo.name) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/orders/qr-status?table=${encodeURIComponent(tableInfo.name)}`);
        if (res.data.success && res.data.data.length > 0) {
          const serverOrders = res.data.data;
          setPlacedOrders(prev => {
            const merged = prev.map(po => {
              const fresh = serverOrders.find(so => String(so._id) === String(po._id || po.id));
              return fresh ? { ...po, status: fresh.status } : po;
            });
            return merged;
          });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [placedOrders.length, tableInfo.name]);

  // Cart helpers
  const addToCart = (item) => {
    const cartItem = { ...item, qty: 1, customizations: {}, specialNote: '' };
    setCart(prev => [...prev, cartItem]);
  };

  const updateQty = (index, delta) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalSubtotal = Math.max(0, cartSubtotal - discount);
  const finalGst = gst(finalSubtotal);
  const finalService = serviceCharge(finalSubtotal);
  const finalTotal = finalSubtotal + finalGst + finalService;

  const placeOrder = async () => {
    if (!cart.length || isPlacingOrder) return;
    setIsPlacingOrder(true);

    const orderPayload = {
      type: orderType === 'Dine In' ? 'Dine-in (QR)' : 'Takeaway (QR)',
      table: orderType === 'Dine In' ? tableInfo.name : 'N/A',
      items: cart.map(i => ({
        id: i.id,
        menuItemId: i.menuItemId || i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        category: i.category,
        image: i.image,
        specialNote: i.specialNote || '',
      })),
      subtotal: finalSubtotal,
      gst: finalGst,
      total: finalTotal,
      guestCount: 1,
      specialInstructions,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    };

    try {
      const res = await axios.post(`${API_URL}/orders/qr`, orderPayload);
      if (res.data.success) {
        const newOrder = { ...res.data.data, id: res.data.data._id };
        setPlacedOrders(prev => [newOrder, ...prev]);
        setSelectedOrder(newOrder);
        setCart([]);
        setSpecialInstructions('');
        setAppliedCoupon(null);
        setIsPlacingOrder(false);
        setStage('tracking');
        return;
      }
    } catch (err) {
      console.error('Order failed:', err);
    }

    // Fallback to localStorage
    const localOrder = {
      id: `ORD-QR-${Date.now().toString().slice(-4)}`,
      ...orderPayload,
      status: 'Pending',
      timestamp: fmtTime(), date: fmtDate(),
    };
    const all = JSON.parse(localStorage.getItem('orders') || '[]');
    localStorage.setItem('orders', JSON.stringify([localOrder, ...all]));
    setPlacedOrders(prev => [localOrder, ...prev]);
    setSelectedOrder(localOrder);
    setCart([]);
    setSpecialInstructions('');
    setAppliedCoupon(null);
    setStage('tracking');
    setIsPlacingOrder(false);
  };

  const submitFeedback = () => {
    const feedbacks = JSON.parse(localStorage.getItem('customerFeedbacks') || '[]');
    feedbacks.unshift({ 
      table: tableInfo.name, 
      ratings, 
      comment: feedbackText, 
      date: fmtDate(), 
      time: fmtTime() 
    });
    localStorage.setItem('customerFeedbacks', JSON.stringify(feedbacks));
    setRatings({ foodQuality: 0, service: 0, ambience: 0 });
    setFeedbackText('');
    setStage('thankYou');
  };

  const filteredMenu = menu.filter(item => {
    const matchCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  /* ── STAGE: WELCOME ── */
  const WelcomeStage = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white px-6 py-10 justify-between">
      <div></div>
      <div className="text-center">
        {/* Logo */}
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <span className="text-5xl">👨‍🍳</span>
        </div>
        <h1 className="text-3xl font-black mb-2">{t.welcome}</h1>
        <p className="text-sm text-slate-300 font-medium mb-8">{t.subtitle}</p>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 mb-8">
          <p className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-2">{t.tableLabel}</p>
          <p className="text-5xl font-black">{'0' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm font-bold">{t.scanSuccess}</span>
          </div>
        </div>

        <button onClick={() => setStage('menu')}
          className="w-full py-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-2xl text-base shadow-2xl transition-all">
          {t.startOrdering}
        </button>
      </div>

      {/* Language selector */}
      <div className="flex justify-center gap-3 mt-8">
        {Object.keys(LANGS).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              lang === l 
                ? 'bg-white text-slate-900' 
                : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
            }`}>
            {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : 'हिंदी'}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── BOTTOM NAV ── */
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex shadow-lg z-40">
      {[
        { id: 'menu', icon: '🏠', label: t.menu },
        { id: 'cart', icon: '🛒', label: t.cart, badge: cart.length },
        { id: 'tracking', icon: '📦', label: t.orders, badge: placedOrders.length },
        { id: 'profile', icon: '👤', label: t.profile },
      ].map(item => (
        <button key={item.id} onClick={() => item.id === 'tracking' && placedOrders.length > 0 ? setStage('tracking') : item.id === 'profile' ? setStage('feedback') : setStage(item.id)}
          className={`flex-1 flex flex-col items-center py-3 text-[10px] font-bold relative transition-colors ${
            stage === item.id ? 'text-orange-500' : 'text-slate-400'
          }`}>
          <span className="text-xl leading-none mb-1">{item.icon}</span>
          {item.badge > 0 && (
            <span className="absolute top-1.5 right-1/4 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {item.badge}
            </span>
          )}
          <span className="leading-none">{item.label}</span>
        </button>
      ))}
    </div>
  );

  /* ── STAGE: MENU ── */
  const MenuStage = () => (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs text-slate-400 font-bold">{tableInfo.name}</p>
            <h1 className="text-2xl font-black">{t.title}</h1>
          </div>
          <button onClick={() => setStage('offers')} className="text-2xl">🎁</button>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:bg-white/20"/>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {categories.map(c => {
            const icons = { All: '🍽️', Starters: '🥗', 'Main Course': '🍛', Beverages: '🥤', Bread: '🍞', Desserts: '🍰' };
            return (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === c 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}>
                <span>{icons[c] || '🍴'}</span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-4 pb-24">
        <div className="grid grid-cols-1 gap-4">
          {filteredMenu.map(item => (
            <div key={item.id} onClick={() => { setSelectedFood(item); setStage('foodDetails'); }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex gap-4 p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-5xl">{item.image}</span>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800 mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.description || 'Delicious dish with special spices.'}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-black text-orange-600">₹{item.price}</span>
                  <button onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                    {t.addToCart}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );

  /* ── STAGE: FOOD DETAILS ── */
  const FoodDetailsStage = () => {
    const [localQty, setLocalQty] = useState(1);
    const [localCustom, setLocalCustom] = useState({ extraCheese: false, noOnion: false, spicy: false });
    const item = selectedFood;
    if (!item) return null;

    const handleAddToCart = () => {
      for (let i = 0; i < localQty; i++) {
        setCart(prev => {
          const existing = prev.find(ci => ci.id === item.id);
          if (existing) {
            return prev.map(ci => ci.id === item.id ? { ...ci, qty: ci.qty + 1, customizations: localCustom } : ci);
          }
          return [...prev, { ...item, qty: 1, customizations: localCustom, specialNote: '' }];
        });
      }
      setStage('menu');
    };

    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setStage('menu')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              ←
            </button>
            <h1 className="text-lg font-black">Food Details</h1>
          </div>
        </div>

        <div className="flex-1 pb-24 overflow-auto">
          {/* Food Image */}
          <div className="w-full h-52 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <span className="text-8xl">{item.image}</span>
          </div>

          <div className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{item.name}</h2>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-500 text-sm">⭐</span>
                  <span className="text-xs font-bold text-slate-500">4.5</span>
                </div>
              </div>
              <p className="text-2xl font-black text-orange-600">₹{item.price}</p>
            </div>

            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              {item.description || 'Delicious dish prepared with fresh ingredients and special spices. A must-try!'}
            </p>

            {/* Customize Section */}
            <div className="mb-5">
              <h3 className="text-sm font-black text-slate-800 mb-3">{t.customize}</h3>
              <div className="space-y-3">
                {[
                  { key: 'extraCheese', label: t.extraCheese, price: '₹50' },
                  { key: 'noOnion', label: t.noOnion, price: '₹0' },
                  { key: 'spicy', label: t.spicy, price: '₹0' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={localCustom[opt.key]} onChange={e => setLocalCustom(p => ({ ...p, [opt.key]: e.target.checked }))}
                        className="w-5 h-5 rounded accent-orange-500"/>
                      <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{opt.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-black text-slate-800">{t.qty}</span>
              <div className="flex items-center gap-4 bg-slate-100 rounded-xl px-4 py-2">
                <button onClick={() => setLocalQty(p => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-full bg-white shadow text-orange-600 font-black text-xl flex items-center justify-center">−</button>
                <span className="text-lg font-black text-slate-800 w-6 text-center">{localQty}</span>
                <button onClick={() => setLocalQty(p => p + 1)}
                  className="w-8 h-8 rounded-full bg-orange-500 shadow text-white font-black text-xl flex items-center justify-center">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4">
          <button onClick={handleAddToCart}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-2xl text-sm shadow-lg">
            {t.addToCart} | ₹{item.price * localQty}
          </button>
        </div>
      </div>
    );
  };

  /* ── STAGE: CART ── */
  const CartStage = () => (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">{t.myCart}</h1>
          <button onClick={() => setStage('menu')} className="text-orange-400 text-sm font-bold">{t.edit}</button>
        </div>
      </div>

      <div className="flex-1 p-4 pb-44">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-6xl mb-4">🛒</span>
            <p className="font-bold text-base">Cart is empty</p>
            <button onClick={() => setStage('menu')} className="mt-4 px-8 py-3 bg-orange-500 text-white font-black rounded-2xl">
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">{item.image}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-800">{item.name}</h3>
                    <p className="text-xs text-slate-400 font-bold">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => index > -1 && cart[index].qty === 1 ? removeFromCart(index) : updateQty(index, -1)}
                      className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-black flex items-center justify-center">−</button>
                    <span className="text-sm font-black text-slate-800 w-5 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(index, 1)}
                      className="w-8 h-8 rounded-full bg-orange-500 text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-100 p-4 z-40">
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span className="font-bold">{t.itemTotal}</span>
              <span className="font-bold">₹{cartSubtotal}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span className="font-bold">{t.gstLabel}</span>
              <span className="font-bold">₹{gst(finalSubtotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="font-bold">Discount ({appliedCoupon.code})</span>
                <span className="font-bold">-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-800 border-t border-slate-200 pt-2 mt-1">
              <span>{t.total}</span>
              <span className="text-orange-600">₹{finalTotal}</span>
            </div>
          </div>
          <button onClick={() => setStage('confirm')}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-2xl text-sm shadow-lg">
            {t.placeOrder}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );

  /* ── STAGE: CONFIRM ORDER ── */
  const ConfirmStage = () => (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => setStage('cart')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">←</button>
          <h1 className="text-xl font-black">{t.confirmOrder}</h1>
        </div>
      </div>

      <div className="flex-1 p-5 pb-44 space-y-4">
        {/* Table Number */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.tableLabel}</p>
          <p className="text-2xl font-black text-slate-800">{'0' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}</p>
        </div>

        {/* Order Type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.orderType}</p>
          <div className="flex gap-3">
            {['Dine In', 'Take Away'].map(type => (
              <button key={type} onClick={() => setOrderType(type)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  orderType === type 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                {type === 'Dine In' ? t.dineIn : t.takeAway}
              </button>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.specialInstructions}</p>
          <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)}
            placeholder={t.siPlaceholder}
            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 resize-none"
            rows="3"/>
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.billDetails}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span className="font-bold">{t.subtotal}</span>
              <span className="font-bold">₹{cartSubtotal}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="font-bold">Discount</span>
                <span className="font-bold">-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-slate-600">
              <span className="font-bold">{t.gstLabel}</span>
              <span className="font-bold">₹{finalGst}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span className="font-bold">{t.serviceChargeLabel}</span>
              <span className="font-bold">₹{finalService}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-slate-800 border-t border-slate-200 pt-2 mt-2">
              <span>{t.total}</span>
              <span className="text-orange-600">₹{finalTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-40">
        <button onClick={placeOrder} disabled={isPlacingOrder}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-black rounded-2xl text-sm shadow-lg transition-all flex items-center justify-center gap-2">
          {isPlacingOrder ? (
            <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Placing...</span></>
          ) : (
            <span>{t.confirmOrderBtn}</span>
          )}
        </button>
      </div>
    </div>
  );

  /* ── STAGE: ORDER TRACKING ── */
  const TrackingStage = () => {
    const order = selectedOrder || placedOrders[0];
    const latest = order 
      ? (placedOrders.find(o => String(o._id || o.id) === String(order._id || order.id)) || order)
      : null;
    const sm = latest ? (STATUS_META[latest.status] || STATUS_META.Pending) : null;

    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
          <h1 className="text-2xl font-black">{t.orderStatus}</h1>
          <p className="text-xs text-slate-300 font-medium mt-1">Order ID: {latest?.orderId || latest?.id}</p>
        </div>

        <div className="flex-1 p-5 pb-24">
          {!latest ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="text-6xl mb-4">📍</span>
              <p className="font-bold text-base">No active order</p>
              <button onClick={() => setStage('menu')} className="mt-4 px-8 py-3 bg-orange-500 text-white font-black rounded-2xl">
                Start Ordering
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status Timeline */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="space-y-4">
                  {['Pending', 'Preparing', 'Ready', 'Served'].map((status, i) => {
                    const meta = STATUS_META[status];
                    const isCurrent = latest.status === status;
                    const isPast = meta.step < (STATUS_META[latest.status]?.step || 1);
                    const isActive = isCurrent || isPast;

                    return (
                      <div key={status} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${
                            isActive ? meta.color + ' shadow-lg' : 'bg-slate-200'
                          }`}>
                            {isActive ? meta.icon : '⏱️'}
                          </div>
                          {i < 3 && (
                            <div className={`w-1 h-8 rounded ${isActive ? 'bg-orange-500' : 'bg-slate-200'}`}/>
                          )}
                        </div>
                        <div className="flex-1 pt-2">
                          <h3 className={`text-sm font-black ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                            {meta.label}
                          </h3>
                          <p className={`text-xs mt-1 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                            {isCurrent ? meta.desc : isActive ? '✓ Completed' : 'Pending'}
                          </p>
                          {isCurrent && (
                            <div className="mt-2 text-xs font-bold text-orange-600 flex items-center gap-1">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"/>
                              <span>{meta.desc}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Summary</h3>
                <div className="space-y-2 mb-3">
                  {latest.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700">{item.qty}x {item.name}</span>
                      <span className="font-bold text-slate-500">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="text-sm font-black text-slate-800">Total</span>
                  <span className="text-lg font-black text-orange-600">₹{latest.total}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStage('callWaiter')}
                  className="py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl text-sm shadow-md">
                  🙋 {t.callWaiter}
                </button>
                <button onClick={() => setStage('bill')}
                  className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-sm shadow-md">
                  🧾 View Bill
                </button>
              </div>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    );
  };

  /* ── STAGE: BILL ── */
  const BillStage = () => {
    const order = selectedOrder || placedOrders[0];
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setStage('tracking')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">←</button>
            <h1 className="text-xl font-black">{t.billSummary}</h1>
          </div>
        </div>

        <div className="flex-1 p-5 pb-24">
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200">
            {/* Header */}
            <div className="text-center mb-6 pb-5 border-b border-slate-200">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-3xl">🧾</span>
              </div>
              <h2 className="text-xl font-black text-slate-800">Bill Details</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Order ID: {order?.orderId || order?.id}</p>
              <p className="text-xs text-slate-400 font-medium">{order?.date} · {order?.timestamp}</p>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {order?.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-bold text-slate-700">{item.qty}x {item.name}</span>
                  <span className="font-bold text-slate-600">₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>

            {/* Subtotals */}
            <div className="space-y-1 mb-3 pb-3 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span className="font-bold">{t.subtotal}</span>
                <span className="font-bold">₹{order?.subtotal || cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span className="font-bold">{t.gstLabel}</span>
                <span className="font-bold">₹{order?.gst || finalGst}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span className="font-bold">{t.serviceChargeLabel}</span>
                <span className="font-bold">₹{serviceCharge(order?.subtotal || finalSubtotal)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between text-xl font-black text-slate-800 bg-orange-50 rounded-xl p-4 mb-5">
              <span>{t.total}</span>
              <span className="text-orange-600">₹{order?.total || finalTotal}</span>
            </div>

            {/* Payment Note */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-4 text-center">
              <span className="text-3xl mb-2 block">💳</span>
              <p className="text-sm font-bold">{t.payAtCashier}</p>
              <p className="text-xs text-slate-300 mt-1 font-medium">{t.thankYou}</p>
            </div>
          </div>

          {/* Feedback Button */}
          <button onClick={() => setStage('feedback')}
            className="w-full mt-5 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-2xl text-sm shadow-lg">
            ⭐ {t.submitFeedback}
          </button>
        </div>

        <BottomNav />
      </div>
    );
  };

  /* ── STAGE: CALL WAITER ── */
  const CallWaiterStage = () => {
    const [requested, setRequested] = useState(false);

    const callWaiter = async () => {
      const requestPayload = {
        type: 'Request',
        requestType: 'Call Waiter',
        table: tableInfo.name,
        items: [{ id: '0', name: 'Call Waiter', qty: 1, price: 0 }],
        subtotal: 0, gst: 0, total: 0,
        guestCount: 1,
      };

      try {
        await axios.post(`${API_URL}/orders/qr`, requestPayload);
      } catch {}

      setRequested(true);
      setTimeout(() => setStage('tracking'), 3000);
    };

    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setStage('tracking')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">←</button>
            <h1 className="text-xl font-black">{t.callWaiter}</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!requested ? (
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <span className="text-6xl">🙋</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">{t.needAssistance}</h2>
              <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">{t.waiterNote}</p>
              <button onClick={callWaiter}
                className="px-12 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black rounded-2xl text-base shadow-lg">
                {t.callWaiter}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-emerald-600 mb-2">Waiter Called!</h2>
              <p className="text-sm text-slate-600">Our staff will assist you shortly</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── STAGE: OFFERS & COUPONS ── */
  const OffersStage = () => (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => setStage('menu')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">←</button>
          <h1 className="text-xl font-black">{t.offersForYou}</h1>
        </div>
      </div>

      <div className="flex-1 p-5 pb-24 space-y-4">
        {/* Coupon 1 */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-5 shadow-lg border-2 border-dashed border-white/30">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">FLAT10</span>
              <h3 className="text-xl font-black mt-2">Get ₹100 OFF</h3>
              <p className="text-xs text-white/80 font-medium mt-1">On orders above ₹500</p>
            </div>
            <span className="text-4xl">🎉</span>
          </div>
          <button onClick={() => { setAppliedCoupon({ code: 'FLAT10', discount: 100 }); setStage('cart'); }}
            className="w-full py-3 bg-white text-orange-600 font-black rounded-xl text-sm shadow-md hover:bg-white/90">
            {t.apply}
          </button>
        </div>

        {/* Coupon 2 */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg border-2 border-dashed border-white/30">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">WELCOME20</span>
              <h3 className="text-xl font-black mt-2">Get 20% OFF</h3>
              <p className="text-xs text-white/80 font-medium mt-1">Valid on first order</p>
            </div>
            <span className="text-4xl">🎁</span>
          </div>
          <button onClick={() => { setAppliedCoupon({ code: 'WELCOME20', discount: Math.round(cartSubtotal * 0.2) }); setStage('cart'); }}
            className="w-full py-3 bg-white text-emerald-600 font-black rounded-xl text-sm shadow-md hover:bg-white/90">
            {t.apply}
          </button>
        </div>

        {/* Today's Special */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🧁</span>
            <div>
              <h3 className="text-base font-black text-slate-800">{t.todaysSpecial}</h3>
              <p className="text-xs text-slate-500 font-medium">{t.freeItem}</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );

  /* ── STAGE: FEEDBACK ── */
  const FeedbackStage = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 pt-10 pb-5 sticky top-0 z-30 shadow-md">
        <h1 className="text-xl font-black">{t.feedback}</h1>
      </div>

      <div className="flex-1 p-5 pb-24">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="text-center mb-6">
            <span className="text-5xl block mb-3">⭐</span>
            <h2 className="text-xl font-black text-slate-800 mb-1">{t.howWasExp}</h2>
            <p className="text-xs text-slate-500 font-medium">{t.veryGood}</p>
          </div>

          {/* Rating Categories */}
          <div className="space-y-4 mb-6">
            {[
              { key: 'foodQuality', label: t.foodQuality, icon: '🍽️' },
              { key: 'service', label: t.service, icon: '🙋' },
              { key: 'ambience', label: t.ambience, icon: '✨' },
            ].map(cat => (
              <div key={cat.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <p className="text-sm font-bold text-slate-700">{cat.label}</p>
                </div>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatings(p => ({ ...p, [cat.key]: n }))}
                      className={`w-10 h-10 rounded-xl transition-all ${
                        ratings[cat.key] >= n 
                          ? 'bg-emerald-500 text-white scale-110' 
                          : 'bg-slate-100 text-slate-400'
                      } flex items-center justify-center font-black text-sm shadow-sm`}>
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="mb-5">
            <p className="text-sm font-bold text-slate-700 mb-2">{t.comments}</p>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
              placeholder={t.commentsPlaceholder}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 resize-none"
              rows="4"/>
          </div>

          {/* Submit Button */}
          <button onClick={submitFeedback}
            disabled={!ratings.foodQuality || !ratings.service || !ratings.ambience}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm shadow-lg transition-all">
            {t.submitFeedback}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );

  /* ── STAGE: THANK YOU ── */
  const ThankYouStage = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-emerald-50 to-white justify-center items-center p-8">
      <div className="text-center">
        <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce">
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </div>

        <h1 className="text-4xl font-black text-slate-800 mb-3">{t.thankYouTitle}</h1>
        <p className="text-base text-slate-600 font-medium mb-8 max-w-sm mx-auto">{t.thankYouMsg}</p>

        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-3xl">👥</span>
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-white"/>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 border-2 border-white"/>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 border-2 border-white"/>
          </div>
          <span className="text-3xl">😊</span>
        </div>

        <button onClick={() => setStage('menu')}
          className="px-12 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-2xl text-base shadow-lg">
          {t.backToMenu}
        </button>
      </div>
    </div>
  );

  // Main render
  return (
    <>
      {stage === 'welcome' && <WelcomeStage />}
      {stage === 'menu' && <MenuStage />}
      {stage === 'foodDetails' && <FoodDetailsStage />}
      {stage === 'cart' && <CartStage />}
      {stage === 'confirm' && <ConfirmStage />}
      {stage === 'tracking' && <TrackingStage />}
      {stage === 'bill' && <BillStage />}
      {stage === 'callWaiter' && <CallWaiterStage />}
      {stage === 'offers' && <OffersStage />}
      {stage === 'feedback' && <FeedbackStage />}
      {stage === 'thankYou' && <ThankYouStage />}
    </>
  );
};

export default CustomerMenu;
