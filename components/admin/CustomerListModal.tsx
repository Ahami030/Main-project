'use client';

import { useCallback, useEffect, useState } from 'react';

type Customer = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  organizationName?: string;
  createdAt?: string;
  hasCred?: boolean; // walk-in account — stored (encrypted) password viewable
};

// Customer directory for the front desk.
// Walk-in accounts (created by staff): password stored encrypted → view anytime + delete (archived).
// Self-registered accounts: password unknowable (bcrypt) → reset-and-show-once.
export default function CustomerListModal({ onClose }: { onClose: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  // one visible password at a time: { customerId, password, label }
  const [revealed, setRevealed] = useState<{ id: string; password: string; label: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    fetch('/api/customers')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone?.includes(q);
  });

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const viewPassword = async (c: Customer) => {
    if (revealed?.id === c._id) { setRevealed(null); return; }
    setBusyId(c._id);
    try {
      const res = await fetch(`/api/customers/${c._id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) { alert(data?.message ?? 'ดูรหัสไม่สำเร็จ'); return; }
      setRevealed({ id: c._id, password: data.password, label: 'รหัสผ่าน' });
      setCopied(false);
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (c: Customer) => {
    if (!confirm(`รีเซ็ตรหัสผ่านของ ${c.name || c.email}?\n\nรหัสเดิมจะใช้ไม่ได้อีก`)) return;
    setBusyId(c._id);
    try {
      const res = await fetch(`/api/customers/${c._id}`, { method: 'PATCH' });
      const data = await res.json().catch(() => null);
      if (!res.ok) { alert(data?.message ?? 'รีเซ็ตไม่สำเร็จ'); return; }
      setRevealed({ id: c._id, password: data.password, label: 'รหัสใหม่' });
      setCopied(false);
      load(); // walk-in adoption may flip hasCred
    } finally {
      setBusyId(null);
    }
  };

  const deleteCustomer = async (c: Customer) => {
    if (!confirm(`ลบบัญชี ${c.name || c.email}?\n\n• แชทและ RFQ จะถูกสำรองเข้า archive ก่อน (เหมือน Reset)\n• ไฟล์ PDF, ใบเสนอราคา และตัวบัญชีจะถูกลบ\n• ถ้ามี PO/ใบวางบิล/การชำระเงินผูกอยู่ ระบบจะไม่ลบให้`)) return;
    setBusyId(c._id);
    try {
      const res = await fetch(`/api/customers/${c._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) { alert(data?.message ?? 'ลบไม่สำเร็จ'); return; }
      setCustomers((prev) => prev.filter((x) => x._id !== c._id));
      if (revealed?.id === c._id) setRevealed(null);
    } finally {
      setBusyId(null);
    }
  };

  const copyRevealed = (c: Customer) => {
    if (!revealed) return;
    navigator.clipboard.writeText(`อีเมล: ${c.email}\nรหัสผ่าน: ${revealed.password}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box rounded-3xl max-w-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-base-300/70 shrink-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-base-content/55">Customers</p>
            <h3 className="font-medium text-lg tracking-mc">บัญชีลูกค้า</h3>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose} aria-label="ปิด">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 shrink-0">
          <input
            type="text"
            placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทร…"
            className="input input-bordered input-sm w-full rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {loading ? (
            <div className="flex justify-center py-10"><span className="loading loading-spinner loading-md text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-base-content/40 text-center py-10">ไม่พบลูกค้า</p>
          ) : (
            <div className="rounded-2xl border border-base-200 divide-y divide-base-200">
              {filtered.map((c) => (
                <div key={c._id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{c.name || '—'}</p>
                        {c.hasCred && (
                          <span className="badge badge-ghost badge-xs text-[9px] font-semibold shrink-0">walk-in</span>
                        )}
                      </div>
                      <p className="text-xs text-base-content/50 font-mono truncate">{c.email}</p>
                      <p className="text-[11px] text-base-content/35 mt-0.5">
                        {c.phone ? `${c.phone} · ` : ''}สร้างเมื่อ {fmtDate(c.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.hasCred ? (
                        <>
                          <button
                            onClick={() => viewPassword(c)}
                            disabled={busyId === c._id}
                            className="btn btn-outline btn-xs rounded-lg"
                          >
                            {busyId === c._id
                              ? <span className="loading loading-spinner loading-xs" />
                              : revealed?.id === c._id ? 'ซ่อนรหัส' : 'ดูรหัสผ่าน'}
                          </button>
                          <button
                            onClick={() => deleteCustomer(c)}
                            disabled={busyId === c._id}
                            className="btn btn-outline btn-error btn-xs rounded-lg"
                          >
                            ลบ
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => resetPassword(c)}
                          disabled={busyId === c._id}
                          className="btn btn-outline btn-xs rounded-lg"
                        >
                          {busyId === c._id
                            ? <span className="loading loading-spinner loading-xs" />
                            : 'รีเซ็ตรหัสผ่าน'}
                        </button>
                      )}
                    </div>
                  </div>

                  {revealed?.id === c._id && (
                    <div className="mt-2 rounded-xl border border-warning/30 bg-warning/8 p-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-warning">{revealed.label}</p>
                        <p className="text-sm font-mono">{revealed.password}</p>
                      </div>
                      <button onClick={() => copyRevealed(c)} className="btn btn-warning btn-xs rounded-lg shrink-0">
                        {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกอีเมล+รหัส'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
