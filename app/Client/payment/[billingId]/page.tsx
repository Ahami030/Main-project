"use client";

import { useState, useRef, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BankInfoCard from "@/components/payment/BankInfoCard";

type SubmitStatus = "idle" | "uploading" | "success" | "error";

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
          const approved = proofs.filter((p) => p.status === "approved").length;
          if (!rejected) setInstallmentNumber(approved + 1);
        }
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, idParam]);

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
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (loadError || !info) {
    return (
      <div className="min-h-screen bg-base-200 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="alert alert-error">{loadError || "ไม่พบข้อมูล"}</div>
          <button className="btn btn-ghost mt-4" onClick={() => router.push("/Client")}>← กลับ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <button className="btn btn-ghost btn-sm mb-3" onClick={() => router.push("/Client")}>← กลับหน้าหลัก</button>
          <h1 className="text-2xl font-bold">
            {existingProof ? "ส่งหลักฐานการชำระเงินใหม่" : "ส่งหลักฐานการชำระเงิน"}
          </h1>
          <p className="text-base-content/60 mt-1">
            {info.billingId ? "ใบวางบิล" : "PO"}{" "}
            <span className="font-semibold text-primary">{info.displayNumber}</span>
            {" · "}PO: {info.poNumbers.join(", ") || "-"}
          </p>
        </div>

        {/* Rejection notice */}
        {existingProof && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            <div>
              <p className="font-semibold">หลักฐานถูกปฏิเสธ</p>
              <p className="text-sm">{existingProof.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Billing summary */}
        {info.totalAmount > 0 && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/60">ยอดตามใบวางบิลรวม</span>
                <span className="text-xl font-bold text-primary">
                  {info.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                </span>
              </div>
              {installmentNumber > 1 && (
                <p className="text-xs text-base-content/50 text-right">ชำระครั้งที่ {installmentNumber}</p>
              )}
            </div>
          </div>
        )}

        {/* Bank info */}
        <BankInfoCard />

        {/* Form */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">รายละเอียดการชำระเงิน</h2>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">จำนวนเงินที่โอน (บาท) *</span></label>
              <input type="number" className="input input-bordered" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)} min={0} step={0.01} />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">วันที่โอนเงิน *</span></label>
              <input type="date" className="input input-bordered" value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)} />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">วิธีการชำระเงิน</span></label>
              <select className="select select-bordered" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="bank_transfer">โอนเงินผ่านธนาคาร</option>
                <option value="cash">เงินสด</option>
                <option value="cheque">เช็ค</option>
              </select>
            </div>

            {paymentMethod === "bank_transfer" && (
              <>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">ธนาคารต้นทาง</span></label>
                  <input type="text" className="input input-bordered" placeholder="เช่น กสิกรไทย, กรุงเทพ"
                    value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">ชื่อบัญชีผู้โอน</span></label>
                  <input type="text" className="input input-bordered" placeholder="ชื่อ-นามสกุล ผู้โอน"
                    value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">เลขอ้างอิงธนาคาร</span></label>
                  <input type="text" className="input input-bordered" placeholder="Transaction reference number"
                    value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
                </div>
              </>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">ชำระครั้งที่</span>
                <span className="label-text-alt text-base-content/50">สำหรับการชำระแบบแบ่งงวด</span>
              </label>
              <input type="number" className="input input-bordered" min={1} value={installmentNumber}
                onChange={(e) => setInstallmentNumber(parseInt(e.target.value) || 1)} />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">หมายเหตุ (ถ้ามี)</span></label>
              <textarea className="textarea textarea-bordered" rows={2} placeholder="ข้อความเพิ่มเติม..."
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {/* File upload */}
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">สลิปการโอนเงิน *</span></label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  file ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"
                }`}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" className="hidden" accept="image/*,application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-semibold text-primary text-sm">{file.name}</p>
                    <p className="text-xs text-base-content/50">คลิกเพื่อเปลี่ยนไฟล์</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-base-content/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                    <p className="text-xs">รูปภาพหรือ PDF ขนาดไม่เกิน 20MB</p>
                  </div>
                )}
              </div>
              {fileError && <p className="text-error text-sm mt-1">{fileError}</p>}
            </div>

            {previewUrl && file && (
              <div className="rounded-lg overflow-hidden border border-base-300">
                {file.type === "application/pdf"
                  ? <iframe src={previewUrl} className="w-full h-56" title="preview" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={previewUrl} alt="preview" className="w-full max-h-56 object-contain bg-base-200" />
                }
              </div>
            )}

            {status === "success" && <div className="alert alert-success"><span>ส่งหลักฐานสำเร็จ! กำลังกลับหน้าหลัก...</span></div>}
            {status === "error"   && <div className="alert alert-error"><span>{errorMsg}</span></div>}

            <div className="flex gap-3 justify-end pt-2">
              <button className="btn btn-ghost" onClick={() => router.push("/Client")}>ยกเลิก</button>
              <button
                className="btn btn-primary"
                disabled={!file || status === "uploading" || status === "success"}
                onClick={handleSubmit}
              >
                {status === "uploading" && <span className="loading loading-spinner loading-sm" />}
                {status === "uploading" ? "กำลังส่ง..." : existingProof ? "ส่งหลักฐานใหม่" : "ส่งหลักฐาน"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
