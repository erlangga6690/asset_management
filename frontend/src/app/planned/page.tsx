'use client';

import { useEffect, useState } from 'react';
import { getPlannedItems, togglePlannedPurchased } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function PlannedToBuyPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'purchased'>('pending');
  const { isAdminOrAdmin2 } = useAuth();

  const fetchItems = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter === 'pending') params.purchased = 'false';
      else if (filter === 'purchased') params.purchased = 'true';
      const res = await getPlannedItems(params);
      setItems(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [filter]);

  const handleToggle = async (id: string) => {
    if (!isAdminOrAdmin2) return;
    try {
      await togglePlannedPurchased(id);
      fetchItems();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">📅 Planned to Buy</h1>
        <div className="flex gap-2">
          <button onClick={() => setFilter('pending')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>Pending</button>
          <button onClick={() => setFilter('purchased')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === 'purchased' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Purchased</button>
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === 'all' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>All</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-500 w-10"></th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Item</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Brand</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Qty</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Est. Price</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Requester</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : items.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No planned items</td></tr>
            : items.map((item: any) => (
              <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${item.purchased ? 'bg-slate-50' : ''}`}>
                <td className="px-4 py-3">
                  {isAdminOrAdmin2 && (
                    <input type="checkbox" checked={item.purchased} onChange={() => handleToggle(item.id)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium text-slate-800 ${item.purchased ? 'line-through text-slate-400' : ''}`}>{item.name}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{item.brand || '-'}</td>
                <td className="px-4 py-3 text-center text-xs font-medium text-slate-700">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">{item.estimatedPrice ? `$${Number(item.estimatedPrice).toLocaleString()}` : '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{item.request?.user?.name || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.purchased ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.purchased ? 'Purchased' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
