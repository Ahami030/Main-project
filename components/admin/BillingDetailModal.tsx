"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TaxInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
}

type BillingType = "group" | "single";

interface Detail {
  type: BillingType;
  _id: string;
  billingNumber: string;
  status: string; // group: draft|finalized · single: accepted|billed
  customerName: string;
  customerEmail: string;
  poNumbers: string[];
  taxInvoices: TaxInvoice[];
  billingDate?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) : "-";

export default function BillingDetailModal({
  item,
  onClose,
  onChanged,
}: {
  item: { _id: string; type: BillingType; billingNumber: string };
  onClose: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail]   = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode]       = useState<"view" | "edit">("view");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");

  const [invNum, setInvNum]       = useState("");
  const [invDate, setInvDate]     = useState("");
  const [invAmount, setInvAmount] = useState("");

  const endpoint = item.type === "single" ? `/api/po/${item._id}` : `/api/billing/${item._id}`;

  const normalize = useCallback((raw: Record<string, unknown>): Detail => {
    const r = raw as Record<string, never> & Record<string, unknown>;
    if (item.type === "single") {
      return {
        type: "single", _id: item._id,
        billingNumber: String(r.poNumber ?? item.billingNumber),
        status: String(r.status ?? "billed"),
        customerName: String(r.userName ?? ""),
        customerEmail: String(r.userEmail ?? ""),
        poNumbers: r.poNumber ? [String(r.poNumber)] : [],
        taxInvoices: (r.taxInvoices as TaxInvoice[]) ?? [],
        billingDate: (r.billedAt as string) ?? null,
        expiresAt: null,
        createdAt: String(r.createdAt ?? ""),
      };
    }
    return {
      type: "group", _id: item._id,
      billingNumber: String(r.billingNumber ?? item.billingNumber),
      status: String(r.status ?? "draft"),
      customerName: String(r.customerName ?? ""),
      customerEmail: String(r.customerEmail ?? ""),
      poNumbers: (r.poNumbers as string[]) ?? [],
      taxInvoices: (r.taxInvoices as TaxInvoice[]) ?? [],
      billingDate: (r.billingDate as string) ?? null,
      expiresAt: (r.expiresAt as string) ?? null,
      createdAt: String(r.createdAt ?? ""),
    };
  }, [item]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (res.ok) setDetail(normalize(await res.json()));
    } finally {
      setLoading(false);
    }
  }, [endpoint, normalize]);

  useEffect(() => { load(); }, [load]);

  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((data as { message?: string })?.message ?? "ทำรายการไม่สำเร็จ");
        return false;
      }
      setDetail(normalize(data));
      onChanged();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => { onChanged(); onClose(); };

  // Enter edit mode. For a billed single-PO, first revert it to editable (unbill).
  const handleEnterEdit = async () => {
    if (!detail) return;
    if (detail.type === "single" && detail.status === "billed") {
      const ok = await patch({ action: "unbill" });
      if (!ok) return;
    }
    setMode("edit");
  };

  const handleAddInvoice = async () => {
    setErr("");
    if (!invNum.trim() || !invDate || !invAmount) { setErr("กรุณากรอกข้อมูลให้ครบถ้วน"); return; }
    const amount = parseFloat(invAmount);
    if (isNaN(amount) || amount <= 0) { setErr("ยอดเงินต้องเป็นตัวเลขมากกว่า 0"); return; }
    const ok = await patch({
      action: "addInvoice",
      invoice: { invoiceNumber: invNum.trim(), invoiceDate: invDate, amount },
    });
    if (ok) { setInvNum(""); setInvDate(""); setInvAmount(""); }
  };

  const handleRemoveInvoice = (invoiceId: string) => patch({ action: "removeInvoice", invoiceId });

  // Confirm = finalize (group) or re-bill (single)
  const handleConfirm = async () => {
    if (!detail) return;
    const ok = await patch(
      detail.type === "group" ? { action: "finalize" } : { action: "generateBilling" }
    );
    if (ok) setMode("view");
  };

  const openFullPage = () => {
    router.push(detail?.type === "single" ? `/Admin/po/${item._id}` : `/Admin/billing/${item._id}`);
  };

  const total = detail ? detail.taxInvoices.reduce((s, inv) => s + inv.amount, 0) : 0;

  // Status helpers
  const isFinalized = detail?.type === "group" && detail.status === "finalized";
  const isBilled    = detail?.type === "single" && detail.status === "billed";
  const statusLabel = isFinalized || isBilled ? "ยืนยันแล้ว" : "ร่าง / แก้ไขได้";
  const statusClass = isFinalized || isBilled ? "badge-success" : "badge-warning";

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-base-300/70">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-base-content/55 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {item.type === "group" ? "ใบวางบิลรวม" : "ใบวางบิล PO เดี่ยว"}
            </p>
            <h3 className="font-medium text-xl tracking-mc truncate">{detail?.billingNumber ?? item.billingNumber}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {detail && <span className={`badge badge-sm ${statusClass}`}>{statusLabel}</span>}
            <button className="btn btn-ghost btn-sm btn-circle" onClick={handleClose} aria-label="ปิด">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading || !detail ? (
            <div className="flex justify-center py-14"><span className="loading loading-spinner loading-lg text-primary" /></div>
          ) : (
            <>
              {/* Customer / meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                  <span className="text-base-content/45">ลูกค้า</span>
                  <span className="font-medium break-all">{detail.customerName}</span>
                </div>
                <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                  <span className="text-base-content/45">อีเมล</span>
                  <span className="font-medium break-all">{detail.customerEmail}</span>
                </div>
                <div className="grid grid-cols-[5.5rem_1fr] gap-2 sm:col-span-2">
                  <span className="text-base-content/45">เลขที่ PO</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.poNumbers.map((pn) => (
                      <span key={pn} className="badge badge-outline badge-sm font-mono">{pn}</span>
                    ))}
                  </div>
                </div>
                {detail.billingDate && (
                  <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                    <span className="text-base-content/45">วันที่วางบิล</span>
                    <span className="font-medium">{fmtDate(detail.billingDate)}</span>
                  </div>
                )}
              </div>

              {/* Edit-mode notice for single PO (was unlocked) */}
              {mode === "edit" && detail.type === "single" && (
                <div className="alert alert-warning rounded-2xl py-2.5 text-xs">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  PO ถูกปลดล็อกเป็น &quot;กำลังดำเนินการ&quot; เพื่อแก้ไข — กด &quot;วางบิลอีกครั้ง&quot; เพื่อยืนยันใหม่ มิฉะนั้นจะไม่ถือเป็นใบวางบิล
                </div>
              )}

              {/* Invoice table */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/45 mb-2">ใบกำกับภาษี / ใบส่งของ</p>
                {detail.taxInvoices.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-base-200">
                    <table className="table table-sm w-full">
                      <thead className="bg-base-200/60">
                        <tr className="text-[11px] uppercase tracking-wider text-base-content/50">
                          <th>เลขที่</th><th>วันที่</th><th className="text-right">ยอดเงิน</th>
                          {mode === "edit" && <th className="w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.taxInvoices.map((inv) => (
                          <tr key={inv._id} className="hover:bg-base-200/30">
                            <td className="font-medium text-sm">{inv.invoiceNumber}</td>
                            <td className="text-sm text-base-content/60">{inv.invoiceDate}</td>
                            <td className="text-right text-sm font-medium">{fmt(inv.amount)}</td>
                            {mode === "edit" && (
                              <td>
                                <button className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                  disabled={busy}
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
                          <td className="text-right font-bold text-sm text-success">{fmt(total)}</td>
                          {mode === "edit" && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-5 gap-2 text-base-content/30 rounded-2xl border border-dashed border-base-300">
                    <p className="text-xs">ยังไม่มีรายการ</p>
                  </div>
                )}
              </div>

              {/* Add invoice form (edit mode) */}
              {mode === "edit" && (
                <div className="space-y-2.5 rounded-2xl bg-base-200/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">เพิ่มใบกำกับภาษี / ใบส่งของ</p>
                  <input type="text" placeholder="เลขที่ใบกำกับฯ"
                    className="input input-bordered input-sm w-full rounded-xl"
                    value={invNum} onChange={(e) => setInvNum(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="input input-bordered input-sm rounded-xl"
                      value={invDate} onChange={(e) => setInvDate(e.target.value)} />
                    <input type="number" placeholder="ยอดเงิน (บาท)"
                      className="input input-bordered input-sm rounded-xl" min="0" step="0.01"
                      value={invAmount} onChange={(e) => setInvAmount(e.target.value)} />
                  </div>
                  <button className="btn btn-outline btn-sm w-full gap-1.5" disabled={busy} onClick={handleAddInvoice}>
                    {busy ? <span className="loading loading-spinner loading-xs" /> :
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>}
                    เพิ่มรายการ
                  </button>
                </div>
              )}

              {err && <p className="text-error text-sm">{err}</p>}
            </>
          )}
        </div>

        {/* Footer actions */}
        {detail && (
          <div className="border-t border-base-300/70 px-6 py-4 flex items-center gap-2">
            <button className="btn btn-ghost btn-sm gap-1.5" onClick={openFullPage}>
              เปิดหน้าเต็ม
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            <div className="flex-1" />

            {mode === "view" ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={handleClose}>ปิด</button>
                {isFinalized ? (
                  <span className="text-xs text-base-content/40 px-2">ยืนยันแล้ว · แก้ไขไม่ได้</span>
                ) : (
                  <button className="btn btn-primary btn-sm gap-2" disabled={busy} onClick={handleEnterEdit}>
                    {busy && <span className="loading loading-spinner loading-xs" />}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isBilled ? "แก้ไข (ปลดล็อก)" : "แก้ไข"}
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setMode("view")}>เสร็จสิ้น</button>
                <button
                  className="btn btn-success btn-sm gap-2"
                  disabled={busy || detail.taxInvoices.length === 0}
                  onClick={handleConfirm}
                  title={detail.taxInvoices.length === 0 ? "ต้องมีใบกำกับภาษีอย่างน้อย 1 รายการ" : ""}
                >
                  {busy && <span className="loading loading-spinner loading-xs" />}
                  {detail.type === "group" ? "ยืนยันใบวางบิล" : "วางบิลอีกครั้ง"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
