"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import PaymentReceiptDocument from "@/components/payment/PaymentReceiptDocument";
import type { PaymentReceiptProps } from "@/components/payment/PaymentReceiptDocument";

interface ProofData {
  proofNumber: string;
  billingNumber: string;
  poNumbers: string[];
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankName: string;
  referenceNumber: string;
  reviewedAt: string | null;
  createdAt: string;
  installmentNumber: number;
  status: string;
}

export default function PaymentReceiptPage({ params }: { params: Promise<{ proofId: string }> }) {
  const { proofId } = use(params);
  const router = useRouter();
  const [proof, setProof] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/payment-proof/${proofId}`);
        if (!res.ok) {
          if (!cancelled) setError(res.status === 404 ? "ไม่พบข้อมูลใบเสร็จ" : "ไม่มีสิทธิ์เข้าถึงใบเสร็จนี้");
          return;
        }
        const data = await res.json();
        if (!cancelled) setProof(data);
      } catch {
        if (!cancelled) setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [proofId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-error font-medium">{error || "ไม่พบข้อมูลใบเสร็จ"}</p>
        <button className="btn btn-sm btn-ghost" onClick={() => router.back()}>ย้อนกลับ</button>
      </div>
    );
  }

  if (proof.status !== "approved") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-warning font-medium">ใบเสร็จจะพร้อมใช้งานหลังการชำระเงินได้รับการยืนยันแล้ว</p>
        <button className="btn btn-sm btn-ghost" onClick={() => router.back()}>ย้อนกลับ</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-6">
      <div className="print:hidden max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between">
        <button className="btn btn-sm btn-ghost gap-1.5" onClick={() => router.back()}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          ย้อนกลับ
        </button>
        <button className="btn btn-sm btn-primary gap-1.5" onClick={() => window.print()}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0h12v6H6v-6z" />
          </svg>
          พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      <PaymentReceiptDocument
        receipt={{
          proofNumber:       proof.proofNumber,
          billingNumber:     proof.billingNumber,
          poNumbers:         proof.poNumbers ?? [],
          customerName:      proof.customerName,
          customerEmail:     proof.customerEmail,
          amount:            proof.amount,
          paymentDate:       proof.paymentDate,
          paymentMethod:     proof.paymentMethod,
          bankName:          proof.bankName,
          referenceNumber:   proof.referenceNumber,
          approvedAt:        proof.reviewedAt ?? proof.createdAt,
          installmentNumber: proof.installmentNumber,
        } satisfies PaymentReceiptProps["receipt"]}
      />
    </div>
  );
}
