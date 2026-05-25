"use client";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────
type UploadStatus = "idle" | "uploading" | "success" | "error";
type QuotationStatus = "sent" | "reviewing" | "completed" | "bargaining";
type View = "upload" | "history";

interface Quotation {
  _id: string;
  filename: string;
  status: QuotationStatus;
  createdAt: string;
  pdfId:   string | null;
  pdfPath: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "http://localhost:5678/webhook-test/pdf-test";

const STEPS: { key: QuotationStatus; label: string; sublabel: string }[] = [
  { key: "sent",        label: "ส่งไฟล์แล้ว",        sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "reviewing",   label: "ตรวจสอบ / จัดทำราย", sublabel: "ทีมงานกำลังตรวจสอบเอกสาร" },
  { key: "completed",   label: "ดำเนินการเสร็จสิ้น",  sublabel: "ใบเสนอราคาพร้อมแล้ว" },
  { key: "bargaining",  label: "พร้อมต่อรองราคา",     sublabel: "เอกสารพร้อมแล้ว กดเพื่อต่อรอง" },
];

const STATUS_ORDER: Record<QuotationStatus, number> = {
  sent: 0,
  reviewing: 1,
  completed: 2,
  bargaining: 3,
};

// ─── Status Stepper ───────────────────────────────────────────────────────────
function StatusStepper({ status }: { status: QuotationStatus }) {
  const current = STATUS_ORDER[status];

  return (
    <ul className="steps steps-horizontal w-full text-xs">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li
            key={step.key}
            className={`step ${done ? "step-primary" : ""}`}
            data-content={done ? "✓" : String(i + 1)}
          >
            <span className={done ? "font-medium" : "text-base-content/40"}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Quotation Card ───────────────────────────────────────────────────────────
function QuotationCard({ q }: { q: Quotation }) {
  const router = useRouter();
  const date = new Date(q.createdAt).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-sm truncate max-w-70">
              {q.filename}
            </p>
            <p className="text-xs text-base-content/50 mt-0.5">{date}</p>
          </div>
          <StatusBadge status={q.status} />
        </div>
        <StatusStepper status={q.status} />
        {q.status === "bargaining" && (
          <button
            onClick={() => router.push("/Client/Bargain")}
            className="btn btn-accent w-full text-sm font-medium"
          >
            ไปยังหน้าต่อรองราคา →
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: QuotationStatus }) {
  const map: Record<QuotationStatus, { cls: string; label: string }> = {
    sent:       { cls: "badge-success", label: "ส่งแล้ว" },
    reviewing:  { cls: "badge-warning", label: "กำลังดำเนินการ" },
    completed:  { cls: "badge-primary", label: "เสร็จสิ้น" },
    bargaining: { cls: "badge-accent",  label: "พร้อมต่อรอง" },
  };
  const { cls, label } = map[status];
  return <span className={`badge ${cls} badge-sm`}>{label}</span>;
}

// ─── Upload Badge ─────────────────────────────────────────────────────────────
function UploadBadge({ status, message }: { status: UploadStatus; message: string }) {
  if (status === "idle") return null;
  const styles: Record<Exclude<UploadStatus, "idle">, string> = {
    uploading: "alert-info",
    success:   "alert-success",
    error:     "alert-error",
  };
  return (
    <div className={`alert ${styles[status as Exclude<UploadStatus, "idle">]} py-2 text-sm`}>
      {message}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page(): JSX.Element {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>("upload");
  const [initializing, setInitializing] = useState(true);
  const [visible, setVisible] = useState(false);

  const switchView = useCallback((next: View) => {
    setVisible(false);
    setTimeout(() => {
      setView(next);
      setVisible(true);
    }, 220);
  }, []);

  // upload state
  const [isDragging, setIsDragging]       = useState(false);
  const [pdfFile, setPdfFile]             = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError]         = useState<string | null>(null);
  const [uploadStatus, setUploadStatus]   = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  // history state
  const [quotations, setQuotations]   = useState<Quotation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const userId =
    (session?.user as any)?.id ??
    (session as any)?.id ??
    (session as any)?.sessionId ??
    "ไม่พบข้อมูล";

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── fetch history (also decides initial view) ──────────────────
  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setHistoryLoading(true);
    try {
      const res = await fetch("/api/quotation");
      const data = await res.json();
      const list: Quotation[] = data.quotations ?? [];
      setQuotations(list);
      setLastUpdated(new Date());
      if (list.length > 0) setView("history");
    } finally {
      if (!silent) setHistoryLoading(false);
      setInitializing(false);
      setVisible(true);
    }
  }, []);

  // initial load
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // auto-poll every 5 s while on history view
  useEffect(() => {
    if (view !== "history") return;
    const id = setInterval(() => fetchHistory(true), 5000);
    return () => clearInterval(id);
  }, [view, fetchHistory]);

  // ── PDF helpers ────────────────────────────────────────────────
  const handlePdfFile = (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf)             { setFileError("รองรับเฉพาะไฟล์ PDF เท่านั้น"); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError("ไฟล์ต้องมีขนาดไม่เกิน 10MB"); return; }

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
    return () => { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); };
  }, [pdfPreviewUrl]);

  // ── send to n8n + save to DB ────────────────────────────────────
  const handleSend = async () => {
    if (!pdfFile) {
      setUploadStatus("error");
      setUploadMessage("กรุณาเลือกไฟล์ PDF ก่อน");
      return;
    }

    const uid =
      (session as any)?.id ??
      (session as any)?.sessionId ??
      (session?.user as any)?.id ??
      "anonymous";

    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("userId", uid);

    setUploadStatus("uploading");
    setUploadMessage("กำลังบันทึกไฟล์…");

    try {
      // 1. save PDF to disk + MongoDB first to get the stored path
      const pdfFormData = new FormData();
      pdfFormData.append("file", pdfFile);
      const pdfRes = await fetch("/api/pdf", { method: "POST", body: pdfFormData });
      const pdfData = pdfRes.ok ? await pdfRes.json() : {};

      // 2. send to n8n with file + userId + stored filename/path
      setUploadMessage("กำลังส่งข้อมูลไปยัง n8n…");
      const storedFilename = (pdfData.pdfPath ?? pdfFile.name).replace(/^\/PDF\//, "");
      formData.append("filename", storedFilename);
      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      // 3. save quotation record with PDF reference
      const saveRes = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: pdfFile.name,
          pdfId:   pdfData.pdfId   ?? null,
          pdfPath: pdfData.pdfPath ?? null,
        }),
      });
      const saveData = await saveRes.json();

      // optimistic: show the card immediately without waiting for the next poll
      const optimistic: Quotation = saveData.quotation ?? {
        _id: `temp-${Date.now()}`,
        filename: pdfFile.name,
        status: "sent",
        createdAt: new Date().toISOString(),
      };
      setQuotations([optimistic]);
      setUploadStatus("success");
      setUploadMessage("ส่งสำเร็จ!");

      resetPdf();
      switchView("history");
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage(`เกิดข้อผิดพลาด: ${(err as Error).message}`);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (initializing) {
    return (
      <main className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base-200 px-4 md:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Header ───────────────────────────── */}
        <header className="space-y-3">
          <p className="text-xs tracking-widest uppercase text-primary/60 font-medium">
            Quotation Request System
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {view === "upload" ? "ส่งเอกสารเพื่อขอใบเสนอราคา" : "สถานะการดำเนินการ"}
          </h1>
          <p className="text-base text-base-content/60 leading-relaxed max-w-2xl">
            {view === "upload"
              ? "อัปโหลดเอกสารรายการสินค้า เช่น ใบสั่งซื้อ หรือ BOQ ระบบจะช่วยอ่านข้อมูลและแปลงเป็นรายการพร้อมใช้งาน"
              : "ติดตามสถานะเอกสารที่ส่งเข้ามาทั้งหมดของคุณ"}
          </p>
        </header>

        {/* ── View Toggle — only show tabs when user has no submission yet ── */}
        {quotations.length === 0 && !historyLoading && (
          <div className="tabs tabs-boxed w-fit">
            <button
              className={`tab ${view === "upload" ? "tab-active" : ""}`}
              onClick={() => switchView("upload")}
            >
              อัปโหลดเอกสาร
            </button>
            <button
              className={`tab ${view === "history" ? "tab-active" : ""}`}
              onClick={() => switchView("history")}
            >
              ประวัติการส่ง
            </button>
          </div>
        )}

        {/* ── Animated view container ─────────────── */}
        <div className={`transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>

        {/* ── Upload View ───────────────────────── */}
        {view === "upload" && (
          <>
            <section className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body space-y-6">

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-base-content/70">อัปโหลดเอกสาร</p>
                  <div className="badge badge-outline text-xs">PDF only</div>
                </div>

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
                      <p className="text-base font-medium">ลากไฟล์มาวาง หรือคลิกเพื่ออัปโหลด</p>
                      <p className="text-sm text-base-content/50">รองรับเฉพาะ PDF • ขนาดไม่เกิน 10 MB</p>
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
                    <div className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="badge badge-neutral">PDF</div>
                        <span className="text-sm truncate max-w-65">{pdfFile?.name}</span>
                        <span className="text-xs text-base-content/50">
                          {((pdfFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button onClick={resetPdf} className="btn btn-ghost btn-xs">เปลี่ยนไฟล์</button>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-base-300 h-130">
                      <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />
                    </div>
                  </div>
                )}

                {fileError && <div className="alert alert-error text-sm">{fileError}</div>}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-base-content/50">ผู้ส่ง</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <code className="text-xs bg-base-200 px-2 py-1 rounded">{userId}</code>
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={!pdfFile || uploadStatus === "uploading"}
                  className="btn btn-primary w-full text-base font-medium"
                >
                  {uploadStatus === "uploading" ? (
                    <><span className="loading loading-spinner loading-sm" />กำลังส่งเอกสาร...</>
                  ) : (
                    "ส่งเอกสารเพื่อออกใบเสนอราคา"
                  )}
                </button>

                <UploadBadge status={uploadStatus} message={uploadMessage} />
              </div>
            </section>

            <section className="grid md:grid-cols-3 gap-4">
              {[
                { title: "อัปโหลดเอกสาร",   desc: "แนบไฟล์รายการสินค้า หรือใบสั่งซื้อ" },
                { title: "ระบบประมวลผล",    desc: "AI อ่านและจัดโครงสร้างข้อมูลอัตโนมัติ" },
                { title: "ออกใบเสนอราคา",   desc: "ทีมงานนำข้อมูลไปจัดทำราคาได้ทันที" },
              ].map((s, i) => (
                <div key={i} className="card bg-base-100 border border-base-300 shadow-sm">
                  <div className="card-body space-y-2">
                    <div className="text-sm text-primary font-semibold">
                      STEP {String(i + 1).padStart(2, "0")}
                    </div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-base-content/60">{s.desc}</p>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {/* ── History View ──────────────────────── */}
        {view === "history" && (
          <section className="space-y-4">
            {historyLoading ? (
              <div className="flex justify-center py-16">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : quotations.length === 0 ? (
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body items-center text-center py-16 space-y-2">
                  <p className="font-medium">ยังไม่มีการส่งเอกสาร</p>
                  <p className="text-sm text-base-content/50">
                    กลับไปที่แท็บ "อัปโหลดเอกสาร" เพื่อเริ่มต้น
                  </p>
                </div>
              </div>
            ) : (
              quotations.map((q) => <QuotationCard key={q._id} q={q} />)
            )}

            <p className="text-center text-xs text-base-content/40">
              {lastUpdated
                ? `อัปเดตอัตโนมัติทุก 5 วินาที • ล่าสุด ${lastUpdated.toLocaleTimeString("th-TH")}`
                : "กำลังโหลด..."}
            </p>
          </section>
        )}

        </div>{/* end animated container */}

      </div>
    </main>
  );
}
