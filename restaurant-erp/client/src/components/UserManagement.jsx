import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Waiter', phone: '', email: '' });

  const load = async () => {
    try {
      const res = await api.get('/users');
      if (res.data && res.data.success) setUsers(res.data.data || []);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addUser = async () => {
    const username = (newUser.username || '').trim();
    const password = newUser.password || '';
    if (!username) return toast.error('Enter a username');
    if (!password || password.length < 3) return toast.error('Password too short (min 3 chars)');
    const exists = users.some(u => (u.username || '').toLowerCase() === username.toLowerCase());
    if (exists) return toast.error('Username already exists');

    setSaving(true);
    try {
      const res = await api.post('/users', { ...newUser, username });
      if (res.data && res.data.success) {
        setUsers([res.data.data, ...users]);
        setNewUser({ username: '', password: '', role: 'Waiter', phone: '', email: '' });
        toast.success('✅ User created');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create user');
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id, updates) => {
    try {
      const { data } = await api.put(`/users/${id}`, updates);
      if (data.success) setUsers(users.map(u => u._id === id ? data.data : u));
    } catch {
      toast.error('Update failed');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="py-16 text-center">Loading users...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={newUser.username} onChange={e=>setNewUser({...newUser, username:e.target.value})} placeholder="username" className="px-3 py-2 border rounded-2xl text-xs" />
        <input value={newUser.password} onChange={e=>setNewUser({...newUser, password:e.target.value})} placeholder="password" type="password" className="px-3 py-2 border rounded-2xl text-xs" />
        <select value={newUser.role} onChange={e=>setNewUser({...newUser, role:e.target.value})} className="px-3 py-2 border rounded-2xl text-xs">
          <option>Admin</option><option>Manager</option><option>Chef</option><option>Waiter</option><option>Cashier</option>
        </select>
        <button onClick={addUser} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-xs disabled:opacity-60">{saving ? 'Adding...' : '➕ Add User'}</button>
      </div>

      <div className="mt-2 bg-white border rounded-2xl p-3">
        {users.map(u => (
          <div key={u._id} className="flex items-center justify-between py-2 border-b">
            <div className="text-sm font-bold">{u.username}</div>
            <div className="flex items-center gap-3">
              <select value={u.role} onChange={e=>updateUser(u._id, { role: e.target.value })} className="text-xs px-2 py-1 border rounded-2xl">
                <option>Admin</option><option>Manager</option><option>Chef</option><option>Waiter</option><option>Cashier</option>
              </select>
              <button onClick={()=>deleteUser(u._id)} className="text-red-600 text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
