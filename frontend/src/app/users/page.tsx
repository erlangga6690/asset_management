'use client';

import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';

const defaultForm = { name: '', email: '', companyId: '', department: '', role: 'user', photo: '' };

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  admin2: 'bg-orange-100 text-orange-700',
  pic_location: 'bg-blue-100 text-blue-700',
  pic_barang: 'bg-indigo-100 text-indigo-700',
  user: 'bg-slate-100 text-slate-600',
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const { isAdmin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const params: Record<string, string> = { page: String(page), limit: "10" };
      if (search) params.search = search;
      const res = await getUsers(params);
      setUsers(res.data);
      if (res.pagination) { setTotalPages(res.pagination.totalPages); setTotal(res.pagination.total); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { fetchUsers(); }, [search, page]);

  const openCreate = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (u: any) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, companyId: u.companyId || '', department: u.department || '', role: u.role, photo: u.photo || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, companyId: form.companyId || null, department: form.department || null, photo: form.photo || null };
      if (editingId) await updateUser(editingId, payload);
      else await createUser(payload);
      setShowModal(false);
      fetchUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try { await deleteUser(id); fetchUsers(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Users</h1>
        {isAdmin && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            + Add User
          </button>
        )}
      </div>

      <div className="mb-6">
        <input type="text" placeholder="Search users..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">ID</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Department</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Role</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{user.email}</td>
                    <td className="px-4 py-3 text-slate-500">{user.companyId || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{user.department || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[user.role] || 'bg-slate-100'}`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {isAdmin && (
                          <>
                            <button onClick={() => openEdit(user)} className="text-xs px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                            <button onClick={() => handleDelete(user.id)} className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100">Del</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4"><Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} /></div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-6">{editingId ? 'Edit' : 'Add'} User</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">ID</label>
                  <input value={form.Id} onChange={(e) => setForm({ ...form, Id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Department</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                  <option value="admin">Admin</option>
                  <option value="admin2">Admin 2 (Pak Amri)</option>
                  <option value="pic_barang">PIC Barang</option>
                  <option value="user">User</option>
                </select>
              </div>
             <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={(form as any).password || ''}
                onChange={(e) => setForm({...form, password: e.target.value,} as any) }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder={editingId ? '' : 'Enter password'}/><button type="button" onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-blue-600"> {showPassword ? 'Hide' : 'Show'} </button>
                </div>
                </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
