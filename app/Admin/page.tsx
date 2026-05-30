'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import InlineChatPanel from '@/components/admin/InlineChatPanel';

type QuotationStatus = 'sent' | 'reviewing' | 'completed' | 'bargaining' | 'confirmed';

interface Quotation {
  _id: string;
  userId: string;
  filename: string;
  status: QuotationStatus;
  createdAt: string;
}

interface ToastNotification {
  id: number;
  message: string;
  count: number;
}

const STATUS_LABELS: Record<QuotationStatus, string> = {
  sent:       'ส่งแล้ว',
  reviewing:  'กำลังดำเนินการ',
  completed:  'เสร็จสิ้น',
  bargaining: 'พร้อมต่อรอง',
  confirmed:  'ยืนยันแล้ว',
};

const STATUS_BADGE: Record<QuotationStatus, string> = {
  sent:       'badge-success',
  reviewing:  'badge-warning',
  completed:  'badge-primary',
  bargaining: 'badge-accent',
  confirmed:  'badge-success',
};

const NEXT_STATUS: Record<QuotationStatus, QuotationStatus | null> = {
  sent:       'reviewing',
  reviewing:  'completed',
  completed:  'bargaining',
  bargaining: null,
  confirmed:  null,
};

export default function AdminPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [newRfqCount, setNewRfqCount] = useState(0);
  const [pendingPoCount, setPendingPoCount] = useState(0);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const prevRfqCountRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Called by InlineChatPanel on every 3s chat/users poll — zero extra requests
  const handleRfqCount = useCallback((count: number) => {
    setNewRfqCount(count);
    if (prevRfqCountRef.current !== null && count > prevRfqCountRef.current) {
      const incoming = count - prevRfqCountRef.current;
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, message: 'มีงานใหม่เข้ามา', count: incoming }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }
    prevRfqCountRef.current = count;
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotation/all');
      const data = await res.json();
      setQuotations(data.quotations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  useEffect(() => {
    const fetchPoCount = async () => {
      try {
        const res = await fetch('/api/po');
        const data = await res.json();
        if (Array.isArray(data)) {
          setPendingPoCount(data.filter((p: { status: string }) => p.status === 'pending').length);
        }
      } catch {}
    };
    fetchPoCount();
    const id = setInterval(fetchPoCount, 10000);
    return () => clearInterval(id);
  }, []);

  const updateStatus = async (id: string, status: QuotationStatus) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/quotation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setQuotations((prev) => prev.map((q) => (q._id === id ? { ...q, status } : q)));
    } finally {
      setUpdating(null);
    }
  };

  const deleteQuotation = async (id: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/quotation/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setQuotations((prev) => prev.filter((q) => q._id !== id));
    } finally {
      setUpdating(null);
    }
  };

  const handleReset = async (q: Quotation) => {
    if (!confirm(`Reset session ของ ${q.userId}?\n\nสิ่งที่จะเกิดขึ้น:\n• แชทและข้อมูล RFQ จะถูกสำรองไว้ใน archived_chats / archived_rfqs\n• ไฟล์ PDF, quotation, chats, และ RFQ จะถูกลบออก`)) return;
    setResetting(q._id);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: q.userId }),
      });
      if (!res.ok) { alert('Reset ล้มเหลว กรุณาลองใหม่'); return; }
      setQuotations((prev) => prev.filter((x) => x._id !== q._id));
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="toast toast-top toast-end z-50 gap-2">
          {toasts.map((t) => (
            <div key={t.id} className="alert alert-info shadow-lg max-w-xs animate-in slide-in-from-right-4">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t.message}</p>
                <p className="text-xs opacity-80">
                  {t.count} งานใหม่เข้ามาใน RFQ
                </p>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => dismissToast(t.id)}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 lg:p-6">
        <main className="flex flex-col gap-5 max-w-5xl mx-auto">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* ── Manage RFQ ── */}
            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
              <div className="h-0.5 bg-linear-to-r from-primary/50 to-primary rounded-t-2xl" />
              <div className="card-body p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-widest">RFQ</p>
                    <h2 className="text-base font-bold text-base-content mt-1">Manage RFQ</h2>
                    <p className="text-[11px] text-base-content/40 mt-0.5">ดูและจัดการใบเสนอราคา</p>
                  </div>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    {newRfqCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                        {newRfqCount > 99 ? '99+' : newRfqCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-actions mt-4">
                  <button
                    className="btn btn-primary btn-sm rounded-lg w-full font-semibold gap-2"
                    onClick={() => router.push('/Admin/rfq')}
                  >
                    ดูทั้งหมด
                    {newRfqCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/20 rounded-full px-2 py-0.5 leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {newRfqCount} ใหม่
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Manage PO ── */}
            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
              <div className="h-0.5 bg-linear-to-r from-secondary/50 to-secondary rounded-t-2xl" />
              <div className="card-body p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-widest">Purchase Order</p>
                    <h2 className="text-base font-bold text-base-content mt-1">Manage PO</h2>
                    <p className="text-[11px] text-base-content/40 mt-0.5">ดูและจัดการใบสั่งซื้อ</p>
                  </div>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    {pendingPoCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                        {pendingPoCount > 99 ? '99+' : pendingPoCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-actions mt-4">
                  <button
                    className="btn btn-secondary btn-sm rounded-lg w-full font-semibold gap-2"
                    onClick={() => router.push('/Admin/po')}
                  >
                    ดูทั้งหมด
                    {pendingPoCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/20 rounded-full px-2 py-0.5 leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {pendingPoCount} ใหม่
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── View analytics ── */}
            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
              <div className="h-0.5 bg-linear-to-r from-accent/50 to-accent rounded-t-2xl" />
              <div className="card-body p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-widest">Reports</p>
                    <h2 className="text-base font-bold text-base-content mt-1">View analytics</h2>
                    <p className="text-[11px] text-base-content/40 mt-0.5">วิเคราะห์ข้อมูลและรายงาน</p>
                  </div>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                      เร็วๆ นี้
                    </span>
                  </div>
                </div>
                <div className="card-actions mt-4">
                  <button className="btn btn-accent btn-sm rounded-lg w-full font-semibold opacity-50 cursor-not-allowed" disabled>
                    เร็วๆ นี้
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ── Chat panel: desktop only (mobile uses floating button) ── */}
          <div className="hidden lg:block bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm" style={{ height: '480px' }}>
            <InlineChatPanel onRfqCount={handleRfqCount} />
          </div>

          {/* ── จัดการใบเสนอราคา — collapse ── */}
          <div className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-2xl shadow-sm">
            <input type="checkbox" />
            <div className="collapse-title min-h-0 py-4 px-5">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-semibold text-sm text-base-content">จัดการใบเสนอราคา</span>
                <span className="badge badge-ghost badge-sm text-[10px]">
                  {quotations.length} รายการ
                </span>
                <span className="badge badge-warning badge-sm text-[10px]">Debug</span>
              </div>
            </div>

            <div className="collapse-content px-0 pb-0">
              <div className="border-t border-base-200 px-5 pt-4 pb-5 space-y-3">
                {/* Refresh button */}
                <div className="flex justify-end">
                  <button
                    onClick={fetchQuotations}
                    className="btn btn-ghost btn-xs gap-1.5 rounded-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    รีเฟรช
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-10">
                    <span className="loading loading-spinner loading-md" />
                  </div>
                ) : quotations.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 text-base-content/30">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">ยังไม่มีเอกสารที่ส่งเข้ามา</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-base-200">
                    <table className="table table-sm w-full">
                      <thead>
                        <tr className="bg-base-200/60 text-[10px] uppercase tracking-wider text-base-content/40">
                          <th>ชื่อไฟล์</th>
                          <th>ผู้ส่ง (userId)</th>
                          <th>วันที่ส่ง</th>
                          <th>สถานะ</th>
                          <th>อัปเดต</th>
                          <th>รีเซ็ต</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotations.map((q) => {
                          const next = NEXT_STATUS[q.status];
                          const date = new Date(q.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          });
                          return (
                            <tr key={q._id} className="hover:bg-base-200/30 transition-colors">
                              <td className="max-w-48 truncate font-medium text-sm">{q.filename}</td>
                              <td className="font-mono text-[11px] text-base-content/50">{q.userId}</td>
                              <td className="text-xs text-base-content/60">{date}</td>
                              <td>
                                <span className={`badge ${STATUS_BADGE[q.status]} badge-sm`}>
                                  {STATUS_LABELS[q.status]}
                                </span>
                              </td>
                              <td>
                                {next ? (
                                  <button
                                    onClick={() => updateStatus(q._id, next)}
                                    disabled={updating === q._id}
                                    className="btn btn-xs btn-outline rounded-lg"
                                  >
                                    {updating === q._id
                                      ? <span className="loading loading-spinner loading-xs" />
                                      : `→ ${STATUS_LABELS[next]}`}
                                  </button>
                                ) : (
                                  <span className="text-xs text-base-content/30">เสร็จสิ้นแล้ว</span>
                                )}
                              </td>
                              <td>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => deleteQuotation(q._id)}
                                    disabled={updating === q._id || resetting === q._id}
                                    className="btn btn-xs btn-error btn-outline rounded-lg"
                                  >
                                    {updating === q._id
                                      ? <span className="loading loading-spinner loading-xs" />
                                      : 'ลบ'}
                                  </button>
                                  {(q.status === 'bargaining' || q.status === 'confirmed') && (
                                    <button
                                      onClick={() => handleReset(q)}
                                      disabled={resetting === q._id || updating === q._id}
                                      className="btn btn-xs btn-warning rounded-lg"
                                      title="Archive แชท+RFQ แล้วลบทุกอย่าง เพื่อเริ่มใหม่"
                                    >
                                      {resetting === q._id
                                        ? <span className="loading loading-spinner loading-xs" />
                                        : 'Reset'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
