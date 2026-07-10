import { useState } from 'react';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([
    { id: 1, name: 'John Doe', phone: '9876543210', totalOrders: 25, totalSpend: 12450, loyaltyPoints: 120 },
    { id: 2, name: 'Alice Smith', phone: '9876543211', totalOrders: 18, totalSpend: 8760, loyaltyPoints: 80 },
    { id: 3, name: 'Robert Brown', phone: '9876543212', totalOrders: 32, totalSpend: 16230, loyaltyPoints: 220 },
    { id: 4, name: 'Emma Wilson', phone: '9876543213', totalOrders: 15, totalSpend: 6880, loyaltyPoints: 60 },
    { id: 5, name: 'David Lee', phone: '9876543214', totalOrders: 28, totalSpend: 13450, loyaltyPoints: 150 },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', totalOrders: 0, totalSpend: 0, loyaltyPoints: 0 });

  const handleAdd = (e) => {
    e.preventDefault();
    setCustomers([...customers, { ...newCustomer, id: Date.now() }]);
    setShowAddModal(false);
    setNewCustomer({ name: '', phone: '', totalOrders: 0, totalSpend: 0, loyaltyPoints: 0 });
  };

  const deleteCustomer = (id) => {
    setCustomers(customers.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Customer Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-650/15"
        >
          + Add Customer
        </button>
      </div>

      {/* Customer Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="pb-4">Name</th>
                <th className="pb-4">Phone</th>
                <th className="pb-4">Total Orders</th>
                <th className="pb-4">Total Spend</th>
                <th className="pb-4">Loyalty Points</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="py-4 font-bold text-slate-800">{c.name}</td>
                  <td className="py-4 text-slate-500 font-medium">{c.phone}</td>
                  <td className="py-4 text-slate-500 font-medium">{c.totalOrders}</td>
                  <td className="py-4 font-bold text-slate-800">₹{c.totalSpend}</td>
                  <td className="py-4 text-slate-500 font-medium">
                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-bold">
                      {c.loyaltyPoints} pts
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button onClick={() => deleteCustomer(c.id)} className="text-red-500 hover:text-red-700 font-semibold text-xs">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Add Customer Profile</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full mt-1 p-3 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Phone</label>
                <input
                  type="text"
                  required
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full mt-1 p-3 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm"
                >
                  Add Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
