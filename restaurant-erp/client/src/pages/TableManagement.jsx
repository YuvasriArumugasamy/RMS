import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_COLORS = {
  Available:   { dot:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-150',  card:'border-emerald-150 bg-white hover:border-emerald-300', icon:'text-emerald-600', text: 'text-emerald-600' },
  Reserved:    { dot:'bg-amber-400',   badge:'bg-amber-50  text-amber-700   border-amber-150',    card:'border-amber-150  bg-white hover:border-amber-300',   icon:'text-amber-600',   text: 'text-amber-600'   },
  Maintenance: { dot:'bg-slate-400',   badge:'bg-slate-50  text-slate-650   border-slate-150',    card:'border-slate-150  bg-white hover:border-slate-300',   icon:'text-slate-500',   text: 'text-slate-500'   },
  Occupied:    { dot:'bg-red-500',     badge:'bg-red-50    text-red-700     border-red-150',      card:'border-red-150    bg-white hover:border-red-300',     icon:'text-red-500',     text: 'text-red-500'     },
};

const RESERVATION_STATUS_STYLES = {
  Pending:   'bg-blue-50   text-blue-700   border-blue-200',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Seated:    'bg-indigo-50  text-indigo-700  border-indigo-200',
  Cancelled: 'bg-slate-50   text-slate-500   border-slate-200',
  'No-show': 'bg-red-50     text-red-600     border-red-200',
};

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
        { id: 1, name: 'Table 01', capacity: 2, status: 'Available', reservation: null },
        { id: 2, name: 'Table 02', capacity: 4, status: 'Available', reservation: null },
        { id: 3, name: 'Table 03', capacity: 6, status: 'Available', reservation: null },
        { id: 4, name: 'Table 04', capacity: 8, status: 'Available', reservation: null },
        { id: 5, name: 'Table 05', capacity: 4, status: 'Available', reservation: null },
      ];
      setTables(defaults);
      localStorage.setItem('tables', JSON.stringify(defaults));
    }
  };

  useEffect(() => {
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
        toast.success(`📅 Table ${resForm.tableName} reserved for ${resForm.customerName}`);
        
        // Also update local tables state if date is today
        if (resForm.date === new Date().toISOString().split('T')[0]) {
          saveTables(tables.map(t =>
            (t._id || t.id) === resForm.tableId ? { ...t, status: 'Reserved', reservation: { name: resForm.customerName, time: resForm.time } } : t
          ));
        }
        setShowResModal(false);
        setResForm({
          customerName: '', customerPhone: '', partySize: '2',
          date: new Date().toISOString().split('T')[0],
          time: '19:00', specialRequest: '', tableId: '', tableName: '',
        });
      }
    } catch (err) {
      toast.error(`❌ Booking failed: ${err.response?.data?.message || 'Check inputs'}`);
    } finally {
      setSavingRes(false);
    }
  };

  // ── Update reservation status ───────────────────────────────
  const updateReservationStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/reservations/${id}/status`, { status });
      if (data.success) {
        setReservations(prev => prev.map(r => (r._id || r.id) === id ? data.data : r));
        toast.success(`📅 Reservation status updated to ${status}`);
        
        // If seated, occupy table
        if (status === 'Seated') {
          const resObj = reservations.find(r => (r._id || r.id) === id);
          if (resObj) {
            saveTables(tables.map(t =>
              (t._id || t.id) === resObj.table || t.name === resObj.tableName ? { ...t, status: 'Occupied' } : t
            ));
          }
        }
      }
    } catch (err) {
      toast.error(`❌ Update failed: ${err.response?.data?.message || 'Network error'}`);
    }
  };

  // ── Auto-assign walk-in guests ─────────────────────────────
  const handleAutoAssign = () => {
    const guests = parseInt(guestCount);
    if (!guests || guests <= 0) {
      toast.warning('⚠️ Enter a valid number of guests.');
      return;
    }
    // Find available tables with capacity >= guests, sorted by closest capacity
    const candidates = tables
      .filter(t => t.status === 'Available' && t.capacity >= guests)
      .sort((a, b) => a.capacity - b.capacity);

    if (candidates.length > 0) {
      const best = candidates[0];
      saveTables(tables.map(t => (t._id || t.id) === (best._id || best.id) ? { ...t, status: 'Occupied' } : t));
      setAutoMessage(`Assigned to ${best.name} (Capacity: ${best.capacity})`);
      toast.success(`✅ Auto-assigned ${guests} guests → ${best.name}`);
    } else {
      setAutoMessage('No suitable table available.');
      toast.warning('⚠️ No suitable table available for that guest count.');
    }
  };

  const freeTable = (id) => {
    const t = tables.find(tb => (tb._id || tb.id) === id);
    saveTables(tables.map(tb => (tb._id || tb.id) === id ? { ...tb, status: 'Available', reservation: null } : tb));
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
    <div className="max-w-[1600px] mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out] font-sans pb-12">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Table Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage tables, reservations, and walk-in assignments.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Live sync badge */}
          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-all ${connected ? 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-500/5' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}/>
            {connected ? 'Live Sync' : 'Offline'}
          </span>
          
          {/* Tabs Control Row */}
          <div className="flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveTab('map')} 
              className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'map' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              🗺️ Table Map
            </button>
            <button 
              onClick={() => { setActiveTab('reservations'); fetchReservations(''); }} 
              className={`px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${activeTab === 'reservations' ? 'bg-[#0F286B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              📅 Reservations
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">{pendingCount}</span>}
            </button>
          </div>

          <button 
            onClick={() => setShowResModal(true)} 
            className="px-5 py-3.5 bg-[#f97316] hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/10 cursor-pointer transition-all"
          >
            + New Reservation
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label:'Total',       val:counts.total,       colorClass:'bg-indigo-50/70 border-indigo-100 text-indigo-700',  dotClass:'bg-indigo-500'  },
          { label:'Available',   val:counts.available,   colorClass:'bg-emerald-50/70 border-emerald-100 text-emerald-700', dotClass:'bg-emerald-500' },
          { label:'Occupied',    val:counts.occupied,    colorClass:'bg-red-50/70 border-red-100 text-red-700',     dotClass:'bg-red-500'     },
          { label:'Reserved',    val:counts.reserved,    colorClass:'bg-amber-50/70 border-amber-100 text-amber-700',   dotClass:'bg-amber-400'   },
          { label:'Maintenance', val:counts.maintenance, colorClass:'bg-slate-50/70 border-slate-100 text-slate-600',   dotClass:'bg-slate-400'   },
        ].map(({ label, val, colorClass, dotClass }) => (
          <div key={label} className={`rounded-2xl p-4.5 flex items-center gap-3.5 border ${colorClass} shadow-sm transition-all hover:scale-102 duration-300`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${dotClass}`}/>
            <div>
              <p className="text-2xl font-black leading-none">{val}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TAB: TABLE MAP ── */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel controls */}
          <div className="space-y-5">
            {/* Auto-assign card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Auto Table Assignment</h3>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">No. of Guests</label>
                <input 
                  type="number" 
                  min="1" 
                  value={guestCount} 
                  onChange={e => setGuestCount(e.target.value)}
                  className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={handleAutoAssign} 
                className="w-full py-3.5 bg-[#0F286B] hover:bg-[#1e3a8a] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
              >
                Find & Occupy Best Table ⚡
              </button>
              {autoMessage && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] font-semibold text-blue-700 animate-[fadeIn_0.2s_ease-out]">
                  {autoMessage}
                </div>
              )}
            </div>

            {/* Edit table status panel inline */}
            {editTable && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Modify Status: {editTable.name}</h3>
                  <button 
                    onClick={() => setEditTable(null)} 
                    className="w-6 h-6 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full text-xs font-bold transition flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2">
                  {['Available','Reserved','Occupied','Maintenance'].map(s => {
                    const sc = STATUS_COLORS[s];
                    return (
                      <button 
                        key={s} 
                        onClick={() => {
                          saveTables(tables.map(t => (t._id||t.id) === (editTable._id||editTable.id) ? { ...t, status: s } : t));
                          setEditTable(null);
                          toast.info(`🔄 ${editTable.name} status changed to ${s}`);
                        }} 
                        className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-left cursor-pointer ${
                          editTable.status === s 
                            ? 'bg-slate-50/50 border-slate-350 font-bold shadow-inner' 
                            : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/30'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
                        <span className={`text-xs font-bold ${editTable.status === s ? 'text-slate-800' : 'text-slate-500'}`}>{s}</span>
                        {editTable.status === s && <span className="ml-auto text-[10px] font-extrabold text-slate-400">Current</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Map Legend</p>
              <div className="space-y-3.5">
                {Object.entries(STATUS_COLORS).map(([status, sc]) => (
                  <div key={status} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${sc.dot}`}/>
                      <span className="text-xs text-slate-650 font-bold">{status}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${sc.badge}`}>
                      {tables.filter(t => t.status === status).length}
                    </span>
                  </div>
                ))}
              </div>
              <button 
                onClick={resetAllTables} 
                className="mt-5 w-full py-3 text-[10px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/50 border border-red-100 rounded-xl transition-all cursor-pointer"
              >
                Reset All Tables 🔄
              </button>
            </div>
          </div>

          {/* Table Map Grid (Right column) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-150">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Interactive Floor Plan Map</h3>
              <span className="text-[10px] text-slate-400 font-bold">Select table to edit or book</span>
            </div>

            {/* Premium, clean list grid of dining table cards (Never overlaps adjacent items!) */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4.5 bg-slate-50/30 border border-slate-100/50 rounded-2xl">
              {tables.map(table => {
                const sc = STATUS_COLORS[table.status] || STATUS_COLORS.Available;
                const capacity = Number(table.capacity) || 4;

                return (
                  <div 
                    key={table.id}
                    className={`bg-white rounded-2xl border-2 p-4.5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[160px] relative ${
                      table.status === 'Available' ? 'border-slate-100' : 
                      table.status === 'Occupied' ? 'border-red-100 bg-red-50/5' :
                      table.status === 'Reserved' ? 'border-amber-100 bg-amber-50/5' :
                      'border-slate-200 bg-slate-50/10'
                    }`}
                  >
                    
                    {/* Header: Table ID & Actions */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${sc.badge}`}>
                          {table.status}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-800 mt-2">{table.name}</h4>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setEditTable(table)} 
                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-650 transition-all flex items-center justify-center border border-slate-100 cursor-pointer"
                          title="Edit Status"
                        >
                          ✏️
                        </button>
                        {table.status === 'Available' && (
                          <button 
                            onClick={() => openResModal(table)} 
                            className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all flex items-center justify-center border border-slate-100 cursor-pointer"
                            title="Add Reservation"
                          >
                            📅
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle: Capacity and Seats layout (Clean inline representation) */}
                    <div className="my-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-450 font-bold">
                        <span>👥 Capacity:</span>
                        <span className="font-extrabold text-slate-700">{capacity} Guests</span>
                      </div>
                      
                      {/* Interactive visual seats (drawn inside the card borders!) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[...Array(capacity)].map((_, i) => (
                          <div 
                            key={i} 
                            title={`Seat ${i+1}`}
                            className={`w-3.5 h-3.5 rounded-full border border-white shadow-sm transition-all duration-300 ${sc.dot}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bottom: reservation details or Free table button */}
                    <div className="pt-2.5 border-t border-slate-50 flex items-center justify-between min-h-[38px]">
                      {table.reservation ? (
                        <div className="text-[10px] text-slate-500 font-semibold leading-normal truncate max-w-[65%]">
                          <span className="text-amber-700 font-bold">👤 {table.reservation.name}</span>
                          <span className="text-slate-400 block">🕐 {table.reservation.time}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-semibold">
                          No active booking
                        </div>
                      )}

                      {(table.status === 'Occupied' || table.status === 'Maintenance' || table.status === 'Reserved') && (
                        <button 
                          onClick={() => freeTable(table._id || table.id)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-[9px] font-black uppercase rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          Free Table
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RESERVATIONS ── */}
      {activeTab === 'reservations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Filters & Summary */}
          <div className="space-y-5">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Filter by Date</h3>
              <input 
                type="date" 
                value={calendarDate} 
                onChange={e => setCalendarDate(e.target.value)}
                className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setCalendarDate(new Date().toISOString().split('T')[0])}
                  className="py-2.5 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-100 cursor-pointer text-center"
                >
                  Today
                </button>
                <button 
                  onClick={() => setCalendarDate('')}
                  className="py-2.5 text-xs font-bold bg-slate-50 text-slate-650 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 cursor-pointer text-center"
                >
                  All Dates
                </button>
              </div>
            </div>

            {/* Reservation Summary */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-3.5">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Summary</h3>
              {[
                { label:'Today\'s Bookings', val: todayCount,                                              colorClass:'text-indigo-600 bg-indigo-50'  },
                { label:'Pending Confirm',   val: reservations.filter(r=>r.status==='Pending').length,    colorClass:'text-amber-600 bg-amber-50'   },
                { label:'Confirmed Bookings', val: reservations.filter(r=>r.status==='Confirmed').length,  colorClass:'text-emerald-600 bg-emerald-50' },
                { label:'Seated Today',      val: reservations.filter(r=>r.status==='Seated' && r.date===new Date().toISOString().split('T')[0]).length, colorClass:'text-blue-600 bg-blue-50' },
              ].map(({ label, val, colorClass }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 last:pb-0">
                  <span className="text-xs text-slate-500 font-bold">{label}</span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg ${colorClass}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: reservations list cards */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  {calendarDate ? `Bookings — ${new Date(calendarDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}` : 'All Bookings'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">{dateReservations.length} reservation{dateReservations.length !== 1 ? 's' : ''} total</p>
              </div>
              <button 
                onClick={() => fetchReservations('')} 
                className="text-[10px] font-black uppercase text-slate-500 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-all"
              >
                Refresh 🔄
              </button>
            </div>

            {loadingRes ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-indigo-650 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : dateReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <span className="text-3xl mb-3">📅</span>
                <p className="text-xs font-bold">No reservations logged for this date.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {dateReservations.map((res) => (
                  <div key={res._id || res.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-sm">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800">{res.customerName}</span>
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${RESERVATION_STATUS_STYLES[res.status] || 'bg-slate-50 text-slate-600'}`}>
                          {res.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-bold">
                        <span>📞 {res.customerPhone}</span>
                        <span>🪑 {res.tableName} ({res.partySize} guests)</span>
                        <span>🕐 {res.time}</span>
                      </div>
                      {res.specialRequest && (
                        <p className="text-[10px] italic text-indigo-600 font-medium bg-indigo-50/50 px-2 py-1 rounded-lg w-fit mt-1.5">
                          " {res.specialRequest} "
                        </p>
                      )}
                    </div>

                    {/* Seating / confirmation controls */}
                    {['Pending', 'Confirmed'].includes(res.status) && (
                      <div className="flex gap-2 w-full sm:w-auto self-end sm:self-center">
                        {res.status === 'Pending' && (
                          <button 
                            onClick={() => updateReservationStatus(res._id || res.id, 'Confirmed')}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-[10px] uppercase cursor-pointer transition-all border border-emerald-100"
                          >
                            Confirm
                          </button>
                        )}
                        <button 
                          onClick={() => updateReservationStatus(res._id || res.id, 'Seated')}
                          className="flex-1 sm:flex-none px-3.5 py-2 bg-[#0F286B] hover:bg-[#1e3a8a] text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer transition-all"
                        >
                          Seat Guest
                        </button>
                        <button 
                          onClick={() => updateReservationStatus(res._id || res.id, 'Cancelled')}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-500 font-bold rounded-xl text-[10px] uppercase cursor-pointer transition-all border border-red-100"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW RESERVATION ── */}
      {showResModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setShowResModal(false)} />
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative z-10 overflow-hidden p-6 space-y-4 animate-[fadeInScale_0.25s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                {resForm.tableName ? `📅 Reserve ${resForm.tableName}` : '📅 Log New Reservation'}
              </h3>
              <button 
                onClick={() => setShowResModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-850 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitReservation} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Customer Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={resForm.customerName}
                  onChange={e => setResForm(f => ({...f, customerName: e.target.value}))}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
                <input 
                  required 
                  type="tel" 
                  placeholder="e.g. +91 9876543210"
                  value={resForm.customerPhone}
                  onChange={e => setResForm(f => ({...f, customerPhone: e.target.value}))}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Table assignment selector dropdown if opening empty */}
              {!resForm.tableId && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Select Table</label>
                  <select 
                    required
                    value={resForm.tableId} 
                    onChange={e => {
                      const found = tables.find(t => (t._id || t.id) === e.target.value);
                      setResForm(f => ({ ...f, tableId: e.target.value, tableName: found ? found.name : '', partySize: String(found ? found.capacity : 2) }));
                    }}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Available Table --</option>
                    {tables.filter(t => t.status === 'Available').map(t => (
                      <option key={t.id} value={t._id || t.id}>{t.name} (Capacity: {t.capacity})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</label>
                  <input 
                    required 
                    type="date" 
                    value={resForm.date} 
                    min={new Date().toISOString().split('T')[0]} 
                    onChange={e => setResForm(f => ({...f, date: e.target.value}))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Time</label>
                  <input 
                    required 
                    type="time" 
                    value={resForm.time} 
                    onChange={e => setResForm(f => ({...f, time: e.target.value}))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Guests</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    value={resForm.partySize} 
                    onChange={e => setResForm(f => ({...f, partySize: e.target.value}))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Special Request (optional)</label>
                <textarea 
                  rows="2" 
                  placeholder="e.g. Window seat, veg preferences..." 
                  value={resForm.specialRequest} 
                  onChange={e => setResForm(f => ({...f, specialRequest: e.target.value}))}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-50">
                <button 
                  type="button" 
                  onClick={() => setShowResModal(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingRes}
                  className="flex-1 py-3 bg-[#f97316] hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-500/10 cursor-pointer"
                >
                  {savingRes ? 'Booking...' : '📅 Confirm Book'}
                </button>
              </div>
            </form>
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

export default TableManagement;
