"use client";

import { useState, useRef, useEffect, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BankInfoCard from "@/components/payment/BankInfoCard";

type SubmitStatus = "idle" | "uploading" | "success" | "error";

const THAI_BANKS = [
  "กรุงเทพ (BBL)",
  "กสิกรไทย (KBank)",
  "กรุงไทย (KTB)",
  "ไทยพาณิชย์ (SCB)",
  "กรุงศรีอยุธยา (BAY)",
  "ทหารไทยธนชาต (TTB)",
  "ออมสิน (GSB)",
  "ธ.ก.ส. (BAAC)",
  "อาคารสงเคราะห์ (GHB)",
  "ซีไอเอ็มบี ไทย (CIMB)",
  "ทิสโก้ (TISCO)",
  "เกียรตินาคินภัทร (KKP)",
  "แลนด์ แอนด์ เฮ้าส์ (LH Bank)",
  "ยูโอบี (UOB)",
  "สแตนดาร์ดชาร์เตอร์ด (SCB-SC)",
  "อิสลามแห่งประเทศไทย (ISBT)",
];

// Info resolved from either a Billing document or a PO document
interface ResolvedInfo {
  displayNumber: string;  // billing number or PO number
  poNumbers: string[];
  totalAmount: number;
  customerName: string;
  // which path
  billingId: string | null;
  poId: string | null;
}

interface ExistingProof {
  _id: string;
  status: string;
  rejectionReason: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankName: string;
  accountName: string;
  referenceNumber: string;
  note: string;
  installmentNumber: number;
}

export default function PaymentSubmitPage({ params }: { params: Promise<{ billingId: string }> }) {
  const { billingId: idParam } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [info, setInfo]             = useState<ResolvedInfo | null>(null);
  const [existingProof, setExistingProof] = useState<ExistingProof | null>(null);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState("");

  const [file, setFile]             = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError]   = useState("");
  const inputRef                    = useRef<HTMLInputElement>(null);

  const [amount, setAmount]               = useState("");
  const [paymentDate, setPaymentDate]     = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [bankName, setBankName]           = useState("");
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const bankRef = useRef<HTMLDivElement>(null);
  const [accountName, setAccountName]     = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote]                   = useState("");
  const [installmentNumber, setInstallmentNumber] = useState(1);

  const [status, setStatus]   = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        // Try billing first, then PO (legacy path)
        let resolved: ResolvedInfo | null = null;
        let proofQueryParam = "";

        const bRes = await fetch(`/api/billing/${idParam}`);
        if (bRes.ok) {
          const b = await bRes.json();
          resolved = {
            displayNumber: b.billingNumber,
            poNumbers:     b.poNumbers ?? [],
            totalAmount:   (b.taxInvoices ?? []).reduce((s: number, inv: { amount: number }) => s + inv.amount, 0),
            customerName:  b.customerName,
            billingId:     idParam,
            poId:          null,
          };
          proofQueryParam = `billingId=${idParam}`;
        } else {
          const pRes = await fetch(`/api/po/${idParam}`);
          if (pRes.ok) {
            const po = await pRes.json();
            if (po.status !== "billed") {
              setLoadError("PO ยังไม่ได้วางบิล");
              setLoading(false);
              return;
            }
            resolved = {
              displayNumber: po.poNumber,
              poNumbers:     [po.poNumber],
              totalAmount:   (po.taxInvoices ?? []).reduce((s: number, inv: { amount: number }) => s + inv.amount, 0),
              customerName:  po.userName,
              billingId:     null,
              poId:          idParam,
            };
            proofQueryParam = `poId=${idParam}`;
          } else {
            setLoadError("ไม่พบใบวางบิลหรือ PO");
            setLoading(false);
            return;
          }
        }

        setInfo(resolved);

        // Fetch existing proofs
        const pRes = await fetch(`/api/payment-proof?${proofQueryParam}`);
        if (pRes.ok) {
          const proofs: ExistingProof[] = await pRes.json();
          const rejected = proofs.find((p) => p.status === "rejected");
          if (rejected) {
            setExistingProof(rejected);
            setAmount(String(rejected.amount));
            setPaymentDate(rejected.paymentDate);
            setPaymentMethod(rejected.paymentMethod);
            setBankName(rejected.bankName);
            setAccountName(rejected.accountName);
            setReferenceNumber(rejected.referenceNumber);
            setNote(rejected.note);
            setInstallmentNumber(rejected.installmentNumber ?? 1);
          }
          const approvedProofs = proofs.filter((p) => p.status === "approved");
          const paidTotal = approvedProofs.reduce((s, p) => s + p.amount, 0);
          setTotalPaidAmount(paidTotal);
          if (!rejected) setInstallmentNumber(approvedProofs.length + 1);
        }
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, idParam]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) {
        setBankDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const filteredBanks = THAI_BANKS.filter((b) =>
    b.toLowerCase().includes(bankName.toLowerCase())
  );

  const selectBank = useCallback((name: string) => {
    setBankName(name);
    setBankDropdownOpen(false);
  }, []);

  const handleFile = (f: File) => {
    setFileError("");
    if (f.size > 20 * 1024 * 1024) { setFileError("ไฟล์ต้องมีขนาดไม่เกิน 20MB"); return; }
    setFile(f);
    if (f.type.startsWith("image/") || f.type === "application/pdf") {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) { setFileError("กรุณาแนบสลิปการโอนเงิน"); return; }
    if (!amount || parseFloat(amount) <= 0) { setErrorMsg("กรุณาระบุจำนวนเงิน"); return; }
    if (!info) return;
    setStatus("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/payment-proof/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).message ?? "Upload failed");
      const { filePath, originalName, mimeType } = await uploadRes.json();

      const payload = {
        billingId:         info.billingId ?? undefined,
        poId:              info.poId ?? undefined,
        amount:            parseFloat(amount),
        paymentDate,
        paymentMethod,
        bankName,
        accountName,
        referenceNumber,
        note,
        filePath,
        fileOrigName:      originalName,
        fileMimeType:      mimeType,
        installmentNumber,
      };

      if (existingProof) {
        const res = await fetch(`/api/payment-proof/${existingProof._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resubmit", ...payload }),
        });
        if (!res.ok) throw new Error((await res.json()).message ?? "Failed");
      } else {
        const res = await fetch("/api/payment-proof", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).message ?? "Failed");
      }

      setStatus("success");
      setTimeout(() => router.push("/Client"), 1500);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-base-content/50">
          <span className="loading loading-spinner loading-lg" />
          <p className="text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (loadError || !info) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="card bg-base-100 shadow-sm max-w-sm w-full">
          <div className="card-body items-center text-center gap-3">
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-error">{loadError || "ไม่พบข้อมูล"}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/Client")}>← กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, info.totalAmount - totalPaidAmount);

  return (
    <div className="min-h-screen bg-base-200">

      {/* Sticky top nav */}
      <div className="bg-base-100 border-b border-base-300 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button className="btn btn-ghost btn-sm btn-circle" onClick={() => router.push("/Client")}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">
              {existingProof ? "ส่งหลักฐานใหม่" : "ส่งหลักฐานการชำระเงิน"}
            </p>
            <p className="text-xs text-base-content/50 truncate">
              {info.billingId ? "ใบวางบิล" : "PO"} {info.displayNumber}
            </p>
          </div>
          {installmentNumber > 1 && (
            <div className="badge badge-neutral badge-outline badge-sm shrink-0">งวดที่ {installmentNumber}</div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Rejection notice */}
        {existingProof && (
          <div className="alert alert-error shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            <div>
              <p className="font-semibold">หลักฐานถูกปฏิเสธ</p>
              <p className="text-sm opacity-80">{existingProof.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Billing summary */}
        {info.totalAmount > 0 && (
          <div className="card bg-base-100 shadow-sm overflow-hidden">
            <div className="h-1 bg-primary w-full" />
            <div className="card-body p-4 gap-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-base-content/60">ยอดตามใบวางบิลรวม</span>
                <span className="font-medium tabular-nums">{info.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</span>
              </div>
              {totalPaidAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-base-content/60">จ่ายไปแล้ว ({installmentNumber - 1} งวด)</span>
                  <span className="font-medium text-success tabular-nums">−{totalPaidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</span>
                </div>
              )}
              {totalPaidAmount > 0 && (
                <>
                  <div className="divider my-0" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">ยอดคงเหลือที่ต้องชำระ</span>
                    <span className={`text-xl font-bold tabular-nums ${remaining === 0 ? "text-success" : "text-warning"}`}>
                      {remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bank info */}
        <BankInfoCard />

        {/* ── Form card ── */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-5 gap-0">

            {/* ① ยอดและวันที่ */}
            <div className="pb-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">รายละเอียดการชำระ</p>
              </div>
              <div className="space-y-4">
                {/* Amount — full width, prominent */}
                <div className="form-control">
                  <label className="label pb-1.5">
                    <span className="label-text font-medium">จำนวนเงินที่โอน</span>
                    <span className="label-text-alt text-error font-semibold">* จำเป็น</span>
                  </label>
                  <label className="input input-bordered flex items-center gap-2 text-lg font-semibold focus-within:input-primary">
                    <input
                      type="number"
                      className="grow tabular-nums"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={0}
                      step={0.01}
                    />
                    <span className="badge badge-ghost badge-sm font-medium shrink-0">THB</span>
                  </label>
                </div>

                {/* Date + Installment — equal columns */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label pb-1.5">
                      <span className="label-text font-medium">วันที่โอนเงิน</span>
                      <span className="label-text-alt text-error font-semibold">*</span>
                    </label>
                    <input type="date" className="input input-bordered w-full" value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                  <div className="form-control">
                    <label className="label pb-1.5">
                      <span className="label-text font-medium">งวดที่ชำระ</span>
                    </label>
                    <label className="input input-bordered flex items-center gap-2">
                      <span className="text-base-content/40 text-xs shrink-0">ครั้งที่</span>
                      <input
                        type="number"
                        className="grow text-center font-semibold tabular-nums"
                        min={1}
                        value={installmentNumber}
                        onChange={(e) => setInstallmentNumber(parseInt(e.target.value) || 1)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="divider my-0" />

            {/* ② วิธีชำระ + ข้อมูลธนาคาร */}
            <div className="py-5">
              <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-4">วิธีการชำระเงิน</p>
              <div className="space-y-4">
                <div className="form-control">
                  <select className="select select-bordered" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="bank_transfer">🏦  โอนเงินผ่านธนาคาร</option>
                    <option value="cash">💵  เงินสด</option>
                    <option value="cheque">📄  เช็ค</option>
                  </select>
                </div>

                {paymentMethod === "bank_transfer" && (
                  <div className="bg-base-200/50 rounded-xl p-4 space-y-4">
                    <div className="form-control">
                      <label className="label pb-1.5"><span className="label-text font-medium">ธนาคารต้นทาง</span></label>
                      <div className="relative" ref={bankRef}>
                        <input
                          type="text"
                          className="input input-bordered w-full pr-10 bg-base-100"
                          placeholder="พิมพ์เพื่อค้นหาธนาคาร..."
                          value={bankName}
                          onChange={(e) => { setBankName(e.target.value); setBankDropdownOpen(true); }}
                          onFocus={() => setBankDropdownOpen(true)}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                          onClick={() => setBankDropdownOpen((v) => !v)}
                          tabIndex={-1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${bankDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {bankDropdownOpen && (
                          <ul className="absolute z-50 w-full bg-base-100 border border-base-300 shadow-lg rounded-box mt-1 max-h-52 overflow-y-auto">
                            {filteredBanks.length > 0 ? filteredBanks.map((bank) => (
                              <li key={bank}>
                                <button
                                  type="button"
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-base-200 transition-colors ${bankName === bank ? "bg-primary/10 text-primary font-medium" : ""}`}
                                  onMouseDown={(e) => { e.preventDefault(); selectBank(bank); }}
                                >
                                  {bank}
                                </button>
                              </li>
                            )) : (
                              <li className="px-4 py-3 text-sm text-base-content/40 text-center">ไม่พบธนาคารที่ค้นหา</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label pb-1.5"><span className="label-text font-medium">ชื่อบัญชีผู้โอน</span></label>
                        <input type="text" className="input input-bordered bg-base-100" placeholder="ชื่อ-นามสกุล ผู้โอน"
                          value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                      </div>
                      <div className="form-control">
                        <label className="label pb-1.5"><span className="label-text font-medium">เลขอ้างอิงธนาคาร</span></label>
                        <input type="text" className="input input-bordered bg-base-100 font-mono" placeholder="เช่น 202406021234567"
                          value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="divider my-0" />

            {/* ③ สลิป */}
            <div className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">แนบสลิปการโอนเงิน</p>
                <span className="badge badge-error badge-sm font-semibold">จำเป็น</span>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150 ${
                  file ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50 hover:bg-base-200/40"
                }`}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" className="hidden" accept="image/*,application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {previewUrl && file ? (
                  <div className="relative">
                    {file.type === "application/pdf"
                      ? <iframe src={previewUrl} className="w-full h-64 rounded-xl" title="preview" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={previewUrl} alt="preview" className="w-full max-h-64 object-contain rounded-xl bg-base-200" />
                    }
                    <span className="absolute bottom-2 right-2 badge badge-primary badge-sm shadow">คลิกเพื่อเปลี่ยน</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-base-content/40">
                    <div className="w-11 h-11 bg-base-300/60 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-base-content/60">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
                    <p className="text-xs">รูปภาพหรือ PDF · ไม่เกิน 20 MB</p>
                  </div>
                )}
              </div>

              {fileError && (
                <p className="text-error text-xs flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {fileError}
                </p>
              )}
            </div>

            <div className="divider my-0 mt-5" />

            {/* ④ หมายเหตุ */}
            <div className="py-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-base-300/60 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">หมายเหตุ</p>
                <span className="badge badge-ghost badge-sm text-base-content/40">ถ้ามี</span>
              </div>
              <textarea
                className="textarea textarea-bordered resize-none w-full"
                rows={3}
                placeholder="ข้อความเพิ่มเติม เช่น ชำระบางส่วน, รายละเอียดการโอน..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* ④ Alerts + Submit */}
            <div className="pt-5 space-y-3 border-t border-base-200 mt-5">
              {status === "success" && (
                <div className="alert alert-success">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>ส่งหลักฐานสำเร็จ! กำลังกลับหน้าหลัก...</span>
                </div>
              )}
              {status === "error" && (
                <div className="alert alert-error">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button className="btn btn-ghost" onClick={() => router.push("/Client")}>ยกเลิก</button>
                <button
                  className="btn btn-primary gap-2"
                  disabled={!file || status === "uploading" || status === "success"}
                  onClick={handleSubmit}
                >
                  {status === "uploading" ? (
                    <><span className="loading loading-spinner loading-sm" />กำลังส่ง...</>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {existingProof ? "ส่งหลักฐานใหม่" : "ส่งหลักฐาน"}
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        <div className="pb-6" />

      </div>
    </div>
  );
}
