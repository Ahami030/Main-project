'use client';
import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    const fetchRfqCount = async () => {
      try {
        const res = await fetch('/api/rfq');
        if (!res.ok) return;
        const data = await res.json();
        const rfqs: any[] = Array.isArray(data) ? data : [];
        const lastSeen = parseInt(localStorage.getItem('admin_rfq_last_seen') || '0');
        const count = rfqs.filter((r) => new Date(r.createdAt).getTime() > lastSeen).length;
        setNewRfqCount(count);
      } catch {}
    };
    fetchRfqCount();
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
      <div className="p-4 lg:p-6">
        <main className="flex flex-col gap-5 max-w-5xl mx-auto">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-base-content/50 font-medium uppercase tracking-wider">RFQ</p>
                    <h2 className="text-lg font-bold text-base-content mt-1">Manage RFQ</h2>
                  </div>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    {newRfqCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 px-1 rounded-full bg-error text-error-content text-[9px] font-bold flex items-center justify-center animate-bounce">
                        {newRfqCount > 99 ? '99+' : newRfqCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-actions mt-3">
                  <button
                    className="btn btn-primary btn-sm rounded-lg w-full gap-2"
                    onClick={() => {
                      localStorage.setItem('admin_rfq_last_seen', Date.now().toString());
                      setNewRfqCount(0);
                      router.push('/Admin/rfq');
                    }}
                  >
                    View
                    {newRfqCount > 0 && (
                      <span className="badge badge-error badge-sm text-[10px] font-bold">
                        {newRfqCount > 99 ? '99+' : newRfqCount} ใหม่
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-base-content/50 font-medium uppercase tracking-wider">Settings</p>
                    <h2 className="text-lg font-bold text-base-content mt-1">Configure system</h2>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="card-actions mt-3">
                  <button className="btn btn-secondary btn-sm rounded-lg w-full">View</button>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-base-content/50 font-medium uppercase tracking-wider">Reports</p>
                    <h2 className="text-lg font-bold text-base-content mt-1">View analytics</h2>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="card-actions mt-3">
                  <button className="btn btn-accent btn-sm rounded-lg w-full">View</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Chat panel: desktop only (mobile uses floating button) ── */}
          <div className="hidden lg:block bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm" style={{ height: '480px' }}>
            <InlineChatPanel />
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
