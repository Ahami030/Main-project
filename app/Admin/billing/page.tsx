"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type BillingStatus = "draft" | "finalized";

interface Billing {
  _id: string;
  billingNumber: string;
  status: BillingStatus;
  customerName: string;
  customerEmail: string;
  poNumbers: string[];
  taxInvoices: { amount: number }[];
  billingDate?: string;
  createdAt: string;
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminBillingListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "draft" | "finalized">("all");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.ok ? r.json() : [])
      .then(setBillings)
      .finally(() => setLoading(false));
  }, []);

  const filtered = billings.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    const q = search.toLowerCase();
    return !q ||
      b.billingNumber.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.poNumbers.some((p) => p.toLowerCase().includes(q));
  });

  const draftCount = billings.filter((b) => b.status === "draft").length;

  if (!session) return null;

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">จัดการใบวางบิล</h1>
            <p className="text-base-content/60 mt-0.5">สร้างและจัดการใบวางบิลรวมหลาย PO</p>
          </div>
          <button className="btn btn-primary gap-2" onClick={() => router.push("/Admin/billing/new")}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            สร้างใบวางบิลใหม่
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div role="tablist" className="tabs tabs-boxed bg-base-100 border border-base-300">
            {(["all", "draft", "finalized"] as const).map((tab) => (
              <button key={tab} role="tab"
                className={`tab h-7 min-h-0 text-xs font-semibold rounded-lg ${filter === tab ? "tab-active" : ""}`}
                onClick={() => setFilter(tab)}>
                {tab === "all" ? `ทั้งหมด (${billings.length})` : tab === "draft" ? "ร่าง" : "ยืนยันแล้ว"}
                {tab === "draft" && draftCount > 0 && (
                  <span className="ml-1.5 badge badge-warning badge-xs">{draftCount}</span>
                )}
              </button>
            ))}
          </div>
          <input type="text" placeholder="ค้นหาเลขที่, ชื่อลูกค้า, PO#..."
            className="input input-bordered input-sm flex-1" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center py-14 text-center">
              <p className="text-base-content/40">ไม่พบรายการ</p>
              {billings.length === 0 && (
                <button className="btn btn-primary btn-sm mt-3" onClick={() => router.push("/Admin/billing/new")}>
                  สร้างใบวางบิลแรก
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block card bg-base-100 shadow-sm overflow-hidden">
              <table className="table table-sm">
                <thead className="bg-base-200 text-xs uppercase">
                  <tr>
                    <th>เลขที่ใบวางบิล</th>
                    <th>ลูกค้า</th>
                    <th>PO ที่รวม</th>
                    <th className="text-right">ยอดรวม</th>
                    <th>สถานะ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const total   = b.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
                    const isDraft = b.status === "draft";
                    return (
                      <tr key={b._id} className="hover cursor-pointer"
                        onClick={() => router.push(`/Admin/billing/${b._id}`)}>
                        <td className="font-semibold">{b.billingNumber}</td>
                        <td>
                          <div className="font-medium">{b.customerName}</div>
                          <div className="text-xs text-base-content/50">{b.customerEmail}</div>
                        </td>
                        <td className="text-xs text-base-content/70">{b.poNumbers.join(", ")}</td>
                        <td className="text-right font-medium text-sm">
                          {b.taxInvoices.length > 0 ? `${fmt(total)} ฿` : <span className="text-base-content/30">-</span>}
                        </td>
                        <td>
                          <span className={`badge badge-sm ${isDraft ? "badge-warning" : "badge-success"}`}>
                            {isDraft ? "ร่าง" : "ยืนยันแล้ว"}
                          </span>
                        </td>
                        <td><button className="btn btn-xs btn-ghost">ดู →</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden flex flex-col gap-3">
              {filtered.map((b) => {
                const total   = b.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
                const isDraft = b.status === "draft";
                return (
                  <div key={b._id} className="card bg-base-100 shadow-sm cursor-pointer"
                    onClick={() => router.push(`/Admin/billing/${b._id}`)}>
                    <div className="card-body py-3 px-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{b.billingNumber}</span>
                        <span className={`badge badge-sm ${isDraft ? "badge-warning" : "badge-success"}`}>
                          {isDraft ? "ร่าง" : "ยืนยันแล้ว"}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{b.customerName}</p>
                      <p className="text-xs text-base-content/50">{b.poNumbers.join(", ")}</p>
                      {b.taxInvoices.length > 0 && <p className="text-sm font-semibold text-success">{fmt(total)} ฿</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
