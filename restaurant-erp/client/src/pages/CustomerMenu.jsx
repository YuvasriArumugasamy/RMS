import { useState, useEffect, useCallback, useRef } from 'react';
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

  // ── Voice Order State ─────────────────────────────────────
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const voiceRecogRef = useRef(null);

  const voiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startVoiceListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    voiceRecogRef.current = recog;

    recog.onstart = () => { setVoiceListening(true); setVoiceStatus('Listening...'); };
    recog.onend   = () => { setVoiceListening(false); };

    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript.toLowerCase().trim();
      setVoiceTranscript(transcript);
      parseVoiceOrder(transcript);
    };

    recog.onerror = (e) => {
      setVoiceListening(false);
      setVoiceStatus(`❌ Error: ${e.error}`);
    };

    recog.start();
  }, [lang, menu]);

  const stopVoiceListening = useCallback(() => {
    voiceRecogRef.current?.stop();
    setVoiceListening(false);
  }, []);

  const parseVoiceOrder = useCallback((transcript) => {
    // Number words map
    const numWords = { one:1, a:1, an:1, two:2, three:3, four:4, five:5,
                       six:6, seven:7, eight:8, nine:9, ten:10,
                       oru:1, rendu:2, moonu:3, naangu:4, aindhu:5,
                       ek:1, do:2, teen:3, char:4, paanch:5 };

    let matched = [];

    for (const item of menu) {
      const name = item.name.toLowerCase();
      // Check if item name is mentioned
      if (transcript.includes(name)) {
        // Look for qty before the item name
        const words = transcript.split(/\s+/);
        const idx = words.findIndex(w => name.includes(w) || w.includes(name.split(' ')[0]));
        let qty = 1;
        if (idx > 0) {
          const prev = words[idx - 1];
          qty = parseInt(prev) || numWords[prev] || 1;
        }
        matched.push({ item, qty });
      }
    }

    if (matched.length > 0) {
      matched.forEach(({ item, qty }) => {
        for (let i = 0; i < qty; i++) {
          setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { ...item, qty: 1, customizations: {}, specialNote: '' }];
          });
        }
      });
      const summary = matched.map(m => `${m.qty}x ${m.item.name}`).join(', ');
      setVoiceStatus(`✅ Added: ${summary}`);
    } else {
      setVoiceStatus('❓ Could not find items. Try again.');
    }
  }, [menu]);

  // Voice UI Panel (shown as bottom sheet on menu stage)
  const VoicePanel = () => (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setVoiceOpen(false)}/>
      <div className="relative w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-t-3xl p-6 pb-10 z-10 shadow-2xl">
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5"/>

        <h3 className="text-white font-black text-lg text-center mb-1">🎤 Voice Order</h3>
        <p className="text-slate-400 text-xs text-center mb-6">
          {lang === 'ta' ? 'உணவு பேர் சொல்லுங்க' : lang === 'hi' ? 'खाने का नाम बोलें' : 'Say the food name to add to cart'}
        </p>

        {/* Mic Button */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <button
            onClick={voiceListening ? stopVoiceListening : startVoiceListening}
            className={`relative w-24 h-24 rounded-full text-4xl font-black shadow-2xl transition-all active:scale-95 ${
              voiceListening
                ? 'bg-red-500 shadow-red-500/50 animate-pulse'
                : 'bg-orange-500 shadow-orange-500/30 hover:bg-orange-600'
            }`}
          >
            {voiceListening ? '⏹' : '🎤'}
            {voiceListening && (
              <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-60"/>
            )}
          </button>
          <p className="text-slate-400 text-xs font-bold">
            {voiceListening ? 'Tap to stop' : 'Tap to speak'}
          </p>
        </div>

        {/* Transcript */}
        {voiceTranscript && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-4 text-center">
            <p className="text-white text-sm font-bold">"{voiceTranscript}"</p>
          </div>
        )}

        {/* Status */}
        {voiceStatus && (
          <p className={`text-center text-sm font-bold mb-4 ${
            voiceStatus.startsWith('✅') ? 'text-emerald-400' :
            voiceStatus.startsWith('❌') || voiceStatus.startsWith('❓') ? 'text-red-400' :
            'text-slate-400'
          }`}>
            {voiceStatus}
          </p>
        )}

        {/* Example commands */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">Example Commands</p>
          <div className="space-y-2">
            {[
              ['English', '"2 biryani and 1 lassi"'],
              ['தமிழ்', '"ரெண்டு பிரியாணி ஒரு லஸ்ஸி"'],
              ['हिंदी', '"दो बिरयानी एक लस्सी"'],
            ].map(([l, ex]) => (
              <div key={l} className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-bold w-14">{l}</span>
                <span className="text-[11px] text-orange-300 font-mono">{ex}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cart shortcut */}
        {cart.length > 0 && (
          <button
            onClick={() => { setVoiceOpen(false); setStage('cart'); }}
            className="w-full mt-5 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-2xl text-sm shadow-lg">
            🛒 View Cart ({cart.length} items) — ₹{cart.reduce((s, i) => s + i.price * i.qty, 0)}
          </button>
        )}
      </div>
    </div>
  );

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
    } catch {
      toast.error('Order placement failed. Please try again.');
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
    <div className="flex flex-col h-screen overflow-y-auto bg-gradient-to-br from-[#0b0f19] via-[#1e293b] to-[#0f172a] text-white px-6 py-10 justify-between relative">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-10 left-10 w-44 h-44 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div></div>
      <div className="text-center z-10">
        {/* Logo */}
        <div className="w-28 h-28 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl relative group transition-transform hover:rotate-6">
          <div className="absolute inset-2 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-full opacity-10 blur-md" />
          <span className="text-6xl animate-pulse">👨‍🍳</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white via-slate-100 to-orange-400 bg-clip-text text-transparent">
          {t.welcome}
        </h1>
        <p className="text-sm text-slate-400 font-medium mb-8 max-w-xs mx-auto">{t.subtitle}</p>
        
        {/* Table Glass Panel */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full" />
          <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-2">{t.tableLabel}</p>
          <p className="text-6xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
            {'0' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider">{t.scanSuccess}</span>
          </div>
        </div>

        {/* Start Ordering Button */}
        <button onClick={() => setStage('menu')}
          className="w-full py-5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold rounded-2xl text-base shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98] hover:scale-[1.01]">
          {t.startOrdering}
        </button>
      </div>

      {/* Language selector */}
      <div className="flex justify-center gap-3 mt-8 z-10">
        {Object.keys(LANGS).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              lang === l 
                ? 'bg-white text-[#0b0f19] shadow-lg scale-105' 
                : 'bg-white/[0.06] text-slate-300 border border-white/10 hover:bg-white/10 active:scale-95'
            }`}>
            {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : 'हिंदी'}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── BOTTOM NAV ── */
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 pb-safe">
      {[
        { id: 'menu', icon: '🏠', label: t.menu },
        { id: 'cart', icon: '🛒', label: t.cart, badge: cart.length },
        { id: 'tracking', icon: '📦', label: t.orders, badge: placedOrders.length },
        { id: 'profile', icon: '👤', label: t.profile },
      ].map(item => {
        const isActive = stage === item.id || (item.id === 'tracking' && stage === 'tracking') || (item.id === 'profile' && stage === 'feedback');
        return (
          <button key={item.id} onClick={() => item.id === 'tracking' && placedOrders.length > 0 ? setStage('tracking') : item.id === 'profile' ? setStage('feedback') : setStage(item.id)}
            className={`flex-1 flex flex-col items-center py-3 text-[10px] font-bold relative transition-colors ${
              isActive ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <span className={`text-2xl leading-none mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
            {item.badge > 0 && (
              <span className="absolute top-2.5 right-1/4 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                {item.badge}
              </span>
            )}
            <span className="leading-none font-extrabold tracking-wide mt-0.5">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-1 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_2px_5px_rgba(249,115,22,0.5)]" />
            )}
          </button>
        );
      })}
    </div>
  );

  /* ── STAGE: MENU ── */
  const MenuStage = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-lg rounded-b-[2rem]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full w-max mb-1">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{tableInfo.name}</p>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{t.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {voiceSupported && (
              <button
                onClick={() => { setVoiceTranscript(''); setVoiceStatus(''); setVoiceOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all active:scale-95"
              >
                🎤 <span>Voice</span>
              </button>
            )}
            <button onClick={() => setStage('offers')} className="text-2xl hover:scale-110 active:scale-95 transition-transform">🎁</button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:bg-white/10 focus:border-orange-500/50 transition-all"/>
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-slate-400">🔍</span>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {categories.map(c => {
            const icons = { All: '🍽️', Starters: '🥗', 'Main Course': '🍛', Beverages: '🥤', Bread: '🍞', Desserts: '🍰' };
            const isActive = activeCategory === c;
            return (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 scale-105' 
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 active:scale-95'
                }`}>
                <span>{icons[c] || '🍴'}</span>
                <span className="font-extrabold">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="grid grid-cols-1 gap-4">
          {filteredMenu.map(item => {
            const isNonVeg = ['chicken', 'biryani', 'fish', 'prawn', 'meat', 'mutton', 'egg'].some(keyword => item.name.toLowerCase().includes(keyword));
            return (
              <div key={item.id} onClick={() => { setSelectedFood(item); setStage('foodDetails'); }}
                className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden flex gap-4 p-4 cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all transform active:scale-[0.99]">
                
                {/* Food Image Container */}
                <div className="w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-200/50 shadow-inner relative">
                  <span className="text-5xl">{item.image}</span>
                  {/* Veg/Nonveg Badge */}
                  <div className="absolute top-2 left-2 bg-white p-1 rounded border border-slate-200 shadow-sm flex items-center justify-center w-5.5 h-5.5">
                    <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center rounded-sm ${isNonVeg ? 'border-red-600 bg-red-50' : 'border-emerald-600 bg-emerald-50'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isNonVeg ? 'bg-red-600' : 'bg-emerald-600'}`} />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="text-base font-extrabold text-slate-800 line-clamp-1">{item.name}</h3>
                      <div className="flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-black text-amber-600">
                        ⭐ <span>4.5</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">{item.description || 'Delicious dish with special spices.'}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-black text-orange-600">₹{item.price}</span>
                    <button onClick={(e) => { e.stopPropagation(); addToCart(item); toast.success(`🛒 Added ${item.name} to cart!`); }}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all transform active:scale-95">
                      {t.addToCart}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
      toast.success(`🛒 Added ${localQty}x ${item.name} to cart!`);
    };

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
        <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setStage('menu')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all font-black text-white">
              ←
            </button>
            <h1 className="text-lg font-black tracking-tight">Food Details</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-28">
          {/* Food Image */}
          <div className="w-full h-56 bg-gradient-to-br from-orange-100 via-amber-100 to-orange-200 flex items-center justify-center shadow-inner relative">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
            <span className="text-8xl relative z-10 drop-shadow-xl animate-bounce">{item.image}</span>
          </div>

          <div className="p-5 space-y-5">
            {/* Title & Price Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-black text-slate-800 leading-tight">{item.name}</h2>
                <p className="text-2xl font-black text-orange-600">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-500 text-sm">⭐</span>
                <span className="text-xs font-extrabold text-slate-500">4.5 · Delicious Recipe</span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mt-3 border-t border-slate-100 pt-3">
                {item.description || 'Delicious dish prepared with fresh ingredients and special spices. A must-try!'}
              </p>
            </div>

            {/* Customize Section */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-3 tracking-wide uppercase text-[11px] text-slate-400">{t.customize}</h3>
              <div className="space-y-2.5">
                {[
                  { key: 'extraCheese', label: t.extraCheese, price: '₹50' },
                  { key: 'noOnion', label: t.noOnion, price: '₹0' },
                  { key: 'spicy', label: t.spicy, price: '₹0' },
                ].map(opt => {
                  const isChecked = localCustom[opt.key];
                  return (
                    <div key={opt.key} onClick={() => setLocalCustom(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-orange-500 bg-orange-50/30' 
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <span className="text-[10px] font-black">✓</span>}
                        </div>
                        <span className={`text-sm font-extrabold transition-colors ${isChecked ? 'text-slate-800' : 'text-slate-600'}`}>{opt.label}</span>
                      </div>
                      <span className="text-xs font-black text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">{opt.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black text-slate-800">{t.qty}</span>
              <div className="flex items-center gap-4 bg-slate-100/80 rounded-2xl px-3 py-1.5">
                <button onClick={() => setLocalQty(p => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-xl bg-white shadow-sm hover:shadow active:scale-95 text-orange-600 font-black text-lg flex items-center justify-center transition-all">−</button>
                <span className="text-lg font-black text-slate-800 w-6 text-center">{localQty}</span>
                <button onClick={() => setLocalQty(p => p + 1)}
                  className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md active:scale-95 text-white font-black text-lg flex items-center justify-center transition-all">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Add to Cart Button Block */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 z-40">
          <button onClick={handleAddToCart}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-sm shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]">
            {t.addToCart} | ₹{item.price * localQty}
          </button>
        </div>
      </div>
    );
  };

  /* ── STAGE: CART ── */
  const CartStage = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">{t.myCart}</h1>
          <button onClick={() => setStage('menu')} className="bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1.5 rounded-xl text-orange-400 text-xs font-extrabold transition-all">{t.edit}</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-48">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200/50">
              <span className="text-5xl animate-bounce">🛒</span>
            </div>
            <p className="font-extrabold text-base text-slate-600">Cart is empty</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Add delicious dishes to start ordering.</p>
            <button onClick={() => setStage('menu')} className="mt-5 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold rounded-2xl shadow-md transition-all active:scale-95">
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {cart.map((item, index) => (
              <div key={index} className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.01)] border border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 border border-slate-200/50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3.5xl">{item.image}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-800 truncate mb-0.5">{item.name}</h3>
                  <p className="text-xs text-orange-600 font-extrabold">₹{item.price}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 rounded-xl p-1">
                  <button onClick={() => index > -1 && cart[index].qty === 1 ? removeFromCart(index) : updateQty(index, -1)}
                    className="w-7 h-7 rounded-lg bg-white shadow-sm hover:shadow text-orange-600 font-extrabold flex items-center justify-center active:scale-95 transition-all">−</button>
                  <span className="text-xs font-black text-slate-800 w-5 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(index, 1)}
                    className="w-7 h-7 rounded-lg bg-orange-500 text-white font-extrabold flex items-center justify-center active:scale-95 transition-all">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 z-40">
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-4 shadow-inner">
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>{t.itemTotal}</span>
              <span>₹{cartSubtotal}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>{t.gstLabel}</span>
              <span>₹{gst(finalSubtotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-xs text-emerald-600 font-bold">
                <span>Discount ({appliedCoupon.code})</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-[#0b0f19] border-t border-slate-200/60 pt-2 mt-1">
              <span>{t.total}</span>
              <span className="text-orange-600 text-base font-black">₹{finalTotal}</span>
            </div>
          </div>
          <button onClick={() => setStage('confirm')}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-sm shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]">
            {t.placeOrder}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );

  /* ── STAGE: CONFIRM ORDER ── */
  const ConfirmStage = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md rounded-b-[2rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => setStage('cart')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all font-black text-white">←</button>
          <h1 className="text-xl font-black tracking-tight">{t.confirmOrder}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-28 space-y-4">
        {/* Table Number Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t.tableLabel}</p>
            <p className="text-2xl font-black text-slate-800">{'0' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl">🍽️</div>
        </div>

        {/* Order Type Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t.orderType}</p>
          <div className="flex gap-3 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl">
            {['Dine In', 'Take Away'].map(type => {
              const isActive = orderType === type;
              return (
                <button key={type} onClick={() => setOrderType(type)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' 
                      : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}>
                  {type === 'Dine In' ? t.dineIn : t.takeAway}
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Instructions Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t.specialInstructions}</p>
          <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)}
            placeholder={t.siPlaceholder}
            className="w-full p-4 border border-slate-150 rounded-2xl text-xs focus:outline-none focus:border-orange-500/50 focus:bg-slate-50/30 transition-all resize-none"
            rows="3"/>
        </div>

        {/* Bill Details Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t.billDetails}</p>
          <div className="space-y-2 border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>{t.subtotal}</span>
              <span>₹{cartSubtotal}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-xs text-emerald-600 font-bold">
                <span>Discount</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>{t.gstLabel}</span>
              <span>₹{finalGst}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>{t.serviceChargeLabel}</span>
              <span>₹{finalService}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-800 border-t border-slate-100 pt-3 mt-2">
              <span>{t.total}</span>
              <span className="text-orange-600">₹{finalTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Button Block */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 z-40">
        <button onClick={placeOrder} disabled={isPlacingOrder}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-extrabold rounded-2xl text-sm shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2">
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

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
        <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md rounded-b-[2rem]">
          <h1 className="text-2xl font-black tracking-tight">{t.orderStatus}</h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">ID: {latest?.orderId || latest?.id}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-28">
          {!latest ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200/50">
                <span className="text-4xl">📍</span>
              </div>
              <p className="font-extrabold text-base text-slate-600">No active order</p>
              <button onClick={() => setStage('menu')} className="mt-5 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold rounded-2xl shadow-md transition-all active:scale-95">
                Start Ordering
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="space-y-6 relative pl-4 border-l-2 border-slate-100">
                  {['Pending', 'Preparing', 'Ready', 'Served'].map((status) => {
                    const meta = STATUS_META[status];
                    const isCurrent = latest.status === status;
                    const isPast = meta.step < (STATUS_META[latest.status]?.step || 1);
                    const isActive = isCurrent || isPast;
                    return (
                      <div key={status} className="relative flex gap-4 items-start">
                        <div className={`absolute -left-[29px] w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-[10px] transition-all shadow-sm ${
                          isCurrent ? 'bg-orange-500 scale-125' : isPast ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}>
                          {isPast && <span className="text-white font-black">✓</span>}
                          {isCurrent && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                        </div>
                        <div className={`flex-1 p-4 rounded-2xl border transition-all ${
                          isCurrent ? 'border-orange-200 bg-orange-50/10 shadow-sm' : isPast ? 'border-slate-100 bg-slate-50/30' : 'border-slate-100/50 bg-white opacity-40'
                        }`}>
                          <div className="flex justify-between items-center">
                            <h3 className={`text-sm font-black ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{meta.label}</h3>
                            <span className="text-xl">{meta.icon}</span>
                          </div>
                          <p className={`text-xs mt-1 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                            {isCurrent ? meta.desc : isPast ? 'Completed' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Order Summary</h3>
                <div className="space-y-2 mb-3">
                  {latest.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700">{item.qty}x {item.name}</span>
                      <span className="font-bold text-slate-500">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-800">Total</span>
                  <span className="text-lg font-black text-orange-600">₹{latest.total}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <button onClick={() => setStage('callWaiter')} className="py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all active:scale-[0.97]">
                  🙋 {t.callWaiter}
                </button>
                <button onClick={() => setStage('bill')} className="py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all active:scale-[0.97]">
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
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
        <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md rounded-b-[2rem]">
          <div className="flex items-center gap-3">
            <button onClick={() => setStage('tracking')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all font-black text-white">←</button>
            <h1 className="text-xl font-black tracking-tight">{t.billSummary}</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pb-24">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 border border-slate-100 rounded-full z-10 shadow-inner" />
            <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 border border-slate-100 rounded-full z-10 shadow-inner" />
            <div className="text-center mb-6 pb-5 border-b border-slate-100">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-[#0f172a] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-3xl">🧾</span>
              </div>
              <h2 className="text-lg font-black text-slate-800">Bill Details</h2>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">ID: {order?.orderId || order?.id}</p>
              <p className="text-xs text-slate-400 font-bold mt-0.5">{order?.date} · {order?.timestamp}</p>
            </div>
            <div className="space-y-2 mb-4">
              {order?.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700">{item.qty}x {item.name}</span>
                  <span className="font-bold text-slate-600">₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-dashed border-slate-200 my-4" />
            <div className="space-y-1.5 mb-3 pb-1">
              <div className="flex justify-between text-xs text-slate-500 font-bold"><span>{t.subtotal}</span><span>₹{order?.subtotal || cartSubtotal}</span></div>
              <div className="flex justify-between text-xs text-slate-500 font-bold"><span>{t.gstLabel}</span><span>₹{order?.gst || finalGst}</span></div>
              <div className="flex justify-between text-xs text-slate-500 font-bold"><span>{t.serviceChargeLabel}</span><span>₹{serviceCharge(order?.subtotal || finalSubtotal)}</span></div>
            </div>
            <div className="flex justify-between text-lg font-black text-slate-800 bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-5">
              <span>{t.total}</span><span className="text-orange-600">₹{order?.total || finalTotal}</span>
            </div>
            <div className="bg-[#0f172a] text-white rounded-2xl p-4 text-center shadow-lg">
              <span className="text-3xl mb-2 block">💳</span>
              <p className="text-xs font-black uppercase tracking-wider text-orange-400 mb-1">{t.payAtCashier}</p>
              <p className="text-[11px] text-slate-300 font-medium">{t.thankYou}</p>
            </div>
          </div>
          <button onClick={() => setStage('feedback')} className="w-full mt-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-sm shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]">
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
      try { await axios.post(`${API_URL}/orders/qr`, { type: 'Request', requestType: 'Call Waiter', table: tableInfo.name, items: [{ id: '0', name: 'Call Waiter', qty: 1, price: 0 }], subtotal: 0, gst: 0, total: 0, guestCount: 1 }); } catch {}
      setRequested(true);
      setTimeout(() => setStage('tracking'), 3000);
    };
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
        <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md rounded-b-[2rem]">
          <div className="flex items-center gap-3">
            <button onClick={() => setStage('tracking')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all font-black text-white">←</button>
            <h1 className="text-xl font-black tracking-tight">{t.callWaiter}</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!requested ? (
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl relative">
                <span className="text-6xl relative z-10">🙋</span>
                <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">{t.needAssistance}</h2>
              <p className="text-xs text-slate-400 font-bold max-w-[240px] mx-auto mb-8 leading-relaxed">{t.waiterNote}</p>
              <button onClick={callWaiter} className="px-12 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-sm shadow-[0_10px_25px_rgba(59,130,246,0.3)] transition-all active:scale-95">{t.callWaiter}</button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-black text-emerald-600 mb-1">Waiter Called!</h2>
              <p className="text-xs text-slate-400 font-bold">Our staff will assist you shortly</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── STAGE: OFFERS & COUPONS ── */
  const OffersStage = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md rounded-b-[2rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => setStage('menu')} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all font-black text-white">←</button>
          <h1 className="text-xl font-black tracking-tight">{t.offersForYou}</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 pb-28 space-y-5">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-5 shadow-lg border-2 border-dashed border-white/20 relative overflow-hidden">
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 z-10" />
          <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 z-10" />
          <div className="flex items-start justify-between mb-4">
            <div><span className="text-[10px] font-black bg-white/20 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">FLAT10</span><h3 className="text-xl font-black mt-3">Get ₹100 OFF</h3><p className="text-xs text-white/80 font-bold mt-0.5">On orders above ₹500</p></div>
            <span className="text-5xl">🎉</span>
          </div>
          <button onClick={() => { setAppliedCoupon({ code: 'FLAT10', discount: 100 }); setStage('cart'); }} className="w-full py-3 bg-white hover:bg-white/95 text-orange-600 font-extrabold rounded-xl text-xs shadow-md transition-all active:scale-[0.98]">{t.apply}</button>
        </div>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-3xl p-5 shadow-lg border-2 border-dashed border-white/20 relative overflow-hidden">
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 z-10" />
          <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 z-10" />
          <div className="flex items-start justify-between mb-4">
            <div><span className="text-[10px] font-black bg-white/20 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">WELCOME20</span><h3 className="text-xl font-black mt-3">Get 20% OFF</h3><p className="text-xs text-white/80 font-bold mt-0.5">Valid on your first order</p></div>
            <span className="text-5xl">🎁</span>
          </div>
          <button onClick={() => { setAppliedCoupon({ code: 'WELCOME20', discount: Math.round(cartSubtotal * 0.2) }); setStage('cart'); }} className="w-full py-3 bg-white hover:bg-white/95 text-emerald-600 font-extrabold rounded-xl text-xs shadow-md transition-all active:scale-[0.98]">{t.apply}</button>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-3xl">🧁</div>
          <div><h3 className="text-sm font-extrabold text-slate-800">{t.todaysSpecial}</h3><p className="text-xs text-slate-400 font-bold mt-0.5">{t.freeItem}</p></div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  /* ── STAGE: FEEDBACK ── */
  const FeedbackStage = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="bg-[#0f172a] text-white px-4 pt-12 pb-5 sticky top-0 z-30 shadow-md rounded-b-[2rem]">
        <h1 className="text-xl font-black tracking-tight">{t.feedback}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-5 pb-28">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="text-center mb-4">
            <span className="text-5xl block mb-2 animate-bounce">⭐</span>
            <h2 className="text-lg font-black text-slate-800">{t.howWasExp}</h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">{t.veryGood}</p>
          </div>
          <div className="space-y-5">
            {[{ key: 'foodQuality', label: t.foodQuality, icon: '🍽️' }, { key: 'service', label: t.service, icon: '🙋' }, { key: 'ambience', label: t.ambience, icon: '✨' }].map(cat => (
              <div key={cat.key} className="space-y-2">
                <div className="flex items-center gap-2 pl-1"><span className="text-lg">{cat.icon}</span><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat.label}</p></div>
                <div className="flex justify-center gap-2 bg-slate-50 border border-slate-100/50 p-2.5 rounded-2xl">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatings(p => ({ ...p, [cat.key]: n }))}
                      className={`w-11 h-11 rounded-xl transition-all flex items-center justify-center shadow-sm text-lg active:scale-90 ${ratings[cat.key] >= n ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white scale-110' : 'bg-white text-slate-300 hover:text-slate-400 border border-slate-100'}`}>★</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t.comments}</p>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder={t.commentsPlaceholder} className="w-full p-4 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-orange-500/50 transition-all resize-none font-medium" rows="3"/>
          </div>
          <button onClick={submitFeedback} disabled={!ratings.foodQuality || !ratings.service || !ratings.ambience}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-sm shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-all">
            {t.submitFeedback}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  /* ── STAGE: THANK YOU ── */
  const ThankYouStage = () => (
    <div className="flex flex-col h-screen overflow-y-auto bg-gradient-to-br from-emerald-50 to-white justify-center items-center p-8 relative">
      <div className="absolute top-10 left-10 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="text-center z-10">
        <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl relative animate-bounce">
          <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-60" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">{t.thankYouTitle}</h1>
        <p className="text-sm text-slate-500 font-bold max-w-xs mx-auto mb-8 leading-relaxed">{t.thankYouMsg}</p>
        <div className="flex items-center justify-center gap-3.5 mb-10">
          <span className="text-4xl animate-pulse">👥</span>
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-white shadow" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 border-2 border-white shadow" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 border-2 border-white shadow" />
          </div>
          <span className="text-4xl animate-pulse">😊</span>
        </div>
        <button onClick={() => setStage('menu')} className="px-12 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-sm shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-all active:scale-95">
          {t.backToMenu}
        </button>
      </div>
    </div>
  );

  // Main render
  return (
    <>
      {voiceOpen && <VoicePanel />}
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
