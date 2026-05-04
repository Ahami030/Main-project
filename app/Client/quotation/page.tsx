"use client";
import React, { JSX, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────────────────────
type UploadStatus = "idle" | "uploading" | "success" | "error";

// ─── Constants ───────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "http://localhost:5678/webhook-test/pdf-test";

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

  // ── n8n upload ──────────────────────────────────────────────────
  const handleSendToN8n = async () => {
    if (!pdfFile) {
      setUploadStatus("error");
      setUploadMessage("กรุณาเลือกไฟล์ PDF ก่อน");
      return;
    }

    const userId =
      (session as any)?.id ??
      (session as any)?.sessionId ??
      (session?.user as any)?.id ??
      "anonymous";

    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("userId", userId);

    setUploadStatus("uploading");
    setUploadMessage("กำลังส่งข้อมูลไปยัง n8n…");

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setUploadStatus("success");
      setUploadMessage(
        `✅ ส่งสำเร็จ! ตอบกลับจาก n8n: ${JSON.stringify(json)}`
      );
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage(`❌ เกิดข้อผิดพลาด: ${(err as Error).message}`);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────
  const userId =
    (session?.user as any)?.id ??
    (session as any)?.id ??
    (session as any)?.sessionId ??
    "ไม่พบข้อมูล";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-base-200 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ══════════════════════════════════════════════════════════
            CARD — PDF Upload + n8n Send
        ══════════════════════════════════════════════════════════ */}
        <section className="card bg-base-100 shadow-md">
          <div className="card-body space-y-4">
            <h2 className="text-xl font-semibold">📤 อัปโหลด PDF</h2>

            {!pdfPreviewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                  flex flex-col items-center justify-center gap-3
                  h-52 border-2 border-dashed rounded-xl cursor-pointer
                  transition-all duration-200 select-none
                  ${isDragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-base-300 bg-base-50 hover:border-primary/50 hover:bg-base-200"
                  }
                `}
              >
                <span className="text-5xl">📄</span>
                <div className="text-center">
                  <p className="font-medium text-sm">ลากวางไฟล์ PDF ที่นี่</p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    หรือคลิกเพื่อเลือกไฟล์ (ไม่เกิน 10MB)
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
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span>📄</span>
                    <span className="font-medium truncate max-w-xs">
                      {pdfFile?.name}
                    </span>
                    <span className="text-base-content/50 text-xs">
                      ({((pdfFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button onClick={resetPdf} className="btn btn-ghost btn-xs">
                    เปลี่ยนไฟล์
                  </button>
                </div>

                <div className="border border-base-300 rounded-xl overflow-hidden h-[500px]">
                  <iframe
                    src={pdfPreviewUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              </div>
            )}

            {fileError && (
              <div className="alert alert-error py-2 text-sm">{fileError}</div>
            )}

            {/* ── Send button + userId ─────────────────────────── */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleSendToN8n}
                disabled={!pdfFile || uploadStatus === "uploading"}
                className="btn btn-primary gap-2 sm:w-auto w-full"
              >
                {uploadStatus === "uploading" ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    กำลังส่ง…
                  </>
                ) : (
                  <>🚀 ส่งไปยัง n8n</>
                )}
              </button>

              {/* userId แสดงใต้ปุ่ม */}
              <div className="flex items-center gap-2 text-xs text-base-content/50">
                <span className="badge badge-outline badge-sm">userId</span>
                <code className="bg-base-200 px-2 py-1 rounded">{userId}</code>
              </div>
            </div>

            <UploadBadge status={uploadStatus} message={uploadMessage} />
          </div>
        </section>

      </div>
    </main>
  );
}