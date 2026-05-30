"use client";

import React from "react";
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
  userName: string;
  userEmail: string;
  fileOrigName: string;
  fileMimeType: string;
  filePath: string;
  taxInvoices: TaxInvoice[];
  billedAt?: string;
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

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminPODetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [po, setPO] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);

  // Invoice form
  const [invNum, setInvNum] = useState("");
  const [invDate, setInvDate] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [addingInv, setAddingInv] = useState(false);
  const [invError, setInvError] = useState("");

  // Actions
  const [actionLoading, setActionLoading] = useState(false);
  const [showBillingConfirm, setShowBillingConfirm] = useState(false);
  const [showBillingNote, setShowBillingNote] = useState(false);

  const fetchPO = async () => {
    const res = await fetch(`/api/po/${id}`);
    if (res.ok) setPO(await res.json());
    setLoading(false);
  };

  useEffect(() => { if (id) fetchPO(); }, [id]);

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
    const fileUrl = `/api/po/file?id=${po._id}`;
    const isImage = po.fileMimeType.startsWith("image/");
    const win = window.open("", "_blank");
    if (!win) return;
    if (isImage) {
      win.document.write(
        `<html><head><title>รายการสินค้า</title></head><body style="margin:0;padding:0"><img src="${fileUrl}" style="max-width:100%;display:block"/></body></html>`
      );
    } else {
      win.document.write(
        `<html><head><title>รายการสินค้า</title></head><body style="margin:0;padding:0"><iframe src="${fileUrl}" style="width:100%;height:100vh;border:none"></iframe></body></html>`
      );
    }
    win.document.close();
    win.addEventListener("load", () => win.print());
  };

  const handlePrintBilling = () => window.print();

  if (!session) return null;
  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
  if (!po) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-xl font-bold">ไม่พบ PO</p>
      <button className="btn btn-primary" onClick={() => router.push("/Admin/po")}>กลับ</button>
    </div>
  );

  const grand = po.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
  const fileUrl = `/api/po/file?id=${po._id}`;
  const isImage = po.fileMimeType.startsWith("image/");
  const isPdf = po.fileMimeType === "application/pdf" || po.fileOrigName.endsWith(".pdf");

  return (
    <>
      {/* Billing note print view (hidden except when printing) */}
      {showBillingNote && po.status === "billed" && (
        <div className="hidden print:block">
          <BillingNoteDocument po={{ ...po, billedAt: po.billedAt ?? "" }} />
        </div>
      )}

      <div className="min-h-screen bg-base-200 py-8 px-4 print:hidden">
        <div className="max-w-6xl mx-auto">

          {/* Top bar */}
          <div className="flex items-center gap-3 mb-6">
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/Admin/po")}>← กลับ</button>
            <h1 className="text-xl font-bold">{po.poNumber}</h1>
            <span className={`badge ${STATUS_BADGE[po.status]}`}>{STATUS_LABEL[po.status]}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ─── Left: File viewer ─── */}
            <div className="flex flex-col gap-4">
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">ไฟล์รายการสินค้า</h2>
                    <button className="btn btn-outline btn-sm gap-1" onClick={handlePrintProductList}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      พิมพ์รายการสินค้า
                    </button>
                  </div>

                  <p className="text-sm text-base-content/60 truncate">{po.fileOrigName}</p>

                  {isPdf ? (
                    <iframe src={fileUrl} className="w-full h-96 rounded border border-base-300" title="product list" />
                  ) : isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl} alt="product list" className="w-full max-h-96 object-contain rounded border border-base-300 bg-base-200" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-10 border border-dashed border-base-300 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">ดาวน์โหลดไฟล์</a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Right: PO info + actions ─── */}
            <div className="flex flex-col gap-4">

              {/* PO Info */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body gap-3">
                  <h2 className="font-semibold">ข้อมูล PO</h2>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    {[
                      { label: "เลขที่ PO", value: po.poNumber },
                      { label: "ลูกค้า", value: po.userName },
                      { label: "อีเมล", value: po.userEmail },
                      { label: "วันที่ส่ง", value: new Date(po.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) },
                    ].map(({ label, value }) => (
                      <React.Fragment key={label}>
                        <span className="text-base-content/50">{label}</span>
                        <span className="font-medium truncate">{value}</span>
                      </React.Fragment>
                    ))}
                  </div>

                  {po.status === "pending" && (
                    <button
                      className="btn btn-primary w-full mt-2"
                      disabled={actionLoading}
                      onClick={handleAccept}
                    >
                      {actionLoading && <span className="loading loading-spinner loading-sm" />}
                      รับ PO
                    </button>
                  )}
                </div>
              </div>

              {/* Tax Invoices section */}
              {(po.status === "accepted" || po.status === "billed") && (
                <div className="card bg-base-100 shadow-sm">
                  <div className="card-body gap-3">
                    <h2 className="font-semibold">ใบกำกับภาษี/ใบส่งของ</h2>

                    {po.taxInvoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="table table-xs">
                          <thead>
                            <tr className="text-xs">
                              <th>เลขที่</th>
                              <th>วันที่</th>
                              <th className="text-right">ยอดเงิน (บาท)</th>
                              {po.status !== "billed" && <th />}
                            </tr>
                          </thead>
                          <tbody>
                            {po.taxInvoices.map((inv) => (
                              <tr key={inv._id}>
                                <td className="font-medium">{inv.invoiceNumber}</td>
                                <td>{inv.invoiceDate}</td>
                                <td className="text-right">{fmt(inv.amount)}</td>
                                {po.status !== "billed" && (
                                  <td>
                                    <button
                                      className="btn btn-ghost btn-xs text-error"
                                      onClick={() => handleRemoveInvoice(inv._id)}
                                    >ลบ</button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="font-bold bg-base-200">
                              <td colSpan={po.status !== "billed" ? 2 : 2}>ยอดรวม</td>
                              <td className="text-right">{fmt(grand)}</td>
                              {po.status !== "billed" && <td />}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-base-content/40 py-2">ยังไม่มีใบกำกับภาษี/ใบส่งของ</p>
                    )}

                    {/* Add invoice form */}
                    {po.status === "accepted" && (
                      <div className="flex flex-col gap-2 pt-1">
                        <p className="text-xs text-base-content/50 font-medium">เพิ่มใบกำกับภาษี/ใบส่งของ</p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="เลขที่ใบกำกับฯ"
                            className="input input-bordered input-sm flex-1 min-w-30"
                            value={invNum}
                            onChange={(e) => setInvNum(e.target.value)}
                          />
                          <input
                            type="date"
                            className="input input-bordered input-sm w-40"
                            value={invDate}
                            onChange={(e) => setInvDate(e.target.value)}
                          />
                          <input
                            type="number"
                            placeholder="ยอดเงิน"
                            className="input input-bordered input-sm w-28"
                            min="0"
                            step="0.01"
                            value={invAmount}
                            onChange={(e) => setInvAmount(e.target.value)}
                          />
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={addingInv}
                            onClick={handleAddInvoice}
                          >
                            {addingInv ? <span className="loading loading-spinner loading-xs" /> : "+ เพิ่ม"}
                          </button>
                        </div>
                        {invError && <p className="text-error text-xs">{invError}</p>}
                      </div>
                    )}

                    {/* Generate billing button */}
                    {po.status === "accepted" && po.taxInvoices.length > 0 && (
                      <button
                        className="btn btn-success w-full mt-1"
                        onClick={() => setShowBillingConfirm(true)}
                      >
                        สร้างใบวางบิล
                      </button>
                    )}

                    {/* Print billing note button */}
                    {po.status === "billed" && (
                      <button className="btn btn-outline btn-sm gap-1" onClick={() => { setShowBillingNote(true); setTimeout(handlePrintBilling, 100); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        พิมพ์ใบวางบิล
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showBillingConfirm && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">ยืนยันการสร้างใบวางบิล</h3>
            <p className="py-3 text-sm">
              จะสร้างใบวางบิลจากใบกำกับภาษี/ใบส่งของ <strong>{po.taxInvoices.length} ใบ</strong> ยอดรวม <strong>{fmt(grand)} บาท</strong>
              <br />หลังจากนี้จะไม่สามารถแก้ไขรายการใบกำกับภาษีได้
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowBillingConfirm(false)}>ยกเลิก</button>
              <button className="btn btn-success" disabled={actionLoading} onClick={handleGenerateBilling}>
                {actionLoading && <span className="loading loading-spinner loading-sm" />}
                ยืนยัน
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setShowBillingConfirm(false)}>close</button></form>
        </dialog>
      )}
    </>
  );
}
