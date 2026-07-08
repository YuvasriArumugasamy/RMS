import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_COLORS = {
  Available:   { dot:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-200',  card:'border-emerald-200 bg-emerald-50/40',  icon:'text-emerald-600' },
  Reserved:    { dot:'bg-amber-400',   badge:'bg-amber-50  text-amber-700   border-amber-200',    card:'border-amber-200  bg-amber-50/40',    icon:'text-amber-600'   },
  Maintenance: { dot:'bg-slate-400',   badge:'bg-slate-50  text-slate-600   border-slate-200',    card:'border-slate-200  bg-slate-50/40',    icon:'text-slate-500'   },
  Occupied:    { dot:'bg-red-500',     badge:'bg-red-50    text-red-700     border-red-200',      card:'border-red-200    bg-red-50/40',      icon:'text-red-500'     },
};

const RESERVATION_STATUS_STYLES = {
  Pending:   'bg-blue-50   text-blue-700   border-blue-200',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Seated:    'bg-indigo-50  text-indigo-700  border-indigo-200',
  Cancelled: 'bg-slate-50   text-slate-500   border-slate-200',
  'No-show': 'bg-red-50     text-red-600     border-red-200',
};

const TableIcon = ({ color = 'currentColor' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="9" width="18" height="2" rx="1"/><line x1="8" y1="11" x2="8" y2="20"/>
    <line x1="16" y1="11" x2="16" y2="20"/><line x1="5" y1="20" x2="19" y2="20"/>
    <line x1="12" y1="3" x2="12" y2="9"/>
  </svg>
);

const TableManagement = () => {
  const { on, connected } = useSocket();
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'reservations'
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [loadingRes, setLoadingRes] = useState(false);

  // Table map state
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount] = useState('4');
  const [autoMessage, setAutoMessage] = useState('');
  const [activeQRTable, setActiveQRTable] = useState(null);
  const [editTable, setEditTable] = useState(null);

  // Reservation form state
  const [showResModal, setShowResModal] = useState(false);
  const [resForm, setResForm] = useState({
    customerName: '', customerPhone: '', partySize: '2',
    date: new Date().toISOString().split('T')[0],
    time: '19:00', specialRequest: '', tableId: '', tableName: '',
  });
  const [savingRes, setSavingRes] = useState(false);

  // Calendar filter
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Fetch tables ────────────────────────────────────────────
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const { data } = await api.get('/tables');
        if (data.success && data.data.length > 0) {
          setTables(data.data);
          localStorage.setItem('tables', JSON.stringify(data.data));
          return;
        }
      } catch {}
      // Fallback to localStorage
      const saved = localStorage.getItem('tables');
      if (saved) {
        setTables(JSON.parse(saved));
      } else {
        const defaults = [
          { id:1, name:'Table 01', capacity:2, status:'Available', reservation:null },
          { id:2, name:'Table 02', capacity:4, status:'Available', reservation:null },
          { id:3, name:'Table 03', capacity:6, status:'Available', reservation:null },
          { id:4, name:'Table 04', capacity:8, status:'Available', reservation:null },
          { id:5, name:'Table 05', capacity:4, status:'Available', reservation:null },
        ];
        setTables(defaults);
        localStorage.setItem('tables', JSON.stringify(defaults));
      }
    };
    fetchTables();
  }, []);

  // ── Fetch reservations ──────────────────────────────────────
  const fetchReservations = useCallback(async (date) => {
    setLoadingRes(true);
    try {
      const { data } = await api.get(`/reservations${date ? `?date=${date}` : ''}`);
      if (data.success) setReservations(data.data);
    } catch {
      const saved = localStorage.getItem('reservations');
      if (saved) setReservations(JSON.parse(saved));
    } finally {
      setLoadingRes(false);
    }
  }, []);

  useEffect(() => { fetchReservations(''); }, [fetchReservations]);

  // ── Socket listeners ───────────────────────────────────────
  useEffect(() => {
    const handleTableUpdate = (update) => {
      setTables(prev => prev.map(t =>
        (t._id || t.id) === (update.tableId || update._id) || t.name === update.name || t.name === update.table
          ? { ...t, status: update.status }
          : t
      ));
    };
    const handleNewReservation = (res) => {
      setReservations(prev => {
        if (prev.find(r => (r._id || r.id) === (res._id || res.id))) return prev;
        toast.info(`📅 New Reservation: ${res.customerName} — ${res.tableName} at ${res.time}`);
        return [res, ...prev];
      });
    };
    const handleResUpdate = (update) => {
      setReservations(prev => prev.map(r =>
        (r._id || r.id) === update.id ? { ...r, status: update.status } : r
      ));
    };
    const c1 = on?.('table-update', handleTableUpdate);
    const c2 = on?.('new-reservation', handleNewReservation);
    const c3 = on?.('reservation-update', handleResUpdate);
    return () => { c1?.(); c2?.(); c3?.(); };
  }, [on]);

  const saveTables = (updated) => {
    setTables(updated);
    localStorage.setItem('tables', JSON.stringify(updated));
  };

  // ── Open reservation modal for a table ─────────────────────
  const openResModal = (table) => {
    setResForm(f => ({ ...f, tableId: table._id || table.id, tableName: table.name, partySize: String(table.capacity) }));
    setShowResModal(true);
  };

  // ── Submit new reservation ──────────────────────────────────
  const submitReservation = async (e) => {
    e.preventDefault();
    setSavingRes(true);
    const payload = {
      table: resForm.tableId,
      tableName: resForm.tableName,
      customerName: resForm.customerName,
      customerPhone: resForm.customerPhone,
      partySize: parseInt(resForm.partySize),
      date: resForm.date,
      time: resForm.time,
      specialRequest: resForm.specialRequest,
    };
    try {
      const { data } = await api.post('/reservations', payload);
      if (data.success) {
        setReservations(prev => [data.data, ...prev]);
        saveTables(tables.map(t => (t._id || t.id) === resForm.tableId || t.name === resForm.tableName
          ? { ...t, status: 'Reserved', reservation: { name: resForm.customerName, time: resForm.time } }
          : t
        ));
        toast.success(`📅 Reserved ${resForm.tableName} for ${resForm.customerName} at ${resForm.time}`);
        setShowResModal(false);
        setResForm(f => ({ ...f, customerName:'', customerPhone:'', specialRequest:'' }));
      }
    } catch (err) {
      // Offline fallback
      const fallback = { id: `RES-${Date.now()}`, ...payload, status: 'Pending', reservationId: `RES-${Date.now().toString().slice(-6)}` };
      const updated = [fallback, ...reservations];
      setReservations(updated);
      localStorage.setItem('reservations', JSON.stringify(updated));
      saveTables(tables.map(t => (t._id || t.id) === resForm.tableId || t.name === resForm.tableName
        ? { ...t, status: 'Reserved', reservation: { name: resForm.customerName, time: resForm.time } }
        : t
      ));
      toast.warning(err?.response?.data?.message || '⚠️ Offline — reservation saved locally');
      setShowResModal(false);
    } finally {
      setSavingRes(false);
    }
  };

  // ── Update reservation status ───────────────────────────────
  const updateResStatus = async (res, newStatus) => {
    const id = res._id || res.id;
    try {
      await api.put(`/reservations/${id}`, { status: newStatus });
      setReservations(prev => prev.map(r => (r._id || r.id) === id ? { ...r, status: newStatus } : r));
      if (newStatus === 'Seated') {
        saveTables(tables.map(t => t.name === res.tableName ? { ...t, status: 'Occupied', reservation: null } : t));
        toast.success(`🪑 ${res.customerName} seated at ${res.tableName}`);
      } else if (newStatus === 'Cancelled' || newStatus === 'No-show') {
        saveTables(tables.map(t => t.name === res.tableName ? { ...t, status: 'Available', reservation: null } : t));
        toast.info(`${newStatus === 'Cancelled' ? '❌' : '👻'} Reservation ${newStatus.toLowerCase()}: ${res.customerName}`);
      } else {
        toast.success(`✅ Reservation confirmed: ${res.customerName}`);
      }
    } catch {
      setReservations(prev => prev.map(r => (r._id || r.id) === id ? { ...r, status: newStatus } : r));
      toast.warning('⚠️ Offline — status updated locally');
    }
  };

  const deleteReservation = async (res) => {
    setConfirmState({
      title: 'Delete Reservation',
      message: `Delete reservation for ${res.customerName}? This will free up the table.`,
      confirmLabel: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        const id = res._id || res.id;
        try {
          await api.delete(`/reservations/${id}`);
        } catch { /* silent offline */ }
        setReservations(prev => prev.filter(r => (r._id || r.id) !== id));
        saveTables(tables.map(t => t.name === res.tableName ? { ...t, status: 'Available', reservation: null } : t));
        toast.success('🗑️ Reservation deleted');
      },
    });
  };

  // ── Auto table assignment ───────────────────────────────────
  const handleAutoAssign = () => {
    const guests = parseInt(guestCount);
    if (isNaN(guests) || guests <= 0) { setAutoMessage('Please enter a valid guest count.'); return; }
    const best = tables.filter(t => t.status === 'Available' && t.capacity >= guests).sort((a, b) => a.capacity - b.capacity)[0];
    if (best) {
      saveTables(tables.map(t => t.id === best.id ? { ...t, status: 'Occupied' } : t));
      setAutoMessage(`Assigned to ${best.name} (Capacity: ${best.capacity})`);
      toast.success(`✅ Auto-assigned ${guests} guests → ${best.name}`);
    } else {
      setAutoMessage('No suitable table available.');
      toast.warning('⚠️ No suitable table available for that guest count.');
    }
  };

  const freeTable = (id) => {
    const t = tables.find(tb => tb.id === id);
    saveTables(tables.map(tb => tb.id === id ? { ...tb, status: 'Available', reservation: null } : tb));
    toast.success(`🟢 ${t?.name || 'Table'} is now Available`);
  };

  const resetAllTables = () => {
    saveTables(tables.map(t => ({ ...t, status: 'Available', reservation: null })));
    setAutoMessage('');
    toast.info('🔄 All tables reset to Available');
  };

  // ── Derived data ────────────────────────────────────────────
  const counts = {
    total:       tables.length,
    available:   tables.filter(t => t.status === 'Available').length,
    reserved:    tables.filter(t => t.status === 'Reserved').length,
    occupied:    tables.filter(t => t.status === 'Occupied').length,
    maintenance: tables.filter(t => t.status === 'Maintenance').length,
  };

  const dateReservations = reservations.filter(r => !calendarDate || r.date === calendarDate);
  const pendingCount     = reservations.filter(r => r.status === 'Pending').length;
  const todayCount       = reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Page Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Table Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage tables, reservations, and walk-in assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border ${connected ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}/>
            {connected ? 'Live Sync' : 'Offline'}
          </span>
          {/* Tabs */}
          <div className="flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
            <button onClick={() => setActiveTab('map')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'map' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              🗺️ Table Map
            </button>
            <button onClick={() => { setActiveTab('reservations'); fetchReservations(''); }} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all relative ${activeTab === 'reservations' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              📅 Reservations
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{pendingCount}</span>}
            </button>
          </div>
          <button onClick={() => setShowResModal(true)} className="px-4 py-2 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md transition-all">
            + New Reservation
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label:'Total',       val:counts.total,       color:'bg-indigo-50  text-indigo-700',  dot:'bg-indigo-400'  },
          { label:'Available',   val:counts.available,   color:'bg-emerald-50 text-emerald-700', dot:'bg-emerald-500' },
          { label:'Occupied',    val:counts.occupied,    color:'bg-red-50     text-red-700',     dot:'bg-red-500'     },
          { label:'Reserved',    val:counts.reserved,    color:'bg-amber-50   text-amber-700',   dot:'bg-amber-400'   },
          { label:'Maintenance', val:counts.maintenance, color:'bg-slate-50   text-slate-600',   dot:'bg-slate-400'   },
        ].map(({ label, val, color, dot }) => (
          <div key={label} className={`${color} rounded-2xl p-4 flex items-center gap-3 border border-white`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dot}`}/>
            <div>
              <p className="text-xl font-extrabold leading-none">{val}</p>
              <p className="text-[10px] font-semibold opacity-70 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TAB: TABLE MAP ── */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left panel */}
          <div className="space-y-4">
            {/* Auto-assign */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Auto Table Assignment</h3>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">No. of Guests</label>
                <input type="number" min="1" value={guestCount} onChange={e => setGuestCount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"/>
              </div>
              <button onClick={handleAutoAssign} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md">
                Find & Occupy Best Table
              </button>
              {autoMessage && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] font-semibold text-blue-700">{autoMessage}</div>
              )}
            </div>

            {/* Edit table panel */}
            {editTable && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Edit {editTable.name}</h3>
                  <button onClick={() => setEditTable(null)} className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-400 rounded-full text-xs font-bold transition flex items-center justify-center">✕</button>
                </div>
                <div className="space-y-2">
                  {['Available','Reserved','Occupied','Maintenance'].map(s => {
                    const sc = STATUS_COLORS[s];
                    return (
                      <button key={s} onClick={() => {
                        saveTables(tables.map(t => (t._id||t.id) === (editTable._id||editTable.id) ? { ...t, status: s } : t));
                        setEditTable(null);
                      }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${editTable.status === s ? `${sc.card} border-current font-bold` : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
                        <span className={`text-sm font-semibold ${editTable.status === s ? '' : 'text-slate-600'}`}>{s}</span>
                        {editTable.status === s && <span className="ml-auto text-[10px] font-bold text-slate-400">Current</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Legend</p>
              <div className="space-y-2">
                {Object.entries(STATUS_COLORS).map(([status, sc]) => (
                  <div key={status} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`}/>
                    <span className="text-xs text-slate-600 font-medium">{status}</span>
                  </div>
                ))}
              </div>
              <button onClick={resetAllTables} className="mt-4 w-full py-2 text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all">
                Reset All Tables
              </button>
            </div>
          </div>

          {/* Table grid */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">Interactive Floor Map</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map(table => {
                const sc = STATUS_COLORS[table.status] || STATUS_COLORS.Available;
                return (
                  <div key={table.id} className={`relative p-4 rounded-2xl border-2 transition-all ${sc.card} ${table.status === 'Available' ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className={`${sc.icon}`}><TableIcon color="currentColor"/></div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditTable(table)} className="w-6 h-6 bg-white/70 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center border border-slate-100" title="Edit status">
                          ✏
                        </button>
                        {table.status === 'Available' && (
                          <button onClick={() => openResModal(table)} className="w-6 h-6 bg-white/70 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center border border-slate-100" title="Reserve">
                            📅
                          </button>
                        )}
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800">{table.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">👥 Capacity: {table.capacity}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${sc.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{table.status}
                    </span>
                    {table.reservation && (
                      <div className="mt-2 pt-2 border-t border-dashed border-amber-300 text-[10px] text-amber-800 space-y-0.5">
                        <p>👤 {table.reservation.name}</p>
                        <p>🕐 {table.reservation.time}</p>
                      </div>
                    )}
                    {(table.status === 'Occupied' || table.status === 'Maintenance') && (
                      <button onClick={() => freeTable(table._id || table.id)}
                        className="mt-2 w-full py-1 text-[9px] font-bold bg-white/70 hover:bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-all">
                        Free Table
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RESERVATIONS ── */}
      {activeTab === 'reservations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: date picker + stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Filter by Date</h3>
              <input type="date" value={calendarDate} onChange={e => setCalendarDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"/>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setCalendarDate(new Date().toISOString().split('T')[0])}
                  className="py-2 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-100">
                  Today
                </button>
                <button onClick={() => setCalendarDate('')}
                  className="py-2 text-xs font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">
                  All Dates
                </button>
              </div>
            </div>

            {/* Reservation summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Summary</h3>
              {[
                { label:'Today\'s Bookings', val: todayCount,                                              color:'text-indigo-600  bg-indigo-50'  },
                { label:'Pending Confirm',   val: reservations.filter(r=>r.status==='Pending').length,    color:'text-amber-600   bg-amber-50'   },
                { label:'Confirmed',         val: reservations.filter(r=>r.status==='Confirmed').length,  color:'text-emerald-600 bg-emerald-50' },
                { label:'Seated Today',      val: reservations.filter(r=>r.status==='Seated' && r.date===new Date().toISOString().split('T')[0]).length, color:'text-blue-600 bg-blue-50' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-600 font-medium">{label}</span>
                  <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg ${color}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: reservation list */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {calendarDate ? `Reservations — ${new Date(calendarDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}` : 'All Reservations'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{dateReservations.length} booking{dateReservations.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => fetchReservations('')} className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all">
                🔄 Refresh
              </button>
            </div>

            {loadingRes ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : dateReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-3">📅</span>
                <p className="text-sm font-bold text-slate-500">No reservations found</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Click "+ New Reservation" to add one</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {dateReservations.map(res => (
                  <div key={res._id || res.id} className={`p-4 rounded-2xl border transition-all ${res.status === 'Cancelled' || res.status === 'No-show' ? 'opacity-50 bg-slate-50' : 'bg-white hover:shadow-sm'} border-slate-100`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                          {res.customerName?.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">{res.customerName}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">📞 {res.customerPhone}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${RESERVATION_STATUS_STYLES[res.status] || RESERVATION_STATUS_STYLES.Pending}`}>
                        {res.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Table</p>
                        <p className="text-xs font-extrabold text-slate-700">{res.tableName}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Time</p>
                        <p className="text-xs font-extrabold text-slate-700">{res.time}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Guests</p>
                        <p className="text-xs font-extrabold text-slate-700">👥 {res.partySize}</p>
                      </div>
                    </div>

                    {res.specialRequest && (
                      <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 font-medium">
                        📝 {res.specialRequest}
                      </p>
                    )}

                    {/* Action buttons */}
                    {!['Cancelled','No-show','Seated'].includes(res.status) && (
                      <div className="flex gap-2 mt-3">
                        {res.status === 'Pending' && (
                          <button onClick={() => updateResStatus(res, 'Confirmed')}
                            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-xl transition-all">
                            ✅ Confirm
                          </button>
                        )}
                        {(res.status === 'Pending' || res.status === 'Confirmed') && (
                          <button onClick={() => updateResStatus(res, 'Seated')}
                            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl transition-all">
                            🪑 Seat Now
                          </button>
                        )}
                        <button onClick={() => updateResStatus(res, 'No-show')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-xl transition-all">
                          No-show
                        </button>
                        <button onClick={() => updateResStatus(res, 'Cancelled')}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-xl transition-all">
                          Cancel
                        </button>
                      </div>
                    )}
                    {['Cancelled','No-show'].includes(res.status) && (
                      <button onClick={() => deleteReservation(res)}
                        className="mt-2 w-full py-1.5 text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all">
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Reservation Modal ── */}
      {showResModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative space-y-5">
            <button onClick={() => setShowResModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">New Reservation</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Book a table in advance for a guest</p>
            </div>

            <form onSubmit={submitReservation} className="space-y-4">
              {/* Table selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Table</label>
                <select required value={resForm.tableId} onChange={e => {
                  const t = tables.find(tb => String(tb._id || tb.id) === e.target.value);
                  setResForm(f => ({ ...f, tableId: e.target.value, tableName: t?.name || '' }));
                }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500">
                  <option value="">-- Choose Table --</option>
                  {tables.filter(t => t.status === 'Available').map(t => (
                    <option key={t._id || t.id} value={t._id || t.id}>{t.name} (Capacity: {t.capacity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Name</label>
                  <input required type="text" placeholder="e.g. Rahul Sharma" value={resForm.customerName} onChange={e => setResForm(f => ({...f, customerName: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</label>
                  <input required type="tel" placeholder="+91 9999999999" value={resForm.customerPhone} onChange={e => setResForm(f => ({...f, customerPhone: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                  <input required type="date" value={resForm.date} min={new Date().toISOString().split('T')[0]} onChange={e => setResForm(f => ({...f, date: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Time</label>
                  <input required type="time" value={resForm.time} onChange={e => setResForm(f => ({...f, time: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Guests</label>
                  <input required type="number" min="1" value={resForm.partySize} onChange={e => setResForm(f => ({...f, partySize: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"/>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Special Request (optional)</label>
                <textarea rows="2" placeholder="e.g. Birthday celebration, window seat..." value={resForm.specialRequest} onChange={e => setResForm(f => ({...f, specialRequest: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-500"/>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowResModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={savingRes}
                  className="flex-1 py-3 bg-[#f97316] hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-orange-400/20">
                  {savingRes ? 'Booking...' : '📅 Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmState && (
        <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />
      )}
    </div>
  );
};

export default TableManagement;
