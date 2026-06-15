"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentStatusBadge from "@/components/payment/PaymentStatusBadge";

interface PaymentProof {
  _id: string;
  proofNumber: string;
  billingNumber: string;
  billingId: string;
  customerName: string;
  customerEmail: string;
  poNumbers: string[];
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankName: string;
  status: string;
  installmentNumber: number;
  createdAt: string;
  reviewedAt: string | null;
}

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "โอนเงิน",
  cash:          "เงินสด",
  cheque:        "เช็ค",
};

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });

export default function AdminPaymentsListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const billingIdParam = searchParams.get("billingId");

  const [proofs, setProofs]   = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch]   = useState(billingIdParam ? "" : "");

  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const fetchProofs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/payment-proof");
      if (res.ok) setProofs(await res.json());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProofs(); }, [fetchProofs]);
  useEffect(() => {
    const id = setInterval(() => fetchProofs(true), 10000);
    return () => clearInterval(id);
  }, [fetchProofs]);

  useEffect(() => {
    if (session && !isAdmin) router.replace("/");
  }, [session, isAdmin, router]);

  const filtered = proofs.filter((p) => {
    if (billingIdParam && p.billingId !== billingIdParam) return false;
    if (filter !== "all" && p.status !== filter) return false;
    const q = search.toLowerCase();
    return !q ||
      p.proofNumber.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      p.billingNumber.toLowerCase().includes(q) ||
      p.poNumbers.some((n) => n.toLowerCase().includes(q));
  });

  // Financial summary
  const pendingTotal   = proofs.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const approvedTotal  = proofs.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const pendingCount   = proofs.filter((p) => p.status === "pending").length;
  const rejectedCount  = proofs.filter((p) => p.status === "rejected").length;

  if (!session) return null;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">จัดการหลักฐานการชำระเงิน</h1>
            <p className="text-base-content/60 text-sm mt-1">ตรวจสอบและอนุมัติหลักฐานการโอนเงินจากลูกค้า</p>
          {billingIdParam && (
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-primary badge-sm">กรองตามใบวางบิล</span>
              <button className="btn btn-ghost btn-xs" onClick={() => router.push("/Admin/payments")}>ล้างตัวกรอง</button>
            </div>
          )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/Admin")}>← กลับ</button>
        </div>

        {/* Financial Summary Cards */}
        <div className="stats stats-horizontal shadow w-full bg-base-100 flex-wrap">
          <div className="stat">
            <div className="stat-figure text-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">รอตรวจสอบ</div>
            <div className="stat-value text-warning text-xl">{pendingCount} รายการ</div>
            <div className="stat-desc">{fmt(pendingTotal)} บาท</div>
          </div>
          <div className="stat">
            <div className="stat-figure text-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">อนุมัติแล้ว</div>
            <div className="stat-value text-success text-xl">{fmt(approvedTotal)} ฿</div>
            <div className="stat-desc">{proofs.filter((p) => p.status === "approved").length} รายการ</div>
          </div>
          <div className="stat">
            <div className="stat-figure text-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="stat-title">ถูกปฏิเสธ</div>
            <div className="stat-value text-error text-xl">{rejectedCount} รายการ</div>
            <div className="stat-desc">รอลูกค้าส่งใหม่</div>
          </div>
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="tabs tabs-boxed bg-base-100 shadow-sm shrink-0">
            {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
              <button
                key={tab}
                className={`tab ${filter === tab ? "tab-active" : ""}`}
                onClick={() => setFilter(tab)}
              >
                {tab === "all" && "ทั้งหมด"}
                {tab === "pending" && (
                  <span className="flex items-center gap-1.5">
                    รอตรวจสอบ
                    {pendingCount > 0 && (
                      <span className="badge badge-warning badge-xs font-bold">{pendingCount}</span>
                    )}
                  </span>
                )}
                {tab === "approved" && "อนุมัติแล้ว"}
                {tab === "rejected" && "ถูกปฏิเสธ"}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="input input-bordered input-sm flex-1"
            placeholder="ค้นหา proof#, ลูกค้า, billing#..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table (desktop) */}
        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center text-base-content/40 py-16">ไม่พบรายการ</div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card bg-base-100 shadow-sm overflow-hidden">
              <table className="table table-sm">
                <thead className="bg-base-200">
                  <tr>
                    <th>เลขที่หลักฐาน</th>
                    <th>ลูกค้า</th>
                    <th>ใบวางบิล</th>
                    <th className="text-right">ยอดเงิน</th>
                    <th>วิธีชำระ</th>
                    <th>วันที่โอน</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((proof) => (
                    <tr key={proof._id} className="hover cursor-pointer" onClick={() => router.push(`/Admin/payments/${proof._id}`)}>
                      <td>
                        <div>
                          <p className="font-medium text-sm">{proof.proofNumber}</p>
                          {proof.installmentNumber > 1 && (
                            <span className="badge badge-ghost badge-xs">งวดที่ {proof.installmentNumber}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="text-sm font-medium">{proof.customerName}</p>
                          <p className="text-xs text-base-content/50">{proof.customerEmail}</p>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="text-sm">{proof.billingNumber}</p>
                          <p className="text-xs text-base-content/40">{proof.poNumbers?.slice(0, 2).join(", ")}{(proof.poNumbers?.length ?? 0) > 2 ? "..." : ""}</p>
                        </div>
                      </td>
                      <td className="text-right font-bold">{fmt(proof.amount)} ฿</td>
                      <td className="text-sm">{METHOD_LABEL[proof.paymentMethod] ?? proof.paymentMethod}</td>
                      <td className="text-sm text-base-content/60">{fmtDate(proof.paymentDate)}</td>
                      <td>
                        <PaymentStatusBadge status={proof.status as "pending" | "approved" | "rejected"} />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(e) => { e.stopPropagation(); router.push(`/Admin/payments/${proof._id}`); }}
                        >
                          ตรวจสอบ →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((proof) => (
                <div
                  key={proof._id}
                  className="card bg-base-100 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => router.push(`/Admin/payments/${proof._id}`)}
                >
                  <div className="card-body p-4 gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{proof.proofNumber}</p>
                        <p className="text-xs text-base-content/50">{proof.customerName}</p>
                      </div>
                      <PaymentStatusBadge status={proof.status as "pending" | "approved" | "rejected"} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/50">{proof.billingNumber}</span>
                      <span className="font-bold">{fmt(proof.amount)} ฿</span>
                    </div>
                    <div className="flex justify-between text-xs text-base-content/40">
                      <span>{METHOD_LABEL[proof.paymentMethod]}</span>
                      <span>{fmtDate(proof.paymentDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
