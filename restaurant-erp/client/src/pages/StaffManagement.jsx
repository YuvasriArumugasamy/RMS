import React, { useState, useEffect } from 'react';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'permissions'
  
  // Attendance & Shift Form
  const [selectedStaffForShift, setSelectedStaffForShift] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

  // Add New Staff Form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Waiter');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // Permissions State
  const [rolePermissions, setRolePermissions] = useState({});

  // Date-wise Attendance State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState(null);

  // Edit Staff State
  const [editingStaff, setEditingStaff] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    const savedStaff = localStorage.getItem('staff');
    if (savedStaff) setStaffList(JSON.parse(savedStaff));

    const savedRoles = localStorage.getItem('rolePermissions');
    if (savedRoles) setRolePermissions(JSON.parse(savedRoles));
  }, []);

  const saveStaff = (updated) => {
    setStaffList(updated);
    localStorage.setItem('staff', JSON.stringify(updated));
  };

  const saveRoles = (updated) => {
    setRolePermissions(updated);
    localStorage.setItem('rolePermissions', JSON.stringify(updated));
    // Usually need a reload or state broadcast to update sidebar, for demo alert suffices
  };

  const markAttendance = (id, status) => {
    const updated = staffList.map(s => {
      if (s.id === id) {
        const attList = s.attendance || [];
        const existingIdx = attList.findIndex(a => a.date === selectedDate);
        let updatedAtt = [...attList];
        if (existingIdx > -1) {
          updatedAtt[existingIdx] = { ...updatedAtt[existingIdx], status };
        } else {
          updatedAtt.push({ date: selectedDate, status });
        }
        
        // Update general status if it is today's date
        const todayStr = new Date().toISOString().split('T')[0];
        const newStatus = selectedDate === todayStr ? status : s.status;

        return { ...s, status: newStatus, attendance: updatedAtt };
      }
      return s;
    });
    saveStaff(updated);

    if (selectedStaffForHistory && selectedStaffForHistory.id === id) {
      const updatedStaff = updated.find(s => s.id === id);
      setSelectedStaffForHistory(updatedStaff);
    }
  };

  const getAttendanceForDate = (staff, date) => {
    const record = (staff.attendance || []).find(a => a.date === date);
    return record ? record.status : '';
  };

  const deleteStaff = (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      const updated = staffList.filter(s => s.id !== id);
      saveStaff(updated);
    }
  };

  const addStaff = (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPhone) return;
    const newEmployee = {
      id: Date.now(),
      name: newStaffName,
      role: newStaffRole,
      phone: newStaffPhone,
      status: 'Active',
      shift: 'None',
      attendance: []
    };
    saveStaff([...staffList, newEmployee]);
    setNewStaffName('');
    setNewStaffRole('Waiter');
    setNewStaffPhone('');
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditRole(staff.role);
    setEditPhone(staff.phone || '');
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    const updated = staffList.map(s => 
      s.id === editingStaff.id 
        ? { ...s, name: editName, role: editRole, phone: editPhone }
        : s
    );
    saveStaff(updated);
    setEditingStaff(null);
  };

  const assignShift = (e) => {
    e.preventDefault();
    if (!selectedStaffForShift || !shiftStart || !shiftEnd) return;

    const updated = staffList.map(s => {
      if (s.id === Number(selectedStaffForShift)) {
        return { ...s, shift: `${shiftStart} - ${shiftEnd}` };
      }
      return s;
    });

    saveStaff(updated);
    setSelectedStaffForShift('');
    setShiftStart('');
    setShiftEnd('');
    alert("Shift assigned successfully!");
  };

  const togglePermission = (role, perm) => {
    const currentPerms = rolePermissions[role] || [];
    let updatedPerms;
    if (currentPerms.includes(perm)) {
      updatedPerms = currentPerms.filter(p => p !== perm);
    } else {
      updatedPerms = [...currentPerms, perm];
    }
    
    saveRoles({
      ...rolePermissions,
      [role]: updatedPerms
    });
  };

  const allAvailablePermissions = [
    'Dashboard', 'Menu', 'Tables', 'Orders', 'Kitchen',
    'Inventory', 'Customers', 'Billing', 'Staff', 'Reports', 'AI Hub'
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">HR & Staff Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage shifts, attendance, and role-based access controls.</p>
        </div>

        <div className="flex space-x-2 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'directory' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            👥 Directory & Shifts
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            🔐 Access Control
          </button>
        </div>
      </div>

      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {/* Add New Employee Form */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">+</span>
                Add New Employee
              </h3>
              <form onSubmit={addStaff} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karthik Raja"
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Role</label>
                    <select
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                    >
                      <option>Waiter</option>
                      <option>Chef</option>
                      <option>Cashier</option>
                      <option>Manager</option>
                      <option>Delivery</option>
                      <option>Cleaner</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="98765xxxxx"
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                      value={newStaffPhone}
                      onChange={(e) => setNewStaffPhone(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10 text-xs"
                >
                  Add Employee
                </button>
              </form>
            </div>

            {/* Shift Assignment Form */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Assign Shift</h3>
              <form onSubmit={assignShift} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Select Staff</label>
                  <select
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                    value={selectedStaffForShift}
                    onChange={(e) => setSelectedStaffForShift(e.target.value)}
                  >
                    <option value="">-- Choose Employee --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 text-xs"
                >
                  Save Shift Schedule
                </button>
              </form>
            </div>
          </div>

          {/* Directory & Attendance */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800">Employee List & Attendance</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Shift</th>
                    <th className="pb-3 text-center">Attendance</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                      <td className="py-4 font-bold text-slate-800">{staff.name}</td>
                      <td className="py-4 font-semibold text-slate-500 text-xs">{staff.role}</td>
                      <td className="py-4 font-semibold text-slate-500 text-xs">{staff.shift}</td>
                      <td className="py-4 text-center">
                         <div className="flex justify-center bg-slate-100 rounded-xl p-1 w-fit mx-auto">
                            <button 
                              onClick={() => markAttendance(staff.id, 'Present')}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                getAttendanceForDate(staff, selectedDate) === 'Present' 
                                  ? 'bg-green-500 text-white shadow-sm' 
                                  : 'text-slate-500 hover:bg-slate-200'
                              }`}
                            >Present</button>
                            <button 
                              onClick={() => markAttendance(staff.id, 'Absent')}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                getAttendanceForDate(staff, selectedDate) === 'Absent' 
                                  ? 'bg-red-500 text-white shadow-sm' 
                                  : 'text-slate-500 hover:bg-slate-200'
                              }`}
                            >Absent</button>
                         </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="w-8 h-8 flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white border border-amber-100 rounded-lg transition-all"
                            title="Edit Employee"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => setSelectedStaffForHistory(staff)}
                            className="w-8 h-8 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-100 rounded-lg transition-all"
                            title="View Attendance History"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteStaff(staff.id)}
                            className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 rounded-lg transition-all"
                            title="Remove Employee"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staffList.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium text-sm">No staff records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
           <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Role-Based Access Control (RBAC)</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Configure which pages each role can access. Changes require a refresh to reflect in the sidebar.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {Object.keys(rolePermissions).map(role => {
               // Protect Admin from being locked out of Staff & Settings ideally, but for demo let user toggle anything
               return (
                 <div key={role} className="border border-slate-100 rounded-3xl p-5 bg-slate-50">
                    <h4 className="font-black text-slate-800 text-lg mb-4 capitalize border-b border-slate-200 pb-2">{role} Access</h4>
                    <div className="space-y-3">
                       {allAvailablePermissions.map(perm => {
                         const hasAccess = rolePermissions[role].includes(perm);
                         return (
                           <label key={perm} className="flex items-center justify-between group cursor-pointer">
                              <span className={`text-sm font-bold ${hasAccess ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {perm}
                              </span>
                              <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${hasAccess ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                 <input 
                                   type="checkbox" 
                                   className="hidden" 
                                   checked={hasAccess} 
                                   onChange={() => togglePermission(role, perm)}
                                 />
                                 <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform ${hasAccess ? 'translate-x-5' : ''}`}></div>
                              </div>
                           </label>
                         );
                       })}
                    </div>
                 </div>
               );
             })}
            </div>
         </div>
       )}

      {/* Attendance History Modal */}
      {selectedStaffForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4 relative animate-[scaleUp_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Attendance History</h3>
                <p className="text-xs text-slate-400 font-semibold">{selectedStaffForHistory.name} ({selectedStaffForHistory.role})</p>
              </div>
              <button 
                onClick={() => setSelectedStaffForHistory(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {(!selectedStaffForHistory.attendance || selectedStaffForHistory.attendance.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  No attendance records found for this employee.
                </div>
              ) : (
                [...selectedStaffForHistory.attendance]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((record, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border border-slate-50 hover:border-slate-100 bg-slate-50/50 rounded-2xl transition">
                      <span className="text-xs font-bold text-slate-700">
                        {new Date(record.date).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                        record.status === 'Present' 
                          ? 'bg-green-50 text-green-600 border border-green-100' 
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStaffForHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4 relative animate-[scaleUp_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Edit Employee</h3>
                <p className="text-xs text-slate-400 font-semibold">Update details for {editingStaff.name}</p>
              </div>
              <button 
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Role</label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    <option>Waiter</option>
                    <option>Chef</option>
                    <option>Cashier</option>
                    <option>Manager</option>
                    <option>Delivery</option>
                    <option>Cleaner</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
     </div>
   );
};

export default StaffManagement;
