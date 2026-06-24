"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PaymentStatusBadge from "@/components/payment/PaymentStatusBadge";
import PaymentHistoryTimeline from "@/components/payment/PaymentHistoryTimeline";

interface PaymentProof {
  _id: string;
  proofNumber: string;
  billingId: string;
  billingNumber: string;
  customerName: string;
  customerEmail: string;
  poNumbers: string[];
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankName: string;
  accountName: string;
  referenceNumber: string;
  note: string;
  filePath: string;
  fileOrigName: string;
  fileMimeType: string;
  status: string;
  installmentNumber: number;
  rejectionReason: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
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

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "โอนเงินผ่านธนาคาร",
  cash:          "เงินสด",
  cheque:        "เช็ค",
};

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [proof, setProof]       = useState<PaymentProof | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");
  const [theme, setTheme] = useState("mastercard");

  const [approveOpen, setApproveOpen]   = useState(false);
  const [approving, setApproving]       = useState(false);
  const [approveNote, setApproveNote]   = useState("");
  const [approveError, setApproveError] = useState("");

  const [rejectOpen, setRejectOpen]     = useState(false);
  const [rejecting, setRejecting]       = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError]   = useState("");

  const [billingProofs, setBillingProofs] = useState<{ status: string; amount: number }[]>([]);

  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => {
    const pick = () => setTheme(localStorage.getItem("theme") || "mastercard");
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!session) return;
    if (!isAdmin) { router.replace("/Admin"); return; }
    fetch(`/api/payment-proof/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject("Not found"))
      .then((data: PaymentProof) => {
        setProof(data);
        return fetch(`/api/payment-proof?billingId=${data.billingId}`);
      })
      .then((r) => r.ok ? r.json() : [])
      .then(setBillingProofs)
      .catch(() => setLoadError("ไม่พบข้อมูลหลักฐาน"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  const handleApprove = async () => {
    if (!proof) return;
    setApproving(true);
    setApproveError("");
    try {
      const res = await fetch(`/api/payment-proof/${proof._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", note: approveNote }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message ?? "Failed");
      }
      setProof(await res.json());
      setApproveOpen(false);
    } catch (err: unknown) {
      setApproveError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!proof || !rejectReason.trim()) { setRejectError("กรุณาระบุเหตุผล"); return; }
    setRejecting(true);
    setRejectError("");
    try {
      const res = await fetch(`/api/payment-proof/${proof._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: rejectReason }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message ?? "Failed");
      }
      setProof(await res.json());
      setRejectOpen(false);
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setRejecting(false);
    }
  };

  const totalApproved = billingProofs
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);

  if (!session || !isAdmin) return null;

  if (loading) {
    return (
      <div data-theme={theme} className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (loadError || !proof) {
    return (
      <div data-theme={theme} className="min-h-screen bg-base-200 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="alert alert-error">{loadError || "ไม่พบข้อมูล"}</div>
          <button className="btn btn-ghost mt-4" onClick={() => router.push("/Admin/payments")}>← กลับ</button>
        </div>
      </div>
    );
  }

  const fileUrl = `/api/payment-proof/file?id=${proof._id}`;
  const isImage = proof.fileMimeType.startsWith("image/");
  const isPDF   = proof.fileMimeType === "application/pdf";

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200 font-mc">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              className="inline-flex items-center gap-1 text-sm text-base-content/50 hover:text-base-content transition-colors mb-3"
              onClick={() => router.push("/Admin/payments")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
              </svg>
              กลับ
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-base-content">{proof.proofNumber}</h1>
            <p className="text-sm text-base-content/40 mt-0.5">ส่งเมื่อ {fmtDateTime(proof.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <PaymentStatusBadge status={proof.status as "pending" | "approved" | "rejected"} size="md" />
            <button
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-base-content/15 hover:bg-base-300 transition-colors text-base-content/70"
              onClick={() => router.push(`/Admin/billing/${proof.billingId}`)}
            >
              ดูใบวางบิล
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Main 2-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT: Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Amount hero */}
            <div className="bg-base-100 rounded-2xl shadow-mc-sm p-5">
              <p className="text-xs text-base-content/40 uppercase tracking-widest mb-1">ยอดชำระ</p>
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-bold text-base-content tabular-nums">{fmt(proof.amount)}</span>
                <span className="text-base-content/40 mb-1 text-sm">บาท</span>
              </div>
              {billingProofs.length > 1 && (
                <div className="mt-3 pt-3 border-t border-base-300">
                  <div className="flex justify-between text-xs text-base-content/40 mb-1.5">
                    <span>อนุมัติแล้ว {billingProofs.filter((p) => p.status === "approved").length}/{billingProofs.length} รายการ</span>
                    <span>{fmt(totalApproved)} ฿</span>
                  </div>
                  <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${(billingProofs.filter((p) => p.status === "approved").length / billingProofs.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Proof info */}
            <div className="bg-base-100 rounded-2xl shadow-mc-sm p-5 space-y-3">
              <p className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">ข้อมูลหลักฐาน</p>
              {[
                { label: "ลูกค้า",        value: proof.customerName },
                { label: "อีเมล",          value: proof.customerEmail },
                { label: "ใบวางบิล",      value: proof.billingNumber },
                { label: "PO",            value: proof.poNumbers?.join(", ") || "-" },
                { label: "ชำระครั้งที่",  value: String(proof.installmentNumber) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-baseline gap-2">
                  <span className="text-xs text-base-content/40 shrink-0">{label}</span>
                  <span className="text-sm font-medium text-right truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Payment details */}
            <div className="bg-base-100 rounded-2xl shadow-mc-sm p-5 space-y-3">
              <p className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">รายละเอียดการชำระ</p>
              {[
                { label: "วันที่โอน",     value: fmtDate(proof.paymentDate) },
                { label: "วิธีชำระ",       value: METHOD_LABEL[proof.paymentMethod] ?? proof.paymentMethod },
                { label: "ธนาคาร",        value: proof.bankName || "-" },
                { label: "ชื่อผู้โอน",     value: proof.accountName || "-" },
                { label: "เลขอ้างอิง",     value: proof.referenceNumber || "-" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-baseline gap-2">
                  <span className="text-xs text-base-content/40 shrink-0">{label}</span>
                  <span className="text-sm font-medium text-right truncate">{value}</span>
                </div>
              ))}
              {proof.note && (
                <div className="pt-2 border-t border-base-300">
                  <p className="text-xs text-base-content/40 mb-1">หมายเหตุ</p>
                  <p className="text-sm text-base-content/70 italic">{proof.note}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {proof.status === "pending" && (
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 rounded-xl bg-success text-success-content font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  onClick={() => setApproveOpen(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  อนุมัติ
                </button>
                <button
                  className="flex-1 py-3 rounded-xl border-2 border-error/30 bg-error/5 text-error font-semibold text-sm hover:bg-error/10 transition-colors flex items-center justify-center gap-2"
                  onClick={() => setRejectOpen(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  ปฏิเสธ
                </button>
              </div>
            )}

            {proof.status === "approved" && (
              <div className="flex items-center gap-3 bg-success/10 border border-success/20 rounded-2xl p-4">
                <div className="w-9 h-9 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-success">อนุมัติแล้ว</p>
                  <p className="text-xs text-base-content/50">{fmtDateTime(proof.reviewedAt)}</p>
                </div>
              </div>
            )}

            {proof.status === "rejected" && (
              <div className="flex items-start gap-3 bg-error/8 border border-error/20 rounded-2xl p-4">
                <div className="w-9 h-9 rounded-full bg-error/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-error">ถูกปฏิเสธ</p>
                  <p className="text-xs text-base-content/60 mt-0.5">{proof.rejectionReason}</p>
                  <p className="text-xs text-base-content/40 mt-1">{fmtDateTime(proof.reviewedAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Slip viewer (3 cols) */}
          <div className="lg:col-span-3">
            <div className="bg-base-100 rounded-2xl shadow-mc-sm overflow-hidden h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-base-content">สลิปการโอนเงิน</span>
                  <span className="text-xs text-base-content/40 truncate max-w-35">{proof.fileOrigName}</span>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-base-content/50 hover:text-base-content transition-colors"
                >
                  เปิดแท็บใหม่
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div className="flex-1 bg-base-200 min-h-120 flex items-center justify-center">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl}
                    alt="slip"
                    className="w-full h-full object-contain max-h-150"
                  />
                ) : isPDF ? (
                  <iframe
                    src={fileUrl}
                    className="w-full h-full min-h-120"
                    title="payment slip"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-base-content/30 p-8">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm px-4 py-2 bg-base-300 rounded-xl hover:bg-base-content/10 transition-colors">
                      ดาวน์โหลดไฟล์
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── History ── */}
        {proof.history && proof.history.length > 0 && (
          <div className="bg-base-100 rounded-2xl shadow-mc-sm p-5">
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-widest mb-4">ประวัติ</p>
            <PaymentHistoryTimeline history={proof.history} />
          </div>
        )}

      </div>

      {/* ── Approve Modal ── */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-mc-lg w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">ยืนยันการอนุมัติ</h3>
            <div className="bg-success/8 border border-success/20 rounded-xl p-3 text-sm">
              <p className="font-medium">{proof.proofNumber}</p>
              <p className="text-base-content/50 text-xs mt-0.5">{proof.billingNumber} · {fmt(proof.amount)} ฿</p>
            </div>
            <div>
              <label className="text-xs text-base-content/50 mb-1.5 block">หมายเหตุ (ถ้ามี)</label>
              <input
                type="text"
                className="w-full border border-base-300 rounded-xl px-3 py-2 text-sm bg-base-200 focus:outline-none focus:border-base-content/30 transition-colors"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="ข้อความถึงลูกค้า (optional)"
              />
            </div>
            {approveError && <p className="text-error text-sm">{approveError}</p>}
            <div className="flex gap-2 pt-1">
              <button className="flex-1 py-2.5 rounded-xl border border-base-300 text-sm hover:bg-base-200 transition-colors" onClick={() => setApproveOpen(false)}>ยกเลิก</button>
              <button className="flex-1 py-2.5 rounded-xl bg-success text-success-content text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5" onClick={handleApprove} disabled={approving}>
                {approving && <span className="loading loading-spinner loading-xs" />}
                ยืนยันอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-mc-lg w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">ปฏิเสธหลักฐาน</h3>
            <p className="text-sm text-base-content/50">กรุณาระบุเหตุผล ลูกค้าจะเห็นข้อความนี้</p>
            <div>
              <label className="text-xs text-base-content/50 mb-1.5 block">เหตุผล *</label>
              <textarea
                className="w-full border border-base-300 rounded-xl px-3 py-2 text-sm bg-base-200 focus:outline-none focus:border-base-content/30 transition-colors resize-none"
                rows={3}
                placeholder="เช่น ยอดเงินไม่ตรง, สลิปไม่ชัดเจน"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            {rejectError && <p className="text-error text-sm">{rejectError}</p>}
            <div className="flex gap-2 pt-1">
              <button className="flex-1 py-2.5 rounded-xl border border-base-300 text-sm hover:bg-base-200 transition-colors" onClick={() => setRejectOpen(false)}>ยกเลิก</button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-error text-error-content text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-40"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting && <span className="loading loading-spinner loading-xs" />}
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
