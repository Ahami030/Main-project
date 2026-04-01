"use client";
import React, { JSX, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Quote = {
  id: string;
  author: string;
  text: string;
  tag: string;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

// ─── Constants ───────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "http://localhost:5678/webhook-test/pdf-test";

const TAG_OPTIONS = [
  { value: "inspiration", label: "✨ Inspiration" },
  { value: "humor", label: "😄 Humor" },
  { value: "life", label: "🌿 Life" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? (crypto as Crypto & { randomUUID: () => string }).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Animated status badge shown after n8n upload */
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

  // ── Quote state ─────────────────────────────────────────────────
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [tag, setTag] = useState("inspiration");
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const addQuote = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const q: Quote = {
      id: newId(),
      author: author.trim() || "Anonymous",
      text: text.trim(),
      tag,
    };
    setQuotes((prev) => [q, ...prev]);
    setAuthor("");
    setText("");
    setTag("inspiration");
  };

  const removeQuote = (id: string) =>
    setQuotes((prev) => prev.filter((q) => q.id !== id));

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
    // Reset any previous upload result when a new file is picked
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
  /**
   * ส่ง PDF + userId ไปยัง n8n webhook
   * - userId มาจาก session (NextAuth) โดยอัตโนมัติ
   * - รองรับ NextAuth adapter หลายแบบ (id / sessionId / user.id)
   */
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
            CARD 1 — Header + User info
        ══════════════════════════════════════════════════════════ */}
        <section className="card bg-base-100 shadow-md">
          <div className="card-body flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">📄 Quotation</h1>
              <p className="text-sm text-base-content/60 mt-1">
                อัปโหลด PDF และสร้าง Quote — Tailwind + DaisyUI
              </p>
            </div>

            {/* User badge */}
            <div className="flex items-center gap-3 bg-base-200 rounded-xl px-4 py-3">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-10">
                  <span className="text-lg">
                    {session?.user?.email?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">
                  {session?.user?.email ?? "ไม่ได้ล็อกอิน"}
                </p>
                <p className="text-xs text-base-content/50 mt-0.5">
                  ID: {userId}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            CARD 2 — PDF Upload + n8n Send
        ══════════════════════════════════════════════════════════ */}
        <section className="card bg-base-100 shadow-md">
          <div className="card-body space-y-4">
            <h2 className="text-xl font-semibold">📤 อัปโหลด PDF</h2>

            {!pdfPreviewUrl ? (
              /* ── Drop Zone ──────────────────────────────────── */
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
              /* ── PDF Preview ────────────────────────────────── */
              <div className="space-y-3">
                {/* File info bar */}
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

                {/* iFrame preview */}
                <div className="border border-base-300 rounded-xl overflow-hidden h-[500px]">
                  <iframe
                    src={pdfPreviewUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              </div>
            )}

            {/* File error */}
            {fileError && (
              <div className="alert alert-error py-2 text-sm">{fileError}</div>
            )}

            {/* ── Send to n8n button + status ─────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
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
                  <>
                    🚀 ส่งไปยัง n8n
                  </>
                )}
              </button>

              {/* User ID display (readonly) */}
              <div className="flex items-center gap-2 text-xs text-base-content/50">
                <span className="badge badge-outline badge-sm">userId</span>
                <code className="bg-base-200 px-2 py-1 rounded">{userId}</code>
              </div>
            </div>

            {/* Upload status badge */}
            <UploadBadge status={uploadStatus} message={uploadMessage} />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            CARD 3 — Create Quote
        ══════════════════════════════════════════════════════════ */}
        <section className="card bg-base-100 shadow-md">
          <div className="card-body space-y-4">
            <h2 className="text-xl font-semibold">💬 สร้าง Quote</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="ชื่อผู้พูด (ถ้าไม่กรอก = Anonymous)"
                className="input input-bordered w-full"
              />
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="select select-bordered w-full"
              >
                {TAG_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Ctrl/Cmd + Enter to submit
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") addQuote();
              }}
              placeholder="พิมพ์ข้อความ quote… (Ctrl+Enter เพื่อบันทึก)"
              className="textarea textarea-bordered w-full h-28"
            />

            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/50">
                {quotes.length} quote{quotes.length !== 1 ? "s" : ""} saved
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAuthor(""); setText(""); setTag("inspiration"); }}
                  className="btn btn-ghost btn-sm"
                >
                  ล้าง
                </button>
                <button
                  type="button"
                  onClick={() => addQuote()}
                  disabled={!text.trim()}
                  className="btn btn-primary btn-sm"
                >
                  + เพิ่ม Quote
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION — Quote List
        ══════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          {quotes.length === 0 ? (
            <div className="alert shadow-sm">
              <span>ยังไม่มี quote — เพิ่มด้านบนได้เลย</span>
            </div>
          ) : (
            quotes.map((q) => (
              <article
                key={q.id}
                className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow"
              >
                <div className="card-body py-4 gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{q.author}</span>
                      <span className="badge badge-outline badge-sm">{q.tag}</span>
                    </div>
                    <button
                      onClick={() => removeQuote(q.id)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      ลบ
                    </button>
                  </div>
                  <p className="text-base-content/80 italic">"{q.text}"</p>
                </div>
              </article>
            ))
          )}
        </section>

      </div>
    </main>
  );
}