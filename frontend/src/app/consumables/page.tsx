'use client';

import { useEffect, useState, useCallback } from 'react';
import { getConsumables, createConsumable, updateConsumable, deleteConsumable, restockConsumable,
  getConsumableStockMovements,
  getUserDraft, addToCart, removeFromCart, updateCartItem, submitRequest, exportConsumableExcel, addCustomPlannedItem } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';

export default function ConsumablesPage() {
  const [consumables, setConsumables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', brand: '', price: '', supplier: '', stock: 0, photo: '', description: '' });
  const [restockTarget, setRestockTarget] = useState<any>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [restockNote, setRestockNote] = useState('');
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [showStockHistory, setShowStockHistory] = useState<any>(null);
  const [cart, setCart] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestType, setRequestType] = useState<'immediate' | 'planned'>('immediate');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [plannedName, setPlannedName] = useState('');
  const [plannedBrand, setPlannedBrand] = useState('');
  const [plannedPrice, setPlannedPrice] = useState('');
  const [plannedQty, setPlannedQty] = useState(1);
  const { user, isAdmin } = useAuth();

  const fetchConsumables = async () => {
    try { const params: Record<string, string> = { page: String(page), limit: "8" }; if (search) params.search = search; const res = await getConsumables(params); setConsumables(res.data); if (res.pagination) { setTotalPages(res.pagination.totalPages); setTotal(res.pagination.total); } } catch { } finally { setLoading(false); }
  };

  const fetchCart = useCallback(async () => { if (!user?.id) return; try { const res = await getUserDraft(); setCart(res.data); } catch {} }, [user?.id]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { fetchConsumables(); }, [search, page]);
  useEffect(() => { if (user?.id) fetchCart(); }, [user?.id, fetchCart]);

  const openCreate = () => { setEditingId(null); setForm({ name: '', brand: '', price: '', supplier: '', stock: 0, photo: '', description: '' }); setShowModal(true); };
  const openEdit = (c: any) => { setEditingId(c.id); setForm({ name: c.name, brand: c.brand || '', price: c.price?.toString() || '', supplier: c.supplier || '', stock: c.stock || 0, photo: c.photo || '', description: c.description || '' }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); try { const payload = { ...form, price: form.price ? parseFloat(form.price) : null, stock: parseInt(form.stock as any) || 0 }; if (editingId) await updateConsumable(editingId, payload); else await createConsumable(payload); setShowModal(false); fetchConsumables(); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } };
  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; try { await deleteConsumable(id); fetchConsumables(); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } };
  const handleAddToCart = async (consumableId: string, qty: number = 1) => { if (!user?.id) return; try { await addToCart({ consumableId, quantity: qty }); await fetchCart(); setMessage({ type: 'success', text: 'Added!' }); setTimeout(() => setMessage(null), 1500); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } };
  const handleRemoveFromCart = async (itemId: string) => { try { await removeFromCart(itemId); await fetchCart(); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } };
  const handleUpdateCartQty = async (itemId: string, qty: number) => { try { await updateCartItem(itemId, qty); await fetchCart(); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } };
  const handleSubmitRequest = async () => { if (!cart || !cart.items?.length) return; setSubmitting(true); try { await submitRequest(cart.id, requestType); await fetchCart(); fetchConsumables(); setMessage({ type: 'success', text: requestType === 'planned' ? 'Submitted! Needs 2 approvals.' : 'Submitted! Needs 1 approval.' }); setTimeout(() => setMessage(null), 3000); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };

  const handleAddPlannedItem = async () => {
    if (!plannedName || plannedQty < 1) return;
    try {
      await addCustomPlannedItem({ name: plannedName, brand: plannedBrand, quantity: plannedQty, price: plannedPrice });
      setPlannedName(''); setPlannedBrand(''); setPlannedPrice(''); setPlannedQty(1);
      await fetchCart();
      setMessage({ type: 'success', text: 'Planned item added!' });
      setTimeout(() => setMessage(null), 1500);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const cartItemCount = cart?.items?.length || 0;

  return (
    <div>
      {message && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Consumables (Expense)</h1>
        <div className="flex gap-3">
          <button onClick={() => setCartOpen(!cartOpen)} className="relative px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100">🛒 Cart {cartItemCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">{cartItemCount}</span>}</button>
          {isAdmin && <button onClick={openCreate} className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 shadow-sm">+ Add</button>}
          <button onClick={async () => { try { const blob = await exportConsumableExcel(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'consumables.xlsx'; a.click(); URL.revokeObjectURL(url); } catch {} }}
            className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100">📥 Export</button>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
      </div>

      {/* Cart panel */}
      {cartOpen && (
        <div className="mb-6 bg-white rounded-xl border border-purple-200 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-purple-800">🛒 Cart</h2><button onClick={() => setCartOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button></div>
          {!cart || cartItemCount === 0 ? <p className="text-sm text-slate-400 py-4 text-center">Empty.</p> : <>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {cart.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex-1"><p className="text-sm font-medium text-slate-800">{item.consumable?.name}</p><p className="text-xs text-slate-400">{item.consumable?.brand || ''} · ${item.consumable?.price}</p></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleUpdateCartQty(item.id, Math.max(1, item.quantity - 1))} className="w-6 h-6 rounded bg-purple-200 text-purple-700 text-sm hover:bg-purple-300">−</button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-purple-200 text-purple-700 text-sm hover:bg-purple-300">+</button>
                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-red-400 hover:text-red-600 ml-2">🗑</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-600 mb-2">Request Type:</p>
              <div className="flex gap-3">
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer ${requestType === 'immediate' ? 'border-purple-400 bg-purple-50' : 'border-slate-200'}`}>
                  <input type="radio" name="reqType" value="immediate" checked={requestType === 'immediate'} onChange={() => setRequestType('immediate')} className="accent-purple-600" />
                  <div><span className="font-medium">📋 Immediate</span><p className="text-[10px] text-slate-400">From stock · 1 approval</p></div>
                </label>
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer ${requestType === 'planned' ? 'border-purple-400 bg-purple-50' : 'border-slate-200'}`}>
                  <input type="radio" name="reqType" value="planned" checked={requestType === 'planned'} onChange={() => setRequestType('planned')} className="accent-purple-600" />
                  <div><span className="font-medium">📅 Planned</span><p className="text-[10px] text-slate-400">Future purchase · 2 approvals</p></div>
                </label>
              </div>
            </div>
            {/* Custom planned item input */}
            {requestType === 'planned' && (
              <div className="mb-4 p-3 rounded-lg bg-purple-50 border border-purple-100 space-y-2">
                <p className="text-xs font-medium text-purple-700">+ Add Planned Item</p>
                <input value={plannedName} onChange={(e) => setPlannedName(e.target.value)} placeholder="Item name *"
                  className="w-full px-3 py-2 rounded-lg border border-purple-200 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <input value={plannedBrand} onChange={(e) => setPlannedBrand(e.target.value)} placeholder="Brand"
                    className="px-3 py-2 rounded-lg border border-purple-200 text-sm" />
                  <input type="number" min="1" value={plannedQty} onChange={(e) => setPlannedQty(parseInt(e.target.value) || 1)} placeholder="Qty"
                    className="px-3 py-2 rounded-lg border border-purple-200 text-sm" />
                  <input type="number" step="0.01" value={plannedPrice} onChange={(e) => setPlannedPrice(e.target.value)} placeholder="Price"
                    className="px-3 py-2 rounded-lg border border-purple-200 text-sm" />
                </div>
                <button onClick={handleAddPlannedItem} disabled={!plannedName}
                  className="w-full py-2 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 disabled:opacity-40">+ Add to Cart</button>
              </div>
            )}
            <button onClick={handleSubmitRequest} disabled={submitting} className="w-full py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50">{submitting ? 'Submitting...' : '📤 Submit'}</button>
            <p className="text-[10px] text-slate-400 mt-2 text-center">{requestType === 'planned' ? '2 approvals: Admin → Pak Amri' : '1 approval: Admin'}</p>
          </>}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Merek</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Stok</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Harga</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Foto</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
              : consumables.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No consumables</td></tr>
              : consumables.map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 text-xs">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.brand || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{c.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">{c.price ? `$${Number(c.price).toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.supplier || '-'}</td>
                  <td className="px-4 py-3">
                    {c.photo ? <img src={c.photo} alt={c.name} className="w-10 h-10 rounded object-cover" /> : <span className="text-slate-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => handleAddToCart(c.id, 1)} disabled={c.stock <= 0} className="text-xs px-2.5 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-30">+ Cart</button>
                      {isAdmin && <><button onClick={() => openEdit(c)} className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button><button onClick={() => { setRestockTarget(c); setRestockQty(1); setRestockNote(''); }} className="text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100">+</button><button onClick={() => handleDelete(c.id)} className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Del</button></>}
                      <button onClick={async () => { try { const res = await getConsumableStockMovements(c.id); setStockHistory(res.data); setShowStockHistory(c); } catch {} }} className="text-xs px-2 py-1 rounded bg-slate-50 text-slate-400 hover:bg-slate-100">📋</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4"><Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} /></div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-6">{editingId ? 'Edit' : 'Add'} Consumable</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-xs text-slate-500 mb-1 font-medium">Nama *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs text-slate-500 mb-1 font-medium">Merek</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" /></div><div><label className="block text-xs text-slate-500 mb-1 font-medium">Harga</label><input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" /></div></div>
              <div><label className="block text-xs text-slate-500 mb-1 font-medium">Supplier</label><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" /></div>
              <div><label className="block text-xs text-slate-500 mb-1 font-medium">Stok *</label><input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" /></div>
              <div><label className="block text-xs text-slate-500 mb-1 font-medium">Foto URL</label><input value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="https://..." /></div>
              <div><label className="block text-xs text-slate-500 mb-1 font-medium">Deskripsi</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none" rows={2} /></div>
              <div className="flex gap-3 pt-2"><button type="submit" className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">{editingId ? 'Update' : 'Create'}</button><button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setRestockTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Restock: {restockTarget.name}</h2><p className="text-xs text-slate-400 mb-5">Current: {restockTarget.stock}</p>
            <div className="space-y-4"><div><label className="block text-xs text-slate-500 mb-1 font-medium">Qty</label><input type="number" min="1" value={restockQty} onChange={(e) => setRestockQty(parseInt(e.target.value) || 1)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm" /></div><div><label className="block text-xs text-slate-500 mb-1 font-medium">Notes</label><input value={restockNote} onChange={(e) => setRestockNote(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm" /></div>
            <div className="flex gap-3 pt-2"><button onClick={async () => { try { await restockConsumable(restockTarget.id, { quantity: restockQty, notes: restockNote }); setRestockTarget(null); fetchConsumables(); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); } }} className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">+ Add</button><button onClick={() => setRestockTarget(null)} className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button></div></div>
          </div>
        </div>
      )}

      {/* Stock History */}
      {showStockHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowStockHistory(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] p-6 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 shrink-0"><h2 className="text-lg font-semibold text-slate-800">History — {showStockHistory.name}</h2><button onClick={() => setShowStockHistory(null)} className="text-slate-400 hover:text-slate-600">✕</button></div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {stockHistory.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">No movements.</p> : stockHistory.map((m: any) => (
                <div key={m.id} className="p-3 rounded-lg border text-sm flex items-center justify-between">
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${m.changeType === 'restock' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{m.changeType === 'restock' ? '+ Restock' : '- Consumed'}</span><span className="text-slate-700">{m.quantityChange} units</span>{m.notes && <span className="text-slate-400 text-xs ml-2">— {m.notes}</span>}</div>
                  <div className="text-right text-xs text-slate-400"><div>{new Date(m.createdAt).toLocaleDateString()}</div><div>{m.previousStock} → {m.newStock}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
