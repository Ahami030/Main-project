'use client';
import { JSX, useCallback, useEffect, useRef, useState } from 'react';
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

// ─── Reusable navigation card (Mastercard editorial) ───────────────────────────
function NavCard({
  category, title, desc, icon, iconWrap, count, cta = 'ดูทั้งหมด', onClick,
}: {
  category: string;
  title: string;
  desc: string;
  icon: JSX.Element;
  iconWrap: string;
  count?: number;
  cta?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group card bg-base-100 border border-base-300/70 rounded-[2rem] shadow-mc-sm hover:shadow-mc hover:-translate-y-0.5 transition-all duration-300 text-left"
    >
      <div className="card-body p-6 gap-0">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconWrap}`}>
            {icon}
          </div>
          {!!count && count > 0 && (
            <span className="min-w-6 h-6 px-2 rounded-full bg-error text-error-content text-xs font-bold flex items-center justify-center animate-pulse shrink-0">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-base-content/40">{category}</p>
        <h2 className="font-medium text-lg tracking-mc leading-tight mt-1">{title}</h2>
        <p className="text-sm text-base-content/50 mt-1.5">{desc}</p>
        <div className="flex items-center gap-1.5 text-sm font-medium mt-5 text-base-content/80 group-hover:text-base-content transition-colors">
          {cta}
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── Section eyebrow header ─────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/55">
      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      {label}
    </p>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [newRfqCount, setNewRfqCount] = useState(0);
  const [pendingPoCount, setPendingPoCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const prevRfqCountRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  // ── Theme ──────────────────────────────────────────────────────────────────
  // Follow the global Theme picker (navbar) but default to the Mastercard theme.
  const [theme, setTheme] = useState('mastercard');
  useEffect(() => {
    const pick = () => setTheme(localStorage.getItem('theme') || 'mastercard');
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

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

  // ── Pending payment-proofs awaiting review ──────────────────────────────────
  useEffect(() => {
    const fetchPaymentCount = async () => {
      try {
        const res = await fetch('/api/payment-proof');
        const data = await res.json();
        if (Array.isArray(data)) {
          setPendingPaymentCount(data.filter((p: { status: string }) => p.status === 'pending').length);
        }
      } catch {}
    };
    fetchPaymentCount();
    const id = setInterval(fetchPaymentCount, 10000);
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
    <div data-theme={theme} className="font-mc relative min-h-screen bg-base-200 text-base-content overflow-hidden">

      {/* ── Decorative orbital rings ─────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30rem] -right-[18rem] w-[58rem] h-[58rem] rounded-full border border-accent/15" />
        <div className="absolute -top-[22rem] -right-[10rem] w-[42rem] h-[42rem] rounded-full border border-accent/10" />
        <div className="absolute -bottom-[34rem] -left-[20rem] w-[58rem] h-[58rem] rounded-full border border-secondary/12" />
        <div className="absolute -bottom-[26rem] -left-[12rem] w-[42rem] h-[42rem] rounded-full border border-secondary/[0.08]" />
      </div>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="toast toast-top toast-end z-50 gap-2">
          {toasts.map((t) => (
            <div key={t.id} className="alert alert-info shadow-mc max-w-xs rounded-2xl">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t.message}</p>
                <p className="text-xs opacity-80">{t.count} งานใหม่เข้ามาใน RFQ</p>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => dismissToast(t.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="relative p-4 lg:p-8">
        <main className="flex flex-col gap-8 max-w-5xl mx-auto">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="pt-2">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/55 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Admin Console
            </p>
            <h1 className="text-4xl md:text-5xl font-medium tracking-mc leading-[1.05]">
              แดชบอร์ด<span className="text-accent">ผู้ดูแลระบบ</span>
            </h1>
            <p className="text-base text-base-content/55 mt-3 max-w-lg leading-relaxed">
              จัดการใบเสนอราคา ใบสั่งซื้อ การชำระเงิน และดูประวัติย้อนหลังได้จากที่นี่
            </p>
          </div>

          {/* ── Management section ──────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <SectionHeader label="การจัดการ" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              <NavCard
                category="RFQ"
                title="Manage RFQ"
                desc="ดูและจัดการใบเสนอราคา"
                count={newRfqCount}
                iconWrap="bg-primary/10 text-primary"
                onClick={() => router.push('/Admin/rfq')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />

              <NavCard
                category="Purchase Order"
                title="Manage PO"
                desc="ดูและจัดการใบสั่งซื้อ"
                count={pendingPoCount}
                iconWrap="bg-secondary/10 text-secondary"
                onClick={() => router.push('/Admin/po')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                }
              />

              <NavCard
                category="Payment"
                title="จัดการการชำระเงิน"
                desc="ตรวจสอบและอนุมัติหลักฐานการโอน"
                count={pendingPaymentCount}
                iconWrap="bg-success/10 text-success"
                onClick={() => router.push('/Admin/payments')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={1.75} />
                    <circle cx="12" cy="12" r="2.5" strokeWidth={1.75} />
                    <path strokeWidth={1.75} strokeLinecap="round" d="M6 12h.01M18 12h.01" />
                  </svg>
                }
              />

              <NavCard
                category="Billing"
                title="จัดการใบวางบิล"
                desc="ดูและจัดการใบวางบิลทั้งหมด"
                iconWrap="bg-accent/10 text-accent"
                onClick={() => router.push('/Admin/billing')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                }
              />

            </div>
          </section>

          {/* ── Archive section ─────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <SectionHeader label="ประวัติย้อนหลัง" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <NavCard
                category="Archive"
                title="ประวัติแชท"
                desc="บทสนทนาที่ถูก archive แล้ว"
                cta="ดูประวัติ"
                iconWrap="bg-info/10 text-info"
                onClick={() => router.push('/Admin/history/chats')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
              />

              <NavCard
                category="Archive"
                title="ประวัติใบวางบิล"
                desc="ใบวางบิลที่ถูก archive แล้ว"
                cta="ดูประวัติ"
                iconWrap="bg-warning/10 text-warning"
                onClick={() => router.push('/Admin/history/billings')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
              />

              <NavCard
                category="Archive"
                title="ประวัติ RFQ"
                desc="ใบเสนอราคาที่ถูก archive แล้ว"
                cta="ดูประวัติ"
                iconWrap="bg-base-200 text-base-content/50"
                onClick={() => router.push('/Admin/history/rfqs')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                }
              />

            </div>
          </section>

          {/* ── Chat panel: desktop only (mobile uses floating button) ── */}
          <div className="hidden lg:block bg-base-100 border border-base-300/70 rounded-[2rem] overflow-hidden shadow-mc-sm" style={{ height: '480px' }}>
            <InlineChatPanel onRfqCount={handleRfqCount} />
          </div>

          {/* ── จัดการใบเสนอราคา — collapse ── */}
          <div className="collapse collapse-arrow bg-base-100 border border-base-300/70 rounded-[2rem] shadow-mc-sm">
            <input type="checkbox" />
            <div className="collapse-title min-h-0 py-5 px-6">
              <div className="flex items-center gap-3 flex-wrap">
                <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-base tracking-mc text-base-content">จัดการใบเสนอราคา</span>
                <span className="badge badge-ghost badge-sm text-[10px]">{quotations.length} รายการ</span>
                <span className="badge badge-warning badge-sm text-[10px]">Debug</span>
              </div>
            </div>

            <div className="collapse-content px-0 pb-0">
              <div className="border-t border-base-200 px-6 pt-4 pb-6 space-y-3">
                {/* Refresh button */}
                <div className="flex justify-end">
                  <button
                    onClick={fetchQuotations}
                    className="btn btn-ghost btn-xs gap-1.5"
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
                  <div className="overflow-x-auto rounded-2xl border border-base-200">
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
                                    className="btn btn-xs btn-outline"
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
                                    className="btn btn-xs btn-error btn-outline"
                                  >
                                    {updating === q._id
                                      ? <span className="loading loading-spinner loading-xs" />
                                      : 'ลบ'}
                                  </button>
                                  {(q.status === 'bargaining' || q.status === 'confirmed') && (
                                    <button
                                      onClick={() => handleReset(q)}
                                      disabled={resetting === q._id || updating === q._id}
                                      className="btn btn-xs btn-warning"
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
