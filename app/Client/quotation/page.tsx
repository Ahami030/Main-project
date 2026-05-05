"use client";
import React, { JSX, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────────────────────
type UploadStatus = "idle" | "uploading" | "success" | "error";

// ─── Constants ───────────────────────────────────────────────────────────────
const API_QUOTATION_URL = "/api/quotation";

// ─── Sub-components ──────────────────────────────────────────────────────────

function UploadBadge({
  status,
  message,
}: {
  status: UploadStatus;
  message: string;
}) {
  if (status === "idle") return null;

  const styles: Record<Exclude<UploadStatus, "idle">, string> = {
    uploading: "alert-info",
    success: "alert-success",
    error: "alert-error",
  };

  return (
    <div
      className={`alert ${styles[status as Exclude<UploadStatus, "idle">]} py-2 text-sm animate-pulse`}
    >
      {message}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Page(): JSX.Element {
  const { data: session } = useSession();

  // ── PDF / drag-drop state ───────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // ── n8n upload state ────────────────────────────────────────────
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  // ── PDF helpers ─────────────────────────────────────────────────
  const handlePdfFile = (file: File) => {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFileError("รองรับเฉพาะไฟล์ PDF เท่านั้น");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
      return;
    }

    setFileError(null);
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);

    setPdfFile(file);
    setPdfPreviewUrl(URL.createObjectURL(file));
    setUploadStatus("idle");
    setUploadMessage("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePdfFile(file);
  };

  const resetPdf = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfFile(null);
    setPdfPreviewUrl(null);
    setFileError(null);
    setUploadStatus("idle");
    setUploadMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  // ── Upload quotation (to database, PDF folder, and n8n) ──────────────────────────
  const handleSendToN8n = async () => {
    if (!pdfFile) {
      setUploadStatus("error");
      setUploadMessage("กรุณาเลือกไฟล์ PDF ก่อน");
      return;
    }

    const formData = new FormData();
    formData.append("file", pdfFile);

    setUploadStatus("uploading");
    setUploadMessage("กำลังส่งข้อมูลและอัปโหลดไฟล์...");

    try {
      const res = await fetch(API_QUOTATION_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setUploadStatus("success");
      setUploadMessage(
        `✅ ส่งสำเร็จ! ไฟล์: ${json.filename} • UserID: ${json.userId}`
      );
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage(`❌ เกิดข้อผิดพลาด: ${(err as Error).message}`);
    }
  };

  // ── Derived ─────────────────────────
  const displayUserId =
    (session?.user as any)?.id ??
    (session as any)?.id ??
    (session as any)?.sessionId ??
    "ไม่พบข้อมูล";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
  <main className="min-h-screen bg-base-200 px-4 md:px-8 py-8">
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── Header ───────────────────────────── */}
      <header className="space-y-3">
        <p className="text-xs tracking-widest uppercase text-primary/60 font-medium">
          Quotation Request System
        </p>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          ส่งเอกสารเพื่อขอใบเสนอราคา
        </h1>

        <p className="text-base text-base-content/60 leading-relaxed max-w-2xl">
          อัปโหลดเอกสารรายการสินค้า เช่น ใบสั่งซื้อ หรือ BOQ ระบบจะช่วยอ่านข้อมูล
          และแปลงเป็นรายการพร้อมใช้งาน เพื่อให้ทีมสามารถจัดทำใบเสนอราคาได้รวดเร็วขึ้น
        </p>
      </header>

      {/* ── Upload Card ───────────────────────────── */}
      <section className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body space-y-6">

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-base-content/70">
              อัปโหลดเอกสาร
            </p>
            <div className="badge badge-outline text-xs">
              PDF only
            </div>
          </div>

          {/* Dropzone */}
          {!pdfPreviewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center gap-4
                h-64 rounded-2xl border-2 border-dashed cursor-pointer
                transition-all duration-200
                ${isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-base-300 hover:border-primary/40 hover:bg-base-200"
                }
              `}
            >
              <div className="text-center space-y-1">
                <p className="text-base font-medium">
                  ลากไฟล์มาวาง หรือคลิกเพื่ออัปโหลด
                </p>
                <p className="text-sm text-base-content/50">
                  รองรับเฉพาะ PDF • ขนาดไม่เกิน 10 MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfFile(file);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">

              {/* File info */}
              <div className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="badge badge-neutral">PDF</div>
                  <span className="text-sm truncate max-w-[260px]">
                    {pdfFile?.name}
                  </span>
                  <span className="text-xs text-base-content/50">
                    {((pdfFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>

                <button
                  onClick={resetPdf}
                  className="btn btn-ghost btn-xs"
                >
                  เปลี่ยนไฟล์
                </button>
              </div>

              {/* Preview */}
              <div className="rounded-xl overflow-hidden border border-base-300 h-[520px]">
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {fileError && (
            <div className="alert alert-error text-sm">
              {fileError}
            </div>
          )}

          {/* User */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-base-content/50">ผู้ส่ง</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <code className="text-xs bg-base-200 px-2 py-1 rounded">
                {displayUserId}
              </code>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSendToN8n}
            disabled={!pdfFile || uploadStatus === "uploading"}
            className="btn btn-primary w-full text-base font-medium"
          >
            {uploadStatus === "uploading" ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                กำลังส่งเอกสาร...
              </>
            ) : (
              "ส่งเอกสารเพื่อออกใบเสนอราคา"
            )}
          </button>

          <UploadBadge status={uploadStatus} message={uploadMessage} />

        </div>
      </section>

      {/* ── Steps ───────────────────────────── */}
      <section className="grid md:grid-cols-3 gap-4">

        {[
          {
            title: "อัปโหลดเอกสาร",
            desc: "แนบไฟล์รายการสินค้า หรือใบสั่งซื้อ",
          },
          {
            title: "ระบบประมวลผล",
            desc: "AI อ่านและจัดโครงสร้างข้อมูลอัตโนมัติ",
          },
          {
            title: "ออกใบเสนอราคา",
            desc: "ทีมงานนำข้อมูลไปจัดทำราคาได้ทันที",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="card bg-base-100 border border-base-300 shadow-sm"
          >
            <div className="card-body space-y-2">
              <div className="text-sm text-primary font-semibold">
                STEP {String(i + 1).padStart(2, "0")}
              </div>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-base-content/60">
                {s.desc}
              </p>
            </div>
          </div>
        ))}

      </section>

    </div>
  </main>
);
}