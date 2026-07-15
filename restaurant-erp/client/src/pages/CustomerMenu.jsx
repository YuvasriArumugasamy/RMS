import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import QRCode from 'react-qr-code';
import { toast } from 'react-toastify';
import MenuItemImage from '../components/MenuItemImage';
import logoImage from '../assets/Screenshot 2026-07-02 173735.png';
import bannerBgImage from '../assets/ChatGPT Image Jul 10, 2026, 06_08_46 PM.png';
import scanStepImg from '../assets/Screenshot 2026-07-11 201657.png';
import orderStepImg from '../assets/Screenshot 2026-07-11 201635.png';
import enjoyStepImg from '../assets/Screenshot 2026-07-11 201920.png';
import chefImage from '../assets/image.png';


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
  en: { title: 'Our Menu', welcome: 'Welcome! ', subtitle: 'Thank you for choosing us',
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
  ta: { title: 'எங்கள் மெனு', welcome: 'வரவேற்கிறோம்', subtitle: 'எங்களை தேர்ந்தெடுத்தற்கு நன்றி',
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
  const [stage, setStage] = useState('menu'); // welcome | menu | foodDetails | cart | confirm | tracking | bill | callWaiter | offers | feedback | thankYou
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Popular');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (itemId) => {
    setFavorites(prev => {
      if (prev.includes(itemId)) {
        toast.info('💔 Removed from Favorites');
        return prev.filter(id => id !== itemId);
      } else {
        toast.success('❤️ Added to Favorites!');
        return [...prev, itemId];
      }
    });
  };

  // ── Voice Order State ─────────────────────────────────────
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const voiceRecogRef = useRef(null);

  // ── Lifted Stage States to prevent focus loss ─────────────
  const [detailsQty, setDetailsQty] = useState(1);
  const [detailsCustom, setDetailsCustom] = useState({ extraCheese: false, noOnion: false, spicy: false });
  const [waiterRequested, setWaiterRequested] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll to top of the content area whenever the stage changes
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [stage]);

  const handleRazorpayPayment = async (order) => {
    if (!order || isProcessingPayment) return;
    if (typeof window.Razorpay === 'undefined') {
      toast.error('Razorpay SDK failed to load. Please check your internet connection or reload the page.');
      return;
    }
    setIsProcessingPayment(true);
    try {
      // 1. Fetch Razorpay config
      const configRes = await axios.get(`${API_URL}/payments/config`);
      if (!configRes.data.success) {
        throw new Error('Could not load payment configuration.');
      }
      const keyId = configRes.data.keyId;

      // 2. Create order on backend
      const createRes = await axios.post(`${API_URL}/payments/create-order`, {
        orderId: order._id || order.id,
      });

      if (!createRes.data.success) {
        throw new Error(createRes.data.message || 'Could not initiate payment.');
      }

      const rzpOrder = createRes.data.data;

      // 3. Configure Razorpay options
      const options = {
        key: keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'Restaurant ERP',
        description: `Order #${order.orderId || order._id}`,
        order_id: rzpOrder.id,
        handler: async function (response) {
          try {
            toast.info('Verifying payment signature...');
            const verifyRes = await axios.post(`${API_URL}/payments/verify-payment`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id || order.id,
            });

            if (verifyRes.data.success) {
              const updatedOrder = { 
                ...order, 
                billingStatus: 'Paid', 
                status: 'Completed',
                paymentMethod: verifyRes.data.data.paymentMethod || 'UPI',
                paidAt: verifyRes.data.data.paidAt
              };
              
              setPlacedOrders(prev => prev.map(o => 
                String(o._id || o.id) === String(order._id || order.id) ? updatedOrder : o
              ));
              setSelectedOrder(updatedOrder);
              
              toast.success('🎉 Payment successful! Thank you.');
            } else {
              toast.error('❌ Signature verification failed.');
            }
          } catch (verifyErr) {
            console.error('Verify payment error:', verifyErr);
            toast.error('❌ Error verifying payment: ' + (verifyErr.response?.data?.message || verifyErr.message));
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: 'Customer',
          contact: order.customerPhone || '',
        },
        theme: {
          color: '#F97316',
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay initialization error:', err);
      toast.error('❌ Payment Error: ' + (err.response?.data?.message || err.message));
      setIsProcessingPayment(false);
    }
  };

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
    // 1. Language transliteration dictionary maps
    const TAMIL_MAP = {
      'பிரியாணி': 'biryani', 'பிரியானி': 'biryani', 'சிக்கன்': 'chicken', 'பட்டர்': 'butter',
      'நாண்': 'naan', 'நான்': 'naan', 'பனீர்': 'paneer', 'பன்னீர்': 'paneer', 'டிக்கா': 'tikka',
      'சோடா': 'soda', 'லைம்': 'lime', 'ப்ரெஷ்': 'fresh', 'பிரெஷ்': 'fresh', 'மீன்': 'fish',
      'பிரைஸ்': 'fries', 'ஃப்ரெஞ்ச்': 'french', 'பெப்சி': 'pepsi', 'கோலா': 'cola', 'நூடுல்ஸ்': 'noodles',
      'சட்னி': 'chutney', 'ரோட்டி': 'roti', 'தோசை': 'dosa', 'இட்லி': 'idli', 'வடை': 'vada', 'சாம்பார்': 'sambar',
      'லஸ்ஸி': 'lassi', 'லசி': 'lassi', 'ஜூஸ்': 'juice'
    };

    const HINDI_MAP = {
      'बिरयानी': 'biryani', 'चिकन': 'chicken', 'बटर': 'butter', 'नान': 'naan', 'पनीर': 'paneer',
      'टिक्का': 'tikka', 'सोडा': 'soda', 'लाइम': 'lime', 'फ्रेश': 'fresh', 'फिश': 'fish',
      'फ्राई': 'fry', 'फ्राइज': 'fries', 'पेप्सी': 'pepsi', 'कोला': 'cola', 'नूडल्स': 'noodles',
      'चटनी': 'chutney', 'रोटी': 'roti', 'डोसा': 'dosa', 'इडली': 'idli', 'वड़ा': 'vada', 'सांबर': 'sambar',
      'लस्सी': 'lassi', 'जूस': 'juice'
    };

    const numWords = { 
      one:1, a:1, an:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
      oru:1, rendu:2, moonu:3, naangu:4, aindhu:5, ek:1, do:2, teen:3, char:4, paanch:5,
      'ஒரு': 1, 'ஒன்று': 1, 'ரெண்டு': 2, 'இரண்டு': 2, 'மூணு': 3, 'மூன்று': 3, 'நாலு': 4, 'நான்கு': 4, 'அஞ்சு': 5, 'ஐந்து': 5,
      'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5
    };

    // Preprocess transcript by replacing Tamil/Hindi words with English equivalent representations
    let processedText = transcript.toLowerCase();
    
    // Replace Tamil keywords
    Object.entries(TAMIL_MAP).forEach(([tamilWord, englishWord]) => {
      processedText = processedText.replace(new RegExp(tamilWord, 'g'), englishWord);
    });

    // Replace Hindi keywords
    Object.entries(HINDI_MAP).forEach(([hindiWord, englishWord]) => {
      processedText = processedText.replace(new RegExp(hindiWord, 'g'), englishWord);
    });

    const words = processedText.split(/\s+/);
    let matched = [];

    // Parse preprocessed text against menu items via keyword lookup
    words.forEach((word, idx) => {
      if (numWords[word] || parseInt(word)) return;
      if (word.length < 3) return;

      const bestMatch = menu.find(item => item.name.toLowerCase().includes(word));
      if (bestMatch) {
        let qty = 1;
        if (idx > 0) {
          const prev = words[idx - 1];
          qty = parseInt(prev) || numWords[prev] || 1;
        }
        if (!matched.some(m => m.item.id === bestMatch.id)) {
          matched.push({ item: bestMatch, qty });
        }
      }
    });

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

        {/* Close Button */}
        <button 
          onClick={() => setVoiceOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

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
      const updateOrder = o => String(o._id || o.id) === String(update.id || update._id)
        ? { ...o, status: update.status, billingStatus: update.billingStatus || o.billingStatus }
        : o;
      setPlacedOrders(prev => prev.map(updateOrder));
      setSelectedOrder(prev => prev ? updateOrder(prev) : null);
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
          setCategories(['All', 'Favorites', ...new Set(items.map(i => i.category))]);
          return;
        }
      } catch {}
      const items = JSON.parse(localStorage.getItem('menuItems') || '[]').filter(m => m.available);
      setMenu(items);
      setCategories(['All', 'Favorites', ...new Set(items.map(i => i.category))]);
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
    if (activeCategory === 'Favorites') {
      return favorites.includes(item.id || item._id) && item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const matchCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  }).sort((a, b) => {
    const isNonVegA = ['chicken', 'biryani', 'fish', 'prawn', 'meat', 'mutton', 'egg'].some(keyword => a.name.toLowerCase().includes(keyword));
    const isNonVegB = ['chicken', 'biryani', 'fish', 'prawn', 'meat', 'mutton', 'egg'].some(keyword => b.name.toLowerCase().includes(keyword));
    const ratingA = (a.name.charCodeAt(0) % 5) * 0.2 + 4.1;
    const ratingB = (b.name.charCodeAt(0) % 5) * 0.2 + 4.1;
    const prepTimeA = PREP_TIMES[a.category] ?? PREP_TIMES.default;
    const prepTimeB = PREP_TIMES[b.category] ?? PREP_TIMES.default;
    const isSpecialA = a.isCombo || a.name.toLowerCase().includes('naan') || a.name.toLowerCase().includes('special');
    const isSpecialB = b.isCombo || b.name.toLowerCase().includes('naan') || b.name.toLowerCase().includes('special');

    switch (sortBy) {
      case 'Best Selling':
        return (b.name.length * 3 + b.price) - (a.name.length * 3 + a.price);
      case 'New Arrivals':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'Price: Low to High':
        return a.price - b.price;
      case 'Price: High to Low':
        return b.price - a.price;
      case 'Highest Rated':
        return ratingB - ratingA;
      case 'Fastest to Prepare':
        return prepTimeA - prepTimeB;
      case 'Veg First':
        if (isNonVegA && !isNonVegB) return 1;
        if (!isNonVegA && isNonVegB) return -1;
        return 0;
      case 'Non-Veg First':
        if (isNonVegA && !isNonVegB) return -1;
        if (!isNonVegA && isNonVegB) return 1;
        return 0;
      case "Today's Special":
        if (isSpecialA && !isSpecialB) return -1;
        if (!isSpecialA && isSpecialB) return 1;
        return 0;
      case 'Popular':
      default:
        return 0;
    }
  });

  const renderMenuStage = () => (
    <>
      <div 
        className="relative -mx-6 sm:mx-0 rounded-none rounded-b-[2.2rem] sm:rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-xl mb-6 mt-0 sm:mt-6 bg-cover bg-center select-none"
        style={{ backgroundImage: `url(${bannerBgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-0" />
        
        <div className="flex items-center justify-between mb-6 select-none relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden text-white text-2xl hover:text-orange-400 transition-colors focus:outline-none cursor-pointer"
            >
              ☰
            </button>
            <span className="inline-block border border-orange-400 text-orange-400 text-[10px] font-bold tracking-wide rounded-full px-4 py-1.5 uppercase">
              TABLE {tableInfo.name.match(/\d+/)?.[0] || tableId}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {voiceSupported && (
              <button 
                onClick={() => { setVoiceTranscript(''); setVoiceStatus(''); setVoiceOpen(true); }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs font-black rounded-full px-4 py-2 hover:from-orange-600 hover:to-orange-500 shadow-lg shadow-orange-500/10 transition-all active:scale-95 cursor-pointer select-none"
              >
                🎤 Voice
              </button>
            )}

          </div>
        </div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Good Food,<br />
              <span className="text-orange-400">Great</span> Mood!
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Explore our delicious menu and place your order</p>
            
            <div className="flex gap-2 w-full mt-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white text-slate-800 placeholder-slate-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500 transition-all shadow-md border border-slate-100/50"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
              </div>
              <button className="p-3.5 bg-orange-500 hover:bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-[#F8FAFC] pt-3 pb-3 -mx-6 px-6 flex gap-2 overflow-x-auto scrollbar-none mb-6 select-none border-b border-slate-100/50">
        {categories.map(c => {
          const categorySvgIcons = {
            All: (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.1" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.1" />
              </svg>
            ),
            Favorites: (
              <svg className="w-4.5 h-4.5 text-red-500 fill-red-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            ),
            Beverages: (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <line x1="6" x2="6" y1="2" y2="8" />
              </svg>
            ),
            Bread: (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M7 20h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3z" />
                <path d="M7 8h10M7 12h10M7 16h10" />
              </svg>
            ),
            'Main Course': (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 17h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2z" />
                <path d="M5 17a7 7 0 0 1 14 0" />
                <circle cx="12" cy="10" r="1" />
              </svg>
            ),
            Starters: (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M2 12h20M12 2v10" />
                <path d="M2 12a10 10 0 0 0 20 0Z" />
              </svg>
            ),
            Desserts: (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 7v10l10 5 10-5V7" />
                <circle cx="12" cy="12" r="1.5" />
              </svg>
            )
          };
          const isActive = activeCategory === c;
          return (
            <button key={c} onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 flex items-center gap-2 px-5.5 py-3 rounded-2xl text-[11px] font-black transition-all duration-300 transform select-none border-2 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-[0_8px_20px_rgba(249,115,22,0.25)] scale-105' 
                  : 'bg-white text-slate-650 border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 active:scale-95'
              }`}>
              <span className={isActive ? 'text-white' : 'text-gray-500'}>
                {categorySvgIcons[c] || (
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center select-none flex-wrap gap-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
            <span className="text-orange-500">✦</span> {activeCategory === 'Favorites' ? 'My Favorites' : 'Popular Dishes'}
          </h3>
          <div className="flex items-center gap-3 relative">
            <button 
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-slate-50 cursor-pointer transition-colors select-none"
            >
              Sort by: {sortBy} 
              <svg className={`w-3.5 h-3.5 transition-transform duration-205 ${isSortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {isSortDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsSortDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl shadow-xl border border-slate-100/60 py-3.5 z-40 flex flex-col gap-0.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {[
                    { label: 'Popular', icon: '⭐' },
                    { label: 'Best Selling', icon: '🔥' },
                    { label: 'New Arrivals', icon: '🆕' },
                    { label: 'Price: Low to High', icon: '📈' },
                    { label: 'Price: High to Low', icon: '📉' },
                    { label: 'Highest Rated', icon: '⭐' },
                    { label: 'Fastest to Prepare', icon: '🕒' },
                    { label: 'Veg First', icon: '🌱' },
                    { label: 'Non-Veg First', icon: '🍗' },
                    { label: "Today's Special", icon: '🎁' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setSortBy(item.label);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-3 text-xs font-semibold select-none cursor-pointer transition-all ${
                        sortBy === item.label 
                          ? 'bg-orange-50/50 text-orange-500' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {sortBy === item.label && (
                        <svg className="w-4 h-4 text-orange-500 font-bold" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-full p-2.5 transition-colors cursor-pointer shadow-sm ${
                viewMode === "grid"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-full p-2.5 transition-colors cursor-pointer shadow-sm ${
                viewMode === "list"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 5.25h16.5m-16.5-10.5h16.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`grid gap-5 ${
          viewMode === "grid"
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        }`}>
          {filteredMenu.map(item => {
            const isNonVeg = ['chicken', 'biryani', 'fish', 'prawn', 'meat', 'mutton', 'egg'].some(keyword => item.name.toLowerCase().includes(keyword));
            const qtyInCart = cart.find(ci => ci.id === item.id)?.qty || 0;
            
            return viewMode === 'grid' ? (
              <div key={item.id} onClick={() => { setSelectedFood(item); setStage('foodDetails'); }}
                className="bg-white rounded-[2.2rem] border-2 border-slate-100/80 p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.012)] hover:shadow-[0_20px_50px_rgba(249,115,22,0.08)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between relative group select-none overflow-hidden">
                
                <div className="flex justify-between items-center select-none mb-3.5">
                  {item.category === 'Desserts' ? (
                    <span className="text-[8.5px] bg-orange-50 text-orange-700 font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-orange-100 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Bestseller
                    </span>
                  ) : isNonVeg ? (
                    <span className="text-[8.5px] bg-red-50/60 text-red-700 font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-red-100/60 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Spicy
                    </span>
                  ) : (
                    <span className="text-[8.5px] bg-emerald-50/60 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-emerald-100/60 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Veg
                    </span>
                  )}
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id || item._id); }} 
                    className="transition-all p-1.5 bg-slate-50/80 hover:bg-red-50 rounded-full active:scale-90 flex items-center justify-center border border-slate-100 shadow-sm group/fav"
                  >
                    <svg 
                      className={`w-3.5 h-3.5 transition-all duration-300 ${
                        favorites.includes(item.id || item._id) 
                          ? 'text-red-500 fill-red-500 scale-105' 
                          : 'text-slate-400 fill-none group-hover/fav:text-red-500 group-hover/fav:fill-red-500 group-hover/fav:scale-110'
                      }`} 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                </div>

                <div className="mb-3">
                  <div className="w-full h-32 flex items-center justify-center overflow-hidden relative rounded-2xl bg-slate-50 border border-slate-100/60 transition-all duration-300">
                    <MenuItemImage src={item.image} alt={item.name}
                      imgClassName="w-full h-full object-contain p-2 group-hover:scale-108 transition-transform duration-500"
                      emojiClassName="text-5xl" />
                    <span className="absolute bottom-3 right-3 bg-orange-500 text-white text-[10.5px] font-black px-3.5 py-1.5 rounded-full shadow-md select-none">
                      ₹{item.price}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-[13px] font-black text-slate-800 line-clamp-1 leading-tight group-hover:text-orange-500 transition-colors duration-200">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-normal line-clamp-2">{item.description || 'Delicious dish cooked to absolute perfection.'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 bg-slate-50/60 border border-slate-155/60 rounded-xl p-0.5 shadow-inner">
                    <button 
                      onClick={() => {
                        const idx = cart.findIndex(ci => ci.id === item.id);
                        if (idx > -1) {
                          if (cart[idx].qty === 1) removeFromCart(idx);
                          else updateQty(idx, -1);
                        }
                      }} 
                      className={`w-7 h-7 rounded-xl bg-white shadow-sm font-extrabold flex items-center justify-center transition-all active:scale-95 ${
                        qtyInCart > 0 ? 'text-orange-500 hover:bg-slate-50' : 'text-slate-300 cursor-not-allowed'
                      }`}
                      disabled={qtyInCart === 0}
                    >
                      -
                    </button>
                    <span className="text-[11px] font-black text-slate-800 px-1 w-6 text-center select-none">
                      {qtyInCart > 0 ? qtyInCart : 1}
                    </span>
                    <button 
                      onClick={() => {
                        const idx = cart.findIndex(ci => ci.id === item.id);
                        if (idx > -1) {
                          updateQty(idx, 1);
                        } else {
                          addToCart(item);
                          toast.success(`🛒 Added ${item.name}!`);
                        }
                      }} 
                      className="w-7 h-7 rounded-xl bg-white shadow-sm font-extrabold text-orange-500 hover:bg-slate-50 flex items-center justify-center transition-all active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      if (qtyInCart === 0) {
                        addToCart(item);
                        toast.success(`🛒 Added ${item.name}!`);
                      } else {
                        setStage('cart');
                      }
                    }}
                    className={`px-4.5 py-2.5 flex items-center gap-1.5 text-[9.5px] font-black rounded-2xl cursor-pointer transition-all active:scale-95 shadow-sm uppercase tracking-wider ${
                      qtyInCart > 0 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                    <span>{qtyInCart > 0 ? 'ADDED' : 'ADD'}</span>
                  </button>
                </div>

              </div>
            ) : (
              <div key={item.id} onClick={() => { setSelectedFood(item); setStage('foodDetails'); }}
                className="bg-white rounded-[2rem] border-2 border-slate-100/80 p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.035)] transition-all cursor-pointer flex gap-5 items-center relative select-none">
                
                <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                  <MenuItemImage src={item.image} alt={item.name}
                    imgClassName="w-full h-full object-contain p-2"
                    emojiClassName="text-4xl" />
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 select-none">
                    <div className="bg-white p-0.5 rounded border border-slate-100 shadow-sm flex items-center justify-center w-5 h-5">
                      <div className={`w-3 h-3 border flex items-center justify-center rounded-sm ${isNonVeg ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50'}`}>
                        <div className={`w-1 h-1 rounded-full ${isNonVeg ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      </div>
                    </div>
                    
                    {item.category === 'Desserts' ? (
                      <span className="text-[8.5px] bg-orange-50 text-orange-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Bestseller</span>
                    ) : isNonVeg ? (
                      <span className="text-[8.5px] bg-red-50 text-red-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Spicy</span>
                    ) : (
                      <span className="text-[8.5px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Veg</span>
                    )}
                  </div>
                  
                  <h4 className="text-xs font-black text-slate-800 line-clamp-1">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{item.description || 'Delicious dish cooked to absolute perfection.'}</p>
                </div>
                
                <div className="flex flex-col items-end gap-3.5 shrink-0 select-none">
                  <span className="text-xs font-black text-orange-600">₹{item.price}</span>
                  
                  {qtyInCart > 0 ? (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl p-0.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => {
                        const idx = cart.findIndex(ci => ci.id === item.id);
                        if (idx > -1) {
                          if (cart[idx].qty === 1) removeFromCart(idx);
                          else updateQty(idx, -1);
                        }
                      }} className="w-6 h-6 rounded-lg bg-white shadow-sm font-extrabold text-orange-600 flex items-center justify-center active:scale-90">-</button>
                      <span className="text-[10px] font-black text-slate-800 px-1 w-4 text-center">{qtyInCart}</span>
                      <button onClick={() => {
                        const idx = cart.findIndex(ci => ci.id === item.id);
                        updateQty(idx, 1);
                      }} className="w-6 h-6 rounded-lg bg-orange-500 font-extrabold text-white flex items-center justify-center active:scale-90">+</button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); addToCart(item); toast.success(`🛒 Added ${item.name}!`); }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black rounded-xl transition-all active:scale-95 flex items-center gap-1">
                      <span>ADD</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
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
    </>
  );

  const FoodDetailsStage = () => {
    const item = selectedFood;
    if (!item) return null;

    const handleAddToCart = () => {
      // Find if item already in cart with same customizations
      const existingIndex = cart.findIndex(ci => 
        ci.id === item.id && 
        JSON.stringify(ci.customizations || {}) === JSON.stringify(detailsCustom)
      );

      if (existingIndex > -1) {
        const updated = [...cart];
        updated[existingIndex].qty += detailsQty;
        setCart(updated);
      } else {
        const cartItem = {
          ...item,
          qty: detailsQty,
          customizations: detailsCustom,
          specialNote: ''
        };
        setCart(prev => [...prev, cartItem]);
      }
      setStage('menu');
      toast.success(`🛒 Added ${detailsQty}x ${item.name} to cart!`);
    };

    return (
      <>
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
          <div className="bg-white rounded-[2.2rem] border border-slate-100 overflow-hidden shadow-md flex flex-col justify-center items-center p-8 h-80 relative select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 rounded-full blur-2xl pointer-events-none" />
            <MenuItemImage src={item.image} alt={item.name}
              imgClassName="w-full h-full object-contain p-4 rounded-[2.2rem]"
              emojiClassName="text-9xl drop-shadow-2xl animate-bounce" />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 select-none">
              <span className="bg-slate-900/90 backdrop-blur-sm text-white text-xs font-black tracking-wider shadow-lg px-4 py-2 rounded-2xl border border-white/10">
                ₹{item.price}
              </span>
              <span className="bg-orange-500 text-white text-[10px] font-black tracking-wider shadow-lg px-4 py-2 rounded-2xl flex items-center gap-1">
                ⭐ 4.5
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[2.2rem] p-6 border border-slate-100 shadow-sm space-y-4">
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

            <div className="bg-white rounded-[2.2rem] p-6 border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.customize}</h4>
              <div className="space-y-2.5">
                {[
                  { key: 'extraCheese', label: t.extraCheese, price: '₹50', icon: '🧀' },
                  { key: 'noOnion', label: t.noOnion, price: '₹0', icon: '🧅' },
                  { key: 'spicy', label: t.spicy, price: '₹0', icon: '🌶️' },
                ].map(opt => {
                  const isChecked = detailsCustom[opt.key];
                  return (
                    <div key={opt.key} onClick={() => setDetailsCustom(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] select-none ${
                        isChecked 
                          ? 'border-orange-500 bg-orange-50/20 shadow-sm' 
                          : 'border-slate-150 bg-slate-50/30 hover:bg-slate-50/70'
                      }`}>
                      <div className="flex items-center gap-3.5">
                        <span className="text-base">{opt.icon}</span>
                        <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-slate-800' : 'text-slate-600'}`}>{opt.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {opt.price !== '₹0' && (
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100/50 border border-slate-200 px-2 py-0.5 rounded-lg">{opt.price}</span>
                        )}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isChecked ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <span className="text-[9px] font-black">✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity select & Buy Block */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-550 uppercase tracking-wider">{t.qty}</span>
                <div className="flex items-center gap-3 bg-slate-100/75 rounded-2xl px-2.5 py-1">
                  <button onClick={() => setDetailsQty(p => Math.max(1, p - 1))}
                    className="w-7.5 h-7.5 rounded-xl bg-white shadow-sm hover:shadow text-orange-600 font-extrabold flex items-center justify-center transition-all cursor-pointer">-</button>
                  <span className="text-sm font-black text-slate-800 w-5 text-center">{detailsQty}</span>
                  <button onClick={() => setDetailsQty(p => p + 1)}
                    className="w-7.5 h-7.5 rounded-xl bg-orange-500 text-white shadow-md font-extrabold flex items-center justify-center transition-all cursor-pointer">+</button>
                </div>
              </div>

              <button onClick={handleAddToCart}
                className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-orange-500/10 transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                <span>{t.addToCart}</span>
                <span>|</span>
                <span>₹{item.price * detailsQty}</span>
              </button>
            </div>

          </div>
        </div>
      </>
    );
  };

  const CartStage = () => {
    const freeDessertThreshold = 200;
    const progressPercent = Math.min(100, Math.round((cartSubtotal / freeDessertThreshold) * 100));
    const neededAmount = Math.max(0, freeDessertThreshold - cartSubtotal);

    return (
      <>
        <div className="flex items-center justify-between mb-6 select-none">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-orange-600 bg-clip-text text-transparent">{t.myCart}</h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Manage items & review summary</p>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setStage('menu')} className="px-4 py-2 border border-orange-500/25 rounded-xl text-orange-500 text-xs font-black bg-orange-500/5 hover:bg-orange-500/10 transition-all duration-300 shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer">
              <span>➕</span>
              <span>Add More Items</span>
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
            <span className="text-6xl mb-4 animate-bounce block select-none">🛒</span>
            <h3 className="text-base font-black text-slate-800">Cart is Empty</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">Browse our delicious menu and add some food here!</p>
            <button onClick={() => setStage('menu')} className="mt-6 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer">
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {/* Free Dessert Progress Bar */}
            <div className="bg-gradient-to-br from-orange-50/80 via-white to-amber-50/30 border border-orange-100 rounded-3xl p-5 flex items-center justify-between gap-5 shadow-[0_8px_30px_rgba(251,146,60,0.04)] select-none transition-all duration-300 hover:shadow-[0_8px_30px_rgba(251,146,60,0.08)]">
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  <p className="text-[11.5px] text-slate-800 font-extrabold tracking-wide">
                    {neededAmount > 0 
                      ? <>Add items worth <span className="text-orange-600 font-black">₹{neededAmount}</span> more to get a <span className="text-orange-600 font-black">FREE Dessert</span>!</>
                      : '🎉 You qualify for a FREE Dessert!'}
                  </p>
                </div>
                <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-[2px]">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-wider">
                  <span>₹{cartSubtotal} Spent</span>
                  <span>Goal: ₹{freeDessertThreshold}</span>
                </div>
              </div>
              <div className="w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden animate-bounce">
                <img src={chefImage} alt="Chef" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={index} className="bg-white rounded-[2rem] p-3.5 sm:p-4.5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:-translate-y-[2px] transition-all duration-300 flex flex-row items-center justify-between gap-3 sm:gap-4">
                  {/* Left side: Image and Info */}
                  <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 sm:w-18 sm:h-18 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner relative group">
                      <MenuItemImage src={item.image} alt={item.name}
                        imgClassName="w-12 h-12 sm:w-16 sm:h-16 object-contain p-1 transform group-hover:scale-110 transition-transform duration-300"
                        emojiClassName="text-3xl sm:text-4xl select-none transform group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate" title={item.name}>{item.name}</h4>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[7.5px] sm:text-[8px] bg-slate-100 text-slate-500 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">{item.category}</span>
                        {Object.entries(item.customizations || {}).filter(([_, v]) => v).map(([k]) => {
                          const labels = { extraCheese: '🧀 Cheese', noOnion: '🧅 No Onion', spicy: '🌶️ Spicy' };
                          return (
                            <span key={k} className="text-[7.5px] sm:text-[8px] bg-amber-50 text-amber-700 border border-amber-100/50 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                              {labels[k] || k}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-xs sm:text-sm text-orange-600 font-black pt-0.5">₹{item.price}</p>
                    </div>
                  </div>
                  
                  {/* Right side: Adjuster & Delete */}
                  <div className="flex items-center gap-1.5 sm:gap-3.5 shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-0.5 sm:p-1 shadow-inner">
                      <button onClick={() => index > -1 && cart[index].qty === 1 ? removeFromCart(index) : updateQty(index, -1)}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white shadow-sm hover:shadow text-orange-600 font-black flex items-center justify-center transition-all cursor-pointer active:scale-90 hover:bg-orange-50/20 text-xs sm:text-sm">-</button>
                      <span className="text-[11px] sm:text-xs font-black text-slate-800 w-3 sm:w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(index, 1)}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm hover:shadow-md font-black text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 text-xs sm:text-sm">+</button>
                    </div>
                    <button onClick={() => removeFromCart(index)} className="p-2 sm:p-2.5 bg-red-50 hover:bg-red-100/80 text-red-650 rounded-xl transition-all duration-200 active:scale-90 flex items-center justify-center shadow-sm border border-red-100/20 shrink-0 cursor-pointer">
                      <span className="text-xs sm:text-sm">🗑️</span>
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
                <div className="bg-gradient-to-br from-white to-slate-50/30 rounded-[2.2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-orange-500/5 rounded-full blur-xl" />
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="text-sm">🎟️</span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Have a coupon?</h4>
                  </div>
                  <div className="flex gap-2.5">
                    <input 
                      type="text" 
                      placeholder="ENTER CODE (FLAT10 / WELCOME20)" 
                      className="flex-1 bg-slate-50/80 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs font-extrabold focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all uppercase placeholder-slate-400 tracking-wide"
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
                    }} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-95 cursor-pointer select-none">
                      Apply
                    </button>
                  </div>
                  {appliedCoupon && (
                    <div className="mt-4 bg-emerald-50 border border-dashed border-emerald-300 text-emerald-700 p-3.5 rounded-2xl text-[10px] font-black text-center uppercase tracking-wider relative flex items-center justify-center gap-1.5 animate-fade-in">
                      <div className="absolute top-1/2 -left-1.5 w-3 h-3 bg-[#F8FAFC] border-r border-slate-100 rounded-full -translate-y-1/2" />
                      <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-[#F8FAFC] border-l border-slate-100 rounded-full -translate-y-1/2" />
                      🎉 Applied: {appliedCoupon.code} <span className="font-normal text-slate-400">|</span> <span className="text-emerald-600">Saved ₹{discount}</span>
                    </div>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="bg-white rounded-[2.2rem] p-5.5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex justify-between text-center select-none">
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-2.5xl p-2 bg-blue-50/60 rounded-2xl group-hover:scale-110 transition-transform duration-300">🛡️</span>
                    <span className="text-[10px] font-black text-slate-800">Safe & Secure</span>
                    <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-wider">Payments</span>
                  </div>
                  <div className="w-px bg-slate-100/80 my-2" />
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-2.5xl p-2 bg-orange-50/60 rounded-2xl group-hover:scale-110 transition-transform duration-300">⚡</span>
                    <span className="text-[10px] font-black text-slate-800">Quick Service</span>
                    <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-wider">To Table</span>
                  </div>
                  <div className="w-px bg-slate-100/80 my-2" />
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-2.5xl p-2 bg-yellow-50/60 rounded-2xl group-hover:scale-110 transition-transform duration-300">🏆</span>
                    <span className="text-[10px] font-black text-slate-800">Best Quality</span>
                    <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-wider">Always</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary & Checkout */}
              <div className="bg-gradient-to-br from-white via-white to-slate-50/20 rounded-[2.2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-4.5">
                    <span className="text-sm">📋</span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Summary</h4>
                  </div>
                  <div className="space-y-3.5 border-b border-slate-100 pb-5">
                    <div className="flex justify-between text-xs text-slate-500 font-bold">
                      <span>Item Total</span>
                      <span className="text-slate-800 font-black">₹{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-555 font-bold">
                      <span>GST (5%)</span>
                      <span className="text-slate-800 font-black">₹{finalGst}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-xs text-emerald-600 font-black">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-₹{discount}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-4 text-xs font-black text-slate-900">
                    <span className="text-sm font-black">Total Amount</span>
                    <span className="text-xl text-orange-600 font-black tracking-tight">₹{finalTotal}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="mt-4 bg-emerald-50/60 border border-emerald-100 text-emerald-700 px-4 py-2.5 rounded-2xl text-[9px] font-black text-center uppercase tracking-wider">
                      🎉 You saved ₹{discount} on this order
                    </div>
                  )}
                </div>

                <button onClick={() => setStage('confirm')}
                  className="w-full py-4.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl text-xs shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest group">
                  <span>Place Order</span>
                  <span className="w-5 h-5 bg-white text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm transform group-hover:translate-x-1 transition-transform duration-250">➔</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </>
    );
  };

  /* ── STAGE: CONFIRM ORDER ── */
  const ConfirmStage = () => (
    <>
      <div className="flex items-center gap-3.5 mb-6.5 select-none">
        <button 
          onClick={() => setStage('cart')} 
          className="w-10 h-10 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50 hover:border-slate-200 flex items-center justify-center transition-all shadow-sm group active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform duration-250" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-black text-slate-800 leading-tight">{t.confirmOrder}</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Final details before checkout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none pb-20">
        <div className="space-y-4.5">
          {/* Table Details */}
          <div className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-[2rem] p-5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.02)] transition-all duration-300 flex items-center justify-between group">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.tableLabel}</p>
              <p className="text-2xl font-black text-slate-800">{'Table ' + (tableInfo.name.match(/\d+/)?.[0] || tableId)}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-tr from-orange-50 to-amber-50 text-orange-500 border border-orange-100/60 rounded-2xl flex items-center justify-center text-2xl shadow-sm relative group-hover:scale-105 transition-transform duration-300">
              🍽️
            </div>
          </div>

          {/* Order Type Toggle */}
          <div className="bg-white rounded-[2rem] p-5.5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">⚡</span>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.orderType}</h4>
            </div>
            <div className="flex gap-3 bg-slate-50 border border-slate-100/80 p-1.5 rounded-2xl">
              {['Dine In', 'Take Away'].map(type => {
                const isActive = orderType === type;
                return (
                  <button key={type} onClick={() => setOrderType(type)}
                    className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] ${
                      isActive 
                        ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white shadow-md shadow-orange-500/15' 
                        : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                    }`}>
                    <span>{type === 'Dine In' ? '🍽️' : '🛍️'}</span>
                    <span>{type === 'Dine In' ? t.dineIn : t.takeAway}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="bg-white rounded-[2rem] p-5.5 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-3.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">✍️</span>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.specialInstructions}</h4>
            </div>
            <textarea 
              value={specialInstructions} 
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder={t.siPlaceholder}
              className="w-full p-4.5 border border-slate-200 hover:border-slate-300 focus:border-orange-500/40 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white transition-all resize-none shadow-inner bg-slate-50/30"
              rows="3"
            />
          </div>
        </div>

        {/* Billing details card */}
        <div className="bg-gradient-to-br from-white via-white to-slate-50/10 rounded-[2.2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.025)] transition-all duration-300 flex flex-col justify-between space-y-6">
          <div className="space-y-4.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
              <span className="text-sm">🧾</span>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.billDetails}</h4>
            </div>
            <div className="space-y-3 pb-4.5 border-b border-dashed border-slate-200">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{t.subtotal}</span>
                <span className="text-slate-800 font-black">₹{cartSubtotal}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-xs text-emerald-600 font-black">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{t.gstLabel}</span>
                <span className="text-slate-800 font-black">₹{finalGst}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{t.serviceChargeLabel}</span>
                <span className="text-slate-800 font-black">₹{finalService}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-black text-slate-800">
              <span className="text-sm font-black text-slate-650">Grand Total</span>
              <span className="text-xl text-orange-650 font-black tracking-tight">₹{finalTotal}</span>
            </div>
          </div>

          <button 
            onClick={placeOrder} 
            disabled={isPlacingOrder}
            className="w-full py-4.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl text-xs shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-widest mt-6 sm:mt-0"
          >
            {isPlacingOrder ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <span>Confirm & Place Order</span>
                <span className="w-5 h-5 bg-white text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm transform group-hover:scale-110 transition-transform duration-250">✓</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
  /* ── STAGE: ORDER TRACKING ── */
  const TrackingStage = () => {
    const order = selectedOrder || placedOrders[0];
    const latest = order 
      ? (placedOrders.find(o => String(o._id || o.id) === String(order._id || order.id)) || order)
      : null;

    return (
      <>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6.5 select-none bg-gradient-to-r from-white via-white to-slate-50/50 p-5.5 rounded-[2rem] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.01)]">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-orange-650 bg-clip-text text-transparent">{t.orderStatus}</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Track your order in real time</p>
          </div>
          <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
            <button onClick={() => setStage('callWaiter')} className="flex-1 sm:flex-none px-5 py-3 border border-slate-200 rounded-2xl text-slate-650 text-xs font-black bg-white hover:bg-slate-50 hover:border-slate-350 transition-all shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-1.5">
              <span>🔔</span>
              <span>Need Help?</span>
            </button>
            <div className="px-4 py-3 bg-orange-50/40 border border-orange-100/50 rounded-2xl flex items-center gap-1.5 text-xs font-black text-slate-800 shadow-sm">
              <span className="text-slate-400 font-bold">ID:</span>
              <span className="font-mono text-orange-600 font-extrabold tracking-wide">{latest?.orderId || latest?.id || '#ORD1234'}</span>
            </div>
          </div>
        </div>

        {!latest ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-[2.2rem] p-8 shadow-sm text-center select-none">
            <span className="text-6xl mb-4 select-none animate-bounce">📍</span>
            <h3 className="text-base font-black text-slate-800">No active order</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">Scan QR code and place order to track statuses.</p>
            <button onClick={() => setStage('menu')} className="mt-6 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer">
              Start Ordering
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline on left (spans 2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-[2.2rem] p-6 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.01)]">
              <div className="relative pl-8.5 space-y-8 py-2">
                {/* Static background track */}
                <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-slate-100" />
                
                {/* Active progress track */}
                {(() => {
                  const currentStep = STATUS_META[latest.status]?.step || 1;
                  const percent = ((currentStep - 1) / 3) * 100;
                  return (
                    <div 
                      className="absolute left-[17px] top-4 w-0.5 bg-gradient-to-b from-emerald-500 to-orange-500 transition-all duration-500" 
                      style={{ height: `calc(${percent}% - 2px)` }}
                    />
                  );
                })()}

                {['Pending', 'Preparing', 'Ready', 'Served'].map((status) => {
                  const meta = STATUS_META[status];
                  const isCurrent = latest.status === status;
                  const isPast = meta.step < (STATUS_META[latest.status]?.step || 1);
                  const isActive = isCurrent || isPast;
                  
                  return (
                    <div key={status} className="relative flex gap-5 items-start">
                      {/* Dot indicator */}
                      <div className={`absolute -left-[35px] w-7.5 h-7.5 rounded-full border-4 border-white flex items-center justify-center shadow-md transition-all duration-300 z-10 ${
                        isCurrent 
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 scale-110 shadow-lg shadow-orange-500/20 text-white' 
                          : isPast 
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isCurrent && (
                          <span className="absolute inset-0 rounded-full bg-orange-400/40 animate-ping scale-150 pointer-events-none" />
                        )}
                        {isPast ? (
                          <span className="text-[10px] font-black">✓</span>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-slate-350'}`} />
                        )}
                      </div>

                      {/* Card */}
                      <div className={`flex-1 p-5 rounded-[2rem] border-2 transition-all duration-300 flex items-center justify-between gap-4 ${
                        isCurrent 
                          ? 'border-orange-500/20 bg-gradient-to-br from-orange-50/10 via-white to-amber-50/5 shadow-[0_12px_35px_rgba(249,115,22,0.05)]' 
                          : isPast 
                            ? 'border-emerald-500/10 bg-emerald-50/5 opacity-90' 
                            : 'border-slate-100 bg-white opacity-45'
                      }`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-black ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                              {meta.label}
                            </h3>
                            {isCurrent && (
                              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse border border-white" />
                            )}
                          </div>
                          <p className={`text-[10.5px] mt-1 ${isActive ? 'text-slate-500' : 'text-slate-400'} font-semibold`}>
                            {isCurrent ? meta.desc : isPast ? 'Completed successfully' : 'Pending status'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl p-2 rounded-xl border transition-all ${
                            isCurrent 
                              ? 'bg-orange-50 border-orange-100/50 animate-bounce' 
                              : isPast 
                                ? 'bg-emerald-50 border-emerald-100/50' 
                                : 'bg-slate-50 border-slate-100 opacity-60'
                          }`}>{meta.icon}</span>
                          {isCurrent && (
                            <span className="text-[8px] bg-orange-500 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse">Active</span>
                          )}
                          {isPast && (
                            <span className="text-[8px] bg-emerald-100/60 text-emerald-600 font-extrabold px-2.5 py-1 rounded-full border border-emerald-200/20 uppercase tracking-wider">Done</span>
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
              <div className="bg-gradient-to-br from-white via-white to-slate-50/20 rounded-[2.2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-1/2 -right-8 w-28 h-28 bg-orange-100/40 rounded-full blur-2xl pointer-events-none" />
                
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

                <div className="border-t border-slate-150 pt-4.5 mt-5 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Amount</p>
                    <p className="text-xl font-black text-orange-600 mt-0.5">₹{latest.total}</p>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={chefImage} alt="Chef" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Alert Message */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-5 flex gap-3.5 text-emerald-800 shadow-inner">
                <span className="text-2xl shrink-0">🛡️</span>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider mb-1 text-emerald-900">Hygiene & Safety Assured</h4>
                  <p className="text-[10.5px] text-emerald-700 font-semibold leading-relaxed">Our kitchen follows rigorous sanitization standards, and our staff uses complete protective gear to prepare your fresh meals.</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3.5">
                <button onClick={() => {
                  const check = confirm('Cancel this order?');
                  if (check) toast.success('Cancellation request sent');
                }} className="py-4 border border-rose-100 hover:border-rose-250 text-rose-500 font-black rounded-2xl text-xs bg-rose-50/10 hover:bg-rose-50/30 transition-all cursor-pointer active:scale-95 shadow-sm text-center">
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
                }} className="py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl text-xs transition-all cursor-pointer active:scale-95 shadow-md shadow-orange-500/10 text-center">
                  Reorder
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button onClick={() => setStage('bill')} className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-2xl text-xs transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10 text-center flex items-center justify-center gap-1.5">
                  <span>🧾</span>
                  <span>View Full Invoice</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  /* ── STAGE: BILL ── */
  const BillStage = () => {
    const order = selectedOrder || placedOrders[0];
    const isPaid = order?.billingStatus === 'Paid';

    return (
      <>
        <div className="flex items-center gap-3.5 mb-6 select-none">
          <button onClick={() => setStage('tracking')} className="w-9 h-9 rounded-xl bg-white border border-slate-150 hover:bg-slate-50 flex items-center justify-center transition-all font-black text-slate-700 active:scale-95 shadow-sm text-xs">
            ←
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 leading-tight">{t.billSummary}</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Review summary and checkout options</p>
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
            {isPaid && (
              <span className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-250 text-[9px] font-black uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                <span>●</span> Paid Online
              </span>
            )}
          </div>

          <div className="space-y-2.5 mb-4">
            {(order?.items || cart).map((item, i) => (
              <div key={i} className="flex justify-between text-xs font-semibold text-slate-655">
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

          {isPaid ? (
            <div className="bg-emerald-50/70 border border-emerald-100 text-emerald-800 rounded-2.5rem p-5 text-center shadow-md animate-fade-in">
              <span className="text-3xl mb-2.5 block select-none">🎉</span>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-1">Payment Successful</p>
              <p className="text-[10px] text-emerald-600 font-semibold mb-2">We have received your payment of ₹{order?.total || finalTotal}.</p>
              <p className="text-[9px] text-slate-400 font-medium">Method: {order?.paymentMethod || 'Online UPI'} · {order?.paidAt ? new Date(order.paidAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : fmtTime()}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Razorpay Online Payment Button */}
              <button
                onClick={() => handleRazorpayPayment(order)}
                disabled={isProcessingPayment}
                className="w-full py-4.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2.5rem text-xs shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-extrabold"
              >
                {isProcessingPayment ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Pay Online Now</span>
                    <span className="w-5 h-5 bg-white text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">💳</span>
                  </>
                )}
              </button>

              {/* Pay at Cashier Alternative */}
              <div className="bg-[#0B0F19] text-white rounded-2.5rem p-4 text-center shadow-md border border-slate-800">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-0.5">Or Pay at Cashier</p>
                <p className="text-[9.5px] text-slate-400 font-medium">You can also pay with cash / card at the billing counter.</p>
              </div>
            </div>
          )}

          <button onClick={() => setStage('feedback')} className="w-full mt-5 py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] cursor-pointer">
            ⭐ SUBMIT FEEDBACK
          </button>
        </div>
      </>
    );
  };

  /* ── STAGE: CALL WAITER ── */
  const CallWaiterStage = () => {
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
      setWaiterRequested(true);
      setTimeout(() => { setWaiterRequested(false); setStage('tracking'); }, 3000);
    };

    return (
      <>
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
          {!waiterRequested ? (
            <div className="text-center space-y-6">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500/10 to-indigo-650/10 border-2 border-blue-100 rounded-full flex items-center justify-center mx-auto shadow-xl relative animate-pulse">
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
      </>
    );
  };

  /* ── STAGE: HELP & SUPPORT ── */
  const SupportStage = () => {
    const faqs = [
      {
        q: "How do I pay my bill?",
        a: "You can click on the Cart icon, proceed to checkout, or request a physical bill using the 'Bill' tab or by calling a waiter."
      },
      {
        q: "Is there a service charge?",
        a: "Yes, a standard 2% service charge and 5% GST are calculated on the food items."
      },
      {
        q: "Can I customize my order?",
        a: "Yes! Click on any dish to view customization options such as spice levels or extra toppings."
      },
      {
        q: "How long will my order take?",
        a: "Starters take about 12 minutes, Main Courses 20 minutes, and Beverages 5 minutes. You can track live status under the 'Orders' tab."
      },
      {
        q: "How do I call a waiter?",
        a: "You can use the 'Summon Waiter' button below, or use the bottom navigation drawer to access the 'Call Waiter' page."
      }
    ];

    const filteredFaqs = faqs.filter(faq => 
      faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
      faq.a.toLowerCase().includes(faqSearch.toLowerCase())
    );

    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!customMessage.trim()) return;
      setIsSubmitting(true);
      try {
        await axios.post(`${API_URL}/orders/qr`, { 
          type: 'Request', 
          requestType: `Message: ${customMessage}`, 
          table: tableInfo.name, 
          items: [{ id: 'msg', name: `Msg: ${customMessage.substring(0, 20)}...`, qty: 1, price: 0 }], 
          subtotal: 0, 
          gst: 0, 
          total: 0, 
          guestCount: 1 
        }); 
        toast.success("🚀 Request sent to kitchen & cashier!");
        setCustomMessage('');
      } catch {
        toast.error("❌ Failed to send request. Please try again.");
      }
      setIsSubmitting(false);
    };

    return (
      <>
        <div className="flex items-center gap-3.5 mb-6 select-none">
          <button onClick={() => setStage('menu')} className="w-9 h-9 rounded-xl bg-white border border-slate-150 hover:bg-slate-50 flex items-center justify-center transition-all font-black text-slate-700 active:scale-95 shadow-sm text-xs">
            ←
          </button>
          <div>
            <h2 className="text-base font-black text-slate-800 leading-tight">Help & Support</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Instant assistance and answers</p>
          </div>
        </div>

        <div className="space-y-6 max-w-xl mx-auto pb-24 select-none">
          {/* Quick Table Actions */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <button 
                onClick={() => setStage('callWaiter')}
                className="py-3.5 bg-gradient-to-r from-orange-500 to-orange-455 text-white text-xs font-black rounded-2xl shadow-md hover:opacity-95 transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span>🙋</span> Summon Waiter
              </button>
              <button 
                onClick={() => {
                  toast.success("🛎️ Reception has been notified!");
                }}
                className="py-3.5 bg-slate-100 text-slate-700 text-xs font-black rounded-2xl hover:bg-slate-150 transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span>📞</span> Call Support
              </button>
            </div>
          </div>

          {/* Send Message Form */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Request anything else?</h3>
            <form onSubmit={handleSendMessage} className="space-y-3">
              <textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Need extra spoons, napkins, clean glasses, or hot water? Write here..."
                rows="3"
                className="w-full p-4 border border-slate-155 rounded-2xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none bg-slate-50/50"
              />
              <button 
                type="submit" 
                disabled={isSubmitting || !customMessage.trim()}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-855 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer uppercase tracking-wider"
              >
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </form>
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Frequently Asked Questions</h3>
            </div>
            
            {/* Search FAQ */}
            <div className="relative">
              <input
                type="text"
                value={faqSearch}
                onChange={e => setFaqSearch(e.target.value)}
                placeholder="Search FAQs..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-155 text-slate-700 placeholder-slate-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-sm transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
            </div>

            <div className="space-y-2.5">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, index) => {
                  const isOpen = activeIndex === index;
                  return (
                    <div 
                      key={index} 
                      className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden transition-all duration-200"
                    >
                      <button 
                        onClick={() => setActiveIndex(isOpen ? null : index)}
                        className="w-full flex items-center justify-between p-4.5 text-left focus:outline-none cursor-pointer"
                      >
                        <span className="text-xs font-black text-slate-700 leading-snug">{faq.q}</span>
                        <span className={`text-slate-400 font-bold transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                          ➔
                        </span>
                      </button>
                      
                      {isOpen && (
                        <div className="px-4.5 pb-4.5 pt-0 text-slate-400 text-xs font-medium leading-relaxed border-t border-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 bg-white border border-dashed border-slate-155 rounded-2xl text-slate-400 text-xs font-bold">
                  No matching FAQs found.
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  /* ── STAGE: OFFERS ── */
  const OffersStage = () => (
    <>
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
    </>
  );

  /* ── STAGE: FEEDBACK ── */
  const FeedbackStage = () => (
    <>
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
    </>
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
      {stage === 'thankYou' ? (
        ThankYouStage()
      ) : (
        <AppShell 
          t={t}
          cart={cart}
          placedOrders={placedOrders}
          favorites={favorites}
          activeCategory={activeCategory}
          stage={stage}
          setStage={setStage}
          setActiveCategory={setActiveCategory}
          isDrawerOpen={isDrawerOpen}
          setIsDrawerOpen={setIsDrawerOpen}
          logoImage={logoImage}
          bannerBgImage={bannerBgImage}
        >
          {stage === 'menu' && renderMenuStage()}
          {stage === 'foodDetails' && FoodDetailsStage()}
          {stage === 'cart' && CartStage()}
          {stage === 'confirm' && ConfirmStage()}
          {stage === 'tracking' && TrackingStage()}
          {stage === 'bill' && BillStage()}
          {stage === 'callWaiter' && CallWaiterStage()}
          {stage === 'offers' && OffersStage()}
          {stage === 'feedback' && FeedbackStage()}
          {stage === 'support' && SupportStage()}
        </AppShell>
      )}

      {/* Mobile Navigation Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden lg:hidden" onClick={() => setIsDrawerOpen(false)}>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/55 transition-opacity duration-300" />
          
          {/* Drawer Panel */}
          <div 
            className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0B0F19] text-white shadow-2xl transition-transform duration-300 transform translate-x-0"
            onClick={e => e.stopPropagation()}
          >
            {/* Header: Resto QR Brand Logo */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-amber-500/10 rounded-2xl flex items-center justify-center text-2xl">👨‍🍳</div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1">
                    Resto <span className="text-[8px] bg-orange-500 text-white font-extrabold px-1.5 py-0.5 rounded ml-1">QR</span>
                  </h2>
                  <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Delicious Food</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-350 hover:text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Navigation List */}
            <div className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5 scrollbar-none select-none">
              {[
                { 
                  id: 'menu', 
                  label: t.menu || 'Menu', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  )
                },
                { 
                  id: 'cart', 
                  label: t.cart || 'Cart', 
                  badge: cart.length,
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  )
                },
                { 
                  id: 'tracking', 
                  label: t.orders || 'Orders', 
                  badge: placedOrders.length,
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )
                },
                { 
                  id: 'favorites', 
                  label: 'Favorites', 
                  badge: favorites.length,
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  ) 
                },
                { 
                  id: 'feedback', 
                  label: t.profile || 'Profile', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  ) 
                },
              ].map(item => {
                const isActive = (item.id === 'favorites')
                  ? (activeCategory === 'Favorites' && stage === 'menu')
                  : ((item.id === 'menu' && activeCategory !== 'Favorites') 
                      ? (stage === 'menu') 
                      : (stage === item.id));

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      if (item.id === 'favorites') {
                        setActiveCategory('Favorites');
                        setStage('menu');
                      } else {
                        if (item.id === 'menu') {
                          setActiveCategory('All');
                        }
                        setStage(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10' 
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="bg-orange-600 text-white text-[9px] font-extrabold rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="h-px bg-white/5 my-4" />

              {/* Secondary links */}
              {[
                { 
                  id: 'offers', 
                  label: t.offersForYou || 'Offers for You', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.43 1.43 0 002.022 0l4.318-4.318a1.43 1.43 0 000-2.022L10.16 3.659A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  )
                },
                { 
                  id: 'support', 
                  label: 'Help & Support', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  )
                },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    if (item.id === 'offers') setStage('offers');
                    else if (item.id === 'support') setStage('support');
                    else toast.info(`ℹ️ ${item.label} section is coming soon!`);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                >
                  <span className="text-gray-400 group-hover:text-orange-400">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Combo Offer Banner Card inside Drawer */}
              <div className="relative bg-slate-900/60 rounded-3xl p-4 overflow-hidden border border-slate-800/80 select-none mt-6 flex flex-col gap-2">
                <div>
                  <p className="text-orange-500 font-black text-xs">Today's Special</p>
                  <p className="text-slate-300 text-[10px] mt-0.5 leading-relaxed">Get 20% OFF on your first order!</p>
                </div>
                <div className="relative h-20 rounded-xl overflow-hidden mt-1 group">
                  <img 
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80" 
                    alt="Promo Combo" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <button 
                    onClick={() => { setIsDrawerOpen(false); setStage('offers'); }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[8px] font-black rounded-lg transition-all active:scale-95 uppercase cursor-pointer"
                  >
                    ORDER NOW
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

/* ── APP SHELL AND BOTTOM NAV DEFINITIONS (OUTSIDE TO PRESERVE SCROLL) ── */
const BottomNav = ({ t, cart, placedOrders, activeCategory, stage, setStage, setActiveCategory, logoImage }) => {
  const items = [
    { 
      id: 'menu', 
      label: t.menu || 'Menu', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    { 
      id: 'cart', 
      label: t.cart || 'Cart', 
      badge: cart.length,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      )
    },
    { 
      id: 'scan', 
      label: 'SCAN QR', 
      isCenter: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-2.25zM3.75 14.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-2.25zM13.125 4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-2.25zM6.75 6.75h.008v.008H6.75V6.75zM6.75 16.5h.008v.008H6.75V16.5zM16.125 6.75h.008v.008h-.008V6.75zM12 12h.008v.008H12V12zM12 16.5h.008v.008H12V16.5zM16.5 12h.008v.008h-.008V12zM18 18h.008v.008H18V18zM15 15h.008v.008H15V15z" />
        </svg>
      )
    },
    { 
      id: 'tracking', 
      label: t.orders || 'Orders', 
      badge: placedOrders.length,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    { 
      id: 'feedback', 
      label: t.profile || 'Profile', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[1.8rem] px-6 py-3 flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 select-none border-t border-slate-100 pb-safe">
      {items.map(item => {
        const isActive = (item.id === 'menu')
          ? (stage === 'menu' && activeCategory !== 'Favorites')
          : (stage === item.id || (item.id === 'tracking' && stage === 'tracking') || (item.id === 'feedback' && stage === 'feedback'));

        if (item.isCenter) {
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveCategory('All');
                setStage('menu');
              }}
              className="flex flex-col items-center -mt-8 cursor-pointer select-none"
            >
              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center ring-4 ring-white shadow-xl active:scale-95 transition-transform overflow-hidden border border-slate-100/50">
                <img 
                  src={logoImage} 
                  alt="Scan Menu" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
            </button>
          );
        }

        return (
          <button 
            key={item.id} 
            onClick={() => {
              if (item.id === 'menu') {
                setActiveCategory('All');
                setStage('menu');
              } else if (item.id === 'tracking' && placedOrders.length > 0) {
                setStage('tracking');
              } else {
                setStage(item.id);
              }
            }}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer relative ${
              isActive 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/15 font-black scale-102' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[8px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-md animate-bounce">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${isActive ? 'text-white' : 'text-slate-400'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const AppShell = ({ 
  children, t, cart, placedOrders, favorites, activeCategory, stage, setStage, 
  setActiveCategory, isDrawerOpen, setIsDrawerOpen, logoImage, bannerBgImage 
}) => {
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
          <nav className="space-y-1 select-none">
            {[
              { 
                id: 'menu', 
                label: t.menu || 'Menu', 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                ) 
              },
              { 
                id: 'cart', 
                label: t.cart || 'Cart', 
                badge: cart.length,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                ) 
              },
              { 
                id: 'tracking', 
                label: t.orders || 'Orders', 
                badge: placedOrders.length,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ) 
              },
              { 
                id: 'favorites', 
                label: 'Favorites', 
                badge: favorites.length,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                ) 
              },
              { 
                id: 'feedback', 
                label: t.profile || 'Profile', 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ) 
              },
            ].map(item => {
              const isActive = (item.id === 'favorites')
                ? (activeCategory === 'Favorites' && stage === 'menu')
                : ((item.id === 'menu' && activeCategory !== 'Favorites') 
                    ? (stage === 'menu') 
                    : (stage === item.id || (item.id === 'tracking' && stage === 'tracking') || (item.id === 'feedback' && stage === 'feedback')));
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'tracking' && placedOrders.length > 0) setStage('tracking');
                    else if (item.id === 'feedback') setStage('feedback');
                    else if (item.id === 'favorites') {
                      setActiveCategory('Favorites');
                      setStage('menu');
                    } else {
                      if (item.id === 'menu' && activeCategory === 'Favorites') {
                        setActiveCategory('All');
                      }
                      setStage(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-orange-500 text-white shadow-md scale-105' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-[#f97316] text-white text-[10px] font-bold rounded-full h-5.5 w-5.5 flex items-center justify-center shadow-md animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="h-px bg-white/10 my-4" />

            {[
              {
                id: 'offers',
                label: t.offersForYou || 'Offers',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.43 1.43 0 002.022 0l4.318-4.318a1.43 1.43 0 000-2.022L10.16 3.659A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                )
              },
              {
                id: 'help',
                label: 'Help & Support',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                )
              }
            ].map(item => {
              const isActive = stage === item.id || (item.id === 'help' && stage === 'support');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'offers') setStage('offers');
                    else if (item.id === 'help') setStage('support');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-orange-500 text-white shadow-md' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom special item */}
        <div className="relative bg-slate-900/60 rounded-3xl p-4 overflow-hidden border border-slate-800/80 mt-auto select-none flex flex-col gap-2.5">
          <div>
            <p className="text-amber-500 font-black text-xs">Today's Special</p>
            <p className="text-slate-300 text-[10px] mt-0.5 leading-relaxed">Get 20% OFF on your first order!</p>
          </div>
          
          <div className="relative mt-1 h-24 rounded-2xl overflow-hidden group">
            <img 
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80" 
              alt="Special Dish" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            
            <button 
              onClick={() => setStage('offers')} 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-[9px] font-black rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest cursor-pointer whitespace-nowrap"
            >
              ORDER NOW
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Main content body */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] pb-24 lg:pb-6 px-6 pt-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="lg:hidden">
          <BottomNav 
            t={t}
            cart={cart}
            placedOrders={placedOrders}
            activeCategory={activeCategory}
            stage={stage}
            setStage={setStage}
            setActiveCategory={setActiveCategory}
            logoImage={logoImage}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerMenu;
