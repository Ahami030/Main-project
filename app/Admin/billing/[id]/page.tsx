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
  customerId: string;
  poNumbers: string[];
  taxInvoices: TaxInvoice[];
  billingDate?: string;
  expiresAt?: string | null;
  fullResetOnExpiry?: boolean;
  createdAt: string;
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

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
  const [showResetConfirm, setShowResetConfirm]       = useState(false);
  const [resetting, setResetting]                     = useState(false);

  // Expiry state
  const [showExpiryPanel, setShowExpiryPanel]   = useState(false);
  const [expiryDays, setExpiryDays]             = useState<number | "">("");
  const [expiryCustom, setExpiryCustom]         = useState("");
  const [expiryFullReset, setExpiryFullReset]   = useState(false);
  const [settingExpiry, setSettingExpiry]       = useState(false);

  // Full Reset state
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [fullResetting, setFullResetting]               = useState(false);

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

  const handleSetExpiry = async () => {
    setSettingExpiry(true);
    let body: Record<string, unknown>;
    if (expiryDays !== "") {
      body = { action: "setExpiry", days: Number(expiryDays), fullResetOnExpiry: expiryFullReset };
    } else if (expiryCustom) {
      body = { action: "setExpiry", expiresAt: expiryCustom, fullResetOnExpiry: expiryFullReset };
    } else {
      setSettingExpiry(false);
      return;
    }
    await patch(body);
    setShowExpiryPanel(false);
    setExpiryDays("");
    setExpiryCustom("");
    setExpiryFullReset(false);
    setSettingExpiry(false);
  };

  const handleFullReset = async () => {
    if (!billing) return;
    setFullResetting(true);
    const res = await fetch("/api/admin/billing/full-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: billing.customerId }),
    });
    setFullResetting(false);
    setShowFullResetConfirm(false);
    if (res.ok) router.push("/Admin/billing");
  };

  const handleClearExpiry = async () => {
    await patch({ action: "clearExpiry" });
  };

  const handleReset = async () => {
    setResetting(true);
    const res = await fetch("/api/admin/billing/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingId: id }),
    });
    setResetting(false);
    setShowResetConfirm(false);
    if (res.ok) router.push("/Admin/billing");
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

  if (!billing) return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-bold">ไม่พบใบวางบิล</p>
      <button className="btn btn-primary" onClick={() => router.push("/Admin/billing")}>กลับ</button>
    </div>
  );

  const grand       = billing.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
  const isFinalized = billing.status === "finalized";
  const isExpired   = billing.expiresAt ? new Date(billing.expiresAt) <= new Date() : false;
  const daysLeft    = billing.expiresAt ? daysUntil(billing.expiresAt) : null;

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
            {isExpired && <span className="badge badge-error badge-sm">หมดอายุ</span>}
            {!isExpired && daysLeft !== null && daysLeft <= 7 && (
              <span className="badge badge-warning badge-sm">เหลือ {daysLeft} วัน</span>
            )}
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

          {/* Expiry card */}
          <div className={`card border shadow-sm overflow-hidden ${isExpired ? "border-error/40 bg-error/5" : "bg-base-100 border-base-300"}`}>
            <div className="card-body p-5 gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 ${isExpired ? "text-error" : "text-base-content/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="font-bold text-sm">วันหมดอายุเอกสาร</h2>
                </div>
                <div className="flex items-center gap-2">
                  {billing.expiresAt && !isExpired && (
                    <button className="btn btn-ghost btn-xs text-base-content/40" onClick={handleClearExpiry}>
                      ยกเลิกวันหมดอายุ
                    </button>
                  )}
                  <button
                    className="btn btn-outline btn-xs gap-1"
                    onClick={() => setShowExpiryPanel((v) => !v)}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    ตั้งวันหมดอายุ
                  </button>
                </div>
              </div>

              {billing.expiresAt ? (
                <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${isExpired ? "bg-error/10" : daysLeft !== null && daysLeft <= 7 ? "bg-warning/10" : "bg-base-200"}`}>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${isExpired ? "text-error" : ""}`}>
                      {isExpired ? "หมดอายุแล้ว" : `เหลือ ${daysLeft} วัน`}
                    </p>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      วันหมดอายุ: {fmtDate(billing.expiresAt)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {isExpired && <span className="badge badge-error badge-sm">จะถูกลบอัตโนมัติ</span>}
                    {billing.fullResetOnExpiry && (
                      <span className="badge badge-error badge-outline badge-sm">Full Reset</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-base-content/40">ยังไม่ได้ตั้งวันหมดอายุ — เอกสารจะเก็บไว้ตลอด</p>
              )}

              {showExpiryPanel && (
                <div className="rounded-xl border border-base-300 p-4 space-y-3">
                  <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                    เลือกระยะเวลาหรือวันที่
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[30, 60, 90, 180].map((d) => (
                      <button
                        key={d}
                        className={`btn btn-sm ${expiryDays === d ? "btn-primary" : "btn-outline"}`}
                        onClick={() => { setExpiryDays(d); setExpiryCustom(""); }}
                      >
                        {d} วัน
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-base-content/40">หรือเลือกวันที่</span>
                    <input
                      type="date"
                      className="input input-bordered input-sm flex-1"
                      value={expiryCustom}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => { setExpiryCustom(e.target.value); setExpiryDays(""); }}
                    />
                  </div>

                  {/* Full Reset on Expiry toggle */}
                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-base-300 p-3 hover:bg-base-200/50 transition-colors">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-error checkbox-sm mt-0.5"
                      checked={expiryFullReset}
                      onChange={(e) => setExpiryFullReset(e.target.checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Full Reset เมื่อหมดอายุ</p>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        ลบไฟล์ PO + ข้อมูล PO ทั้งหมดด้วย (ไม่ใช่แค่รีเซ็ตสถานะ) · ข้อมูลใบวางบิลยังสำรองไว้
                      </p>
                    </div>
                  </label>

                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm flex-1" onClick={() => setShowExpiryPanel(false)}>ยกเลิก</button>
                    <button
                      className={`btn btn-sm flex-1 ${expiryFullReset ? "btn-error" : "btn-primary"}`}
                      disabled={settingExpiry || (expiryDays === "" && !expiryCustom)}
                      onClick={handleSetExpiry}
                    >
                      {settingExpiry ? <span className="loading loading-spinner loading-xs" /> : "บันทึก"}
                    </button>
                  </div>
                </div>
              )}
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
                      ยืนยันเมื่อ {fmtDate(billing.billingDate)}
                    </p>
                  )}
                </>
              )}

              {!isFinalized && (
                <button className="btn btn-ghost btn-sm text-error w-full" onClick={() => setShowCancelConfirm(true)}>
                  ยกเลิกและลบใบวางบิลนี้
                </button>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card bg-base-100 border border-error/20 shadow-sm">
            <div className="card-body p-5 gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-error/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="font-bold text-sm text-error/80">Danger Zone</h2>
              </div>

              {/* Reset billing only */}
              <div className="rounded-xl border border-base-300 p-4 space-y-2">
                <p className="text-sm font-semibold">Reset ใบวางบิลนี้</p>
                <p className="text-xs text-base-content/50">
                  สำรองข้อมูลใบวางบิลไว้ใน <code className="bg-base-200 px-1 rounded">archived_billings</code> แล้ว PO กลับสู่สถานะ &quot;กำลังดำเนินการ&quot;
                </p>
                <button className="btn btn-outline btn-error btn-sm gap-2" onClick={() => setShowResetConfirm(true)}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset ใบวางบิล
                </button>
              </div>

              {/* Full Reset customer */}
              <div className="rounded-xl border border-error/30 bg-error/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-error">Full Reset ลูกค้า</p>
                <p className="text-xs text-base-content/50">
                  ลบข้อมูล<strong>ทั้งหมด</strong>ของ <strong>{billing.customerName}</strong>: ไฟล์ PO + ข้อมูล PO + ใบวางบิลทุกใบ
                  · สำรองใบวางบิลไว้ก่อนลบ
                </p>
                <button className="btn btn-error btn-sm gap-2" onClick={() => setShowFullResetConfirm(true)}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Full Reset ลูกค้า
                </button>
              </div>
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
              <button className="btn btn-success flex-1 gap-2" disabled={actionLoading}
                onClick={handleFinalize}>
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

      {/* Full Reset confirm modal */}
      {showFullResetConfirm && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">Full Reset ลูกค้า</h3>
                <p className="text-xs text-base-content/50 mt-0.5">{billing.customerName}</p>
              </div>
            </div>
            <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-xs space-y-2 mb-4">
              <p className="font-semibold text-sm text-error mb-2">จะลบข้อมูลต่อไปนี้ทั้งหมด:</p>
              <div className="flex items-start gap-2">
                <span className="text-success mt-0.5">✓</span>
                <span>ใบวางบิลทั้งหมดจะถูกสำรองไว้ใน <code className="bg-base-200 px-1 rounded">archived_billings</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-error mt-0.5">✕</span>
                <span>ไฟล์ PO ทั้งหมดจากระบบไฟล์จะถูกลบ</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-error mt-0.5">✕</span>
                <span>ข้อมูล PO ทั้งหมดใน database จะถูกลบ</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-error mt-0.5">✕</span>
                <span>ใบวางบิลทั้งหมดจะถูกลบ</span>
              </div>
            </div>
            <p className="text-xs text-base-content/40 mb-4">การกระทำนี้<strong>ไม่สามารถย้อนกลับได้</strong></p>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setShowFullResetConfirm(false)}>ยกเลิก</button>
              <button className="btn btn-error flex-1 gap-2" disabled={fullResetting} onClick={handleFullReset}>
                {fullResetting && <span className="loading loading-spinner loading-sm" />}
                ยืนยัน Full Reset
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setShowFullResetConfirm(false)}>close</button></form>
        </dialog>
      )}

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">Reset {billing.billingNumber}?</h3>
                <p className="text-xs text-base-content/50 mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="bg-base-200 rounded-xl p-4 text-xs space-y-2 mb-4">
              <p className="font-semibold text-sm mb-2">สิ่งที่จะเกิดขึ้น:</p>
              <div className="flex items-start gap-2">
                <span className="text-success mt-0.5">✓</span>
                <span>ข้อมูลใบวางบิลจะถูกสำรองไว้ใน <code className="bg-base-300 px-1 rounded">archived_billings</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-warning mt-0.5">↩</span>
                <span>PO จำนวน {billing.poNumbers.length} ใบ จะกลับสู่สถานะ &quot;กำลังดำเนินการ&quot;</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-error mt-0.5">✕</span>
                <span>ใบวางบิล {billing.billingNumber} จะถูกลบออก</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setShowResetConfirm(false)}>ยกเลิก</button>
              <button className="btn btn-error flex-1 gap-2" disabled={resetting} onClick={handleReset}>
                {resetting && <span className="loading loading-spinner loading-sm" />}
                ยืนยัน Reset
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setShowResetConfirm(false)}>close</button></form>
        </dialog>
      )}
    </>
  );
}
