'use client';
import { useCallback, useEffect, useState } from 'react';

type QuotationStatus = 'sent' | 'reviewing' | 'completed';

interface Quotation {
  _id: string;
  userId: string;
  filename: string;
  status: QuotationStatus;
  createdAt: string;
}

const STATUS_LABELS: Record<QuotationStatus, string> = {
  sent:      'ส่งแล้ว',
  reviewing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
};

const STATUS_BADGE: Record<QuotationStatus, string> = {
  sent:      'badge-success',
  reviewing: 'badge-warning',
  completed: 'badge-primary',
};

const NEXT_STATUS: Record<QuotationStatus, QuotationStatus | null> = {
  sent:      'reviewing',
  reviewing: 'completed',
  completed: null,
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
      setQuotations((prev) =>
        prev.map((q) => (q._id === id ? { ...q, status } : q))
      );
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
    <div className="min-h-screen bg-base-100">
      <nav className="navbar bg-base-200 shadow-lg">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Admin Panel</a>
        </div>
        <div className="flex-none gap-2">
          <button
            onClick={toggleTheme}
            className="btn btn-square btn-ghost"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>

      <main className="p-8 space-y-8">
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Users</h2>
              <p>Manage users</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary">View</button>
              </div>
            </div>
          </div>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Settings</h2>
              <p>Configure system</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary">View</button>
              </div>
            </div>
          </div>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Reports</h2>
              <p>View analytics</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary">View</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quotation Management ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">จัดการใบเสนอราคา</h2>
            <button
              onClick={fetchQuotations}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : 'รีเฟรช'}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : quotations.length === 0 ? (
            <div className="card bg-base-200 border border-base-300">
              <div className="card-body items-center py-12">
                <p className="text-base-content/50">ยังไม่มีเอกสารที่ส่งเข้ามา</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-base-300">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
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
                      <tr key={q._id}>
                        <td className="max-w-52 truncate font-medium">{q.filename}</td>
                        <td className="font-mono text-xs text-base-content/60">{q.userId}</td>
                        <td className="text-sm">{date}</td>
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
                              className="btn btn-xs btn-outline"
                            >
                              {updating === q._id
                                ? <span className="loading loading-spinner loading-xs" />
                                : `→ ${STATUS_LABELS[next]}`}
                            </button>
                          ) : (
                            <span className="text-xs text-base-content/40">เสร็จสิ้นแล้ว</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => deleteQuotation(q._id)}
                            disabled={updating === q._id}
                            className="btn btn-xs btn-error btn-outline"
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
        </section>
      </main>
    </div>
  );
}
