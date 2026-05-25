'use client';
import { useCallback, useEffect, useState } from 'react';
import InlineChatPanel from '@/components/admin/InlineChatPanel';

type QuotationStatus = 'sent' | 'reviewing' | 'completed' | 'bargaining';

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
};

const STATUS_BADGE: Record<QuotationStatus, string> = {
  sent:       'badge-success',
  reviewing:  'badge-warning',
  completed:  'badge-primary',
  bargaining: 'badge-accent',
};

const NEXT_STATUS: Record<QuotationStatus, QuotationStatus | null> = {
  sent:       'reviewing',
  reviewing:  'completed',
  completed:  'bargaining',
  bargaining: null,
};

export default function AdminPage() {
  const [theme, setTheme] = useState('light');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

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

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      {/* ── Navbar ── */}
      <nav className="navbar bg-base-100 border-b border-base-300 shrink-0 px-4 lg:px-6">
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-base-content text-lg">Admin Panel</span>
          </div>
        </div>
        <div className="flex-none gap-1">
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm btn-square rounded-lg"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ── Page body ── */}
      <div className="p-4 lg:p-6">
        <main className="flex flex-col gap-5 max-w-5xl mx-auto">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-base-content/50 font-medium uppercase tracking-wider">Users</p>
                    <h2 className="text-lg font-bold text-base-content mt-1">Manage users</h2>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="card-actions mt-3">
                  <button className="btn btn-primary btn-sm rounded-lg w-full">View</button>
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
                                <button
                                  onClick={() => deleteQuotation(q._id)}
                                  disabled={updating === q._id}
                                  className="btn btn-xs btn-error btn-outline rounded-lg"
                                >
                                  {updating === q._id
                                    ? <span className="loading loading-spinner loading-xs" />
                                    : 'ลบ / รีเซ็ต'}
                                </button>
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
