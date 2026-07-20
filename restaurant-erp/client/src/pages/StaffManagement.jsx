import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState(() => {
    try { return JSON.parse(localStorage.getItem('staff') || '[]'); } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'permissions'
  const [showAddModal, setShowAddModal] = useState(false);

  // Attendance & Shift Form
  const [selectedStaffForShift, setSelectedStaffForShift] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

  // Add New Staff Form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Waiter');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // Permissions State
  const [rolePermissions, setRolePermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rolePermissions') || '{}'); } catch { return {}; }
  });

  // Date-wise Attendance State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState(null);

  // Attendance Override State
  const [overrideStaff, setOverrideStaff] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('Present');
  const [overrideClockIn, setOverrideClockIn] = useState('09:00 AM');
  const [overrideClockOut, setOverrideClockOut] = useState('');
  const [overrideHours, setOverrideHours] = useState(0);

  // Edit Staff State
  const [editingStaff, setEditingStaff] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, permRes] = await Promise.all([
          api.get('/staff'),
          api.get('/settings/permissions'),
        ]);
        if (staffRes.data.success) {
          setStaffList(staffRes.data.data);
          localStorage.setItem('staff', JSON.stringify(staffRes.data.data));
        }
        if (permRes.data.success) {
          setRolePermissions(permRes.data.data);
          localStorage.setItem('rolePermissions', JSON.stringify(permRes.data.data));
        }
      } catch {
        // Cache already shown above — silent fail
      }
    };
    fetchData();
  }, []);

  const saveStaff = (updated) => {
    setStaffList(updated);
    localStorage.setItem('staff', JSON.stringify(updated));
  };

  const saveRoles = async (updated) => {
    setRolePermissions(updated);
    localStorage.setItem('rolePermissions', JSON.stringify(updated));
    try {
      // Persist each changed role
      for (const [role, perms] of Object.entries(updated)) {
        await api.put('/settings/permissions', { role, permissions: perms });
      }
    } catch { /* silent — local state already updated */ }
  };

  const markAttendance = async (id, status) => {
    try {
      const { data } = await api.put(`/staff/${id}/attendance`, { date: selectedDate, status });
      if (data.success) {
        setStaffList(prev => prev.map(s => (s._id || s.id) === id ? data.data : s));
        if (selectedStaffForHistory?._id === id || selectedStaffForHistory?.id === id) {
          setSelectedStaffForHistory(data.data);
        }
        toast.success(`${status === 'Present' ? '✅' : '❌'} Attendance marked: ${status}`);
      }
    } catch {
      // fallback local
      const updated = staffList.map(s => {
        if ((s._id || s.id) !== id) return s;
        const att = [...(s.attendance || [])];
        const idx = att.findIndex(a => a.date === selectedDate);
        if (idx > -1) att[idx] = { ...att[idx], status };
        else att.push({ date: selectedDate, status });
        return { ...s, attendance: att };
      });
      saveStaff(updated);
      toast.warning('⚠️ Offline — attendance saved locally');
    }
  };

  const getAttendanceRecord = (staff, date) => {
    return (staff.attendance || []).find(a => a.date === date) || null;
  };

  const getAttendanceForDate = (staff, date) => {
    const record = getAttendanceRecord(staff, date);
    return record ? record.status : '';
  };

  const openOverrideModal = (staff) => {
    const rec = getAttendanceRecord(staff, selectedDate);
    setOverrideStaff(staff);
    setOverrideStatus(rec?.status || 'Present');
    setOverrideClockIn(rec?.clockInTime || '09:00 AM');
    setOverrideClockOut(rec?.clockOutTime || '');
    setOverrideHours(rec?.totalHours || 0);
  };

  const saveOverride = async (e) => {
    e.preventDefault();
    if (!overrideStaff) return;
    const id = overrideStaff._id || overrideStaff.id;
    try {
      const { data } = await api.put(`/staff/${id}/attendance`, {
        date: selectedDate,
        status: overrideStatus,
        clockInTime: overrideClockIn,
        clockOutTime: overrideClockOut,
        totalHours: parseFloat(overrideHours) || 0,
      });
      if (data.success) {
        setStaffList(prev => prev.map(s => (s._id || s.id) === id ? data.data : s));
        if (selectedStaffForHistory?._id === id || selectedStaffForHistory?.id === id) {
          setSelectedStaffForHistory(data.data);
        }
        toast.success(`✅ Attendance updated for ${overrideStaff.name}`);
      }
      setOverrideStaff(null);
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Override failed'}`);
    }
  };

  const deleteStaff = async (id) => {
    setConfirmState({
      title: 'Delete Employee',
      message: 'Are you sure you want to permanently delete this employee? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await api.delete(`/staff/${id}`);
          setStaffList(prev => prev.filter(s => (s._id || s.id) !== id));
          toast.success('🗑️ Employee deleted');
        } catch (err) {
          toast.error(`❌ ${err.response?.data?.message || 'Delete failed'}`);
        }
      },
    });
  };

  const addStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPhone) return;
    try {
      const { data } = await api.post('/staff', {
        name: newStaffName, role: newStaffRole, phone: newStaffPhone
      });
      if (data.success) {
        setStaffList(prev => [...prev, data.data]);
        toast.success(`✅ ${newStaffName} added! Login: ${data.credentials?.username || ''}`);
        if (data.credentials) {
          toast.info(`🔑 Default password: ${data.credentials.defaultPassword || 'Staff@123'}`, { autoClose: 8000 });
        }
        setNewStaffName(''); setNewStaffRole('Waiter'); setNewStaffPhone('');
      }
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Failed to add staff'}`);
    }
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditRole(staff.role);
    setEditPhone(staff.phone || '');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    const id = editingStaff._id || editingStaff.id;
    try {
      const { data } = await api.put(`/staff/${id}`, {
        name: editName, role: editRole, phone: editPhone
      });
      if (data.success) {
        setStaffList(prev => prev.map(s => (s._id || s.id) === id ? data.data : s));
        toast.success(`✅ ${editName} updated!`);
      }
      setEditingStaff(null);
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Update failed'}`);
    }
  };

  const assignShift = async (e) => {
    e.preventDefault();
    if (!selectedStaffForShift || !shiftStart || !shiftEnd) return;
    try {
      const { data } = await api.put(`/staff/${selectedStaffForShift}`, {
        shift: `${shiftStart} - ${shiftEnd}`
      });
      if (data.success) {
        setStaffList(prev => prev.map(s => (s._id || s.id) === selectedStaffForShift ? data.data : s));
        toast.success(`⏰ Shift assigned: ${shiftStart} - ${shiftEnd}`);
      }
      setSelectedStaffForShift(''); setShiftStart(''); setShiftEnd('');
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.message || 'Shift assign failed'}`);
    }
  };

  const togglePermission = async (role, perm) => {
    const currentPerms = rolePermissions[role] || [];
    const updatedPerms = currentPerms.includes(perm)
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];
    const updated = { ...rolePermissions, [role]: updatedPerms };
    setRolePermissions(updated);
    try {
      await api.put('/settings/permissions', { role, permissions: updatedPerms });
    } catch { /* silent */ }
  };

  const allAvailablePermissions = [
    'Dashboard', 'Menu', 'Tables', 'Orders', 'Kitchen',
    'Inventory', 'Customers', 'Billing', 'Staff', 'Reports', 'AI Hub'
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-[fadeIn_0.3s_ease-out] pb-12">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">HR & Staff Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage shifts, attendance, and role-based access controls.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tab Selection */}
          <div className="flex space-x-1.5 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'directory' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              👥 Directory & Shifts
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'permissions' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              🔐 Access Control
            </button>
          </div>

          {/* Add Staff Action (Modal trigger) */}
          {activeTab === 'directory' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-emerald-600/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="text-sm font-black">+</span> Add Staff
            </button>
          )}
        </div>
      </div>

      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">

            {/* Quick Metrics Dashboard */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">Total Staff</span>
                <span className="text-lg font-black text-[#0F286B] mt-1">{staffList.length}</span>
              </div>
              <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">🟢 Clocked In</span>
                <span className="text-lg font-black text-emerald-600 mt-1">
                  {staffList.filter(s => {
                    const r = getAttendanceRecord(s, selectedDate);
                    return r && r.clockInTime && !r.clockOutTime;
                  }).length}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">⏱️ Shift Done</span>
                <span className="text-lg font-black text-indigo-600 mt-1">
                  {staffList.filter(s => {
                    const r = getAttendanceRecord(s, selectedDate);
                    return r && r.clockOutTime;
                  }).length}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">🔴 Absent Today</span>
                <span className="text-lg font-black text-rose-500 mt-1">
                  {staffList.filter(s => {
                    const r = getAttendanceRecord(s, selectedDate);
                    return r && r.status === 'Absent';
                  }).length}
                </span>
              </div>
            </div>

            {/* Shift Assignment Form */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Assign Shift</h3>
              <form onSubmit={assignShift} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Select Staff</label>
                  <select
                    required
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-sm font-semibold"
                    value={selectedStaffForShift}
                    onChange={(e) => setSelectedStaffForShift(e.target.value)}
                  >
                    <option value="">-- Choose Employee --</option>
                    {staffList.map(s => (
                      <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">End Time</label>
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
                  className="w-full py-3.5 bg-indigo-600 hover:bg-[#0F286B] text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 text-xs cursor-pointer"
                >
                  Save Shift Schedule
                </button>
              </form>
            </div>
          </div>

          {/* Directory & Attendance */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Employee List & Attendance</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Clock In</th>
                    <th className="pb-3">Clock Out</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {staffList.map((staff) => {
                    const id = staff._id || staff.id;
                    const rec = getAttendanceRecord(staff, selectedDate);
                    const isClockedIn = !!(rec?.clockInTime && !rec?.clockOutTime);
                    const isClockedOut = !!rec?.clockOutTime;
                    const isAbsent = rec?.status === 'Absent';

                    return (
                      <tr key={id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                        <td className="py-4 font-bold text-slate-800">
                          <div>
                            <p>{staff.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{staff.shift && staff.shift !== 'None' ? `⏰ ${staff.shift}` : 'No Shift'}</p>
                          </div>
                        </td>
                        <td className="py-4 font-semibold text-slate-500 text-xs">{staff.role}</td>
                        <td className="py-4 text-xs font-extrabold text-slate-700">
                          {rec?.clockInTime ? (
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/60">
                              🟢 {rec.clockInTime}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-4 text-xs font-extrabold text-slate-700">
                          {rec?.clockOutTime ? (
                            <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md border border-rose-100/60">
                              🔴 {rec.clockOutTime}
                            </span>
                          ) : (isClockedIn ? (
                            <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100/60 animate-pulse">
                              In Shift
                            </span>
                          ) : '—')}
                        </td>
                        <td className="py-4 text-xs font-bold text-slate-600">
                          {rec?.totalHours ? `${rec.totalHours} hrs` : (isClockedIn ? 'In Progress' : '—')}
                        </td>
                        <td className="py-4 text-center">
                          {isClockedOut ? (
                            <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                              ⏱️ Shift Done
                            </span>
                          ) : isClockedIn ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                              🟢 Clocked In
                            </span>
                          ) : isAbsent ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                              🔴 Absent
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                              ⏸️ Not Clocked In
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {/* Attendance Override / Quick Edit */}
                            <button
                              onClick={() => openOverrideModal(staff)}
                              className="w-8 h-8 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title="Edit Attendance Timestamps"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(staff)}
                              className="w-8 h-8 flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white border border-amber-100 rounded-lg transition-all cursor-pointer"
                              title="Edit Employee Profile"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setSelectedStaffForHistory(staff)}
                              className="w-8 h-8 flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-100 rounded-lg transition-all cursor-pointer"
                              title="View Attendance History"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteStaff(id)}
                              className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 rounded-lg transition-all cursor-pointer"
                              title="Remove Employee"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {staffList.length === 0 && (
                    <tr><td colSpan="7" className="text-center py-10 text-slate-400 font-medium text-sm">No staff records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (hidden on desktop) */}
            <div className="sm:hidden space-y-4">
              {staffList.length === 0 ? (
                <p className="text-center py-10 text-slate-400 font-medium text-sm">No staff records found.</p>
              ) : (
                staffList.map((staff) => {
                  const id = staff._id || staff.id;
                  const attendanceStatus = getAttendanceForDate(staff, selectedDate);
                  const initials = staff.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const roleColors = {
                    Waiter: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    Chef: 'bg-blue-50 text-blue-700 border-blue-100',
                    Cashier: 'bg-violet-50 text-violet-700 border-violet-100',
                    Manager: 'bg-amber-50 text-amber-700 border-amber-100',
                  };
                  const roleStyle = roleColors[staff.role] || 'bg-slate-50 text-slate-700 border-slate-100';

                  return (
                    <div key={id} className="bg-slate-50/50 border border-slate-100 rounded-3xl p-5 space-y-4 relative shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm select-none">
                            {initials}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{staff.name}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider border leading-none ${roleStyle}`}>
                                {staff.role}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {staff.shift && staff.shift !== 'None' ? `⏰ ${staff.shift}` : 'No Shift'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">Mark Attendance</label>
                        <div className="flex bg-white border border-slate-150 rounded-2xl p-1 w-full gap-1 shadow-sm select-none">
                          <button
                            onClick={() => markAttendance(id, 'Present')}
                            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${attendanceStatus === 'Present'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100'
                              }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => markAttendance(id, 'Absent')}
                            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${attendanceStatus === 'Absent'
                                ? 'bg-red-500 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100'
                              }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100/70">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="px-3.5 py-1.5 flex items-center justify-center gap-1 text-[10.5px] font-extrabold text-amber-650 bg-amber-50 hover:bg-amber-500 hover:text-white border border-amber-100 rounded-xl transition-all cursor-pointer"
                            title="Edit Employee"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setSelectedStaffForHistory(staff)}
                            className="px-3.5 py-1.5 flex items-center justify-center gap-1 text-[10.5px] font-extrabold text-indigo-650 bg-indigo-50 hover:bg-indigo-650 hover:text-white border border-indigo-100 rounded-xl transition-all cursor-pointer"
                            title="View History"
                          >
                            📊 History
                          </button>
                        </div>
                        <button
                          onClick={() => deleteStaff(id)}
                          className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 rounded-xl transition-all cursor-pointer"
                          title="Remove Employee"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
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
                    <div key={index} className="p-3 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-1.5 transition">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-800">
                          {new Date(record.date).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-lg ${record.status === 'Present'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                          {record.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-100/60">
                        {record.clockInTime && <span>🟢 In: <b>{record.clockInTime}</b></span>}
                        {record.clockOutTime && <span>🔴 Out: <b>{record.clockOutTime}</b></span>}
                        {record.totalHours > 0 && <span className="text-indigo-600 font-bold ml-auto">⏱️ {record.totalHours} hrs</span>}
                      </div>
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
      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />

          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative z-10 p-6 space-y-4 animate-[scaleUp_0.2s_ease-out] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-black">+</span>
                Add New Employee
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { addStaff(e); setShowAddModal(false); }} className="space-y-4.5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karthik Raja"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Role</label>
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                  >
                    <option>Waiter</option>
                    <option>Chef</option>
                    <option>Cashier</option>
                    <option>Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="98765xxxxx"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-extrabold rounded-xl text-xs cursor-pointer transition-all border border-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer transition-all"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Override / Timestamps Modal */}
      {overrideStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4 relative animate-[scaleUp_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Attendance Override</h3>
                <p className="text-xs text-slate-400 font-semibold">{overrideStaff.name} ({overrideStaff.role}) · {selectedDate}</p>
              </div>
              <button
                onClick={() => setOverrideStaff(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={saveOverride} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Status</label>
                <select
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Clock In Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:15 AM"
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                    value={overrideClockIn}
                    onChange={(e) => setOverrideClockIn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Clock Out Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 05:30 PM"
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                    value={overrideClockOut}
                    onChange={(e) => setOverrideClockOut(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Hours Worked</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                  value={overrideHours}
                  onChange={(e) => setOverrideHours(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideStaff(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-600/10 cursor-pointer transition-all"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />
      )}
    </div>
  );
};

export default StaffManagement;