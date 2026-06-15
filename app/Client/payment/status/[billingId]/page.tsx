"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PaymentStatusBadge from "@/components/payment/PaymentStatusBadge";

interface Proof {
  _id: string;
  proofNumber: string;
  billingNumber: string;
  poNumbers: string[];
  customerName: string;
  customerEmail: string;
  status: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankName: string;
  accountName: string;
  referenceNumber: string;
  note: string;
  installmentNumber: number;
  rejectionReason: string;
  reviewedAt: string | null;
  fileMimeType: string;
  history: {
    action: string;
    actor: string;
    actorName: string;
    timestamp: string;
    note?: string;
    amount?: number;
  }[];
  createdAt: string;
}

interface BillingInfo {
  _id: string;
  billingNumber: string;
  taxInvoices: { _id: string; invoiceNumber: string; invoiceDate: string; amount: number }[];
  paymentStatus: string;
}

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "โอนเงินผ่านธนาคาร",
  cash: "เงินสด",
  cheque: "เช็ค",
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
};

export default function PaymentStatusPage({ params }: { params: Promise<{ billingId: string }> }) {
  const { billingId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [proofs, setProofs] = useState<Proof[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [slipProof, setSlipProof] = useState<Proof | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        // Try billingId first, then poId (for legacy single-PO billings)
        let data: Proof[] = [];
        let foundViaBillingId = false;

        const byBilling = await fetch(`/api/payment-proof?billingId=${billingId}`);
        if (byBilling.ok) {
          const billingProofs = await byBilling.json() as Proof[];
          if (billingProofs.length > 0) {
            data = billingProofs;
            foundViaBillingId = true;
          }
        }
        if (!foundViaBillingId) {
          const byPO = await fetch(`/api/payment-proof?poId=${billingId}`);
          if (byPO.ok) data = await byPO.json();
        }
        setProofs(data.sort((a, b) => a.installmentNumber - b.installmentNumber));

        // Fetch billing/PO info to get total amount for remaining balance calculation
        if (foundViaBillingId) {
          const billingRes = await fetch(`/api/billing/${billingId}`);
          if (billingRes.ok) setBilling(await billingRes.json());
        } else {
          // Legacy PO path: fetch PO to get taxInvoices total
          const poRes = await fetch(`/api/po/${billingId}`);
          if (poRes.ok) setBilling(await poRes.json());
        }
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, billingId]);

  const totalPaid = proofs
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);

  const billingTotal = billing?.taxInvoices?.reduce((s, inv) => s + inv.amount, 0) ?? 0;
  const remaining = billingTotal > 0 ? Math.max(0, billingTotal - totalPaid) : 0;
  const isFullyPaid = billingTotal > 0 && remaining === 0;

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-base-content/50">
          <span className="loading loading-spinner loading-lg" />
          <p className="text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="card bg-base-100 shadow-sm max-w-sm w-full">
          <div className="card-body items-center text-center gap-3">
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-error">{loadError}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/Client")}>← กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    );
  }

  if (proofs.length === 0) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="card bg-base-100 shadow-sm max-w-sm w-full">
          <div className="card-body items-center text-center gap-4">
            <div className="w-14 h-14 bg-base-200 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">ยังไม่มีการส่งหลักฐาน</p>
              <p className="text-sm text-base-content/50 mt-1">กรุณาส่งหลักฐานการชำระเงินเพื่อดำเนินการต่อ</p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => router.push(`/Client/payment/${billingId}`)}
            >
              ส่งหลักฐานการชำระเงิน
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => router.push("/Client")}>← กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    );
  }

  const latestProof = proofs[proofs.length - 1];
  const allApproved = proofs.every((p) => p.status === "approved");
  const paidCount   = proofs.filter((p) => p.status === "approved").length;
  const paidPct     = billingTotal > 0 ? Math.min(100, Math.round((totalPaid / billingTotal) * 100)) : 0;

  // Merge all history entries from every proof, sorted chronologically
  const mergedTimeline = proofs
    .flatMap((p) =>
      (p.history ?? []).map((h) => ({
        ...h,
        proofNumber:       p.proofNumber,
        installmentNumber: p.installmentNumber,
        proofStatus:       p.status,
      }))
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="min-h-screen bg-base-200">

      {/* Sticky top nav */}
      <div className="bg-base-100 border-b border-base-300 sticky top-16 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button className="btn btn-ghost btn-sm btn-circle" onClick={() => router.push("/Client")}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">สถานะการชำระเงิน</p>
            <p className="text-xs text-base-content/50 truncate">{latestProof.billingNumber}</p>
          </div>
          <PaymentStatusBadge
            status={allApproved ? "approved" : latestProof.status as "pending" | "approved" | "rejected"}
            size="md"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Payment summary card */}
        <div className="card bg-base-100 shadow-sm overflow-hidden">
          {/* Coloured top strip based on status */}
          <div className={`h-1.5 w-full ${isFullyPaid ? "bg-success" : "bg-warning"}`} />
          <div className="card-body p-5 gap-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="font-semibold text-sm">สรุปการชำระเงิน</span>
            </div>

            {billingTotal > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-base-content/50 mb-1">
                  <span>ความคืบหน้า</span>
                  <span className="font-medium">{paidPct}%</span>
                </div>
                <progress
                  className={`progress w-full h-2.5 ${isFullyPaid ? "progress-success" : "progress-warning"}`}
                  value={totalPaid}
                  max={billingTotal}
                />
              </div>
            )}

            <div className="space-y-2.5">
              {billingTotal > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-base-content/60">ยอดตามใบวางบิลรวม</span>
                  <span className="font-medium tabular-nums">
                    {billingTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-base-content/60">ชำระแล้ว ({paidCount} รายการ)</span>
                <span className="font-medium text-success tabular-nums">
                  −{totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                </span>
              </div>
              {billingTotal > 0 && (
                <>
                  <div className="divider my-0" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">ยอดคงเหลือ</span>
                    <span className={`text-2xl font-bold tabular-nums ${isFullyPaid ? "text-success" : "text-warning"}`}>
                      {remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-base-content/40 flex flex-wrap gap-x-3">
              {proofs.filter((p) => p.status === "pending").length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
                  กำลังรอตรวจสอบ
                </span>
              )}
              {proofs.filter((p) => p.status === "rejected").length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-error" />
                  มีรายการถูกปฏิเสธ
                </span>
              )}
              <span>ส่งหลักฐานทั้งหมด {proofs.length} ครั้ง</span>
            </p>
          </div>
        </div>

        {/* Proof cards */}
        <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider px-1">
          ประวัติการส่งหลักฐาน
        </p>

        {proofs.map((proof, idx) => (
          <div key={proof._id} className="card bg-base-100 shadow-sm">
            <div className="card-body p-0 gap-0">

              {/* Card header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  proof.status === "approved" ? "bg-success/15 text-success" :
                  proof.status === "rejected"  ? "bg-error/15 text-error"   : "bg-warning/15 text-warning"
                }`}>
                  {proof.installmentNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{proof.proofNumber}</p>
                  <p className="text-xs text-base-content/50 mt-0.5">ส่งเมื่อ {fmtDate(proof.createdAt)}</p>
                </div>
                <PaymentStatusBadge status={proof.status as "pending" | "approved" | "rejected"} />
              </div>

              {/* Amount highlight */}
              <div className="mx-4 mb-3 bg-base-200/70 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-base-content/50">จำนวนเงิน</span>
                <span className="text-xl font-bold tabular-nums">
                  {proof.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                </span>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-3 text-sm">
                <div>
                  <p className="text-xs text-base-content/40 mb-0.5">วันที่โอน</p>
                  <p className="font-medium">{fmtDate(proof.paymentDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/40 mb-0.5">วิธีชำระ</p>
                  <p>{METHOD_LABEL[proof.paymentMethod] ?? proof.paymentMethod}</p>
                </div>
                {proof.bankName && (
                  <div>
                    <p className="text-xs text-base-content/40 mb-0.5">ธนาคาร</p>
                    <p>{proof.bankName}</p>
                  </div>
                )}
                {proof.referenceNumber && (
                  <div className={proof.bankName ? "" : "col-span-2"}>
                    <p className="text-xs text-base-content/40 mb-0.5">เลขอ้างอิง</p>
                    <p className="font-mono text-xs">{proof.referenceNumber}</p>
                  </div>
                )}
              </div>

              {/* Rejection reason */}
              {proof.status === "rejected" && proof.rejectionReason && (
                <div className="mx-4 mb-3 alert alert-error py-2 px-3 text-sm rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>เหตุผลที่ปฏิเสธ: {proof.rejectionReason}</span>
                </div>
              )}

              {/* Action row */}
              <div className="border-t border-base-200 px-4 py-2.5 flex gap-2 justify-end">
                <button className="btn btn-ghost btn-xs gap-1.5" onClick={() => setSlipProof(proof)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  ดูสลิป
                </button>
                {proof.status === "approved" && (
                  <Link
                    href={`/Client/payment/receipt/${proof._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success btn-xs gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    ใบเสร็จ
                  </Link>
                )}
                {proof.status === "rejected" && idx === proofs.length - 1 && (
                  <button className="btn btn-error btn-xs gap-1.5" onClick={() => router.push(`/Client/payment/${billingId}`)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    ส่งหลักฐานใหม่
                  </button>
                )}
              </div>

            </div>
          </div>
        ))}

        {/* ── Unified timeline ── */}
        {mergedTimeline.length > 0 && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5 gap-4">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-sm">ไทม์ไลน์ทั้งหมด</span>
                <span className="badge badge-ghost badge-sm ml-auto">{mergedTimeline.length} รายการ</span>
              </div>

              <ol className="relative border-l-2 border-base-300 ml-3 space-y-0">
                {mergedTimeline.map((entry, i) => {
                  const isLast = i === mergedTimeline.length - 1;
                  const cfg: Record<string, { label: string; dot: string; text: string }> = {
                    submitted:   { label: "ส่งหลักฐาน",  dot: "bg-info border-info",       text: "text-info" },
                    approved:    { label: "อนุมัติแล้ว", dot: "bg-success border-success",  text: "text-success" },
                    rejected:    { label: "ถูกปฏิเสธ",  dot: "bg-error border-error",      text: "text-error" },
                    resubmitted: { label: "ส่งใหม่",     dot: "bg-warning border-warning",  text: "text-warning" },
                  };
                  const c = cfg[entry.action] ?? { label: entry.action, dot: "bg-neutral border-neutral", text: "text-neutral" };

                  return (
                    <li key={i} className={`relative pl-6 ${isLast ? "pb-0" : "pb-5"}`}>
                      {/* Dot */}
                      <span className={`absolute -left-2.25 top-1 w-4 h-4 rounded-full border-2 border-base-100 ${c.dot} shrink-0`} />

                      <div className="bg-base-200/60 rounded-xl px-4 py-3 space-y-1">
                        {/* Row 1: action label + installment badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${c.text}`}>{c.label}</span>
                          <span className="badge badge-outline badge-xs text-base-content/50">
                            งวดที่ {entry.installmentNumber} · {entry.proofNumber}
                          </span>
                        </div>
                        {/* Row 2: actor + time */}
                        <p className="text-xs text-base-content/50">
                          {entry.actorName} ·{" "}
                          {new Date(entry.timestamp).toLocaleString("th-TH", {
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                        {/* Row 3: amount */}
                        {entry.amount != null && (
                          <p className="text-xs font-medium text-base-content/70">
                            {entry.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                          </p>
                        )}
                        {/* Row 4: note */}
                        {entry.note && (
                          <p className="text-xs text-base-content/40 italic">{entry.note}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}

        {/* Fully paid / next installment */}
        {latestProof.status === "approved" && (
          isFullyPaid ? (
            <div className="card border border-success/30 shadow-sm overflow-hidden">
              <div className="h-1 bg-success w-full" />
              <div className="card-body p-6 text-center gap-3 bg-gradient-to-b from-success/10 to-base-100">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-success text-xl">ชำระเงินครบถ้วนแล้ว</p>
                  <p className="text-base-content/60 text-sm mt-1">
                    คุณได้ชำระเงินตามยอดที่กำหนดครบถ้วนแล้ว<br />ขอบคุณสำหรับการชำระเงิน
                  </p>
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <div className="badge badge-success badge-outline gap-1">
                    ยอดรวม {billingTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                  </div>
                  <div className="badge badge-success gap-1">
                    ชำระแล้ว {totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-sm border-2 border-dashed border-primary/40">
              <div className="card-body p-5 text-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm">ชำระงวดถัดไป</p>
                  {billingTotal > 0 && (
                    <p className="text-warning font-bold text-lg mt-0.5">
                      เหลืออีก {remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                    </p>
                  )}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => router.push(`/Client/payment/${billingId}`)}
                >
                  ส่งหลักฐานงวดถัดไป
                </button>
              </div>
            </div>
          )
        )}

      </div>

      {/* Slip modal */}
      {slipProof && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl w-full p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <div>
                <p className="font-semibold text-sm">{slipProof.proofNumber}</p>
                <p className="text-xs text-base-content/50">สลิปการโอนเงิน</p>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setSlipProof(null)}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="bg-base-200 flex items-center justify-center min-h-64 max-h-[75vh] overflow-auto">
              {slipProof.fileMimeType?.startsWith("image/") || !slipProof.fileMimeType ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/payment-proof/file?id=${slipProof._id}`}
                  alt="สลิปการโอนเงิน"
                  className="max-w-full max-h-[75vh] object-contain"
                />
              ) : (
                <iframe
                  src={`/api/payment-proof/file?id=${slipProof._id}`}
                  className="w-full"
                  style={{ height: "75vh" }}
                  title="สลิปการโอนเงิน"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-base-300">
              <a
                href={`/api/payment-proof/file?id=${slipProof._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                เปิดในแท็บใหม่
              </a>
              <button className="btn btn-sm" onClick={() => setSlipProof(null)}>
                ปิด
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setSlipProof(null)} />
        </div>
      )}
    </div>
  );
}
