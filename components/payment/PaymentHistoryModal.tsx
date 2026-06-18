"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PaymentHistoryTimeline, { HistoryEntry } from "./PaymentHistoryTimeline";
import PaymentStatusBadge from "./PaymentStatusBadge";
import PaymentReceiptDocument from "./PaymentReceiptDocument";
import type { PaymentReceiptProps } from "./PaymentReceiptDocument";

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
  referenceNumber: string;
  reviewedAt: string | null;
  installmentNumber: number;
  history: HistoryEntry[];
  createdAt: string;
}

function IconEye() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0h12v6H6v-6z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface Props {
  billingKey: string;
  isGroup:    boolean;
  label:      string;
  onClose:    () => void;
}

const fmtBaht = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentHistoryModal({ billingKey, isGroup, label, onClose }: Props) {
  const [loading, setLoading]         = useState(true);
  const [proofs, setProofs]           = useState<Proof[]>([]);
  const [billingTotal, setBillingTotal] = useState(0);
  const [viewingProof, setViewingProof] = useState<Proof | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const param = isGroup ? `billingId=${billingKey}` : `poId=${billingKey}`;
        const [proofsRes, infoRes] = await Promise.all([
          fetch(`/api/payment-proof?${param}`),
          fetch(isGroup ? `/api/billing/${billingKey}` : `/api/po/${billingKey}`),
        ]);

        const proofsData: Proof[] = proofsRes.ok ? await proofsRes.json() : [];
        let total = 0;
        if (infoRes.ok) {
          const info = await infoRes.json();
          total = (info.taxInvoices ?? []).reduce(
            (s: number, inv: { amount: number }) => s + (inv.amount ?? 0), 0
          );
        }

        if (!cancelled) {
          setProofs(proofsData.sort((a, b) => a.installmentNumber - b.installmentNumber));
          setBillingTotal(total);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [billingKey, isGroup]);

  const totalPaid    = proofs.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const remaining    = billingTotal > 0 ? Math.max(0, billingTotal - totalPaid) : 0;
  const paidPct      = billingTotal > 0 ? Math.min(100, Math.round((totalPaid / billingTotal) * 100)) : 0;
  const isFullyPaid  = billingTotal > 0 && remaining === 0;

  const mergedTimeline = proofs
    .flatMap((p) => p.history ?? [])
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <>
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">ประวัติการชำระเงิน</h3>
            <p className="text-xs text-base-content/50 mt-0.5">{label}</p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : proofs.length === 0 ? (
          <p className="text-sm text-base-content/50 text-center py-12">ยังไม่มีประวัติการชำระเงิน</p>
        ) : (
          <div className="space-y-5">

            {/* Summary */}
            {billingTotal > 0 && (
              <div className="bg-base-200 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-base-content/50">
                  <span>ความคืบหน้า</span>
                  <span className="font-medium">{paidPct}%</span>
                </div>
                <progress
                  className={`progress w-full h-2.5 ${isFullyPaid ? "progress-success" : "progress-warning"}`}
                  value={totalPaid}
                  max={billingTotal}
                />
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-base-content/60">ยอดรวม</span>
                  <span className="font-medium tabular-nums">{fmtBaht(billingTotal)} ฿</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-base-content/60">ชำระแล้ว</span>
                  <span className="font-medium text-success tabular-nums">−{fmtBaht(totalPaid)} ฿</span>
                </div>
                <div className="divider my-0" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">คงเหลือ</span>
                  <span className={`text-xl font-bold tabular-nums ${isFullyPaid ? "text-success" : "text-warning"}`}>
                    {fmtBaht(remaining)} ฿
                  </span>
                </div>
              </div>
            )}

            {/* Proof list */}
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                การส่งหลักฐาน ({proofs.length})
              </p>
              <div className="space-y-2">
                {proofs.map((proof) => (
                  <div key={proof._id} className="flex items-center justify-between gap-3 bg-base-200/60 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-base-100 flex items-center justify-center text-xs font-bold shrink-0">
                        {proof.installmentNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{proof.proofNumber}</p>
                        <p className="text-xs text-base-content/50 mt-0.5 tabular-nums">{fmtBaht(proof.amount)} ฿</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PaymentStatusBadge status={proof.status as "pending" | "approved" | "rejected"} size="sm" />
                      {proof.status === "approved" && (
                        <button
                          className="btn btn-success btn-xs btn-square"
                          title="ดูใบเสร็จ"
                          onClick={() => setViewingProof(proof)}
                        >
                          <IconEye />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">ไทม์ไลน์</p>
              <PaymentHistoryTimeline history={mergedTimeline} />
            </div>

          </div>
        )}

      </div>

      <div className="modal-backdrop" onClick={onClose} />
    </dialog>

    {viewingProof && typeof document !== "undefined" && createPortal(
      <dialog className="modal modal-open receipt-print-dialog" style={{ zIndex: 1000 }}>
        {/* While printing the receipt, hide the entire app behind it (the
            dashboard's min-h-screen would otherwise leave a blank first page).
            The receipt dialog is portaled directly under <body>. */}
        <style>{`@media print { body > *:not(.receipt-print-dialog) { display: none !important; } }`}</style>
        <div className="modal-box receipt-print-box max-w-4xl p-0 overflow-hidden">
          <div className="print:hidden sticky top-0 z-10 bg-base-100 border-b border-base-300 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-sm">ใบเสร็จรับเงิน</h3>
            <div className="flex items-center gap-2">
              <button className="btn btn-sm btn-primary gap-1.5" onClick={() => window.print()}>
                <IconPrint /> พิมพ์ / บันทึกเป็น PDF
              </button>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setViewingProof(null)} aria-label="ปิด">
                <IconClose />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[80vh] py-6 bg-base-200">
            <PaymentReceiptDocument
              receipt={{
                proofNumber:       viewingProof.proofNumber,
                billingNumber:     viewingProof.billingNumber,
                poNumbers:         viewingProof.poNumbers ?? [],
                customerName:      viewingProof.customerName,
                customerEmail:     viewingProof.customerEmail,
                amount:            viewingProof.amount,
                paymentDate:       viewingProof.paymentDate,
                paymentMethod:     viewingProof.paymentMethod,
                bankName:          viewingProof.bankName,
                referenceNumber:   viewingProof.referenceNumber,
                approvedAt:        viewingProof.reviewedAt ?? viewingProof.createdAt,
                installmentNumber: viewingProof.installmentNumber,
              } satisfies PaymentReceiptProps["receipt"]}
            />
          </div>
        </div>
        <div className="modal-backdrop" onClick={() => setViewingProof(null)} />
      </dialog>,
      document.body
    )}
    </>
  );
}
