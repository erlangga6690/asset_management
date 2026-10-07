'use client';

import { useEffect, useState } from 'react';
import { getInvestmentDashboard, getExpenseDashboard, returnEquipment, sendReminder } from '@/lib/api';

function formatUSD(v: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(v));
}

export default function DashboardPage() {
  const [investData, setInvestData] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const fetchData = async () => {
  setLoading(true);

  try {
    console.log('=== INVESTMENT REQUEST ===');

    try {
      const invest = await getInvestmentDashboard();

      console.log('✅ INVESTMENT SUCCESS:', invest.data);

      setInvestData(invest.data);
    } catch (err: any) {
      console.error('❌ INVESTMENT ERROR', {
        status: err.response?.status,
        message: err.message,
        baseURL: err.config?.baseURL,
        url: err.config?.url,
        method: err.config?.method,
        response: err.response?.data,
      });
    }

    console.log('=== EXPENSE REQUEST ===');

    try {
      const expense = await getExpenseDashboard();

      console.log('✅ EXPENSE SUCCESS:', expense.data);

      setExpenseData(expense.data);
    } catch (err: any) {
      console.error('❌ EXPENSE ERROR', {
        status: err.response?.status,
        message: err.message,
        baseURL: err.config?.baseURL,
        url: err.config?.url,
        method: err.config?.method,
        response: err.response?.data,
      });
    }

  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 15000); return () => clearInterval(i); }, []);

  const handleReturn = async (id: string) => { await returnEquipment(id); fetchData(); };
  const handleRemind = async (recordId: string) => {
  try {
    setSendingReminderId(recordId);

    await sendReminder(recordId);

    console.log('✅ Reminder sent:', recordId);
  } catch (err: any) {
    console.error('❌ Failed to send reminder:', {
      status: err.response?.status,
      message: err.message,
      response: err.response?.data,
    });

    alert(
      err.response?.data?.message ||
      'Failed to send reminder'
    );
  } finally {
    setSendingReminderId(null);
  }
};


  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  const inv = investData?.stats;
  const exp = expenseData?.stats;


  return (
    <div className="space-y-8">
      {/* ═══ INVESTMENT (Equipment) ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
      <span className="text-xl">💻</span>
    </div>

    <div>
      <h2 className="text-lg font-bold text-slate-800">
        Equipment
      </h2>
      <p className="text-xs text-slate-400">
        Equipment overview
      </p>
    </div>
  </div>

  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
    {inv?.totalEquipment || 0} items
  </span>
</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
  <Metric
    label="Total Equipment"
    value={inv?.totalEquipment || 0}
  />

  <Metric
    label="Borrowed"
    value={inv?.borrowedCount || 0}
    color="text-blue-600"
  />

  <Metric
    label="Overdue"
    value={inv?.overdueCount || 0}
    color={inv?.overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}
  />
</div>
 {/* Borrowed + Overdue */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">

  {/* ═══ Borrowed Items ═══ */}
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col min-h-[380px]">

    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Borrowed Items
        </h3>

        <p className="text-[11px] text-slate-400 mt-1">
          Currently borrowed equipment
        </p>
      </div>

      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
        {investData?.borrowedRecords?.length || 0} Active
      </span>
    </div>

    {!investData?.borrowedRecords?.length ? (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
          📦
        </div>

        <p className="text-sm font-medium text-slate-500">
          No borrowed equipment
        </p>

        <p className="text-xs text-slate-400 mt-1">
          All equipment has been returned
        </p>
      </div>
    ) : (
      <div className="space-y-2 overflow-y-auto pr-1 max-h-[330px]">
        {investData.borrowedRecords.map((r: any) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const dueDate = r.expectedReturnDate
            ? new Date(`${r.expectedReturnDate}T00:00:00`)
            : null;

          const isOverdue = dueDate && dueDate < today;

          return (
            <div
              key={r.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isOverdue
                  ? 'bg-red-50 border-red-100'
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
              }`}
            >
              {/* Equipment Icon */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isOverdue ? 'bg-red-100' : 'bg-blue-100'
                }`}
              >
                💻
              </div>

              {/* Equipment */}
              <div className="min-w-0 flex-[1.4]">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {r.equipment?.name || '-'}
                </p>

                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {r.equipment?.assetTag || '-'}
                </p>
              </div>

              {/* Borrower */}
              <div className="hidden sm:block min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-wide text-slate-400">
                  Borrower
                </p>

                <p className="text-xs font-medium text-slate-600 truncate">
                  {r.user?.name || '-'}
                </p>
              </div>

              {/* Due */}
              <div className="text-right shrink-0">
                <p className="text-[9px] uppercase tracking-wide text-slate-400">
                  Due
                </p>

                <p
                  className={`text-xs font-semibold ${
                    isOverdue ? 'text-red-600' : 'text-slate-600'
                  }`}
                >
                  {r.expectedReturnDate
                    ? new Date(r.expectedReturnDate).toLocaleDateString('en-GB')
                    : '-'}
                </p>

                {isOverdue && (
                  <span className="text-[9px] font-semibold text-red-600">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>

  {/* ═══ Overdue Returns ═══ */}
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col min-h-[380px]">

    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Overdue Returns
        </h3>

        <p className="text-[11px] text-slate-400 mt-1">
          Equipment past its return date
        </p>
      </div>

      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          investData?.overdueRecords?.length
            ? 'text-red-600 bg-red-50'
            : 'text-emerald-600 bg-emerald-50'
        }`}
      >
        {investData?.overdueRecords?.length || 0} Overdue
      </span>
    </div>

    {!investData?.overdueRecords?.length ? (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-15 h-15 rounded-full bg-orange-50 flex items-center justify-center mb-2">
          📦
        </div>

        <p className="text-sm font-medium text-slate-500">
          No overdue items
        </p>

        <p className="text-xs text-slate-400 mt-1">
          All borrowed equipment is on schedule
        </p>
      </div>
    ) : (
      <div className="space-y-2 overflow-y-auto pr-1 max-h-[330px]">
        {investData.overdueRecords.map((r: any) => (
          <div
            key={r.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100"
          >
            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              ⚠️
            </div>

            {/* Equipment */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {r.equipment?.name || '-'}
              </p>

              <p className="text-[10px] text-slate-400 font-mono">
                {r.equipment?.assetTag || '-'}
              </p>
            </div>

            {/* Borrower */}
            <div className="hidden sm:block min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">
                Borrower
              </p>

              <p className="text-xs font-medium text-slate-600 truncate">
                {r.user?.name || '-'}
              </p>
            </div>

            {/* Due */}
            <div className="text-right shrink-0">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">
                Due
              </p>

              <p className="text-xs font-semibold text-red-600">
                {r.expectedReturnDate
                  ? new Date(r.expectedReturnDate).toLocaleDateString('en-GB')
                  : '-'}
              </p>

              <span className="text-[9px] font-semibold text-red-600">
                Overdue
              </span>
            </div>
          
          </div>
        ))}
      </div>
    )}
  </div>
</div>

      </div>

      {/* ═══ Divider ═══ */}
      <div className="border-t border-slate-200" />

      {/* ═══ EXPENSE (Consumables) ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📋</span>
          <h2 className="text-lg font-bold text-slate-800">Expense — Consumables</h2>
          <span className="text-xs text-slate-400 ml-2">{exp?.totalConsumables || 0} items</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <Metric label="Total Items" value={exp?.totalConsumables} />
          <Metric label="Total Stock" value={exp?.totalStock} />
          <Metric label="Pending Requests" value={exp?.pendingRequests} color={exp?.pendingRequests > 0 ? 'text-amber-600' : ''} />
          <Metric label="Low Stock Items" value={exp?.lowStockCount} color={exp?.lowStockCount > 0 ? 'text-red-600' : ''} />
          <Metric label="Approved (Month)" value={exp?.approvedThisMonth} color="text-emerald-600" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Low stock */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Low Stock
            </h3>
            {!expenseData?.lowStockConsumables?.length ? (
              <p className="text-sm text-slate-400 pt-2">All stocked up ✅</p>
            ) : (
              <div className="space-y-2">{expenseData.lowStockConsumables.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <div><p className="text-sm font-medium text-slate-700">{item.name}</p><p className="text-xs text-slate-400">{item.brand || '-'}</p></div>
                  <span className={`text-sm font-bold ${item.stock <= 2 ? 'text-red-600' : 'text-amber-600'}`}>{item.stock} left</span>
                </div>
              ))}</div>
            )}
          </div>

          {/* Recent requests */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Recent Requests</h3>
            {!expenseData?.recentRequests?.length ? (
              <p className="text-sm text-slate-400 pt-2">No requests yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expenseData.recentRequests.map((r: any) => (
                  <div key={r.id} className="p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700">{r.user?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {r.items?.map((i: any) => `${i.consumable?.name} ×${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                      r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      r.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      r.status.includes('pending') ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {r.status.replace(/_/g, ' ')}
                      {r.requestType === 'planned' && r.status !== 'approved' && r.status !== 'rejected' ? ' (2-step)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, color }: { label: string; value?: string | number; sub?: string; color?: string }) {
  return <div className="bg-white rounded-xl border border-slate-200 p-3.5">
    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">{label}</p>
    {value !== undefined && <p className={`text-lg font-bold ${color || 'text-slate-800'}`}>{value}</p>}
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>;
}
