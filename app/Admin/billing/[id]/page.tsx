"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import BillingNoteDocument from "@/components/BillingNoteDocument";

type BillingStatus = "draft" | "finalized";

interface TaxInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
}

interface Billing {
  _id: string;
  billingNumber: string;
  status: BillingStatus;
  customerName: string;
  customerEmail: string;
  poNumbers: string[];
  taxInvoices: TaxInvoice[];
  billingDate?: string;
  createdAt: string;
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminBillingDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;

  const [billing, setBilling]   = useState<Billing | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showPrint, setShowPrint] = useState(false);

  const [invNum, setInvNum]       = useState("");
  const [invDate, setInvDate]     = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [addingInv, setAddingInv] = useState(false);
  const [invError, setInvError]   = useState("");

  const [actionLoading, setActionLoading]             = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm]     = useState(false);

  const fetchBilling = async () => {
    const res = await fetch(`/api/billing/${id}`);
    if (res.ok) setBilling(await res.json());
    setLoading(false);
  };

  useEffect(() => { if (id) fetchBilling(); }, [id]);

  useEffect(() => {
    if (!showPrint) return;
    const handler = () => setShowPrint(false);
    window.addEventListener("afterprint", handler, { once: true });
    return () => window.removeEventListener("afterprint", handler);
  }, [showPrint]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/billing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setBilling(await res.json());
    return res.ok;
  };

  const handleAddInvoice = async () => {
    setInvError("");
    if (!invNum.trim() || !invDate || !invAmount) { setInvError("กรุณากรอกข้อมูลให้ครบถ้วน"); return; }
    const amount = parseFloat(invAmount);
    if (isNaN(amount) || amount <= 0) { setInvError("ยอดเงินต้องเป็นตัวเลขมากกว่า 0"); return; }
    setAddingInv(true);
    const ok = await patch({ action: "addInvoice", invoice: { invoiceNumber: invNum.trim(), invoiceDate: invDate, amount } });
    if (ok) { setInvNum(""); setInvDate(""); setInvAmount(""); }
    setAddingInv(false);
  };

  const handleRemoveInvoice = async (invoiceId: string) => {
    await patch({ action: "removeInvoice", invoiceId });
  };

  const handleFinalize = async () => {
    setActionLoading(true);
    await patch({ action: "finalize" });
    setShowFinalizeConfirm(false);
    setActionLoading(false);
  };

  const handleCancel = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/billing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setActionLoading(false);
    setShowCancelConfirm(false);
    if (res.ok) router.push("/Admin/billing");
  };

  const handlePrint = () => { setShowPrint(true); setTimeout(() => window.print(), 100); };

  if (!session) return null;

  if (loading) return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-sm text-base-content/40">กำลังโหลด...</p>
      </div>
    </div>
  );

  if (!billing) return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-bold">ไม่พบใบวางบิล</p>
      <button className="btn btn-primary" onClick={() => router.push("/Admin/billing")}>กลับ</button>
    </div>
  );

  const grand       = billing.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
  const isFinalized = billing.status === "finalized";

  return (
    <>
      {/* Print area */}
      {showPrint && (
        <div className="hidden print:block">
          <BillingNoteDocument po={{
            poNumbers:      billing.poNumbers,
            billingGroupId: billing.billingNumber,
            userName:       billing.customerName,
            userEmail:      billing.customerEmail,
            taxInvoices:    billing.taxInvoices,
            billedAt:       billing.billingDate,
            createdAt:      billing.createdAt,
          }} />
        </div>
      )}

      <div className="min-h-screen bg-base-200 print:hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-base-100 border-b border-base-300 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
            <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => router.push("/Admin/billing")}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              กลับ
            </button>
            <div className="w-px h-5 bg-base-300" />
            <span className="font-bold text-base">{billing.billingNumber}</span>
            <span className={`badge badge-sm ${isFinalized ? "badge-success" : "badge-warning"}`}>
              {isFinalized ? "ยืนยันแล้ว" : "ร่าง"}
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-5">

          {/* Info card */}
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className={`h-1 ${isFinalized ? "bg-success" : "bg-warning"}`} />
            <div className="card-body p-6 gap-4">
              <h2 className="font-bold text-base">ข้อมูลใบวางบิล</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: "เลขที่ใบวางบิล", value: billing.billingNumber },
                  { label: "ลูกค้า",         value: billing.customerName },
                  { label: "อีเมล",           value: billing.customerEmail },
                ].map(({ label, value }) => (
                  <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
                    <span className="text-base-content/45">{label}</span>
                    <span className="font-medium break-all">{value}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[7rem_1fr] gap-2 sm:col-span-2">
                  <span className="text-base-content/45">เลขที่ PO</span>
                  <div className="flex flex-wrap gap-1.5">
                    {billing.poNumbers.map((pn) => (
                      <span key={pn} className="badge badge-outline badge-sm font-mono">{pn}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice management */}
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className="card-body p-6 gap-5">
              <h2 className="font-bold text-base">ใบกำกับภาษี / ใบส่งของ</h2>

              {billing.taxInvoices.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-base-200">
                  <table className="table table-sm w-full">
                    <thead className="bg-base-200/60">
                      <tr className="text-[11px] uppercase tracking-wider text-base-content/50">
                        <th>เลขที่</th><th>วันที่</th><th className="text-right">ยอดเงิน</th>
                        {!isFinalized && <th className="w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {billing.taxInvoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-base-200/30">
                          <td className="font-medium text-sm">{inv.invoiceNumber}</td>
                          <td className="text-sm text-base-content/60">{inv.invoiceDate}</td>
                          <td className="text-right text-sm font-medium">{fmt(inv.amount)}</td>
                          {!isFinalized && (
                            <td>
                              <button className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                onClick={() => handleRemoveInvoice(inv._id)}>
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
                        {!isFinalized && <td />}
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

              {!isFinalized && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                    เพิ่มใบกำกับภาษี / ใบส่งของ
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="เลขที่ใบกำกับฯ"
                      className="input input-bordered input-sm col-span-2"
                      value={invNum} onChange={(e) => setInvNum(e.target.value)} />
                    <input type="date" className="input input-bordered input-sm"
                      value={invDate} onChange={(e) => setInvDate(e.target.value)} />
                    <input type="number" placeholder="ยอดเงิน (บาท)"
                      className="input input-bordered input-sm" min="0" step="0.01"
                      value={invAmount} onChange={(e) => setInvAmount(e.target.value)} />
                  </div>
                  {invError && <p className="text-error text-xs">{invError}</p>}
                  <button className="btn btn-outline btn-sm w-full gap-1.5" disabled={addingInv} onClick={handleAddInvoice}>
                    {addingInv ? <span className="loading loading-spinner loading-xs" /> :
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    }
                    เพิ่มรายการ
                  </button>
                </div>
              )}

              {!isFinalized && billing.taxInvoices.length > 0 && (
                <>
                  <div className="divider my-0" />
                  <button className="btn btn-success w-full gap-2" onClick={() => setShowFinalizeConfirm(true)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ยืนยันใบวางบิล
                  </button>
                </>
              )}

              {!isFinalized && (
                <button className="btn btn-ghost btn-sm text-error w-full" onClick={() => setShowCancelConfirm(true)}>
                  ยกเลิกและลบใบวางบิลนี้
                </button>
              )}

              {isFinalized && (
                <>
                  <div className="divider my-0" />
                  <button className="btn btn-outline btn-success w-full gap-2" onClick={handlePrint}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    พิมพ์ใบวางบิล
                  </button>
                  {billing.billingDate && (
                    <p className="text-xs text-center text-base-content/35">
                      ยืนยันเมื่อ {new Date(billing.billingDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finalize modal */}
      {showFinalizeConfirm && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold mb-3">ยืนยันการสร้างใบวางบิล</h3>
            <div className="bg-base-200 rounded-xl p-4 space-y-1.5 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-base-content/60">จำนวน PO</span>
                <span className="font-semibold">{billing.poNumbers.length} ใบ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">ใบกำกับภาษี</span>
                <span className="font-semibold">{billing.taxInvoices.length} ใบ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">ยอดรวม</span>
                <span className="font-bold text-success">{fmt(grand)} บาท</span>
              </div>
            </div>
            <p className="text-xs text-base-content/40 mb-4">
              PO ทุกใบจะเปลี่ยนสถานะเป็น &quot;วางบิลแล้ว&quot; และไม่สามารถแก้ไขได้
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setShowFinalizeConfirm(false)}>ยกเลิก</button>
              <button className="btn btn-success flex-1 gap-2" disabled={actionLoading} onClick={handleFinalize}>
                {actionLoading && <span className="loading loading-spinner loading-sm" />}
                ยืนยัน
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setShowFinalizeConfirm(false)}>close</button></form>
        </dialog>
      )}

      {/* Cancel modal */}
      {showCancelConfirm && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-error mb-2">ยกเลิกและลบใบวางบิล?</h3>
            <p className="text-sm text-base-content/60 mb-4">
              PO ทุกใบจะกลับสู่สถานะ &quot;กำลังดำเนินการ&quot;
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setShowCancelConfirm(false)}>ยกเลิก</button>
              <button className="btn btn-error flex-1 gap-2" disabled={actionLoading} onClick={handleCancel}>
                {actionLoading && <span className="loading loading-spinner loading-sm" />}
                ลบใบวางบิล
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setShowCancelConfirm(false)}>close</button></form>
        </dialog>
      )}
    </>
  );
}
