import React, { useState, useEffect } from 'react';

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'suppliers'
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Form states
  const [newIngredient, setNewIngredient] = useState({ name: '', stock: '', unit: 'kg', threshold: 5 });
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', items: '' });

  useEffect(() => {
    const savedIngredients = localStorage.getItem('ingredients');
    if (savedIngredients) setIngredients(JSON.parse(savedIngredients));

    const savedSuppliers = localStorage.getItem('suppliers');
    if (savedSuppliers) setSuppliers(JSON.parse(savedSuppliers));
  }, []);

  const saveIngredients = (updated) => {
    setIngredients(updated);
    localStorage.setItem('ingredients', JSON.stringify(updated));
  };

  const saveSuppliers = (updated) => {
    setSuppliers(updated);
    localStorage.setItem('suppliers', JSON.stringify(updated));
  };

  const handleAddIngredient = (e) => {
    e.preventDefault();
    const stockVal = Number(newIngredient.stock);
    const added = [
      ...ingredients,
      {
        id: Date.now(),
        name: newIngredient.name,
        stock: stockVal,
        unit: newIngredient.unit,
        threshold: newIngredient.threshold,
        status: stockVal <= newIngredient.threshold ? 'Low Stock' : 'In Stock'
      }
    ];
    saveIngredients(added);
    setNewIngredient({ name: '', stock: '', unit: 'kg', threshold: 5 });
  };

  const deleteIngredient = (id) => {
    saveIngredients(ingredients.filter(i => i.id !== id));
  };

  const updateStock = (id, change) => {
    saveIngredients(ingredients.map(i => {
      if (i.id === id) {
        const newStock = Math.max(0, i.stock + change);
        return {
          ...i,
          stock: newStock,
          status: newStock <= i.threshold ? 'Low Stock' : 'In Stock'
        };
      }
      return i;
    }));
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    const added = [
      ...suppliers,
      {
        id: Date.now(),
        name: newSupplier.name,
        contact: newSupplier.contact,
        items: newSupplier.items
      }
    ];
    saveSuppliers(added);
    setNewSupplier({ name: '', contact: '', items: '' });
  };

  const deleteSupplier = (id) => {
    saveSuppliers(suppliers.filter(s => s.id !== id));
  };

  const lowStockCount = ingredients.filter(i => i.status === 'Low Stock').length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-sans">Inventory & Supply Chain</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage raw materials, low stock alerts, and vendor contacts.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-2 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'stock' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            📦 Stock Status {lowStockCount > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] animate-pulse">{lowStockCount}</span>}
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🚚 Suppliers
          </button>
        </div>
      </div>

      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Ingredient Form */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Add Raw Material</h3>
            <form onSubmit={handleAddIngredient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomatoes"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                    value={newIngredient.stock}
                    onChange={(e) => setNewIngredient({ ...newIngredient, stock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unit</label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                  value={newIngredient.threshold}
                  onChange={(e) => setNewIngredient({ ...newIngredient, threshold: Number(e.target.value) })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 text-xs"
              >
                Add Inventory Item
              </button>
            </form>
          </div>

          {/* List */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Live Stock Monitor</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Ingredient Name</th>
                    <th className="pb-3">Current Stock</th>
                    <th className="pb-3">Alert At</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {ingredients.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors group">
                      <td className="py-4 font-bold text-slate-800">{item.name}</td>
                      <td className="py-4 font-black text-slate-800">
                         <div className="flex items-center space-x-2">
                           <span>{Number(item.stock).toFixed(2)} {item.unit}</span>
                           <div className="flex bg-slate-100 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => updateStock(item.id, -1)} className="px-2 text-slate-500 hover:text-red-500 font-bold">-</button>
                             <button onClick={() => updateStock(item.id, 1)} className="px-2 text-slate-500 hover:text-green-500 font-bold">+</button>
                           </div>
                         </div>
                      </td>
                      <td className="py-4 font-semibold text-slate-500">{item.threshold} {item.unit}</td>
                      <td className="py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'In Stock'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-red-50 text-red-700 border border-red-100 animate-pulse'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-3 font-semibold text-xs">
                        <button onClick={() => deleteIngredient(item.id)} className="text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {ingredients.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium text-sm">No ingredients tracked yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Supplier Form */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Register Supplier</h3>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Company / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FreshFarm Co."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact No. / Email</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9988776655"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                  value={newSupplier.contact}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Provides (Items)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Veggies, Dairy"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                  value={newSupplier.items}
                  onChange={(e) => setNewSupplier({ ...newSupplier, items: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 text-xs"
              >
                Add Supplier
              </button>
            </form>
          </div>

          {/* Suppliers List */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Supplier Directory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {suppliers.length === 0 && (
                 <p className="col-span-2 text-center text-slate-400 text-sm py-10 font-medium">No suppliers registered.</p>
               )}
               {suppliers.map(s => (
                  <div key={s.id} className="p-5 border border-slate-100 rounded-3xl bg-slate-50 hover:bg-white hover:border-indigo-100 transition-all group relative">
                     <button onClick={() => deleteSupplier(s.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                     <h4 className="font-extrabold text-slate-800 text-sm mb-1">{s.name}</h4>
                     <p className="text-xs font-semibold text-slate-500 mb-3">{s.items}</p>
                     <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-bold text-xs w-full text-center truncate">
                          📞 {s.contact}
                        </span>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryManagement;
