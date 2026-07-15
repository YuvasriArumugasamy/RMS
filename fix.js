const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'restaurant-erp', 'client', 'src', 'pages', 'CustomerMenu.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const startKeyword = 'const submitFeedback = () => {';
const endKeyword = 'const renderMenuStage = () => (';

const startIndex = content.indexOf(startKeyword);
const endIndex = content.indexOf(endKeyword);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end keyword in CustomerMenu.jsx!");
  process.exit(1);
}

// Using escaped backticks so that the written file gets regular clean backticks (`` ` ``)
const replacement = `const submitFeedback = () => {
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

  /* ── STAGE: WELCOME ── */
  const renderWelcomeStage = () => {
    const handleLanguageSelect = (code) => {
      setLang(code);
    };

    return (
      <div className="relative min-h-screen w-full overflow-y-auto bg-[#FFFBF7] flex flex-col items-center justify-center px-4 py-16 select-none" style={{scrollbarWidth:'none', msOverflowStyle:'none'}}>
        <style dangerouslySetInnerHTML={{__html: \`
          @keyframes floatBlob1 {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(20px, -20px) scale(1.06); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes floatBlob2 {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(-25px, 25px) scale(0.94); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob1 {
            animation: floatBlob1 12s infinite ease-in-out;
          }
          .animate-blob2 {
            animation: floatBlob2 15s infinite ease-in-out;
          }
        \`}} />

        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 opacity-90 blur-0 animate-blob1" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-96 w-96 rounded-full bg-gradient-to-tr from-orange-400 via-orange-300 to-amber-200 opacity-90 animate-blob2" />
        <div className="pointer-events-none absolute top-1/3 right-6 h-24 w-24 rounded-full bg-orange-100 opacity-40 blur-xl animate-blob1" />
        <div className="pointer-events-none absolute bottom-1/4 left-4 h-16 w-16 rounded-full bg-[#FFE7D6] opacity-40 blur-lg animate-blob2" />

        <div className="pointer-events-none absolute top-8 right-8 grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-orange-400/60" />
          ))}
        </div>

        <div
          className={\`relative z-10 w-full max-w-sm rounded-[2rem] bg-white/90 backdrop-blur-md border border-white/80 shadow-[0_20px_50px_rgba(255,122,0,0.12)] px-6 pt-12 pb-5 transition-all duration-700 ease-out \${
            showWelcomeContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }\`}
        >
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-white p-1.5 shadow-md shadow-orange-200 ring-4 ring-white flex items-center justify-center">
              <img 
                src={logoImage} 
                alt="Resto Logo" 
                className="w-20 h-20 rounded-full object-cover" 
              />
            </div>
          </div>

          <div className="text-center mt-2 px-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-orange-600 leading-tight">
              {t.welcome}
            </h1>
            <p className="mt-1 text-gray-550 text-[10.5px] font-semibold tracking-wide">{t.subtitle}</p>
          </div>

          <div className="mt-4 rounded-xl bg-white shadow-sm border border-orange-50 py-3.5 px-4 text-center">
            <p className="text-orange-500 font-bold tracking-wide text-[9.5px] mb-1">
              {t.tableLabel}
            </p>
            <p className="text-5xl font-black text-gray-900 tabular-nums leading-none my-0.5">
              {'0' + (tableInfo.name.match(/\\d+/)?.[0] || tableId)}
            </p>

            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3.5 py-1 border border-green-100 shadow-sm text-green-700">
              <svg className="w-3.5 h-3.5 text-green-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-[9px] uppercase tracking-wider">
                {t.scanSuccess}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3.5 select-none">
            <div className="flex flex-col items-center gap-0.5">
              <img src={scanStepImg} alt="Scan" className="w-8 h-8 object-contain" />
              <span className="text-[9.5px] text-gray-555 font-bold mt-0.5">Scan</span>
            </div>
            
            <span className="text-orange-400 font-bold text-xs mb-3">&raquo;</span>

            <div className="flex flex-col items-center gap-0.5">
              <img src={orderStepImg} alt="Order" className="w-8 h-8 object-contain" />
              <span className="text-[9.5px] text-gray-555 font-bold mt-0.5">Order</span>
            </div>

            <span className="text-orange-400 font-bold text-xs mb-3">&raquo;</span>

            <div className="flex flex-col items-center gap-0.5">
              <img src={enjoyStepImg} alt="Enjoy" className="w-8 h-8 object-contain" />
              <span className="text-[9.5px] text-gray-555 font-bold mt-0.5">Enjoy</span>
            </div>
          </div>

          <button
            onClick={() => setStage('menu')}
            className="mt-4 w-full flex items-center justify-between rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2.5 text-white font-extrabold text-[11px] shadow-md shadow-orange-200 active:scale-[0.98] transition-transform cursor-pointer uppercase tracking-wider"
          >
            <span className="mx-auto">{t.startOrdering}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-orange-500 ml-2 shadow-inner font-black">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </button>

          <div className="mt-3.5 flex items-center justify-center gap-2.5">
            {Object.keys(LANGS).map((code) => (
              <button
                key={code}
                onClick={() => handleLanguageSelect(code)}
                className={\`rounded-full px-4 py-2 text-[10px] font-extrabold border transition-all cursor-pointer select-none \${
                  lang === code
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/20 scale-105 active:scale-95"
                    : "bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50/10 active:scale-95"
                }\`}
              >
                {code === 'en' ? 'English' : code === 'ta' ? 'தமிழ்' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("CustomerMenu.jsx fixed successfully!");
