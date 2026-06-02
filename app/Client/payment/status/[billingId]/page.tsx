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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        // Try billingId first, then poId (for legacy single-PO billings)
        let data: Proof[] = [];
        const byBilling = await fetch(`/api/payment-proof?billingId=${billingId}`);
        if (byBilling.ok) data = await byBilling.json();
        if (data.length === 0) {
          const byPO = await fetch(`/api/payment-proof?poId=${billingId}`);
          if (byPO.ok) data = await byPO.json();
        }
        setProofs(data.sort((a, b) => a.installmentNumber - b.installmentNumber));
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
          <div className="stats stats-horizontal shadow w-full bg-base-100">
            <div className="stat">
              <div className="stat-title">ชำระสะสม</div>
              <div className="stat-value text-success text-xl">
                {totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
              </div>
              <div className="stat-desc">{proofs.filter((p) => p.status === "approved").length} รายการที่อนุมัติ</div>
            </div>
            <div className="stat">
              <div className="stat-title">จำนวนครั้งที่ส่ง</div>
              <div className="stat-value text-xl">{proofs.length}</div>
              <div className="stat-desc">
                {proofs.filter((p) => p.status === "pending").length > 0 && "กำลังรอตรวจสอบ"}
                {proofs.filter((p) => p.status === "rejected").length > 0 && "มีรายการที่ถูกปฏิเสธ"}
                {allApproved && "ชำระครบทุกรายการ"}
              </div>
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
                <a
                  href={`/api/payment-proof/file?id=${proof._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs"
                >
                  ดูสลิป
                </a>
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

        {/* Send new installment */}
        {latestProof.status === "approved" && (
          <div className="card bg-base-100 shadow-sm border-2 border-dashed border-primary/30">
            <div className="card-body p-4 text-center">
              <p className="text-base-content/60 text-sm">ต้องการชำระงวดถัดไปหรือไม่?</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => router.push(`/Client/payment/${billingId}`)}
              >
                ส่งหลักฐานงวดถัดไป
              </button>
            </div>
          </div>
        )}

      </div>

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
