'use client';

import { useEffect, useState } from 'react';
import Pagination from '@/components/Pagination';
import { getBorrowRecords, sendReminder, returnEquipment } from '@/lib/api';

export default function BorrowsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchRecords = async () => {
    try {
      const params: Record<string, string> = { page: String(page), limit: "8" };
      if (statusFilter) params.status = statusFilter;
      if (searchFilter) params.search = searchFilter;
      const res = await getBorrowRecords(params);
      setRecords(res.data);
      if (res.pagination) { setTotalPages(res.pagination.totalPages); setTotal(res.pagination.total); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [statusFilter, searchFilter]);
  useEffect(() => { fetchRecords(); }, [statusFilter, searchFilter, page]);

  const handleReturn = async (id: string) => {
    try { await returnEquipment(id); fetchRecords(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleRemind = async (recordId: string) => {
    try { const res = await sendReminder(recordId); alert(res.message); fetchRecords(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const isOverdue = (d: string) => new Date(d) < new Date();

  const activeCount = records.filter((r) => r.status === 'active' && !isOverdue(r.expectedReturnDate)).length;
  const overdueCount = records.filter((r) => r.status === 'active' && isOverdue(r.expectedReturnDate)).length;
  const returnedCount = records.filter((r) => r.status === 'returned').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Equipment Borrow Records</h1>
      </div>

      <div className="flex gap-3 mb-6">
        <input type="text" placeholder="Search equipment name..." value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="flex-1 max-w-xs px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="returned">Returned</option>
        </select>
        <div className="flex items-center gap-3 text-xs text-slate-400 self-center ml-auto">
          <span className="text-emerald-600 font-medium">{activeCount} active</span>
          <span className="text-red-600 font-medium">{overdueCount} overdue</span>
          <span className="text-slate-500">{returnedCount} returned</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Equipment</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Borrower</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Approved By</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Borrow</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Due</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Returned</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No borrow records</td></tr>
            ) : (
              records.map((r: any) => {
                const overdue = r.status === 'active' && isOverdue(r.expectedReturnDate);
                const status = overdue ? 'overdue' : r.status;
                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.equipment?.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.equipment?.assetTag}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 text-xs">{r.user?.name}</p>
                      <p className="text-xs text-slate-400">{r.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.approvedBy || (r.status === 'active' ? 'PIC Approved' : '-')}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.borrowDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={overdue ? 'text-red-600 font-medium text-xs' : 'text-slate-500 text-xs'}>{r.expectedReturnDate}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.actualReturnDate ? new Date(r.actualReturnDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        status === 'active' ? 'badge-active' : status === 'returned' ? 'badge-returned' : 'badge-overdue'
                      }`}>{status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {status !== 'returned' && (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleReturn(r.equipment?.id || r.equipmentId)} className="text-xs px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100">Return</button>
                          {overdue && !r.reminderSent && (
                            <button onClick={() => handleRemind(r.id)} className="text-xs px-3 py-1.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100">Remind</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4"><Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} /></div>
    </div>
  );
}
