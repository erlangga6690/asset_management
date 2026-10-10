"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  requestBorrowEquipment,
  returnEquipment,
  getBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  exportEquipmentExcel,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Pagination from "@/components/Pagination";

interface Equipment {
  id: string;
  assetTag: string;
  name: string;
  brand: string | null;
  price: number | null;
  supplier: string | null;
  datePurchased: string | null;
  location: string | null;
  status: string;
  description: string | null;
  borrowRecords?: { user?: { id: string; name: string; email: string } }[];
}

const defaultForm = {
  assetTag: "",
  name: "",
  brand: "",
  supplier: "",
  datePurchased: "",
  location: "",
  status: "available",
  description: "",
};

function EquipmentContent() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Equipment | null>(null);
  const [requestUserId, setRequestUserId] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterStatus = searchParams.get("status") || "";
  const [search, setSearch] = useState("");

  // Borrow requests for PIC approval
  const [borrowRequests, setBorrowRequests] = useState<any[]>([]);
  const [myBorrowRequests, setMyBorrowRequests] = useState<any[]>([]);
  const [showBorrowRequests, setShowBorrowRequests] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { user, isAdmin, isAdminOrAdmin2, isPIC } = useAuth();

  const fetchEquipment = async () => {
    try {
      const params: Record<string, string> = { page: String(page), limit: "8" };
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const res = await getEquipment(params);
      setEquipment(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBorrowRequests = async () => {
    try {
      const [pendingRes, myRes] = await Promise.all([
        getBorrowRequests({ status: "pending_admin" }),
        user ? getBorrowRequests({}) : Promise.resolve({ data: [] }),
      ]);
      setBorrowRequests(pendingRes.data || []);
      // Filter my own requests
      const allRequests = myRes.data || [];
      setMyBorrowRequests(
        user ? allRequests.filter((r: any) => r.userId === user.id) : [],
      );
    } catch {}
  };

  useEffect(() => {
    setPage(1);
  }, [filterStatus, search]);
  useEffect(() => {
    fetchEquipment();
  }, [filterStatus, search, page]);

  useEffect(() => {
    fetchBorrowRequests();
  }, []);

  const openCreate = async () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = async (eq: Equipment) => {
    setEditingId(eq.id);
    setForm({
      assetTag: eq.assetTag,
      name: eq.name,
      brand: eq.brand || "",
      supplier: eq.supplier || "",
      datePurchased: eq.datePurchased || "",
      location: eq.location || "",
      status: eq.status,
      description: eq.description || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        datePurchased: form.datePurchased || null,
      };
      if (editingId) await updateEquipment(editingId, payload);
      else await createEquipment(payload);
      setShowModal(false);
      fetchEquipment();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this equipment?")) return;
    try {
      await deleteEquipment(id);
      fetchEquipment();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const openRequestBorrow = async (eq: Equipment) => {
    setRequestTarget(eq);
    setRequestDate("");
    setRequestNotes("");
    setShowModal(false);
  };

  const handleRequestBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTarget || !requestDate) return;
    setRequestSubmitting(true);
    try {
      const res = await requestBorrowEquipment(requestTarget.id, {
        expectedReturnDate: requestDate,
        notes: requestNotes,
      });
      setRequestTarget(null); // close modal immediately
      fetchEquipment(); // refresh in background
      fetchBorrowRequests();
      setMessage({
        type: "success",
        text: res.message || "Request submitted for approval",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Request borrow error:", err.response?.data || err.message);
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.message ||
          "Failed to submit request",
      });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await returnEquipment(id);
      fetchEquipment();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed",
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const res = await approveBorrowRequest(requestId, user!.id);
      fetchEquipment(); // fire and forget
      fetchBorrowRequests();
      setMessage({ type: "success", text: res.message || "Approved!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed",
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectBorrowRequest(requestId, user!.id, rejectReason);
      setRejectingId(null);
      setRejectReason("");
      fetchBorrowRequests();
      setMessage({ type: "success", text: "Request rejected." });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const canApprove = isAdminOrAdmin2 || isPIC;
  const pendingRequestsCount = borrowRequests.length;
  const showPICPanel = canApprove;

  const [showMyBorrowHistory, setShowMyBorrowHistory] = useState(false);

  const activeMyBorrowRequests = myBorrowRequests.filter(
    (br: any) => br.status === "pending_admin",
  );

  const myBorrowHistory = myBorrowRequests.filter(
    (br: any) =>
      br.status === "approved" ||
      br.status === "rejected" ||
      br.status === "returned",
  );

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      available: "badge-available",
      borrowed: "badge-borrowed",
      maintenance: "badge-maintenance",
    };
    return map[status] || "bg-slate-50 text-slate-600";
  };

  return (
    <div>
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">
          Equipment (Investment)
        </h1>
        <div className="flex gap-3">
          {showPICPanel && (
            <button
              onClick={() => {
                setShowBorrowRequests(!showBorrowRequests);
                fetchBorrowRequests();
              }}
              className="relative px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors"
            >
              📋 Requests{" "}
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              + Add Equipment
            </button>
          )}
          <button
            onClick={async () => {
              try {
                const blob = await exportEquipmentExcel();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "equipment.xlsx";
                a.click();
                URL.revokeObjectURL(url);
              } catch {}
            }}
            className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors"
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* My Borrow Requests (visible to all users) */}
      {/* My Borrow Requests */}
      {myBorrowRequests.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                📋 My Borrow Requests
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track your equipment borrow requests
              </p>
            </div>

            {myBorrowHistory.length > 0 && (
              <button
                onClick={() => setShowMyBorrowHistory(!showMyBorrowHistory)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {showMyBorrowHistory
                  ? "Hide History"
                  : `History (${myBorrowHistory.length})`}
              </button>
            )}
          </div>

          {/* Active / Pending Requests */}
          <div className="p-4">
            {activeMyBorrowRequests.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-slate-400">
                  No pending borrow requests.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeMyBorrowRequests.map((br: any) => (
                  <div
                    key={br.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {br.equipment?.name}
                        </p>

                        <span className="text-xs text-slate-400 font-mono">
                          {br.equipment?.assetTag}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        Due: {br.expectedReturnDate}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                      Waiting Approval
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {showMyBorrowHistory && myBorrowHistory.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="px-5 py-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Request History
                </p>
              </div>

              <div className="p-4 space-y-2">
                {myBorrowHistory.map((br: any) => (
                  <div
                    key={br.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {br.equipment?.name}
                        </p>

                        <span className="text-xs text-slate-400 font-mono">
                          {br.equipment?.assetTag}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1">
                        Due: {br.expectedReturnDate}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                        br.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {br.status === "approved" ? "✓ Approved" : "✕ Rejected"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Borrow Requests panel (for PIC/Admin) */}
      {showBorrowRequests && showPICPanel && (
        <div className="mb-6 bg-white rounded-xl border border-amber-200 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-amber-800">
              📋 Pending Borrow Requests
            </h2>
            <button
              onClick={() => setShowBorrowRequests(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          {borrowRequests.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              No pending borrow requests.
            </p>
          ) : (
            <div className="space-y-2">
              {borrowRequests.map((br: any) => (
                <div
                  key={br.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {br.equipment?.name}{" "}
                      <span className="text-xs text-slate-400 font-mono">
                        {br.equipment?.assetTag}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Requested by: {br.user?.name} ({br.user?.department}) ·
                      Due: {br.expectedReturnDate}
                    </p>
                    {br.notes && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Note: {br.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => handleApproveRequest(br.id)}
                      className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(br.id);
                        setRejectReason("");
                      }}
                      className="text-xs px-3 py-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reject dialog inline */}
          {rejectingId && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-2">
                Rejection Reason
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm focus:outline-none resize-none"
                rows={2}
                placeholder="Why is this request rejected?"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleRejectRequest(rejectingId)}
                  className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, tag, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <select
          value={filterStatus}
          onChange={(e) => {
            const val = e.target.value;
            router.push(val ? `/equipment?status=${val}` : "/equipment");
          }}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="borrowed">Borrowed</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Asset Tag
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Brand
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Borrower
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Location
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No equipment found
                  </td>
                </tr>
              ) : (
                equipment.map((eq) => {
                  const currentBorrower = eq.borrowRecords?.[0]?.user;
                  const canEdit = isAdmin;
                  return (
                    <tr
                      key={eq.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {eq.assetTag}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 text-xs">
                        {eq.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {eq.brand || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(eq.status)}`}
                        >
                          {eq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {currentBorrower?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {eq.location || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5 flex-wrap">
                          {eq.status === "available" && (
                            <button
                              onClick={() => openRequestBorrow(eq)}
                              className="text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 whitespace-nowrap"
                            >
                              Request
                            </button>
                          )}
                          {eq.status === "borrowed" && (
                            <button
                              onClick={() => handleReturn(eq.id)}
                              className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 whitespace-nowrap"
                            >
                              Return
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                onClick={() => openEdit(eq)}
                                className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 whitespace-nowrap"
                              >
                                Edit
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(eq.id)}
                                  className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 whitespace-nowrap"
                                >
                                  Del
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-800 mb-6">
              {editingId ? "Edit Equipment" : "Add Equipment"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    Asset Tag *
                  </label>
                  <input
                    required
                    value={form.assetTag}
                    onChange={(e) =>
                      setForm({ ...form, assetTag: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g., LAP-001"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  >
                    <option value="available">Available</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Equipment name"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Brand
                </label>
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., Apple"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Supplier
                </label>
                <input
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({ ...form, supplier: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="e.g., Apple Store"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    Date Purchased
                  </label>
                  <input
                    type="date"
                    value={form.datePurchased}
                    onChange={(e) =>
                      setForm({ ...form, datePurchased: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    Location
                  </label>
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="e.g., Office A"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  {editingId ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Borrow Modal */}
      {requestTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setRequestTarget(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Request Borrow: {requestTarget.name}
            </h2>
            <p className="text-xs text-slate-400 mb-2">
              {requestTarget.assetTag} · {requestTarget.brand || ""}
            </p>
            <form onSubmit={handleRequestBorrow} className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                Requesting as: <strong>{user?.name}</strong> ({user?.email})
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Expected Return *
                </label>
                <input
                  type="date"
                  required
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">
                  Notes
                </label>
                <input
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                  placeholder="Optional..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="flex-1 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {requestSubmitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestTarget(null)}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <Suspense
      fallback={<div className="flex items-center justify-center h-64">/</div>}
    >
      <EquipmentContent />
    </Suspense>
  );
}
