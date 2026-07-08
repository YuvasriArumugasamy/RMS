import React, { useState, useEffect } from 'react';
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

  // Load from API
  useEffect(() => {
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
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Failed to save item'}`);
    } finally {
      setSaving(false);
    }
  };
  const startEdit = (item) => {
    setNewItem(item);
    setEditingId(item._id || item.id);
  };

  const deleteItem = async (id) => {
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
        toast.info(`${data.data.available ? '✅' : '❌'} "${item.name}" ${data.data.available ? 'available' : 'unavailable'}`);
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

  if (pageLoading) return <PageLoader message="Loading Menu..." />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-sans">Food & Beverage Menu</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Control single items, combo deals, and ingredient recipes.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-2 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'items' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🍔 Single Items
          </button>
          <button
            onClick={() => setActiveTab('combos')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'combos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🍱 Combo Offers
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'recipes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🍳 Recipe Config
          </button>
        </div>
      </div>

      {/* RENDER TAB: SINGLE ITEMS */}
      {activeTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
            <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option>Main Course</option>
                    <option>Starters</option>
                    <option>Beverages</option>
                    <option>Bread</option>
                    <option>Desserts</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Icon</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 🍔"
                    className="w-full p-3 border border-slate-200 rounded-xl text-center text-sm font-semibold focus:outline-none focus:border-indigo-500"
                    value={newItem.image}
                    onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>
              <LoadingButton
                type="submit"
                loading={saving}
                loadingText={editingId ? 'Updating...' : 'Adding...'}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md text-xs"
              >
                {editingId ? 'Update Menu Item' : 'Add Menu Item'}
              </LoadingButton>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setNewItem({ name: '', category: 'Main Course', price: '', available: true, image: '🍔' });
                  }}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>

          {/* List */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Menu List</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Item</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {menuItems.filter(item => !item.isCombo).map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                      <td className="py-4 flex items-center space-x-3">
                        <span className="text-2xl">{item.image}</span>
                        <span className="font-bold text-slate-800">{item.name}</span>
                      </td>
                      <td className="py-4 text-slate-500 font-semibold">{item.category}</td>
                      <td className="py-4 font-bold text-slate-800">₹{item.price}</td>
                      <td className="py-4">
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            item.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {item.available ? 'In Stock' : 'Out of Stock'}
                        </button>
                      </td>
                      <td className="py-4 text-right space-x-3 font-semibold text-xs">
                        <button onClick={() => startEdit(item)} className="text-indigo-650 hover:underline">Edit</button>
                        <button onClick={() => deleteItem(item._id || item.id)} className="text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB: COMBO OFFERS */}
      {activeTab === 'combos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Combo Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 h-fit space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Create Combo Pack</h3>
            <form onSubmit={handleCreateCombo} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Combo Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Feast"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                    value={comboPrice}
                    onChange={(e) => setComboPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Icon</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl text-center text-sm font-semibold focus:outline-none focus:border-indigo-500"
                    value={comboImage}
                    onChange={(e) => setComboImage(e.target.value)}
                  />
                </div>
              </div>

              {/* Multi Select for Combo Items */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Include Menu Items</label>
                <div className="border border-slate-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50/30">
                  {menuItems.filter(item => !item.isCombo).map(item => (
                    <label key={item.id} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItemsForCombo.includes(item.id)}
                        onChange={() => toggleComboItemSelection(item.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{item.image} {item.name} (₹{item.price})</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10"
              >
                Launch Combo Offer 🚀
              </button>
            </form>
          </div>

          {/* Active Combos List */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Active Combo Offers</h3>
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
                          <span className="font-bold text-slate-800">{combo.name}</span>
                        </td>
                        <td className="py-4 text-xs font-semibold text-slate-500 max-w-xs truncate">
                          {combo.comboItems.map(itemId => {
                            const found = menuItems.find(mi => mi.id === itemId);
                            return found ? `${found.image} ${found.name}` : '';
                          }).join(', ')}
                        </td>
                        <td className="py-4 font-bold text-slate-800">₹{combo.price}</td>
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => deleteItem(combo.id)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs"
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
          {/* Configure Recipe */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 h-fit space-y-5">
            <h3 className="text-lg font-bold text-slate-800">Recipe Configurator</h3>
            
            {/* Select Menu Item */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Select Food / Drink</label>
              <select
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
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
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Add Ingredient</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Ingredient</label>
                    <select
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
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
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addIngredientToRecipe}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
                >
                  + Add Item to Recipe
                </button>
              </div>
            )}
          </div>

          {/* Current Recipe Ingredients List */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
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
                            <tr key={idx} className="border-b border-slate-50 last:border-0">
                              <td className="py-3.5 font-bold text-slate-800">{ing ? ing.name : 'Unknown Ingredient'}</td>
                              <td className="py-3.5 font-semibold text-slate-600">{r.qty} {ing ? ing.unit : 'unit'}</td>
                              <td className="py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeIngredientFromRecipe(r.ingredientId)}
                                  className="text-red-500 hover:text-red-700 font-bold text-xs"
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
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-650/10"
                  >
                    Save Configured Recipe 💾
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmState && (
        <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />
      )}
    </div>
  );
};

export default MenuManagement;
