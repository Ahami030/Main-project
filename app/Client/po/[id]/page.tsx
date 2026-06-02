"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import BillingNoteDocument from "@/components/BillingNoteDocument";

type POStatus = "pending" | "accepted" | "billed";

interface TaxInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
}

interface PO {
  _id: string;
  poNumber: string;
  status: POStatus;
  fileOrigName: string;
  userName: string;
  userEmail: string;
  taxInvoices: TaxInvoice[];
  billedAt?: string | null;
  billingId?: string | null;
  createdAt: string;
}

interface Billing {
  _id: string;
  billingNumber: string;
  customerName: string;
  customerEmail: string;
  poNumbers: string[];
  taxInvoices: TaxInvoice[];
  status: string;
  billingDate?: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<POStatus, string> = {
  pending:  "รอตรวจสอบ",
  accepted: "กำลังดำเนินการ",
  billed:   "วางบิลแล้ว",
};

export default function ClientPODetailPage() {
  const { data: session } = useSession();
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;

  const [po, setPO]           = useState<PO | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        // 1. Fetch PO
        const poRes = await fetch(`/api/po/${id}`);
        if (poRes.status === 404 || poRes.status === 403) { setNotFound(true); return; }
        if (!poRes.ok) return;

        const poData: PO = await poRes.json();
        setPO(poData);

        // 2. If PO is part of a Billing group → fetch billing document
        if (poData.status === "billed" && poData.billingId) {
          const billRes = await fetch(`/api/billing/${poData.billingId}`);
          if (billRes.ok) setBilling(await billRes.json());
          // If fetch fails → falls back to single-PO display using po.taxInvoices
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handlePrint = () => window.print();

  if (!session) return null;
  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-xl font-bold">ไม่พบใบสั่งซื้อ</p>
      <button className="btn btn-primary" onClick={() => router.push("/Client/po")}>กลับ</button>
    </div>
  );
  if (!po) return null;

  // ── Decide which data to render ─────────────────────────────────────────────
  // Priority 1: Billing collection (multi-PO billing group)
  // Priority 2: PO's own taxInvoices (old single-PO billing)
  const useBilling   = Boolean(billing && billing.taxInvoices.length > 0);
  const usePoInvoices = !useBilling && Array.isArray(po.taxInvoices) && po.taxInvoices.length > 0;
  const hasBillingData = useBilling || usePoInvoices;

  const billingNoteProps = useBilling
    ? {
        poNumbers:      billing!.poNumbers,
        billingGroupId: billing!.billingNumber,
        userName:       billing!.customerName,
        userEmail:      billing!.customerEmail,
        taxInvoices:    billing!.taxInvoices,
        billedAt:       billing!.billingDate,
        createdAt:      billing!.createdAt,
      }
    : {
        poNumbers:   [po.poNumber],
        userName:    po.userName,
        userEmail:   po.userEmail,
        taxInvoices: po.taxInvoices,
        billedAt:    po.billedAt,
        createdAt:   po.createdAt,
      };

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center gap-3 mb-6 print:hidden">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/Client/po")}>← กลับ</button>
          <h1 className="text-xl font-bold">{po.poNumber}</h1>
        </div>

        {po.status !== "billed" ? (
          <div className="card bg-base-100 shadow-sm print:hidden">
            <div className="card-body items-center py-16 text-center">
              <div
                className={`radial-progress text-${po.status === "pending" ? "warning" : "info"} mb-4`}
                style={{ "--value": po.status === "pending" ? 33 : 66, "--size": "5rem" } as React.CSSProperties}
              >
                {po.status === "pending" ? "1/3" : "2/3"}
              </div>
              <h2 className="text-lg font-bold">{STATUS_LABEL[po.status]}</h2>
              <p className="text-base-content/60 mt-1 max-w-xs">
                {po.status === "pending"
                  ? "กำลังรอ admin ตรวจสอบและรับ PO ของคุณ"
                  : "admin กำลังจัดเตรียมสินค้าและออกใบกำกับภาษี/ใบส่งของ"}
              </p>
              <p className="text-sm text-base-content/40 mt-2">
                ระบบจะอัปเดตโดยอัตโนมัติเมื่อสถานะเปลี่ยน
              </p>
            </div>
          </div>
        ) : hasBillingData ? (
          <>
            <div className="flex justify-end mb-4 print:hidden">
              <button className="btn btn-primary gap-2" onClick={handlePrint}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                พิมพ์ใบวางบิล
              </button>
            </div>
            <BillingNoteDocument po={billingNoteProps} />
          </>
        ) : (
          <div className="card bg-base-100 shadow-sm print:hidden">
            <div className="card-body items-center py-16 text-center">
              <span className="loading loading-spinner loading-md text-primary mb-3" />
              <p className="font-semibold">กำลังออกใบวางบิล</p>
              <p className="text-sm text-base-content/50 mt-1">
                admin กำลังเพิ่มรายการใบกำกับภาษี กรุณารอสักครู่
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
