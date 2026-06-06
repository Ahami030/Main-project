"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ArchivedBilling {
  _id: string;
  originalBillingId: string;
  billingNumber: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  poNumbers?: string[];
  taxInvoices?: { invoiceNumber?: string; amount?: number }[];
  billingStatus?: string;
  billingDate?: string;
  archivedAt: string;
  archiveReason?: string;
}

const REASON_LABEL: Record<string, string> = {
  manual_reset: "Reset โดย admin",
  expired:      "หมดอายุ",
  full_reset:   "Reset ทั้งหมด",
};

const STATUS_BADGE: Record<string, string> = {
  draft:     "badge-ghost",
  finalized: "badge-success",
  billed:    "badge-warning",
  paid:      "badge-primary",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });

const fmtMoney = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ArchivedBillingsPage() {
  const router = useRouter();
  const [billings, setBillings] = useState<ArchivedBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/history/billings")
      .then((r) => r.ok ? r.json() : [])
      .then(setBillings)
      .finally(() => setLoading(false));
  }, []);

  const filtered = billings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.billingNumber?.toLowerCase().includes(q) ||
      b.customerName?.toLowerCase().includes(q) ||
      b.customerEmail?.toLowerCase().includes(q)
    );
  });

  const totalAmount = (b: ArchivedBilling) =>
    (b.taxInvoices ?? []).reduce((s, inv) => s + (inv.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-base-200 p-4 lg:p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/Admin")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </button>
          <div>
            <h1 className="text-lg font-bold text-base-content">ประวัติใบวางบิล</h1>
            <p className="text-[11px] text-base-content/40">ใบวางบิลที่ถูก archive ทั้งหมด</p>
          </div>
          <span className="badge badge-warning badge-outline ml-auto">
            {billings.length} รายการ
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาเลขที่ใบวางบิล, ชื่อ หรืออีเมล..."
            className="input input-bordered w-full pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2 text-base-content/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">{search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีประวัติใบวางบิล"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="bg-base-200/60 text-[10px] uppercase tracking-wider text-base-content/40">
                    <th>เลขที่ใบวางบิล</th>
                    <th>ลูกค้า</th>
                    <th>ยอดรวม</th>
                    <th>สถานะเดิม</th>
                    <th>เหตุผล Archive</th>
                    <th>Archive เมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b._id} className="hover:bg-base-200/30 transition-colors">
                      <td className="font-mono text-xs font-medium">{b.billingNumber}</td>
                      <td>
                        <p className="text-sm font-medium">{b.customerName ?? "-"}</p>
                        <p className="text-[11px] text-base-content/40">{b.customerEmail ?? ""}</p>
                      </td>
                      <td className="text-sm font-semibold tabular-nums">
                        ฿{fmtMoney(totalAmount(b))}
                      </td>
                      <td>
                        <span className={`badge badge-sm ${STATUS_BADGE[b.billingStatus ?? ""] ?? "badge-ghost"}`}>
                          {b.billingStatus ?? "-"}
                        </span>
                      </td>
                      <td className="text-xs text-base-content/60">
                        {REASON_LABEL[b.archiveReason ?? ""] ?? b.archiveReason ?? "-"}
                      </td>
                      <td className="text-xs text-base-content/60">
                        {fmt(b.archivedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
