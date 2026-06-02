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

  // Approve modal
  const [approveOpen, setApproveOpen]   = useState(false);
  const [approving, setApproving]       = useState(false);
  const [approveNote, setApproveNote]   = useState("");
  const [approveError, setApproveError] = useState("");

  // Reject modal
  const [rejectOpen, setRejectOpen]     = useState(false);
  const [rejecting, setRejecting]       = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError]   = useState("");

  // Installment summary (other proofs for same billing)
  const [billingProofs, setBillingProofs] = useState<{ status: string; amount: number }[]>([]);

  const isAdmin = (session?.user as { role?: string })?.role === "admin";

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
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (loadError || !proof) {
    return (
      <div className="min-h-screen bg-base-200 py-10 px-4">
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
    <div className="min-h-screen bg-base-200 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button className="btn btn-ghost btn-sm mb-2" onClick={() => router.push("/Admin/payments")}>← กลับ</button>
            <h1 className="text-xl font-bold">{proof.proofNumber}</h1>
            <p className="text-sm text-base-content/60">ส่งเมื่อ {fmtDateTime(proof.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <PaymentStatusBadge status={proof.status as "pending" | "approved" | "rejected"} size="md" />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => router.push(`/Admin/billing/${proof.billingId}`)}
            >
              ดูใบวางบิล ↗
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 gap-3">
            <h2 className="font-semibold text-base">ข้อมูลหลักฐาน</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                { label: "ลูกค้า",       value: proof.customerName },
                { label: "อีเมล",         value: proof.customerEmail },
                { label: "ใบวางบิล",     value: proof.billingNumber },
                { label: "PO",           value: proof.poNumbers?.join(", ") || "-" },
                { label: "ชำระครั้งที่", value: String(proof.installmentNumber) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-base-content/50 text-xs">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
            {/* Installment progress */}
            {billingProofs.length > 1 && (
              <div className="mt-2 pt-2 border-t border-base-300">
                <div className="flex justify-between text-xs text-base-content/50 mb-1">
                  <span>ชำระสะสม (อนุมัติแล้ว)</span>
                  <span>{fmt(totalApproved)} ฿ / {billingProofs.length} รายการ</span>
                </div>
                <progress
                  className="progress progress-success w-full"
                  value={billingProofs.filter((p) => p.status === "approved").length}
                  max={billingProofs.length}
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment details */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 gap-3">
            <h2 className="font-semibold text-base">รายละเอียดการชำระเงิน</h2>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-3xl font-bold text-primary">{fmt(proof.amount)}</span>
              <span className="text-base-content/50 mb-1">บาท</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                { label: "วันที่โอน",       value: fmtDate(proof.paymentDate) },
                { label: "วิธีชำระ",         value: METHOD_LABEL[proof.paymentMethod] ?? proof.paymentMethod },
                { label: "ธนาคารต้นทาง",   value: proof.bankName || "-" },
                { label: "ชื่อผู้โอน",       value: proof.accountName || "-" },
                { label: "เลขอ้างอิง",       value: proof.referenceNumber || "-" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-base-content/50 text-xs">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
              {proof.note && (
                <div className="col-span-2">
                  <p className="text-base-content/50 text-xs">หมายเหตุจากลูกค้า</p>
                  <p className="text-base-content/70 italic">{proof.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slip viewer */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">สลิปการโอนเงิน</h2>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-xs"
              >
                เปิดในแท็บใหม่ ↗
              </a>
            </div>
            <div className="rounded-lg overflow-hidden border border-base-300 bg-base-200">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl}
                  alt="slip"
                  className="w-full max-h-96 object-contain"
                />
              ) : isPDF ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-96"
                  title="payment slip"
                />
              ) : (
                <div className="p-8 text-center">
                  <p className="text-base-content/50 text-sm">{proof.fileOrigName}</p>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm mt-2">
                    ดาวน์โหลดไฟล์
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review actions */}
        {proof.status === "pending" && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 gap-3">
              <h2 className="font-semibold text-base">การตรวจสอบ</h2>
              <div className="flex gap-3">
                <button
                  className="btn btn-success flex-1"
                  onClick={() => setApproveOpen(true)}
                >
                  ✓ อนุมัติ
                </button>
                <button
                  className="btn btn-error flex-1"
                  onClick={() => setRejectOpen(true)}
                >
                  ✕ ปฏิเสธ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approved/Rejected status display */}
        {proof.status === "approved" && (
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">อนุมัติแล้ว</p>
              <p className="text-sm">เมื่อ {fmtDateTime(proof.reviewedAt)}</p>
            </div>
          </div>
        )}

        {proof.status === "rejected" && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <p className="font-semibold">ถูกปฏิเสธ · รอการส่งใหม่</p>
              <p className="text-sm">เหตุผล: {proof.rejectionReason}</p>
              <p className="text-xs text-base-content/60">เมื่อ {fmtDateTime(proof.reviewedAt)}</p>
            </div>
          </div>
        )}

        {/* History timeline */}
        {proof.history && proof.history.length > 0 && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h2 className="font-semibold text-base mb-2">ประวัติ</h2>
              <PaymentHistoryTimeline history={proof.history} />
            </div>
          </div>
        )}

      </div>

      {/* ── Approve Modal ── */}
      {approveOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-2">ยืนยันการอนุมัติ</h3>
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium">{proof.proofNumber}</p>
              <p className="text-base-content/60">{proof.billingNumber} · {fmt(proof.amount)} ฿</p>
            </div>
            <div className="form-control mb-4">
              <label className="label"><span className="label-text text-sm">หมายเหตุ (ถ้ามี)</span></label>
              <input
                type="text"
                className="input input-bordered input-sm"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="ข้อความถึงลูกค้า (optional)"
              />
            </div>
            {approveError && <p className="text-error text-sm mb-3">{approveError}</p>}
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setApproveOpen(false)}>ยกเลิก</button>
              <button className="btn btn-success btn-sm" onClick={handleApprove} disabled={approving}>
                {approving && <span className="loading loading-spinner loading-xs" />}
                ยืนยันอนุมัติ
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setApproveOpen(false)} />
        </dialog>
      )}

      {/* ── Reject Modal ── */}
      {rejectOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-2">ปฏิเสธหลักฐาน</h3>
            <p className="text-sm text-base-content/60 mb-3">กรุณาระบุเหตุผล ลูกค้าจะเห็นข้อความนี้และสามารถส่งหลักฐานใหม่ได้</p>
            <div className="form-control mb-4">
              <label className="label"><span className="label-text text-sm font-medium">เหตุผล *</span></label>
              <textarea
                className="textarea textarea-bordered"
                rows={3}
                placeholder="เช่น ยอดเงินไม่ตรง, สลิปไม่ชัดเจน, เลขอ้างอิงไม่ถูกต้อง"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            {rejectError && <p className="text-error text-sm mb-3">{rejectError}</p>}
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectOpen(false)}>ยกเลิก</button>
              <button
                className="btn btn-error btn-sm"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting && <span className="loading loading-spinner loading-xs" />}
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setRejectOpen(false)} />
        </dialog>
      )}

    </div>
  );
}
