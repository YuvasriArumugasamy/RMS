import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { PageLoader, LoadingButton } from '../components/LoadingSkeleton';
import ConfirmModal from '../components/ConfirmModal';

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  // Form states
  const [newIngredient, setNewIngredient] = useState({ name: '', stock: '', unit: 'kg', threshold: 5 });
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', items: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ingRes, supRes] = await Promise.all([
          api.get('/inventory'),
          api.get('/suppliers'),
        ]);
        if (ingRes.data.success) setIngredients(ingRes.data.data);
        if (supRes.data.success) setSuppliers(supRes.data.data);
      } catch {
        const savedIngredients = localStorage.getItem('ingredients');
        if (savedIngredients) setIngredients(JSON.parse(savedIngredients));
        const savedSuppliers = localStorage.getItem('suppliers');
        if (savedSuppliers) setSuppliers(JSON.parse(savedSuppliers));
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/inventory', {
        name: newIngredient.name, stock: Number(newIngredient.stock),
        unit: newIngredient.unit, threshold: newIngredient.threshold,
      });
      if (data.success) {
        setIngredients(prev => [...prev, data.data]);
        toast.success(`✅ "${newIngredient.name}" added to inventory!`);
        setNewIngredient({ name: '', stock: '', unit: 'kg', threshold: 5 });
      }
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Failed to add ingredient'}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteIngredient = async (id) => {
    setConfirmState({
      title: 'Delete Ingredient',
      message: 'This ingredient will be permanently removed from inventory. Stock records will be lost.',
      confirmLabel: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await api.delete(`/inventory/${id}`);
          setIngredients(prev => prev.filter(i => (i._id || i.id) !== id));
          toast.success('🗑️ Ingredient deleted');
        } catch (err) {
          toast.error(`❌ ${err.response?.data?.message || 'Delete failed'}`);
        }
      },
    });
  };

  const updateStock = async (id, change) => {
    const item = ingredients.find(i => (i._id || i.id) === id);
    if (!item) return;
    const newStock = Math.max(0, item.stock + change);
    try {
      const { data } = await api.put(`/inventory/${id}`, { stock: newStock });
      if (data.success) setIngredients(prev => prev.map(i => (i._id || i.id) === id ? data.data : i));
    } catch {
      // fallback local update
      setIngredients(prev => prev.map(i => (i._id || i.id) === id ? { ...i, stock: newStock } : i));
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/suppliers', newSupplier);
      if (data.success) {
        setSuppliers(prev => [...prev, data.data]);
        toast.success(`✅ Supplier "${newSupplier.name}" added!`);
        setNewSupplier({ name: '', contact: '', items: '' });
      }
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Failed to add supplier'}`);
    }
  };

  const deleteSupplier = async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => (s._id || s.id) !== id));
      toast.success('🗑️ Supplier removed');
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Delete failed'}`);
    }
  };

  // Dynamic emoji selection helper
  const getItemEmoji = (name) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes('tomato')) return '🍅';
    if (lowercase.includes('cheese')) return '🧀';
    if (lowercase.includes('milk') || lowercase.includes('cream') || lowercase.includes('dairy') || lowercase.includes('butter')) return '🥛';
    if (lowercase.includes('onion')) return '🧅';
    if (lowercase.includes('potato')) return '🥔';
    if (lowercase.includes('bread') || lowercase.includes('bun') || lowercase.includes('naan') || lowercase.includes('flour')) return '🍞';
    if (lowercase.includes('chicken') || lowercase.includes('meat') || lowercase.includes('beef') || lowercase.includes('mutton') || lowercase.includes('fish')) return '🥩';
    if (lowercase.includes('egg')) return '🥚';
    if (lowercase.includes('rice') || lowercase.includes('grain')) return '🌾';
    if (lowercase.includes('sugar') || lowercase.includes('salt') || lowercase.includes('spice') || lowercase.includes('masala')) return '🧂';
    if (lowercase.includes('coffee') || lowercase.includes('tea') || lowercase.includes('drink') || lowercase.includes('mojito') || lowercase.includes('water')) return '🥤';
    return '📦';
  };

  const lowStockCount = ingredients.filter(i => i.status === 'Low Stock').length;

  if (pageLoading) return <PageLoader message="Loading Inventory..." />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out] font-sans pb-12">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventory & Supply Chain</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage raw materials, low stock alerts, and vendor contacts.</p>
        </div>

        {/* Tab Buttons (mockup layout style) */}
        <div className="flex space-x-1.5 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'stock' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            📦 Stock Status 
            {lowStockCount > 0 && (
              <span className="bg-red-500 text-white rounded-full h-4 w-4 text-[8px] font-black flex items-center justify-center animate-pulse">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'suppliers' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🚚 Suppliers
          </button>
        </div>
      </div>

      {/* TAB: STOCK STATUS */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Ingredient Card Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 h-fit space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Add Raw Material</h3>
            
            <form onSubmit={handleAddIngredient} className="space-y-4 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomatoes"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    placeholder="10.0"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={newIngredient.stock}
                    onChange={(e) => setNewIngredient({ ...newIngredient, stock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Unit</label>
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                  >
                    <option value="kg">kg</option>
                    <option value="ltr">ltr</option>
                    <option value="pcs">pcs</option>
                    <option value="gms">gms</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  required
                  placeholder="5"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newIngredient.threshold}
                  onChange={(e) => setNewIngredient({ ...newIngredient, threshold: Number(e.target.value) })}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/10 cursor-pointer transition-all"
              >
                Add Inventory Item
              </button>
            </form>
          </div>

          {/* Stock monitor table list */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 lg:col-span-2 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Live Stock Monitor</h3>
              <span className="text-[10px] text-slate-400 font-bold">Adjust stock counts on hover</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3.5">Ingredient</th>
                    <th className="pb-3.5">Current Stock</th>
                    <th className="pb-3.5">Alert Level</th>
                    <th className="pb-3.5">Status</th>
                    <th className="pb-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {ingredients.map((item) => {
                    const id = item._id || item.id;
                    const isLow = item.status === 'Low Stock';
                    const stockVal = Number(item.stock) || 0;
                    const limitVal = Number(item.threshold) || 5;
                    const percent = Math.min(100, Math.max(5, (stockVal / (limitVal * 2)) * 100));

                    return (
                      <tr key={id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/20 transition-colors group">
                        <td className="py-4 flex items-center space-x-3.5">
                          <span className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100/50 flex items-center justify-center text-lg shadow-sm">
                            {getItemEmoji(item.name)}
                          </span>
                          <span className="font-extrabold text-slate-800">{item.name}</span>
                        </td>
                        <td className="py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-3">
                              <span className="font-black text-slate-800">{stockVal.toFixed(1)} {item.unit}</span>
                              
                              {/* Stock modifier quick adjust buttons */}
                              <div className="flex bg-slate-100 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => updateStock(id, -1)} 
                                  className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-red-500 font-black cursor-pointer text-xs"
                                >
                                  -
                                </button>
                                <button 
                                  onClick={() => updateStock(id, 1)} 
                                  className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-emerald-500 font-black cursor-pointer text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            
                            {/* Stock status progress bar indicator */}
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 font-bold text-slate-500">{item.threshold} {item.unit}</td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider leading-none ${
                              isLow
                                ? 'bg-red-50 text-red-500 border border-red-150 animate-pulse'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-150'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => deleteIngredient(id)} 
                            className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {ingredients.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-16 text-slate-400 font-bold text-xs">
                        No ingredients tracked yet. Click Add raw material to populate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Supplier Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 h-fit space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Register Supplier</h3>
            
            <form onSubmit={handleAddSupplier} className="space-y-4 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Company / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FreshFarm Co."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Contact No. / Email</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9988776655"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newSupplier.contact}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Provides (Items)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Veggies, Dairy"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newSupplier.items}
                  onChange={(e) => setNewSupplier({ ...newSupplier, items: e.target.value })}
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3.5 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/10 cursor-pointer transition-all"
              >
                Add Supplier
              </button>
            </form>
          </div>

          {/* Suppliers List directory grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 lg:col-span-2 space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight border-b border-slate-50 pb-3">Supplier Directory</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suppliers.length === 0 ? (
                <p className="col-span-2 text-center text-slate-400 text-xs py-16 font-bold">No suppliers registered.</p>
              ) : (
                suppliers.map(s => (
                  <div 
                    key={s._id || s.id} 
                    className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-indigo-150 transition-all duration-300 group relative shadow-sm"
                  >
                    <button 
                      onClick={() => deleteSupplier(s._id || s.id)} 
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 font-extrabold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ✕
                    </button>
                    
                    <span className="w-8 h-8 rounded-lg bg-[#0F286B]/10 text-[#0F286B] flex items-center justify-center text-xs font-black mb-3">
                      🏢
                    </span>
                    
                    <h4 className="font-extrabold text-slate-850 text-sm mb-1">{s.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.items}</p>
                    
                    <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100/70">
                      <span className="bg-indigo-50/80 text-indigo-700 px-3 py-2 rounded-xl font-bold text-[10.5px] w-full text-center truncate shadow-sm">
                        📞 {s.contact}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmState && (
        <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />
      )}
    </div>
  );
};

export default InventoryManagement;
