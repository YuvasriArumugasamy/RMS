import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { PageLoader, LoadingButton } from '../components/LoadingSkeleton';
import ConfirmModal from '../components/ConfirmModal';

const MenuManagement = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [menuItems, setMenuItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  // Search, Category, Sorting, View states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'price-low', 'price-high', 'name'
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Active Dropdown ID for actions menu (three dots)
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Form states
  const [newItem, setNewItem] = useState({ name: '', category: 'Main Course', price: '', available: true, image: '🍔' });
  const [editingId, setEditingId] = useState(null);

  // Combo creator states
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [selectedItemsForCombo, setSelectedItemsForCombo] = useState([]);
  const [comboImage, setComboImage] = useState('🍱');

  // Recipe linker states
  const [selectedRecipeItem, setSelectedRecipeItem] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState([]); // [{ ingredientId, qty }]
  const [tempIngredientId, setTempIngredientId] = useState('');
  const [tempQty, setTempQty] = useState('');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load from API
  const fetchData = async () => {
    try {
      const [menuRes, ingRes] = await Promise.all([
        api.get('/menu'),
        api.get('/inventory'),
      ]);
      if (menuRes.data.success) setMenuItems(menuRes.data.data);
      if (ingRes.data.success) setIngredients(ingRes.data.data);
    } catch {
      const savedMenu = localStorage.getItem('menuItems');
      if (savedMenu) setMenuItems(JSON.parse(savedMenu));
      const savedIngredients = localStorage.getItem('ingredients');
      if (savedIngredients) setIngredients(JSON.parse(savedIngredients));
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add or Update Single Item
  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { data } = await api.put(`/menu/${editingId}`, {
          name: newItem.name, category: newItem.category,
          price: Number(newItem.price), available: newItem.available, image: newItem.image
        });
        if (data.success) {
          setMenuItems(prev => prev.map(item => (item._id || item.id) === editingId ? data.data : item));
          toast.success(`✅ "${newItem.name}" updated!`);
        }
        setEditingId(null);
      } else {
        const { data } = await api.post('/menu', {
          name: newItem.name, category: newItem.category,
          price: Number(newItem.price), available: newItem.available, image: newItem.image, recipe: []
        });
        if (data.success) {
          setMenuItems(prev => [...prev, data.data]);
          toast.success(`✅ "${newItem.name}" added to menu!`);
        }
      }
      setNewItem({ name: '', category: 'Main Course', price: '', available: true, image: '🍔' });
      setIsItemModalOpen(false);
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Failed to save item'}`);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setNewItem({
      name: item.name,
      category: item.category || 'Main Course',
      price: item.price,
      available: item.available ?? true,
      image: item.image || '🍔'
    });
    setEditingId(item._id || item.id);
    setActiveDropdownId(null);
    setIsItemModalOpen(true);
  };

  const deleteItem = async (id) => {
    setActiveDropdownId(null);
    setConfirmState({
      title: 'Delete Menu Item',
      message: 'This item will be permanently removed from the menu. This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await api.delete(`/menu/${id}`);
          setMenuItems(prev => prev.filter(item => (item._id || item.id) !== id));
          toast.success('🗑️ Item deleted');
        } catch (err) {
          toast.error(`❌ ${err.response?.data?.message || 'Delete failed'}`);
        }
      },
    });
  };

  const toggleAvailability = async (item) => {
    const id = item._id || item.id;
    try {
      const { data } = await api.put(`/menu/${id}`, { available: !item.available });
      if (data.success) {
        setMenuItems(prev => prev.map(i => (i._id || i.id) === id ? data.data : i));
        toast.info(`${data.data.available ? '✅ Available' : '❌ Out of Stock'} - "${item.name}"`);
      }
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Update failed'}`);
    }
  };

  // Create Combo Offer
  const handleCreateCombo = async (e) => {
    e.preventDefault();
    if (!comboName || !comboPrice || selectedItemsForCombo.length === 0) {
      toast.warning('⚠️ Please fill all fields and select items for the combo.');
      return;
    }
    try {
      const { data } = await api.post('/menu', {
        name: comboName, category: 'Combo Offers',
        price: Number(comboPrice), available: true,
        image: comboImage, isCombo: true,
        comboItems: selectedItemsForCombo, recipe: []
      });
      if (data.success) {
        setMenuItems(prev => [...prev, data.data]);
        toast.success(`🍱 Combo "${comboName}" created!`);
      }
      setComboName(''); setComboPrice(''); setSelectedItemsForCombo([]);
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Combo creation failed'}`);
    }
  };

  const toggleComboItemSelection = (id) => {
    setSelectedItemsForCombo(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Recipe Editing
  const handleRecipeItemSelect = (e) => {
    const itemId = e.target.value;
    setSelectedRecipeItem(itemId);
    const item = menuItems.find(i => (i._id || i.id) === itemId || String(i._id || i.id) === itemId);
    if (item?.recipe) setRecipeIngredients(item.recipe);
    else setRecipeIngredients([]);
  };

  const addIngredientToRecipe = () => {
    if (!tempIngredientId || !tempQty) return;
    const existing = recipeIngredients.find(r =>
      String(r.ingredientId) === String(tempIngredientId)
    );
    if (existing) {
      setRecipeIngredients(prev => prev.map(r =>
        String(r.ingredientId) === String(tempIngredientId) ? { ...r, qty: Number(tempQty) } : r
      ));
    } else {
      setRecipeIngredients(prev => [...prev, { ingredientId: tempIngredientId, qty: Number(tempQty) }]);
    }
    setTempIngredientId(''); setTempQty('');
  };

  const removeIngredientFromRecipe = (ingId) => {
    setRecipeIngredients(prev => prev.filter(r => String(r.ingredientId) !== String(ingId)));
  };

  const saveRecipe = async () => {
    if (!selectedRecipeItem) return;
    try {
      const { data } = await api.put(`/menu/${selectedRecipeItem}`, { recipe: recipeIngredients });
      if (data.success) {
        setMenuItems(prev => prev.map(item =>
          String(item._id || item.id) === String(selectedRecipeItem) ? data.data : item
        ));
        toast.success('🍳 Recipe saved successfully!');
      }
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Recipe save failed'}`);
    }
  };

  // Filtering & Sorting menu items
  const filteredMenuItems = menuItems.filter(item => {
    if (item.isCombo) return false;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedMenuItems = [...filteredMenuItems].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0; // Default / popular
  });

  const paginatedItems = sortedMenuItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(sortedMenuItems.length / itemsPerPage));

  // Category navigation items with icons/emojis
  const categoriesList = [
    { key: 'All', label: 'All Items', icon: '✨' },
    { key: 'Main Course', label: 'Main Course', icon: '🍲' },
    { key: 'Starters', label: 'Starters', icon: '🍗' },
    { key: 'Bread', label: 'Bread', icon: '🍞' },
    { key: 'Beverages', label: 'Beverages', icon: '🥤' },
    { key: 'Desserts', label: 'Desserts', icon: '🍰' },
  ];

  if (pageLoading) return <PageLoader message="Loading Menu..." />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out] font-sans pb-12">
      
      {/* ── HEADER BLOCK ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Food & Beverage Menu</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Control single items, combo deals, and ingredient recipes.</p>
        </div>

        {/* Tab Buttons (styled like mockup card container) */}
        <div className="flex space-x-1.5 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'items' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🍔 Single Items
          </button>
          <button
            onClick={() => setActiveTab('combos')}
            className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'combos' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🍱 Combo Offers
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'recipes' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🍳 Recipe Config
          </button>
        </div>
      </div>

      {/* RENDER TAB: SINGLE ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-5">
          
          {/* Filters & Actions row */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Search and Filters */}
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 shadow-sm"
                />
              </div>
              
              {/* Filter reset / config button */}
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSortBy('popular'); }}
                title="Reset filters"
                className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-slate-500 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>

            {/* Add Item Button */}
            <button
              onClick={() => {
                setEditingId(null);
                setNewItem({ name: '', category: 'Main Course', price: '', available: true, image: '🍔' });
                setIsItemModalOpen(true);
              }}
              className="px-5 py-3.5 bg-[#f97316] hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10 cursor-pointer transition-all shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Item
            </button>
          </div>

          {/* Main List Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Category Navigation (Left Sidebar Card) */}
            <div className="bg-white rounded-3xl border border-slate-100 p-4 space-y-1 h-fit shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 block mb-3">Categories</span>
              {categoriesList.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => { setSelectedCategory(cat.key); setCurrentPage(1); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.key
                      ? 'bg-indigo-50/70 text-indigo-700 font-extrabold shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <span className="text-sm leading-none">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Items List container (Right main content) */}
            <div className="md:col-span-3 space-y-4">
              
              {/* Toolbar: Sort & view toggles */}
              <div className="flex justify-between items-center bg-white/40 px-2 py-1 rounded-xl">
                {/* Sort selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border-0 font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="popular">Popular</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name">Alphabetical</option>
                  </select>
                </div>

                {/* View toggles */}
                <div className="flex items-center gap-1 bg-white border border-slate-100 p-1 rounded-xl shadow-inner">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Items Display Cards Wrapper */}
              {paginatedItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400 font-medium shadow-sm">
                  No menu items found. Click "+ Add Item" to create one.
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid Layout Mode */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedItems.map((item) => (
                    <div key={item._id || item.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group">
                      
                      {/* Dropdown Options Button */}
                      <div className="absolute top-4 right-4" ref={activeDropdownId === (item._id || item.id) ? dropdownRef : null}>
                        <button 
                          onClick={() => setActiveDropdownId(activeDropdownId === (item._id || item.id) ? null : (item._id || item.id))}
                          className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 cursor-pointer"
                        >
                          ⋮
                        </button>
                        
                        {activeDropdownId === (item._id || item.id) && (
                          <div className="absolute right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl w-28 py-1 z-30 animate-[fadeIn_0.15s_ease-out]">
                            <button onClick={() => startEdit(item)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              ✏️ Edit
                            </button>
                            <button onClick={() => deleteItem(item._id || item.id)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-xs font-bold text-red-500 flex items-center gap-1.5">
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Image Bubble */}
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100/50 flex items-center justify-center text-3xl shadow-inner shrink-0">
                          {item.image || '🍔'}
                        </div>
                        
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{item.name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.category}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-6 pt-3 border-t border-slate-50">
                        <span className="text-sm font-black text-slate-800">₹{item.price}</span>
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                            item.available ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                          }`}
                        >
                          {item.available ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List Layout Mode (Exactly matching mockup image) */
                <div className="space-y-3">
                  {paginatedItems.map((item) => (
                    <div key={item._id || item.id} className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 relative">
                      
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Round circular image bubble */}
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100/50 flex items-center justify-center text-3xl shadow-inner shrink-0">
                          {item.image || '🍔'}
                        </div>
                        
                        <div className="min-w-0 space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-800 truncate leading-snug">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            {item.category === 'Beverages' ? 'Refreshing beverage' : 'Classic recipe item'} · Prepared fresh daily
                          </p>
                          <span className="text-xs font-black text-[#f97316] block">₹{item.price}</span>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2.5 shrink-0" ref={activeDropdownId === (item._id || item.id) ? dropdownRef : null}>
                        
                        {/* Status Toggle Button */}
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            item.available ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-500 hover:bg-red-100'
                          }`}
                        >
                          {item.available ? 'Active' : 'Inactive'}
                        </button>

                        {/* Three dots options */}
                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdownId(activeDropdownId === (item._id || item.id) ? null : (item._id || item.id))}
                            className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 cursor-pointer"
                          >
                            ⋮
                          </button>
                          
                          {activeDropdownId === (item._id || item.id) && (
                            <div className="absolute right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl w-28 py-1 z-35 animate-[fadeIn_0.15s_ease-out]">
                              <button onClick={() => startEdit(item)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                ✏️ Edit
                              </button>
                              <button onClick={() => deleteItem(item._id || item.id)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-xs font-bold text-red-500 flex items-center gap-1.5">
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PAGINATION CONTROLS ── */}
              <div className="flex justify-center items-center gap-2 pt-4 select-none">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                >
                  ‹
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm ${
                      currentPage === i + 1
                        ? 'bg-[#0F286B] text-white font-extrabold shadow-md'
                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                >
                  ›
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB: COMBO OFFERS */}
      {activeTab === 'combos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Combo Form Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 h-fit space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Create Combo Pack</h3>
            <form onSubmit={handleCreateCombo} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Combo Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Feast"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={comboPrice}
                    onChange={(e) => setComboPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Emoji Icon</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={comboImage}
                    onChange={(e) => setComboImage(e.target.value)}
                  />
                </div>
              </div>

              {/* Multi Select for Combo Items */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Include Menu Items</label>
                <div className="border border-slate-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50/30">
                  {menuItems.filter(item => !item.isCombo).map(item => (
                    <label key={item.id} className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItemsForCombo.includes(item.id)}
                        onChange={() => toggleComboItemSelection(item.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-650"
                      />
                      <span>{item.image} {item.name} (₹{item.price})</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Launch Combo Offer 🚀
              </button>
            </form>
          </div>

          {/* Active Combos List Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 lg:col-span-2 space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Active Combo Offers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Combo</th>
                    <th className="pb-3">Contains</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {menuItems.filter(item => item.isCombo).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-slate-400 py-12 font-semibold">
                        No active combo offers. Create one to list here.
                      </td>
                    </tr>
                  ) : (
                    menuItems.filter(item => item.isCombo).map((combo) => (
                      <tr key={combo.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-4 flex items-center space-x-3">
                          <span className="text-2xl">{combo.image}</span>
                          <span className="font-extrabold text-slate-800">{combo.name}</span>
                        </td>
                        <td className="py-4 text-xs font-semibold text-slate-500 max-w-xs truncate">
                          {combo.comboItems.map(itemId => {
                            const found = menuItems.find(mi => mi.id === itemId);
                            return found ? `${found.image} ${found.name}` : '';
                          }).join(', ')}
                        </td>
                        <td className="py-4 font-black text-slate-800">₹{combo.price}</td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => deleteItem(combo.id)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB: RECIPE CONFIGURATOR */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configure Recipe Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 h-fit space-y-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Recipe Configurator</h3>
            
            {/* Select Menu Item */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Select Food / Drink</label>
              <select
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                value={selectedRecipeItem}
                onChange={handleRecipeItemSelect}
              >
                <option value="">-- Choose Menu Item --</option>
                {menuItems.filter(item => !item.isCombo).map(item => (
                  <option key={item.id} value={item.id}>{item.image} {item.name}</option>
                ))}
              </select>
            </div>

            {selectedRecipeItem && (
              <div className="space-y-4 border-t border-slate-100 pt-4 animate-[fadeIn_0.2s_ease-out]">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Add Ingredient</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Ingredient</label>
                    <select
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                      value={tempIngredientId}
                      onChange={(e) => setTempIngredientId(e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Qty Required</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 0.2"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addIngredientToRecipe}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  + Add Item to Recipe
                </button>
              </div>
            )}
          </div>

          {/* Current Recipe Ingredients List Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 lg:col-span-2 space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">
              Recipe Ingredients {selectedRecipeItem && ` - ${menuItems.find(i => i.id === selectedRecipeItem)?.name}`}
            </h3>
            
            {!selectedRecipeItem ? (
              <div className="py-20 text-center text-slate-400 text-sm font-medium">
                Choose a menu item from the sidebar to view or edit its recipe configuration.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-3">Ingredient</th>
                        <th className="pb-3">Required Qty</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {recipeIngredients.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center text-slate-400 py-10 font-semibold">
                            No ingredients linked yet. Link ingredients to perform auto stock deduction.
                          </td>
                        </tr>
                      ) : (
                        recipeIngredients.map((r, idx) => {
                          const ing = ingredients.find(i => i.id === r.ingredientId);
                          return (
                            <tr key={idx} className="border-b border-slate-50 last:border-0 animate-[fadeIn_0.15s_ease-out]">
                              <td className="py-3.5 font-bold text-slate-800">{ing ? ing.name : 'Unknown Ingredient'}</td>
                              <td className="py-3.5 font-semibold text-slate-600">{r.qty} {ing ? ing.unit : 'unit'}</td>
                              <td className="py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeIngredientFromRecipe(r.ingredientId)}
                                  className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={saveRecipe}
                    className="px-6 py-3 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
                  >
                    Save Configured Recipe 💾
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT MENU ITEM ── */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsItemModalOpen(false)} />
          
          {/* Modal Container */}
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative z-10 overflow-hidden transform scale-100 transition-all animate-[fadeInScale_0.25s_cubic-bezier(0.4,0,0.2,1)] p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                {editingId ? '✏️ Edit Menu Item' : '✨ Add Menu Item'}
              </h3>
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOrUpdate} className="space-y-4 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic Veg Burger"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="Main Course">Main Course</option>
                    <option value="Starters">Starters</option>
                    <option value="Bread">Bread</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Emoji Icon</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 🍔"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={newItem.image}
                    onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="120"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="modal-available"
                  checked={newItem.available}
                  onChange={(e) => setNewItem({ ...newItem, available: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-650 cursor-pointer"
                />
                <label htmlFor="modal-available" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  Available (In Stock)
                </label>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={saving}
                  loadingText={editingId ? 'Saving...' : 'Creating...'}
                  className="flex-1 py-3 bg-[#0F286B] hover:bg-[#1e3a8a] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Create Item'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmState && (
        <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />
      )}
    </div>
  );
};

export default MenuManagement;
