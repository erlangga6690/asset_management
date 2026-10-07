'use client';

import { useEffect, useState, useCallback } from 'react';
import { getRequests, getRequest, approveAdmin, approveAdmin2, rejectRequest, getUsers } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user, isAdmin, isAdminOrAdmin2 } = useAuth();

  const fetchRequests = async () => {
    try {
      const params: Record<string, string> = { page: String(page), limit: "10" };
      if (statusFilter) params.status = statusFilter;
      const res = await getRequests(params);
      setRequests(res.data);
      if (res.pagination) { setTotalPages(res.pagination.totalPages); setTotal(res.pagination.total); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetchRequests(); }, [statusFilter, page]);

  const handleApproveAdmin = async (id: string) => {
    if (!user?.id) return;
    try {
      await approveAdmin(id, user.id);
      fetchRequests();
      setMessage({ type: 'success', text: 'Approved! Waiting for admin 2.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleApproveAdmin2 = async (id: string) => {
    if (!user?.id) return;
    try {
      await approveAdmin2(id, user.id);
      fetchRequests();
      setMessage({ type: 'success', text: 'Fully approved! Stock has been reduced.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async (id: string) => {
    if (!user?.id) return;
    try {
      await rejectRequest(id, user.id, rejectReason);
      setShowReject(false);
      setRejectReason('');
      fetchRequests();
      setMessage({ type: 'success', text: 'Request rejected.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const openDetail = async (id: string) => {
    try {
      const res = await getRequest(id);
      setSelectedRequest(res.data);
      setShowDetail(true);
    } catch {}
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    pending_admin: 'bg-amber-100 text-amber-700',
    pending_admin2: 'bg-orange-100 text-orange-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Consumable Requests</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm">
          <option value="">All Status</option>
          <option value="pending_admin">Pending Admin</option>
          <option value="pending_admin2">Pending Admin 2</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Requester</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Items</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Approvals</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No requests found</td></tr>
              ) : (
                requests.map((r: any) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-xs">{r.user?.name}</p>
                      <p className="text-[10px] text-slate-400">{r.user?.department || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs">{r.items?.length || 0} items</span>
                      <div className="text-[10px] text-slate-400">
                        {r.items?.slice(0, 2).map((i: any) => `${i.consumable?.name} ×${i.quantity}`).join(', ')}
                        {r.items?.length > 2 && ` +${r.items.length - 2} more`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium ${statusColors[r.status] || 'bg-slate-50'}">
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      {r.requestType === 'planned' && r.status !== 'approved' && r.status !== 'rejected' && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">2-step</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-400">
                      {r.adminApprover ? <span className="text-emerald-600">✓ Admin: {r.adminApprover.name}</span> : <span className="text-slate-300">○ Admin</span>}
                      {r.requestType === 'planned' && (
                        <><br />{r.admin2Approver ? <span className="text-emerald-600">✓ Admin2: {r.admin2Approver.name}</span> : <span className="text-slate-300">○ Admin2</span>}</>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => openDetail(r.id)} className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100">View</button>
                        {r.status === 'pending_admin' && isAdmin && (
                          <>
                            <button onClick={() => handleApproveAdmin(r.id)} className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                              ✓ {r.requestType === 'planned' ? 'Approve (1/2)' : 'Approve'}
                            </button>
                            <button onClick={() => { setSelectedRequest(r); setShowReject(true); }} className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100">✕</button>
                          </>
                        )}
                        {r.status === 'pending_admin2' && isAdminOrAdmin2 && r.requestType === 'planned' && (
                          <>
                            <button onClick={() => handleApproveAdmin2(r.id)} className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100">✓ Admin2</button>
                            <button onClick={() => { setSelectedRequest(r); setShowReject(true); }} className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100">✕</button>
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

      {/* Detail Modal */}
      {showDetail && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Request Detail</h2>
            <div className="text-xs text-slate-400 mb-4 space-y-0.5">
              <p>Requester: <span className="text-slate-600 font-medium">{selectedRequest.user?.name}</span> ({selectedRequest.user?.department})</p>
              <p>Status: <span className={`px-2 py-0.5 rounded-full font-medium ${statusColors[selectedRequest.status]}`}>{selectedRequest.status.replace(/_/g, ' ')}</span></p>
              {selectedRequest.notes && <p>Notes: {selectedRequest.notes}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Items</h3>
              {selectedRequest.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.consumable?.name}</p>
                    <p className="text-xs text-slate-400">{item.consumable?.brand || ''} · ${item.consumable?.price}</p>
                  </div>
                  <span className="text-sm font-bold text-purple-600">×{item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Approval history */}
            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
              <h3 className="font-semibold text-slate-600">Approval History</h3>
              {selectedRequest.adminApprover ? (
                <p className="text-emerald-600">✓ Admin approved by {selectedRequest.adminApprover?.name} — {new Date(selectedRequest.adminApprovedAt).toLocaleString()}</p>
              ) : <p className="text-slate-300">○ Admin pending</p>}
              {selectedRequest.requestType === 'planned' && (
                <>
                  {selectedRequest.admin2Approver ? (
                    <p className="text-emerald-600">✓ Admin 2 approved by {selectedRequest.admin2Approver?.name} — {new Date(selectedRequest.admin2ApprovedAt).toLocaleString()}</p>
                  ) : <p className="text-slate-300">○ Admin 2 pending</p>}
                </>
              )}
              {selectedRequest.rejectedBy && (
                <p className="text-red-600">✕ Rejected by {selectedRequest.rejector?.name} — {new Date(selectedRequest.rejectedAt).toLocaleString()}</p>
              )}
              {selectedRequest.rejectionReason && (
                <p className="text-red-500">Reason: {selectedRequest.rejectionReason}</p>
              )}
            </div>

            <button onClick={() => setShowDetail(false)} className="mt-6 w-full py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">Close</button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showReject && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowReject(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Reject Request</h2>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Reason</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none resize-none" rows={3} placeholder="Why is this request being rejected?" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => handleReject(selectedRequest.id)} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Reject</button>
              <button onClick={() => setShowReject(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
