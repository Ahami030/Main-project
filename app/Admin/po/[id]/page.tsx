"use client";

import { useEffect, useRef, useState } from "react";
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
  userName: string;
  userEmail: string;
  fileOrigName: string;
  fileMimeType: string;
  filePath: string;
  taxInvoices: TaxInvoice[];
  billedAt?: string;
  billingId?: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<POStatus, string> = {
  pending:  "รอตรวจสอบ",
  accepted: "กำลังดำเนินการ",
  billed:   "วางบิลแล้ว",
};

const STATUS_BADGE: Record<POStatus, string> = {
  pending:  "badge-warning",
  accepted: "badge-info",
  billed:   "badge-success",
};

const STATUS_BAR: Record<POStatus, string> = {
  pending:  "from-warning to-warning/40",
  accepted: "from-info to-info/40",
  billed:   "from-success to-success/40",
};

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminPODetailPage() {
  const { data: session } = useSession();
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [po, setPO]           = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);

  const [invNum, setInvNum]       = useState("");
  const [invDate, setInvDate]     = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [addingInv, setAddingInv] = useState(false);
  const [invError, setInvError]   = useState("");

  const [actionLoading, setActionLoading]         = useState(false);
  const [showBillingConfirm, setShowBillingConfirm] = useState(false);
  const [showBillingNote, setShowBillingNote]     = useState(false);
  const [printImageMode, setPrintImageMode]       = useState(false);

  const fetchPO = async () => {
    const res = await fetch(`/api/po/${id}`);
    if (res.ok) setPO(await res.json());
    setLoading(false);
  };

  useEffect(() => { if (id) fetchPO(); }, [id]);

  // Cleanup image print CSS after dialog closes
  useEffect(() => {
    if (!printImageMode) return;
    const handler = () => setPrintImageMode(false);
    window.addEventListener("afterprint", handler, { once: true });
    return () => window.removeEventListener("afterprint", handler);
  }, [printImageMode]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/po/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setPO(await res.json());
    return res.ok;
  };

  const handleAccept = async () => {
    setActionLoading(true);
    await patch({ action: "accept" });
    setActionLoading(false);
  };

  const handleAddInvoice = async () => {
    setInvError("");
    if (!invNum.trim() || !invDate || !invAmount) {
      setInvError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const amount = parseFloat(invAmount);
    if (isNaN(amount) || amount <= 0) {
      setInvError("ยอดเงินต้องเป็นตัวเลขมากกว่า 0");
      return;
    }
    setAddingInv(true);
    const ok = await patch({ action: "addInvoice", invoice: { invoiceNumber: invNum.trim(), invoiceDate: invDate, amount } });
    if (ok) { setInvNum(""); setInvDate(""); setInvAmount(""); }
    setAddingInv(false);
  };

  const handleRemoveInvoice = async (invoiceId: string) => {
    await patch({ action: "removeInvoice", invoiceId });
  };

  const handleGenerateBilling = async () => {
    setActionLoading(true);
    const ok = await patch({ action: "generateBilling" });
    setShowBillingConfirm(false);
    if (ok) setShowBillingNote(true);
    setActionLoading(false);
  };

  const handlePrintProductList = () => {
    if (!po) return;
    if (isPdf) {
      // Same-origin iframe: trigger PDF's own print dialog
      try { iframeRef.current?.contentWindow?.print(); } catch {}
    } else if (isImage) {
      // Image: apply @media print CSS to show only image, then print
      setPrintImageMode(true);
      setTimeout(() => window.print(), 80);
    }
  };

  const handlePrintBilling = () => {
    setShowBillingNote(true);
    setTimeout(() => window.print(), 100);
  };

  if (!session) return null;

  if (loading) return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-sm text-base-content/40">กำลังโหลด...</p>
      </div>
    </div>
  );

  if (!po) return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-bold">ไม่พบ PO</p>
      <button className="btn btn-primary" onClick={() => router.push("/Admin/po")}>กลับ</button>
    </div>
  );

  const grand   = po.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
  const fileUrl = `/api/po/file?id=${po._id}`;
  const isImage = po.fileMimeType.startsWith("image/");
  const isPdf   = po.fileMimeType === "application/pdf" || po.fileOrigName.toLowerCase().endsWith(".pdf");

  return (
    <>
      {/* ── Print CSS: image-only mode ───────────────── */}
      {printImageMode && (
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #po-product-print-area, #po-product-print-area * { visibility: visible !important; }
            #po-product-print-area {
              position: fixed !important; top: 0; left: 0;
              width: 100vw; height: 100vh;
              display: flex !important; align-items: center; justify-content: center;
              background: white !important;
              z-index: 9999 !important;
            }
          }
        `}</style>
      )}

      {/* ── Billing note (hidden until printing) ─────── */}
      {po.status === "billed" && showBillingNote && (
        <div className="hidden print:block">
          <BillingNoteDocument po={{
            poNumbers:      [po.poNumber],
            billingGroupId: po.billingId ?? undefined,
            userName:       po.userName,
            userEmail:      po.userEmail,
            taxInvoices:    po.taxInvoices,
            billedAt:       po.billedAt,
            createdAt:      po.createdAt,
          }} />
        </div>
      )}

      {/* ── Main UI ──────────────────────────────────── */}
      <div className="min-h-screen bg-base-200 print:hidden">

        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-base-100 border-b border-base-300 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
            <button
              className="btn btn-ghost btn-sm gap-1.5"
              onClick={() => router.push("/Admin/po")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              กลับ
            </button>
            <div className="w-px h-5 bg-base-300" />
            <span className="font-bold text-base">{po.poNumber}</span>
            <span className={`badge badge-sm ${STATUS_BADGE[po.status]}`}>
              {STATUS_LABEL[po.status]}
            </span>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-5 items-start">

            {/* ── Left: File viewer ─────────────────────── */}
            <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
              <div className={`h-1 bg-linear-to-r ${STATUS_BAR[po.status]}`} />
              <div className="card-body p-4 gap-3 h-full">

                {/* File card header */}
                <div className="flex items-center justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40 mb-0.5">
                      ไฟล์รายการสินค้า
                    </p>
                    <p className="text-sm font-medium truncate text-base-content/70">
                      {po.fileOrigName}
                    </p>
                  </div>
                  {(isPdf || isImage) ? (
                    <button
                      className="btn btn-outline btn-sm gap-1.5 shrink-0"
                      onClick={handlePrintProductList}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      พิมพ์รายการสินค้า
                    </button>
                  ) : (
                    <a
                      href={fileUrl}
                      download={po.fileOrigName}
                      className="btn btn-outline btn-sm gap-1.5 shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      ดาวน์โหลด
                    </a>
                  )}
                </div>

                {/* File display area */}
                {isPdf ? (
                  <iframe
                    ref={iframeRef}
                    src={fileUrl}
                    title="product list"
                    className="w-full rounded-lg border border-base-300"
                    style={{ height: "calc(100vh - 11rem)", minHeight: "480px" }}
                  />
                ) : isImage ? (
                  <div
                    id="po-product-print-area"
                    className="flex items-center justify-center rounded-lg border border-base-300 bg-base-200/50 overflow-hidden"
                    style={{ height: "calc(100vh - 11rem)", minHeight: "480px" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl}
                      alt="product list"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-base-300 py-16">
                    <svg className="w-12 h-12 text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-base-content/40">ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
                    <a href={fileUrl} download={po.fileOrigName} className="btn btn-primary btn-sm gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      ดาวน์โหลดไฟล์
                    </a>
                  </div>
                )}

              </div>
            </div>

            {/* ── Right: Info + Actions ─────────────────── */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-[4.5rem]">

              {/* PO info card */}
              <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
                <div className={`h-1 bg-linear-to-r ${STATUS_BAR[po.status]}`} />

                {/* Card header */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-base-200">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-base-content/40">ข้อมูล PO</h2>
                  <span className={`badge badge-md ${STATUS_BADGE[po.status]}`}>{STATUS_LABEL[po.status]}</span>
                </div>

                {/* PO number hero */}
                <div className="px-6 py-5 border-b border-base-200">
                  <p className="text-[11px] text-base-content/40 mb-1.5 uppercase tracking-wider">เลขที่ PO</p>
                  <p className="text-3xl font-bold tracking-tight">{po.poNumber}</p>
                </div>

                {/* Details */}
                <div className="px-6 py-5 space-y-4">
                  {[
                    { label: "ลูกค้า",     value: po.userName },
                    { label: "อีเมล",      value: po.userEmail },
                    { label: "วันที่ส่ง",  value: new Date(po.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-3 text-sm">
                      <span className="text-base-content/45 pt-px">{label}</span>
                      <span className="font-medium break-all leading-snug">{value}</span>
                    </div>
                  ))}
                </div>

                {po.status === "pending" && (
                  <div className="px-6 pb-6">
                    <button
                      className="btn btn-primary w-full gap-2"
                      disabled={actionLoading}
                      onClick={handleAccept}
                    >
                      {actionLoading
                        ? <span className="loading loading-spinner loading-sm" />
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                      }
                      รับ PO
                    </button>
                  </div>
                )}

                {/* Billing navigation */}
                {po.status === "accepted" && !po.billingId && (
                  <div className="px-6 pb-6 pt-0">
                    <div className="divider my-0 mb-4" />
                    <button
                      className="btn btn-outline btn-sm w-full gap-2"
                      onClick={() => router.push(`/Admin/billing/new?preselect=${po._id}`)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      สร้างใบวางบิลรวม
                    </button>
                    <p className="text-[10px] text-center text-base-content/35 mt-1.5">
                      สามารถรวม PO หลายใบของลูกค้าคนเดียวกันได้
                    </p>
                  </div>
                )}

                {po.billingId && (
                  <div className="px-6 pb-6 pt-0">
                    <div className="divider my-0 mb-4" />
                    <button
                      className="btn btn-ghost btn-sm w-full gap-2 text-primary"
                      onClick={() => router.push(`/Admin/billing/${encodeURIComponent(po.billingId!)}`)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      ดูใบวางบิล ({po.billingId}) →
                    </button>
                  </div>
                )}
              </div>

              {/* Billing info card — when PO is linked to a billing group */}
              {po.billingId && (po.status === "accepted" || po.status === "billed") && (
                <div className="card bg-primary/5 border border-primary/20 shadow-sm">
                  <div className="card-body p-4 gap-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm font-semibold text-primary">อยู่ในระบบใบวางบิลรวม</p>
                    </div>
                    <p className="text-xs text-base-content/60">
                      PO นี้ถูกรวมอยู่ในใบวางบิลของระบบใหม่ ข้อมูลใบกำกับภาษีและการพิมพ์ใบวางบิลอยู่ที่หน้าจัดการใบวางบิล
                    </p>
                    <button
                      className="btn btn-primary btn-sm w-full gap-2"
                      onClick={() => router.push(`/Admin/billing/${encodeURIComponent(po.billingId!)}`)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      ไปจัดการใบวางบิล
                    </button>
                  </div>
                </div>
              )}

              {/* Tax Invoice section — only for old (single-PO) billing, not billing group */}
              {(po.status === "accepted" || po.status === "billed") && !po.billingId && (
                <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
                  <div className="card-body p-6 gap-5">

                    <h2 className="font-bold text-base">ใบกำกับภาษี / ใบส่งของ</h2>

                    {/* Invoice list */}
                    {po.taxInvoices.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-base-200">
                        <table className="table table-sm w-full">
                          <thead className="bg-base-200/60">
                            <tr className="text-[11px] uppercase tracking-wider text-base-content/50">
                              <th>เลขที่</th>
                              <th>วันที่</th>
                              <th className="text-right">ยอดเงิน</th>
                              {po.status !== "billed" && <th className="w-10" />}
                            </tr>
                          </thead>
                          <tbody>
                            {po.taxInvoices.map((inv) => (
                              <tr key={inv._id} className="hover:bg-base-200/30">
                                <td className="font-medium text-sm">{inv.invoiceNumber}</td>
                                <td className="text-sm text-base-content/60">{inv.invoiceDate}</td>
                                <td className="text-right text-sm font-medium">{fmt(inv.amount)}</td>
                                {po.status !== "billed" && (
                                  <td>
                                    <button
                                      className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                      onClick={() => handleRemoveInvoice(inv._id)}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-base-300 bg-base-200/40">
                              <td colSpan={2} className="font-bold text-sm">ยอดรวม</td>
                              <td className="text-right font-bold text-sm text-success">{fmt(grand)}</td>
                              {po.status !== "billed" && <td />}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-5 gap-2 text-base-content/30 rounded-lg border border-dashed border-base-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs">ยังไม่มีรายการ</p>
                      </div>
                    )}

                    {/* Add invoice form */}
                    {po.status === "accepted" && (
                      <div className="space-y-2.5 pt-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                          เพิ่มใบกำกับภาษี / ใบส่งของ
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="เลขที่ใบกำกับฯ"
                            className="input input-bordered input-sm col-span-2"
                            value={invNum}
                            onChange={(e) => setInvNum(e.target.value)}
                          />
                          <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={invDate}
                            onChange={(e) => setInvDate(e.target.value)}
                          />
                          <input
                            type="number"
                            placeholder="ยอดเงิน (บาท)"
                            className="input input-bordered input-sm"
                            min="0"
                            step="0.01"
                            value={invAmount}
                            onChange={(e) => setInvAmount(e.target.value)}
                          />
                        </div>
                        {invError && (
                          <p className="text-error text-xs">{invError}</p>
                        )}
                        <button
                          className="btn btn-outline btn-sm w-full gap-1.5"
                          disabled={addingInv}
                          onClick={handleAddInvoice}
                        >
                          {addingInv
                            ? <span className="loading loading-spinner loading-xs" />
                            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                          }
                          เพิ่มรายการ
                        </button>
                      </div>
                    )}

                    {/* Action buttons */}
                    {po.status === "accepted" && po.taxInvoices.length > 0 && (
                      <>
                        <div className="divider my-0" />
                        <button
                          className="btn btn-success w-full gap-2"
                          onClick={() => setShowBillingConfirm(true)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          สร้างใบวางบิล
                        </button>
                      </>
                    )}

                    {po.status === "billed" && (
                      <>
                        <div className="divider my-0" />
                        <button
                          className="btn btn-outline btn-success w-full gap-2"
                          onClick={handlePrintBilling}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          พิมพ์ใบวางบิล
                        </button>
                        {po.billedAt && (
                          <p className="text-xs text-center text-base-content/35">
                            วางบิลเมื่อ {new Date(po.billedAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        )}
                      </>
                    )}

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm billing modal ─────────────────────── */}
      {showBillingConfirm && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">ยืนยันการสร้างใบวางบิล</h3>
                <p className="text-xs text-base-content/50 mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="bg-base-200 rounded-xl p-4 space-y-1.5 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-base-content/60">จำนวนใบกำกับภาษี</span>
                <span className="font-semibold">{po.taxInvoices.length} ใบ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">ยอดรวม</span>
                <span className="font-bold text-success">{fmt(grand)} บาท</span>
              </div>
            </div>
            <p className="text-xs text-base-content/40 mb-4">
              หลังจากนี้จะไม่สามารถแก้ไขรายการใบกำกับภาษี/ใบส่งของได้
            </p>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowBillingConfirm(false)}
              >
                ยกเลิก
              </button>
              <button
                className="btn btn-success flex-1 gap-2"
                disabled={actionLoading}
                onClick={handleGenerateBilling}
              >
                {actionLoading && <span className="loading loading-spinner loading-sm" />}
                ยืนยัน
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowBillingConfirm(false)}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
