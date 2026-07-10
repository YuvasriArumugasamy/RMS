import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import QRCode from 'react-qr-code';
import { toast } from 'react-toastify';

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
    const numWords = { one:1, a:1, an:1, two:2, three:3, four:4, five:5,
                       six:6, seven:7, eight:8, nine:9, ten:10,
                       oru:1, rendu:2, moonu:3, naangu:4, aindhu:5,
                       ek:1, do:2, teen:3, char:4, paanch:5 };

    let matched = [];

    for (const item of menu) {
      const name = item.name.toLowerCase();
      if (transcript.includes(name)) {
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
      <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-t-3xl p-6 pb-10 z-10 shadow-2xl">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5"/>

        <h3 className="text-white font-black text-lg text-center mb-1">🎤 Voice Order</h3>
        <p className="text-slate-400 text-xs text-center mb-6">
          {lang === 'ta' ? 'உணவு பேர் சொல்லுங்க' : lang === 'hi' ? 'खाने का नाम बोलें' : 'Say the food name to add to cart'}
        </p>

        <div className="flex flex-col items-center gap-4 mb-6">
          <button
            onClick={voiceListening ? stopVoiceListening : startVoiceListening}
            className={`relative w-24 h-24 rounded-full text-4xl font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center ${
              voiceListening
                ? 'bg-red-500 shadow-red-500/50 animate-pulse text-white'
                : 'bg-orange-500 shadow-orange-500/30 hover:bg-orange-600 text-white'
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

        {voiceTranscript && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-4 text-center">
            <p className="text-white text-sm font-bold">"{voiceTranscript}"</p>
          </div>
        )}

        {voiceStatus && (
          <p className={`text-center text-sm font-bold mb-4 ${
            voiceStatus.startsWith('✅') ? 'text-emerald-400' :
            voiceStatus.startsWith('❌') || voiceStatus.startsWith('❓') ? 'text-red-400' :
            'text-slate-400'
          }`}>
            {voiceStatus}
          </p>
        )}

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
  const WelcomeStage = () => {
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
      const t = setTimeout(() => setShowContent(true), 80);
      return () => clearTimeout(t);
    }, []);

    const handleLanguageSelect = (code) => {
      setLang(code);
    };

    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#FFFBF7] flex flex-col items-center justify-center px-4 py-10 select-none">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 opacity-90 blur-0" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-96 w-96 rounded-full bg-gradient-to-tr from-orange-400 via-orange-300 to-amber-200 opacity-90" />
        <div className="pointer-events-none absolute top-1/3 right-6 h-24 w-24 rounded-full bg-orange-100 opacity-40 blur-xl" />
        <div className="pointer-events-none absolute bottom-1/4 left-4 h-16 w-16 rounded-full bg-[#FFE7D6] opacity-40 blur-lg" />

        {/* Dot grid decoration (top-right) */}
        <div className="pointer-events-none absolute top-8 right-8 grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-orange-455/60" />
          ))}
        </div>

        {/* Card */}
        <div
          className={`relative z-10 w-full max-w-sm rounded-[2rem] bg-white/70 backdrop-blur-sm shadow-xl shadow-orange-100 px-6 pt-16 pb-8 transition-all duration-700 ease-out ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* QR Code medallion */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-white p-3 shadow-lg shadow-orange-200 ring-4 ring-white">
              <div className="rounded-full bg-white p-3">
                <QRCode
                  value={window.location.href}
                  size={100}
                  level="H"
                  fgColor="#1a1a1a"
                  bgColor="#ffffff"
                />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mt-4">
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-b from-orange-500 to-amber-800 bg-clip-text text-transparent">
              {t.welcome}
            </h1>
            <p className="mt-2 text-gray-500 text-sm font-semibold">{t.subtitle}</p>
          </div>

          {/* Table number panel */}
          <div className="mt-8 rounded-3xl bg-white shadow-sm border border-orange-50 py-8 px-6 text-center">
            <p className="text-orange-500 font-bold tracking-wide text-xs mb-2">
              {t.tableLabel}
            </p>
            <p className="text-7xl font-black text-gray-900 tabular-nums">
              {'0' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 border border-green-100 shadow-sm text-green-700">
              <svg className="w-5 h-5 text-green-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-xs uppercase tracking-wider">
                {t.scanSuccess}
              </span>
            </div>
          </div>

          {/* Scan -> Order -> Enjoy steps */}
          <div className="mt-8 flex items-center justify-center gap-4 select-none">
            <div className="flex flex-col items-center gap-2">
              <div className="text-orange-500">
                <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M5 12h14" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Scan</span>
            </div>
            
            <span className="text-orange-400 font-bold text-xl mb-4">&raquo;</span>

            <div className="flex flex-col items-center gap-2">
              <div className="text-orange-500">
                <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="m15 11-5 5" />
                  <path d="m19 7-3 3" />
                  <path d="M21 3v5c0 1.5-1.5 3-3 3h-1L12 16v5H8v-6l5-5V9c0-1.5 1.5-3 3-3V3Z" />
                  <path d="M3 14h3v7H3Z" />
                  <path d="M3 3v7c0 1.5 1.5 3 3 3v8" />
                  <path d="M9 3v7M6 3v4" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Order</span>
            </div>

            <span className="text-orange-400 font-bold text-xl mb-4">&raquo;</span>

            <div className="flex flex-col items-center gap-2">
              <div className="text-orange-500">
                <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" x2="9.01" y1="9" y2="9" />
                  <line x1="15" x2="15.01" y1="9" y2="9" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Enjoy</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setStage('menu')}
            className="mt-8 w-full flex items-center justify-between rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-4 text-white font-extrabold text-sm shadow-lg shadow-orange-200 active:scale-[0.98] transition-transform cursor-pointer uppercase tracking-wider"
          >
            <span className="mx-auto">{t.startOrdering}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-orange-500 ml-2 shadow-inner font-black">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </button>

          {/* Language Switcher */}
          <div className="mt-6 flex items-center justify-center gap-3">
            {Object.keys(LANGS).map((code) => (
              <button
                key={code}
                onClick={() => handleLanguageSelect(code)}
                className={`rounded-full px-5 py-2.5 text-xs font-black border transition-all cursor-pointer ${
                  lang === code
                    ? "bg-orange-500 text-white border-orange-500 shadow-md scale-105"
                    : "bg-white text-orange-650 border-orange-200 hover:bg-slate-50 active:scale-95"
                }`}
              >
                {code === 'en' ? 'English' : code === 'ta' ? 'தமிழ்' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ── BOTTOM NAV (Mobile View) ── */
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.05)] z-40 pb-safe pt-2">
      {[
        { id: 'menu', icon: '🏠', label: t.menu },
        { id: 'cart', icon: '🛒', label: t.cart, badge: cart.length },
        { id: 'tracking', icon: '📦', label: t.orders, badge: placedOrders.length },
        { id: 'feedback', icon: '👤', label: t.profile },
      ].map(item => {
        const isActive = stage === item.id || (item.id === 'tracking' && stage === 'tracking') || (item.id === 'feedback' && stage === 'feedback');
        return (
          <button key={item.id} onClick={() => {
            if (item.id === 'tracking' && placedOrders.length > 0) setStage('tracking');
            else if (item.id === 'feedback') setStage('feedback');
            else setStage(item.id);
          }}
            className={`flex-1 flex flex-col items-center py-2.5 text-[9px] font-black uppercase tracking-wider relative transition-colors ${
              isActive ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <span className={`text-xl leading-none mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
            {item.badge > 0 && (
              <span className="absolute top-1.5 right-1/4 w-5.5 h-5.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                {item.badge}
              </span>
            )}
            <span>{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-2.5 h-1 bg-orange-500 rounded-full shadow-[0_2px_5px_rgba(249,115,22,0.5)]" />
            )}
          </button>
        );
      })}
    </div>
  );

  /* ── COMMON SHELL WRAPPER ── */
  const AppShell = ({ children }) => {
    return (
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 bg-[#0B0F19] text-white p-6 justify-between shrink-0 select-none">
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-3xl">👨‍🍳</div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Resto <span className="text-[9px] bg-orange-500 text-white font-extrabold px-2 py-0.5 rounded">QR</span>
                </h2>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Delicious Food</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1.5">
              {[
                { id: 'menu', label: t.menu, icon: '🏠' },
                { id: 'cart', label: t.cart, icon: '🛒', badge: cart.length },
                { id: 'tracking', label: t.orders, icon: '📦', badge: placedOrders.length },
                { id: 'feedback', label: t.profile, icon: '👤' },
                { id: 'offers', label: t.offersForYou, icon: '🎁' },
              ].map(item => {
                const isActive = stage === item.id || (item.id === 'tracking' && stage === 'tracking') || (item.id === 'feedback' && stage === 'feedback');
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'tracking' && placedOrders.length > 0) setStage('tracking');
                      else if (item.id === 'feedback') setStage('feedback');
                      else setStage(item.id);
                    }}
                    className={`w-full flex items-center justify-between px-4.5 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105' 
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom special item */}
          <div className="relative bg-slate-900 rounded-3xl p-5 overflow-hidden border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-black/60 z-10" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400')] bg-cover bg-center" />
            <div className="relative z-20 space-y-3">
              <span className="text-[8px] bg-orange-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Today's Special</span>
              <h3 className="text-xs font-black text-white leading-normal">Get 20% OFF on your first order!</h3>
              <button onClick={() => setStage('offers')} className="w-full py-2 bg-white hover:bg-slate-100 text-[#0B0F19] font-black text-[9px] rounded-xl transition-all uppercase tracking-wider">Order Now</button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between bg-white border-b border-slate-100 px-6 py-4.5 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3.5 py-1.5 rounded-full text-orange-600 shadow-sm">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-wider">{'Table ' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {voiceSupported && (
                <button
                  onClick={() => { setVoiceTranscript(''); setVoiceStatus(''); setVoiceOpen(true); }}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  🎤 <span>Voice</span>
                </button>
              )}
              <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="text-lg">🔔</span>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 border-2 border-white shadow-sm flex items-center justify-center text-white font-black text-xs">
                👤
              </div>
            </div>
          </header>

          {/* Main content body */}
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC] pb-24 lg:pb-6 p-6">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <div className="lg:hidden">
            <BottomNav />
          </div>
        </div>
      </div>
    );
  };

  /* ── STAGE: MENU ── */
  const MenuStage = () => (
    <AppShell>
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-[#0B0F19] to-slate-900 rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-xl mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-4 max-w-md text-center md:text-left w-full">
            <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 font-black px-3 py-1 rounded-full uppercase tracking-wider">Resto Special</span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">Good Food,<br />Great Mood!</h2>
            <p className="text-[11px] text-slate-400 font-medium">Explore our delicious menu and place your order</p>
            
            {/* Search Input nested in hero */}
            <div className="flex gap-2 w-full mt-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-xs font-semibold focus:outline-none focus:bg-white/10 focus:border-orange-500/50 transition-all"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
              </div>
              <button className="p-3.5 bg-orange-500 hover:bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center shrink-0">
                <span className="text-xs">⚙️</span>
              </button>
            </div>
          </div>

          {/* Burger Graphic */}
          <div className="w-36 h-36 md:w-44 md:h-44 relative shrink-0">
            <span className="text-8xl md:text-9xl drop-shadow-2xl animate-bounce block select-none">🍔</span>
          </div>
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
        {categories.map(c => {
          const icons = { All: '🍽️', Starters: '🥗', 'Main Course': '🍛', Beverages: '🥤', Bread: '🍞', Desserts: '🍰' };
          const isActive = activeCategory === c;
          return (
            <button key={c} onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all ${
                isActive 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105' 
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 active:scale-95'
              }`}>
              <span>{icons[c] || '🍴'}</span>
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Dishes */}
      <div className="space-y-4">
        <div className="flex justify-between items-center select-none">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Popular Dishes</h3>
          <div className="flex items-center gap-3">
            <select className="text-[10px] font-bold text-slate-500 bg-white border border-slate-150 rounded-xl px-2.5 py-1.5 focus:outline-none">
              <option>Sort by: Popular</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button className="p-1.5 bg-white shadow-sm rounded-lg text-[10px]">📅</button>
              <button className="p-1.5 text-slate-400 text-[10px]">📋</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredMenu.map(item => {
            const isNonVeg = ['chicken', 'biryani', 'fish', 'prawn', 'meat', 'mutton', 'egg'].some(keyword => item.name.toLowerCase().includes(keyword));
            const qtyInCart = cart.find(ci => ci.id === item.id)?.qty || 0;
            return (
              <div key={item.id} onClick={() => { setSelectedFood(item); setStage('foodDetails'); }}
                className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden flex flex-col p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.035)] transition-all cursor-pointer group relative">
                
                {/* Veg/Nonveg label badge */}
                <div className="flex justify-between items-center mb-3">
                  <div className="bg-white p-1 rounded-lg border border-slate-100 shadow-sm flex items-center justify-center w-6 h-6">
                    <div className={`w-4 h-4 border flex items-center justify-center rounded ${isNonVeg ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isNonVeg ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    </div>
                  </div>
                  
                  {item.category === 'Desserts' ? (
                    <span className="text-[8px] bg-orange-50 text-orange-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Bestseller</span>
                  ) : isNonVeg ? (
                    <span className="text-[8px] bg-red-50 text-red-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Spicy</span>
                  ) : (
                    <span className="text-[8px] bg-emerald-50 text-emerald-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Veg</span>
                  )}
                  
                  <button onClick={(e) => { e.stopPropagation(); }} className="text-slate-300 hover:text-red-500 transition-colors">
                    <span className="text-sm">❤️</span>
                  </button>
                </div>

                {/* Center Food Graphic */}
                <div className="h-28 w-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <span className="text-6xl drop-shadow-md select-none">{item.image}</span>
                </div>

                {/* Details */}
                <div className="space-y-1 flex-grow">
                  <h4 className="text-xs font-black text-slate-800 line-clamp-1">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{item.description || 'Delicious dish cooked to absolute perfection.'}</p>
                </div>

                {/* Price & Add Block */}
                <div className="flex items-center justify-between mt-4 border-t border-slate-50 pt-3">
                  <span className="text-sm font-black text-orange-600">₹{item.price}</span>
                  
                  {qtyInCart > 0 ? (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl p-0.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => {
                        const idx = cart.findIndex(ci => ci.id === item.id);
                        if (idx > -1) {
                          if (cart[idx].qty === 1) removeFromCart(idx);
                          else updateQty(idx, -1);
                        }
                      }} className="w-6 h-6 rounded-lg bg-white shadow-sm font-extrabold text-orange-600 flex items-center justify-center active:scale-90">-</button>
                      <span className="text-[10px] font-black text-slate-800 px-1 w-4.5 text-center">{qtyInCart}</span>
                      <button onClick={() => {
                        const idx = cart.findIndex(ci => ci.id === item.id);
                        updateQty(idx, 1);
                      }} className="w-6 h-6 rounded-lg bg-orange-500 font-extrabold text-white flex items-center justify-center active:scale-90">+</button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); addToCart(item); toast.success(`🛒 Added ${item.name}!`); }}
                      className="px-3 py-1.5 bg-orange-50 hover:bg-orange-500 border border-orange-200/50 hover:border-orange-500 text-orange-600 hover:text-white text-[10px] font-black rounded-xl transition-all active:scale-95 flex items-center gap-1">
                      <span>ADD</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Combo Offer Banner */}
        <div className="bg-[#FFF7ED] rounded-3xl p-5 border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 select-none shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            <div>
              <h4 className="text-xs font-black text-orange-800 uppercase tracking-wide">Combo Offer!</h4>
              <p className="text-xs text-orange-700 font-bold mt-0.5">Add any 2 items & get 15% OFF</p>
            </div>
          </div>
          <button onClick={() => setStage('offers')} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] rounded-xl transition-all uppercase tracking-wider shadow-md shadow-orange-500/10">Explore Combos</button>
        </div>
      </div>
    </AppShell>
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
      <AppShell>
        <div className="flex items-center gap-3.5 mb-6">
          <button onClick={() => setStage('menu')} className="w-9 h-9 rounded-xl bg-white border border-slate-150 hover:bg-slate-50 flex items-center justify-center transition-all font-black text-slate-700 active:scale-95 shadow-sm text-xs">
            ←
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 leading-tight">Food Details</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Customize your dish</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {/* Left: Food graphic details */}
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col justify-center items-center p-8 h-80 relative select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 rounded-full blur-2xl pointer-events-none" />
            <span className="text-9xl drop-shadow-2xl animate-bounce">{item.image}</span>
          </div>

          {/* Right: Info and custom choices */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-black text-slate-800 leading-snug">{item.name}</h3>
                <span className="text-xl font-black text-orange-600">₹{item.price}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-500 text-xs">⭐</span>
                <span className="text-[10px] font-black text-slate-400">4.5 · Highly Recommended Recipe</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-3 border-t border-slate-50">
                {item.description || 'Prepared fresh with high quality organic ingredients, seasoned to absolute deliciousness.'}
              </p>
            </div>

            {/* Custom Choices */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.customize}</h4>
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
                          ? 'border-orange-500 bg-orange-50/20' 
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <span className="text-[9px] font-black">✓</span>}
                        </div>
                        <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-slate-800' : 'text-slate-600'}`}>{opt.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">{opt.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity select & Buy Block */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{t.qty}</span>
                <div className="flex items-center gap-3 bg-slate-100/75 rounded-2xl px-2.5 py-1">
                  <button onClick={() => setLocalQty(p => Math.max(1, p - 1))}
                    className="w-7.5 h-7.5 rounded-xl bg-white shadow-sm hover:shadow text-orange-600 font-extrabold flex items-center justify-center transition-all cursor-pointer">-</button>
                  <span className="text-sm font-black text-slate-800 w-5 text-center">{localQty}</span>
                  <button onClick={() => setLocalQty(p => p + 1)}
                    className="w-7.5 h-7.5 rounded-xl bg-orange-500 text-white shadow-md font-extrabold flex items-center justify-center transition-all cursor-pointer">+</button>
                </div>
              </div>

              <button onClick={handleAddToCart}
                className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-orange-500/10 transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                <span>{t.addToCart}</span>
                <span>|</span>
                <span>₹{item.price * localQty}</span>
              </button>
            </div>

          </div>
        </div>
      </AppShell>
    );
  };

  /* ── STAGE: CART ── */
  const CartStage = () => {
    const freeDeliveryThreshold = 200;
    const progressPercent = Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100));
    const neededAmount = Math.max(0, freeDeliveryThreshold - cartSubtotal);

    return (
      <AppShell>
        <div className="flex items-center justify-between mb-6 select-none">
          <div>
            <h2 className="text-xl font-black text-slate-800">{t.myCart}</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manage items & review summary</p>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setStage('menu')} className="px-4 py-2 border border-slate-150 rounded-xl text-orange-500 text-xs font-black bg-white hover:bg-slate-50 transition-all shadow-sm">
              Add More Items
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
            <span className="text-6xl mb-4 animate-bounce block select-none">🛒</span>
            <h3 className="text-base font-black text-slate-800">Cart is Empty</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">Browse our delicious menu and add some food here!</p>
            <button onClick={() => setStage('menu')} className="mt-6 px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs uppercase tracking-wider">
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {/* Free Delivery Bar */}
            <div className="bg-[#FFF7ED] border border-orange-100 rounded-3xl p-4.5 flex items-center justify-between gap-4 shadow-sm select-none">
              <div className="flex-1 space-y-2">
                <p className="text-[11px] text-orange-800 font-black">
                  {neededAmount > 0 
                    ? `Add items worth ₹${neededAmount} more to get FREE delivery!` 
                    : '🎉 You qualify for FREE delivery!'}
                </p>
                <div className="relative w-full h-2 bg-orange-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[9px] text-orange-600 font-extrabold uppercase">₹{cartSubtotal} / ₹{freeDeliveryThreshold}</p>
              </div>
              <div className="text-3xl animate-pulse">🛵</div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3.5">
              {cart.map((item, index) => (
                <div key={index} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                      <span className="text-4xl select-none">{item.image}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 line-clamp-1">{item.name}</h4>
                      <p className="text-[9px] bg-slate-50 border border-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md mt-1 w-max uppercase tracking-wider">{item.category}</p>
                      <p className="text-xs text-orange-600 font-black mt-1">₹{item.price}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-155 rounded-xl p-0.5">
                      <button onClick={() => index > -1 && cart[index].qty === 1 ? removeFromCart(index) : updateQty(index, -1)}
                        className="w-6.5 h-6.5 rounded-lg bg-white shadow-sm font-extrabold text-orange-600 flex items-center justify-center active:scale-90">-</button>
                      <span className="text-xs font-black text-slate-800 w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(index, 1)}
                        className="w-6.5 h-6.5 rounded-lg bg-orange-500 font-extrabold text-white flex items-center justify-center active:scale-90">+</button>
                    </div>
                    <button onClick={() => removeFromCart(index)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all active:scale-90 flex items-center justify-center">
                      <span className="text-sm">🗑️</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Split Checkout Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Coupon Panel */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Have a coupon?</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter coupon code (FLAT10 / WELCOME20)" 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-orange-500/50 focus:bg-white transition-all uppercase"
                      id="couponCodeInput"
                    />
                    <button onClick={() => {
                      const code = document.getElementById('couponCodeInput')?.value?.toUpperCase();
                      if (code === 'FLAT10') {
                        setAppliedCoupon({ code: 'FLAT10', discount: 100 });
                        toast.success('Coupon applied: FLAT10');
                      } else if (code === 'WELCOME20') {
                        setAppliedCoupon({ code: 'WELCOME20', discount: Math.round(cartSubtotal * 0.2) });
                        toast.success('Coupon applied: WELCOME20');
                      } else {
                        toast.error('Invalid coupon code');
                      }
                    }} className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-orange-500/10 cursor-pointer">Apply</button>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex justify-between text-center">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-2xl">🛡️</span>
                    <span className="text-[10px] font-black text-slate-800">Safe & Secure</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Payments</span>
                  </div>
                  <div className="w-px bg-slate-100" />
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-2xl">🛵</span>
                    <span className="text-[10px] font-black text-slate-800">Fast Delivery</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">On Time</span>
                  </div>
                  <div className="w-px bg-slate-100" />
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-2xl">🏆</span>
                    <span className="text-[10px] font-black text-slate-800">Best Quality</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Always</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary & Checkout */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Summary</h4>
                <div className="space-y-2.5 border-b border-slate-100 pb-4">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>Item Total</span>
                    <span>₹{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>GST (5%)</span>
                    <span>₹{finalGst}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-xs text-emerald-600 font-black">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>-₹{discount}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs font-black text-[#0B0F19]">
                  <span className="text-sm">Total Amount</span>
                  <span className="text-lg text-orange-600 font-black">₹{finalTotal}</span>
                </div>
                {appliedCoupon && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3.5 py-2 rounded-2xl text-[9px] font-black text-center uppercase tracking-wider">
                    🎉 You saved ₹{discount} on this order
                  </div>
                )}

                <button onClick={() => setStage('confirm')}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
                  <span>PLACE ORDER</span>
                  <span className="w-5 h-5 bg-white text-orange-500 rounded-full flex items-center justify-center text-[10px] font-black">➔</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </AppShell>
    );
  };

  /* ── STAGE: CONFIRM ORDER ── */
  const ConfirmStage = () => (
    <AppShell>
      <div className="flex items-center gap-3.5 mb-6">
        <button onClick={() => setStage('cart')} className="w-9 h-9 rounded-xl bg-white border border-slate-150 hover:bg-slate-50 flex items-center justify-center transition-all font-black text-slate-700 active:scale-95 shadow-sm text-xs">
          ←
        </button>
        <div>
          <h2 className="text-base font-black text-slate-800 leading-tight">{t.confirmOrder}</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Final details before checkout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none pb-20">
        <div className="space-y-4">
          {/* Table Details */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.tableLabel}</p>
              <p className="text-2xl font-black text-slate-800">{'Table ' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🍽️</div>
          </div>

          {/* Order Type Toggle */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-3.5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.orderType}</h4>
            <div className="flex gap-3 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl">
              {['Dine In', 'Take Away'].map(type => {
                const isActive = orderType === type;
                return (
                  <button key={type} onClick={() => setOrderType(type)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                      isActive 
                        ? 'bg-orange-500 text-white shadow-sm' 
                        : 'bg-transparent text-slate-400 hover:text-slate-700'
                    }`}>
                    {type === 'Dine In' ? t.dineIn : t.takeAway}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.specialInstructions}</h4>
            <textarea 
              value={specialInstructions} 
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder={t.siPlaceholder}
              className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-orange-500/50 focus:bg-slate-50/30 transition-all resize-none"
              rows="3"
            />
          </div>
        </div>

        {/* Billing details card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.billDetails}</h4>
            <div className="space-y-3 border-slate-100 pb-3 border-b">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{t.subtotal}</span>
                <span>₹{cartSubtotal}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-xs text-emerald-600 font-black">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{t.gstLabel}</span>
                <span>₹{finalGst}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{t.serviceChargeLabel}</span>
                <span>₹{finalService}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-black text-slate-800">
              <span className="text-sm">Grand Total</span>
              <span className="text-lg text-orange-600 font-black">₹{finalTotal}</span>
            </div>
          </div>

          <button onClick={placeOrder} disabled={isPlacingOrder}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6 sm:mt-0">
            {isPlacingOrder ? (
              <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Placing Order...</span></>
            ) : (
              <span>CONFIRM & PLACE ORDER</span>
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );

  /* ── STAGE: ORDER TRACKING ── */
  const TrackingStage = () => {
    const order = selectedOrder || placedOrders[0];
    const latest = order 
      ? (placedOrders.find(o => String(o._id || o.id) === String(order._id || order.id)) || order)
      : null;

    return (
      <AppShell>
        <div className="flex items-center justify-between mb-6 select-none">
          <div>
            <h2 className="text-xl font-black text-slate-800">{t.orderStatus}</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Track your order in real time</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStage('callWaiter')} className="px-4 py-2 border border-slate-150 rounded-xl text-slate-650 text-xs font-black bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
              Need Help?
            </button>
            <div className="px-3.5 py-2 bg-white border border-slate-155 rounded-xl flex items-center gap-1.5 text-xs font-black text-slate-800 shadow-sm">
              <span className="text-slate-400 font-bold">ID:</span>
              <span className="font-mono text-orange-600">{latest?.orderId || latest?.id || '#ORD1234'}</span>
            </div>
          </div>
        </div>

        {!latest ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
            <span className="text-6xl mb-4 select-none">📍</span>
            <h3 className="text-base font-black text-slate-800">No active order</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">Scan QR code and place order to track statuses.</p>
            <button onClick={() => setStage('menu')} className="mt-6 px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs uppercase tracking-wider">
              Start Ordering
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline on left (spans 2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-6">
              <div className="relative pl-6 border-l-2 border-slate-100 ml-3 space-y-6">
                {['Pending', 'Preparing', 'Ready', 'Served'].map((status) => {
                  const meta = STATUS_META[status];
                  const isCurrent = latest.status === status;
                  const isPast = meta.step < (STATUS_META[latest.status]?.step || 1);
                  const isActive = isCurrent || isPast;
                  
                  return (
                    <div key={status} className="relative flex gap-4 items-start">
                      {/* Dot indicator */}
                      <div className={`absolute -left-[35px] w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-md transition-all ${
                        isCurrent 
                          ? 'bg-orange-500 scale-110 shadow-orange-500/20 text-white' 
                          : isPast 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isPast ? (
                          <span className="text-xs font-black">✓</span>
                        ) : (
                          <span className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>

                      {/* Card */}
                      <div className={`flex-1 p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isCurrent 
                          ? 'border-orange-200 bg-orange-50/10 shadow-sm' 
                          : isPast 
                            ? 'border-slate-100 bg-slate-50/30' 
                            : 'border-slate-100/50 bg-white opacity-40'
                      }`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-black ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                              {meta.label}
                            </h3>
                            {isCurrent && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                            )}
                          </div>
                          <p className={`text-[11px] mt-1 ${isActive ? 'text-slate-500' : 'text-slate-400'} font-semibold`}>
                            {isCurrent ? meta.desc : isPast ? 'Completed successfully' : 'Pending status'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{meta.icon}</span>
                          {isPast && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-600 font-extrabold px-2.5 py-0.5 rounded-full">Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side Info Card */}
            <div className="space-y-6 select-none">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-1/2 -right-8 w-28 h-28 bg-orange-100/50 rounded-full blur-2xl pointer-events-none" />
                
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Order Summary</h3>
                  <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                    {latest.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="font-extrabold text-slate-700">{item.qty}x {item.name}</span>
                        <span className="font-black text-slate-800">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4.5 mt-5 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Amount</p>
                    <p className="text-xl font-black text-orange-600 mt-0.5">₹{latest.total}</p>
                  </div>
                  <div className="w-16 h-16 bg-[#FFF7ED] rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                    🛍️
                  </div>
                </div>
              </div>

              {/* Alert Message */}
              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4.5 flex gap-3 text-blue-800 shadow-inner">
                <span className="text-xl shrink-0">🛡️</span>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider mb-0.5">Your order is safe!</h4>
                  <p className="text-[10px] text-blue-700 font-semibold leading-relaxed">We do not share your physical location and use high encryption protocols.</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3.5">
                <button onClick={() => {
                  const check = confirm('Cancel this order?');
                  if (check) toast.success('Cancellation request sent');
                }} className="py-3.5 border border-slate-200 hover:border-slate-350 text-slate-650 font-black rounded-2xl text-xs bg-white hover:bg-slate-50 transition-all cursor-pointer active:scale-95 shadow-sm">
                  Cancel Order
                </button>
                <button onClick={() => {
                  latest.items.forEach(i => {
                    setCart(prev => {
                      const existing = prev.find(ci => ci.id === i.id);
                      if (existing) return prev.map(ci => ci.id === i.id ? { ...ci, qty: ci.qty + i.qty } : ci);
                      return [...prev, { ...i, qty: i.qty, customizations: {}, specialNote: '' }];
                    });
                  });
                  setStage('cart');
                  toast.success('🛒 Items added back to cart for reorder!');
                }} className="py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-xs transition-all cursor-pointer active:scale-95 shadow-md shadow-orange-500/10">
                  Reorder
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button onClick={() => setStage('bill')} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xs transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10">
                  🧾 View Full Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    );
  };

  /* ── STAGE: BILL ── */
  const BillStage = () => {
    const order = selectedOrder || placedOrders[0];
    return (
      <AppShell>
        <div className="flex items-center gap-3.5 mb-6 select-none">
          <button onClick={() => setStage('tracking')} className="w-9 h-9 rounded-xl bg-white border border-slate-150 hover:bg-slate-50 flex items-center justify-center transition-all font-black text-slate-700 active:scale-95 shadow-sm text-xs">
            ←
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 leading-tight">{t.billSummary}</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Review summary and cashier billing instructions</p>
          </div>
        </div>

        <div className="max-w-md mx-auto bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative overflow-hidden select-none mb-20">
          <div className="absolute top-1/2 -left-3.5 w-7 h-7 bg-[#F8FAFC] border border-slate-100 rounded-full z-10 shadow-inner" />
          <div className="absolute top-1/2 -right-3.5 w-7 h-7 bg-[#F8FAFC] border border-slate-100 rounded-full z-10 shadow-inner" />
          
          <div className="text-center mb-6 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 bg-[#FFF7ED] rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
              <span className="text-3xl">🧾</span>
            </div>
            <h3 className="text-base font-black text-slate-800">Payment Invoice</h3>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">ID: {order?.orderId || order?.id || '#ORD1234'}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{order?.date || fmtDate()} · {order?.timestamp || fmtTime()}</p>
          </div>

          <div className="space-y-2.5 mb-4">
            {(order?.items || cart).map((item, i) => (
              <div key={i} className="flex justify-between text-xs font-semibold text-slate-650">
                <span>{item.qty}x {item.name}</span>
                <span>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-slate-200 my-4" />
          
          <div className="space-y-1.5 mb-4 text-xs font-semibold text-slate-500">
            <div className="flex justify-between"><span>{t.subtotal}</span><span>₹{order?.subtotal || cartSubtotal}</span></div>
            <div className="flex justify-between"><span>{t.gstLabel}</span><span>₹{order?.gst || finalGst}</span></div>
            <div className="flex justify-between"><span>{t.serviceChargeLabel}</span><span>₹{serviceCharge(order?.subtotal || finalSubtotal)}</span></div>
          </div>

          <div className="flex justify-between items-center text-sm font-black text-slate-800 bg-[#FFF7ED] border border-orange-100 rounded-2xl p-4 mb-5 shadow-sm">
            <span>{t.total}</span>
            <span className="text-orange-600 text-lg font-black">₹{order?.total || finalTotal}</span>
          </div>

          <div className="bg-[#0B0F19] text-white rounded-2.5rem p-5 text-center shadow-lg">
            <span className="text-3xl mb-2.5 block select-none">💳</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">{t.payAtCashier}</p>
            <p className="text-[10px] text-slate-400 font-medium">{t.thankYou}</p>
          </div>

          <button onClick={() => setStage('feedback')} className="w-full mt-5 py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] cursor-pointer">
            ⭐ SUBMIT FEEDBACK
          </button>
        </div>
      </AppShell>
    );
  };

  /* ── STAGE: CALL WAITER ── */
  const CallWaiterStage = () => {
    const [requested, setRequested] = useState(false);
    const callWaiter = async () => {
      try { 
        await axios.post(`${API_URL}/orders/qr`, { 
          type: 'Request', 
          requestType: 'Call Waiter', 
          table: tableInfo.name, 
          items: [{ id: '0', name: 'Call Waiter', qty: 1, price: 0 }], 
          subtotal: 0, 
          gst: 0, 
          total: 0, 
          guestCount: 1 
        }); 
      } catch {}
      setRequested(true);
      setTimeout(() => setStage('tracking'), 3000);
    };

    return (
      <AppShell>
        <div className="flex items-center gap-3.5 mb-6 select-none">
          <button onClick={() => setStage('tracking')} className="w-9 h-9 rounded-xl bg-white border border-slate-150 hover:bg-slate-50 flex items-center justify-center transition-all font-black text-slate-700 active:scale-95 shadow-sm text-xs">
            ←
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 leading-tight">{t.callWaiter}</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Summon help to your table</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 max-w-sm mx-auto select-none pt-12">
          {!requested ? (
            <div className="text-center space-y-6">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-2 border-blue-100 rounded-full flex items-center justify-center mx-auto shadow-xl relative animate-pulse">
                <span className="text-5xl relative z-10">🙋</span>
                <span className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-800">{t.needAssistance}</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">{t.waiterNote}</p>
              </div>
              <button onClick={callWaiter} className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-650 hover:from-blue-600 hover:to-indigo-750 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-blue-500/15 transition-all active:scale-95 cursor-pointer uppercase tracking-wider">
                Call Waiter Now
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <span className="text-4xl text-emerald-600 font-bold">✓</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-emerald-600">Staff Summoned!</h3>
                <p className="text-xs text-slate-400 font-semibold">Our floor waiter is heading to your table.</p>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    );
  };

  /* ── STAGE: OFFERS ── */
  const OffersStage = () => (
    <AppShell>
      <div className="flex items-center gap-3.5 mb-6 select-none">
        <button onClick={() => setStage('menu')} className="w-9 h-9 rounded-xl bg-white border border-slate-150 hover:bg-slate-50 flex items-center justify-center transition-all font-black text-slate-700 active:scale-95 shadow-sm text-xs">
          ←
        </button>
        <div>
          <h2 className="text-base font-black text-slate-800 leading-tight">{t.offersForYou}</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Apply coupons for high savings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 select-none pb-20">
        {/* Card 1 */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between gap-6 border-2 border-dashed border-white/20">
          <div className="absolute top-1/2 -left-3.5 w-7 h-7 bg-[#F8FAFC] rounded-full z-10" />
          <div className="absolute top-1/2 -right-3.5 w-7 h-7 bg-[#F8FAFC] rounded-full z-10" />
          
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] bg-white/25 border border-white/25 px-3 py-1 rounded-full uppercase tracking-widest font-black">FLAT10</span>
              <h3 className="text-xl font-black mt-4">Get ₹100 OFF</h3>
              <p className="text-xs text-white/95 font-bold mt-1">Valid on orders above ₹500</p>
            </div>
            <span className="text-5xl block animate-bounce">🎉</span>
          </div>
          
          <button onClick={() => { setAppliedCoupon({ code: 'FLAT10', discount: 100 }); setStage('cart'); toast.success('Coupon Applied: FLAT10'); }} 
            className="w-full py-3 bg-white hover:bg-slate-50 text-orange-600 font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md uppercase tracking-wider cursor-pointer">
            {t.apply}
          </button>
        </div>

        {/* Card 2 */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between gap-6 border-2 border-dashed border-white/20">
          <div className="absolute top-1/2 -left-3.5 w-7 h-7 bg-[#F8FAFC] rounded-full z-10" />
          <div className="absolute top-1/2 -right-3.5 w-7 h-7 bg-[#F8FAFC] rounded-full z-10" />
          
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] bg-white/25 border border-white/25 px-3 py-1 rounded-full uppercase tracking-widest font-black">WELCOME20</span>
              <h3 className="text-xl font-black mt-4">Get 20% OFF</h3>
              <p className="text-xs text-white/95 font-bold mt-1">Valid on your first order discount</p>
            </div>
            <span className="text-5xl block animate-bounce">🎁</span>
          </div>
          
          <button onClick={() => { setAppliedCoupon({ code: 'WELCOME20', discount: Math.round(cartSubtotal * 0.2) }); setStage('cart'); toast.success('Coupon Applied: WELCOME20'); }} 
            className="w-full py-3 bg-white hover:bg-slate-50 text-emerald-600 font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md uppercase tracking-wider cursor-pointer">
            {t.apply}
          </button>
        </div>
      </div>
    </AppShell>
  );

  /* ── STAGE: FEEDBACK ── */
  const FeedbackStage = () => (
    <AppShell>
      <div className="flex items-center justify-between mb-6 select-none">
        <div>
          <h2 className="text-xl font-black text-slate-800">{t.feedback}</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">We highly value your restaurant suggestions</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 max-w-xl mx-auto shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-6 select-none pb-20">
        <div className="text-center">
          <span className="text-5xl block mb-2 animate-bounce">⭐</span>
          <h3 className="text-base font-black text-slate-800">{t.howWasExp}</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{t.veryGood}</p>
        </div>

        <div className="space-y-5">
          {[
            { key: 'foodQuality', label: t.foodQuality, icon: '🍽' }, 
            { key: 'service', label: t.service, icon: '🙋' }, 
            { key: 'ambience', label: t.ambience, icon: '✨' }
          ].map(cat => (
            <div key={cat.key} className="space-y-2">
              <div className="flex items-center gap-2 pl-1">
                <span className="text-base">{cat.icon}</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.label}</p>
              </div>
              <div className="flex justify-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRatings(p => ({ ...p, [cat.key]: n }))}
                    className={`w-11 h-11 rounded-xl transition-all flex items-center justify-center shadow-sm text-lg active:scale-90 ${ratings[cat.key] >= n ? 'bg-orange-500 text-white scale-110' : 'bg-white text-slate-300 hover:text-slate-450 border border-slate-150'}`}>★</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.comments}</p>
          <textarea 
            value={feedbackText} 
            onChange={e => setFeedbackText(e.target.value)} 
            placeholder={t.commentsPlaceholder} 
            className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-orange-500/50 focus:bg-slate-50/20 transition-all resize-none" 
            rows="3"
          />
        </div>

        <button onClick={submitFeedback} disabled={!ratings.foodQuality || !ratings.service || !ratings.ambience}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-xs transition-all uppercase tracking-widest cursor-pointer shadow-md shadow-orange-500/10 active:scale-95">
          {t.submitFeedback}
        </button>
      </div>
    </AppShell>
  );

  /* ── STAGE: THANK YOU ── */
  const ThankYouStage = () => (
    <div className="flex flex-col h-screen overflow-y-auto bg-gradient-to-br from-emerald-50 to-white justify-center items-center p-8 relative select-none">
      <div className="absolute top-10 left-10 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="text-center z-10 max-w-sm w-full space-y-6">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce relative">
          <span className="text-4xl text-emerald-600 font-bold font-sans">✓</span>
          <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-60" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800">{t.thankYouTitle}</h2>
          <p className="text-xs text-slate-400 font-bold leading-relaxed">{t.thankYouMsg}</p>
        </div>

        <div className="flex items-center justify-center gap-3.5 py-4">
          <span className="text-4xl animate-pulse">🍱</span>
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-white shadow" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 border-2 border-white shadow" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 border-2 border-white shadow" />
          </div>
          <span className="text-4xl animate-pulse">😊</span>
        </div>

        <button onClick={() => setStage('menu')} className="w-full py-4.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-orange-500/10 transition-all uppercase tracking-widest active:scale-95 cursor-pointer">
          {t.backToMenu}
        </button>
      </div>
    </div>
  );

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
