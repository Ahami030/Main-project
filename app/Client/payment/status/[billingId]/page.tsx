"use client";

import { useState, useEffect, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PaymentStatusBadge from "@/components/payment/PaymentStatusBadge";
import PaymentHistoryTimeline from "@/components/payment/PaymentHistoryTimeline";
import PaymentReceiptDocument from "@/components/payment/PaymentReceiptDocument";
import type { PaymentReceiptProps } from "@/components/payment/PaymentReceiptDocument";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const [downloadReady, setDownloadReady] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  const [slipProof, setSlipProof] = useState<Proof | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadReceipt = async (proof: Proof) => {
    setSelectedProof(proof);
    setDownloadReady(true);
  };

  useEffect(() => {
    if (!downloadReady || !selectedProof || !receiptRef.current) return;
    const el = receiptRef.current.querySelector("#payment-receipt-print-area") as HTMLElement | null;
    if (!el) return;
    html2canvas(el, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`receipt-${selectedProof.proofNumber}.pdf`);
      setDownloadReady(false);
      setSelectedProof(null);
    });
  }, [downloadReady, selectedProof]);

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
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-base-200 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="alert alert-error">{loadError}</div>
          <button className="btn btn-ghost mt-4" onClick={() => router.push("/Client")}>← กลับ</button>
        </div>
      </div>
    );
  }

  if (proofs.length === 0) {
    return (
      <div className="min-h-screen bg-base-200 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <button className="btn btn-ghost btn-sm mb-4" onClick={() => router.push("/Client")}>← กลับ</button>
          <div className="alert alert-info">ยังไม่มีการส่งหลักฐานการชำระเงิน</div>
          <button
            className="btn btn-primary mt-4"
            onClick={() => router.push(`/Client/payment/${billingId}`)}
          >
            ส่งหลักฐานการชำระเงิน
          </button>
        </div>
      </div>
    );
  }

  const latestProof = proofs[proofs.length - 1];
  const allApproved = proofs.every((p) => p.status === "approved");

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <button className="btn btn-ghost btn-sm mb-3" onClick={() => router.push("/Client")}>← กลับหน้าหลัก</button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">สถานะการชำระเงิน</h1>
              <p className="text-base-content/60 mt-1">ใบวางบิล {latestProof.billingNumber}</p>
            </div>
            <PaymentStatusBadge
              status={allApproved ? "approved" : latestProof.status as "pending" | "approved" | "rejected"}
              size="md"
            />
          </div>
        </div>

        {/* Summary card */}
        {proofs.length > 0 && (
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 gap-3">
              {/* Billing total row */}
              {billingTotal > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-base-content/60">ยอดตามใบวางบิลรวม</span>
                  <span className="font-semibold">
                    {billingTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                  </span>
                </div>
              )}

              {/* Paid row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-base-content/60">
                  ชำระแล้ว ({proofs.filter((p) => p.status === "approved").length} รายการ)
                </span>
                <span className="font-semibold text-success">
                  {totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                </span>
              </div>

              {/* Remaining row */}
              {billingTotal > 0 && (
                <>
                  <div className="divider my-0" />
                  <div className="flex items-center justify-between">
                    <span className="font-medium">ยอดคงเหลือ</span>
                    <span className={`text-xl font-bold ${remaining === 0 ? "text-success" : "text-warning"}`}>
                      {remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                  {remaining === 0 && (
                    <div className="badge badge-success badge-sm self-end">ชำระครบแล้ว</div>
                  )}
                </>
              )}

              {/* Status note */}
              <p className="text-xs text-base-content/40 mt-1">
                {proofs.filter((p) => p.status === "pending").length > 0 && "มีรายการรอตรวจสอบ · "}
                {proofs.filter((p) => p.status === "rejected").length > 0 && "มีรายการถูกปฏิเสธ · "}
                ส่งหลักฐานทั้งหมด {proofs.length} ครั้ง
              </p>
            </div>
          </div>
        )}

        {/* Proofs list */}
        {proofs.map((proof, idx) => (
          <div key={proof._id} className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{proof.proofNumber}</p>
                  <p className="text-xs text-base-content/50">ครั้งที่ {proof.installmentNumber} · ส่งเมื่อ {fmtDate(proof.createdAt)}</p>
                </div>
                <PaymentStatusBadge status={proof.status as "pending" | "approved" | "rejected"} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-base-content/50">จำนวนเงิน</span>
                  <p className="font-bold text-lg">{proof.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</p>
                </div>
                <div>
                  <span className="text-base-content/50">วันที่โอน</span>
                  <p className="font-medium">{fmtDate(proof.paymentDate)}</p>
                </div>
                <div>
                  <span className="text-base-content/50">วิธีชำระ</span>
                  <p>{METHOD_LABEL[proof.paymentMethod] ?? proof.paymentMethod}</p>
                </div>
                {proof.bankName && (
                  <div>
                    <span className="text-base-content/50">ธนาคาร</span>
                    <p>{proof.bankName}</p>
                  </div>
                )}
                {proof.referenceNumber && (
                  <div className="col-span-2">
                    <span className="text-base-content/50">เลขอ้างอิง</span>
                    <p className="font-mono">{proof.referenceNumber}</p>
                  </div>
                )}
              </div>

              {/* Rejection reason */}
              {proof.status === "rejected" && proof.rejectionReason && (
                <div className="alert alert-error py-2 px-3 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>เหตุผล: {proof.rejectionReason}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end flex-wrap">
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setSlipProof(proof)}
                >
                  ดูสลิป
                </button>
                {proof.status === "approved" && (
                  <button
                    className="btn btn-success btn-xs"
                    onClick={() => handleDownloadReceipt(proof)}
                  >
                    ดาวน์โหลดใบเสร็จ
                  </button>
                )}
                {proof.status === "rejected" && idx === proofs.length - 1 && (
                  <button
                    className="btn btn-error btn-xs"
                    onClick={() => router.push(`/Client/payment/${billingId}`)}
                  >
                    ส่งหลักฐานใหม่
                  </button>
                )}
              </div>

              {/* History timeline */}
              {proof.history && proof.history.length > 0 && (
                <div className="mt-2 pt-2 border-t border-base-300">
                  <p className="text-xs font-medium text-base-content/50 mb-2">ประวัติ</p>
                  <PaymentHistoryTimeline history={proof.history} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Fully paid banner / send next installment */}
        {latestProof.status === "approved" && (
          isFullyPaid ? (
            <div className="card bg-success/10 border border-success/30 shadow-sm">
              <div className="card-body p-5 text-center gap-2">
                <div className="text-4xl">✓</div>
                <p className="font-bold text-success text-lg">ชำระเงินครบถ้วนแล้ว</p>
                <p className="text-base-content/60 text-sm">
                  คุณได้ชำระเงินตามยอดที่กำหนดครบถ้วนแล้ว ขอบคุณสำหรับการชำระเงิน
                </p>
                <p className="text-xs text-base-content/40 mt-1">
                  ยอดรวม {billingTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿ · ชำระแล้ว {totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                </p>
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-sm border-2 border-dashed border-primary/30">
              <div className="card-body p-4 text-center">
                <p className="text-base-content/60 text-sm">ต้องการชำระงวดถัดไปหรือไม่?</p>
                {billingTotal > 0 && (
                  <p className="text-xs text-warning font-medium">
                    ยังคงเหลืออีก {remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                  </p>
                )}
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

      {/* Hidden receipt document for PDF generation */}
      {downloadReady && selectedProof && (
        <div ref={receiptRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <PaymentReceiptDocument
            receipt={{
              proofNumber:       selectedProof.proofNumber,
              billingNumber:     selectedProof.billingNumber,
              poNumbers:         selectedProof.poNumbers ?? [],
              customerName:      selectedProof.customerName,
              customerEmail:     selectedProof.customerEmail,
              amount:            selectedProof.amount,
              paymentDate:       selectedProof.paymentDate,
              paymentMethod:     selectedProof.paymentMethod,
              bankName:          selectedProof.bankName,
              referenceNumber:   selectedProof.referenceNumber,
              approvedAt:        selectedProof.reviewedAt ?? selectedProof.createdAt,
              installmentNumber: selectedProof.installmentNumber,
            } satisfies PaymentReceiptProps["receipt"]}
          />
        </div>
      )}
    </div>
  );
}
