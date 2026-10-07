'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getBorrowRequests, approveBorrowRequest, rejectBorrowRequest } from '@/lib/api';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isAdmin, isAdminOrAdmin2 } = useAuth();

  // Notification bell
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const canApprove = user?.role === 'pic_location' || user?.role === 'pic_barang' || user?.role === 'admin' || user?.role === 'admin2';

  const fetchNotifications = useCallback(async () => {
    if (!canApprove) return;
    try {
      const res = await getBorrowRequests({ status: 'pending_pic' });
      setPendingRequests(res.data || []);
    } catch {}
  }, [canApprove]);

  useEffect(() => { fetchNotifications(); const i = setInterval(fetchNotifications, 10000); return () => clearInterval(i); }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleApprove = async (id: string) => {
    if (!user?.id) return alert('Not logged in');
    try { 
      const res = await approveBorrowRequest(id, user.id); 
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      setNotifOpen(false);
    } catch (err: any) { 
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      alert('Approve failed: ' + msg);
    }
  };
  const handleReject = async (id: string) => {
    if (!user?.id) return alert('Not logged in');
    try { 
      await rejectBorrowRequest(id, user.id);
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      setNotifOpen(false);
    } catch (err: any) { 
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      alert('Reject failed: ' + msg);
    }
  };

  const roleLabel: Record<string, string> = {
    admin: 'Admin', admin2: 'Admin 2', pic_location: 'PIC Location', pic_barang: 'PIC Barang', user: 'User',
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const navGroups = [
    { label: 'Overview', items: [{ label: 'Dashboard', href: '/', icon: '📊' }] },
    { label: 'Investment (Equipment)', items: [
      { label: 'Equipment', href: '/equipment', icon: '💻' },
      { label: 'Borrow Records', href: '/borrows', icon: '🔄' },
    ]},
    { label: 'Expense (Consumables)', items: [
      { label: 'Consumables', href: '/consumables', icon: '📋' },
      { label: 'Requests', href: '/requests', icon: '📦' },
      { label: 'Planned to Buy', href: '/planned', icon: '📅' },
    ]},
    ...(isAdminOrAdmin2 ? [{ label: 'People', items: [{ label: 'Users', href: '/users', icon: '👥' }] }] : []),
    ...(isAdmin ? [{ label: 'Tools', items: [{ label: 'Bulk Upload (Excel)', href: '/bulk-upload', icon: '📤' }] }] : []),
  ];

  const notifCount = pendingRequests.length;

  return (
    <div className="flex min-h-screen">
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-40 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`h-16 flex items-center border-b border-slate-100 px-4 ${collapsed ? 'justify-center' : ''}`}>
         <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">SAM</div>
            {!collapsed && <span className="font-semibold text-slate-800 text-sm">Software Assets Management</span>}
          </Link>
        </div>
        <nav className="p-3 space-y-4 overflow-y-auto h-[calc(100vh-4rem)]">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{group.label}</p>}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive(item.href) ? 'bg-blue-50 text-blue-700 font-medium border border-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'} ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}>
                    <span className="text-base">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <button onClick={() => setCollapsed(!collapsed)} className="absolute bottom-16 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
          {collapsed ? '→' : '←'}
        </button>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <h1 className="text-lg font-semibold text-slate-800">Software Assets Management</h1>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            {canApprove && (
              <div ref={notifRef} className="relative">
                <button onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="text-lg">🔔</span>
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {notifCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">📋 Borrow Requests</p>
                      <p className="text-[10px] text-slate-400">{notifCount} pending</p>
                    </div>
                    {notifCount === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">No pending requests</p>
                    ) : (
                      pendingRequests.map((br: any) => (
                        <div key={br.id} className="p-3 border-b border-slate-50 hover:bg-slate-50">
                          <p className="text-xs font-medium text-slate-800">{br.equipment?.name}</p>
                          <p className="text-[10px] text-slate-400">{br.equipment?.assetTag} · {br.user?.name} · Due: {br.expectedReturnDate}</p>
                          {br.notes && <p className="text-[10px] text-slate-400 italic">{br.notes}</p>}
                          <div className="flex gap-2 mt-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleApprove(br.id); }}
                              className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">✓ Approve</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleReject(br.id); }}
                              className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200">✕ Reject</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">{user?.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{roleLabel[user?.role || 'user']}</span>
            </div>
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-colors">Logout</button>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
