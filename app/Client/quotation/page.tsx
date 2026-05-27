"use client";
import { JSX, useCallback, useEffect, useRef, useState } from "react";
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
  { key: "sent",       label: "ส่งไฟล์แล้ว",        sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "reviewing",  label: "ตรวจสอบ / จัดทำราย", sublabel: "ทีมงานกำลังตรวจสอบเอกสาร" },
  { key: "completed",  label: "ดำเนินการเสร็จสิ้น",  sublabel: "ใบเสนอราคาพร้อมแล้ว" },
  { key: "bargaining", label: "พร้อมต่อรองราคา",     sublabel: "เอกสารพร้อมแล้ว กดเพื่อต่อรอง" },
];

const STATUS_ORDER: Record<QuotationStatus, number> = {
  sent: 0, reviewing: 1, completed: 2, bargaining: 3,
};

const STATUS_STYLE: Record<QuotationStatus, { spotlight: string; dot: string; bar: string; badge: string; label: string }> = {
  sent:       { spotlight: "border-success/25 bg-success/5",  dot: "bg-success", bar: "from-success to-success/30", badge: "badge-success", label: "ส่งแล้ว" },
  reviewing:  { spotlight: "border-warning/25 bg-warning/5",  dot: "bg-warning", bar: "from-warning to-warning/30", badge: "badge-warning", label: "กำลังดำเนินการ" },
  completed:  { spotlight: "border-primary/25 bg-primary/5",  dot: "bg-primary", bar: "from-primary to-primary/30", badge: "badge-primary", label: "เสร็จสิ้น" },
  bargaining: { spotlight: "border-accent/25  bg-accent/5",   dot: "bg-accent",  bar: "from-accent  to-accent/30",  badge: "badge-accent",  label: "พร้อมต่อรอง" },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconArrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V15.5A1.5 1.5 0 0 1 13.5 17h-9A1.5 1.5 0 0 1 3 15.5v-12Z" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
      <path d="M12 16V4m0 0-4 4m4-4 4 4" />
      <path d="M3 15v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

// ─── Quotation Card ───────────────────────────────────────────────────────────
function QuotationCard({ q }: { q: Quotation }) {
  const router = useRouter();
  const date = new Date(q.createdAt).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const currentStep  = STEPS.find((s) => s.key === q.status)!;
  const nextStep     = STEPS[STATUS_ORDER[q.status] + 1] ?? null;
  const isInProgress = q.status === "sent" || q.status === "reviewing";
  const { spotlight, dot, bar, badge, label } = STATUS_STYLE[q.status];

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${bar}`} />
      <div className="card-body gap-5 pt-5 px-6 md:px-8">

        {/* File header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center shrink-0 text-base-content/35">
              <IconDoc />
            </div>
            <div className="min-w-0">
              <p className="text-xs tracking-widest uppercase text-primary/60 font-medium mb-0.5">
                Quotation Request
              </p>
              <p className="font-semibold leading-snug truncate max-w-lg">{q.filename}</p>
              <p className="text-xs text-base-content/40 mt-0.5">{date}</p>
            </div>
          </div>
          <span className={`badge badge-sm shrink-0 ${badge}`}>{label}</span>
        </div>

        <div className="divider my-0" />

        {/* Two-column on wide screens */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Left: spotlight + hint / CTA */}
          <div className="flex-1 flex flex-col gap-4">
            <div className={`rounded-2xl border px-5 py-5 flex items-center gap-4 ${spotlight}`}>
              <span className={`w-3 h-3 rounded-full shrink-0 ${dot} ${isInProgress ? "animate-pulse" : ""}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{currentStep.label}</p>
                <p className="text-sm text-base-content/50 mt-0.5">{currentStep.sublabel}</p>
              </div>
              {isInProgress && <span className="loading loading-dots loading-sm opacity-30" />}
            </div>

            {nextStep && q.status !== "bargaining" && (
              <div className="flex items-center gap-3 text-xs text-base-content/30">
                <div className="flex-1 h-px bg-base-300" />
                <span>ขั้นถัดไป · {nextStep.label}</span>
                <div className="flex-1 h-px bg-base-300" />
              </div>
            )}
            {q.status === "bargaining" && (
              <button
                onClick={() => router.push("/Client/Bargain")}
                className="btn btn-accent w-full font-semibold gap-2 shadow-lg shadow-accent/20"
              >
                ไปยังหน้าต่อรองราคา
                <IconArrow />
              </button>
            )}
          </div>

          {/* Right: vertical steps timeline */}
          <div className="md:w-56 shrink-0 flex flex-col">
            {STEPS.map((step, i) => {
              const done    = i <= STATUS_ORDER[q.status];
              const current = i === STATUS_ORDER[q.status];
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                      ${done ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/30"}`}>
                      {done ? "✓" : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-px flex-1 my-1 ${done ? "bg-primary/40" : "bg-base-300"}`} />
                    )}
                  </div>
                  <div className="pb-4 pt-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight
                      ${current ? "text-base-content" : done ? "text-base-content/60" : "text-base-content/25"}`}>
                      {step.label}
                    </p>
                    {current && (
                      <p className="text-xs text-base-content/40 mt-0.5">{step.sublabel}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
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
    <div className={`alert ${styles[status as Exclude<UploadStatus, "idle">]} py-2.5 text-sm`}>
      {message}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page(): JSX.Element {
  const { data: session } = useSession();
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const previewRef      = useRef<HTMLDivElement>(null);
  const dropZoneRef     = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);

  const [view, setView]           = useState<View>("upload");
  const [initializing, setInitializing] = useState(true);
  const [visible, setVisible]     = useState(false);

  const switchView = useCallback((next: View) => {
    setVisible(false);
    setTimeout(() => { setView(next); setVisible(true); }, 220);
  }, []);

  const [isDragging, setIsDragging]       = useState(false);
  const [pdfFile, setPdfFile]             = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError]         = useState<string | null>(null);
  const [uploadStatus, setUploadStatus]   = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const [quotations, setQuotations]         = useState<Quotation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);

  const userId =
    (session?.user as any)?.id ??
    (session as any)?.id ??
    (session as any)?.sessionId ??
    "ไม่พบข้อมูล";

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setHistoryLoading(true);
    try {
      const res  = await fetch("/api/quotation");
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

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (view !== "history") return;
    const id = setInterval(() => fetchHistory(true), 5000);
    return () => clearInterval(id);
  }, [view, fetchHistory]);

  const handlePdfFile = (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf)                         { setFileError("รองรับเฉพาะไฟล์ PDF เท่านั้น"); return; }
    if (file.size > 10 * 1024 * 1024)  { setFileError("ไฟล์ต้องมีขนาดไม่เกิน 10MB");  return; }
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
    setPdfFile(null); setPdfPreviewUrl(null);
    setFileError(null); setUploadStatus("idle"); setUploadMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); };
  }, [pdfPreviewUrl]);

  useEffect(() => {
    if (!pdfPreviewUrl) return;
    const t = setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => clearTimeout(t);
  }, [pdfPreviewUrl]);

  useEffect(() => {
    if (!visible || view !== "upload" || hasAutoScrolled.current) return;
    hasAutoScrolled.current = true;
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 200);
    return () => clearTimeout(t);
  }, [visible, view]);

  const handleSend = async () => {
    if (!pdfFile) { setUploadStatus("error"); setUploadMessage("กรุณาเลือกไฟล์ PDF ก่อน"); return; }

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

    let pdfData: { pdfId?: string; pdfPath?: string } = {};
    try {
      const pdfFormData = new FormData();
      pdfFormData.append("file", pdfFile);
      const pdfRes = await fetch("/api/pdf", { method: "POST", body: pdfFormData });
      pdfData = pdfRes.ok ? await pdfRes.json() : {};

      setUploadMessage("กำลังส่งข้อมูลไปยัง n8n…");
      const storedFilename = (pdfData.pdfPath ?? pdfFile.name).replace(/^\/PDF\//, "");
      formData.append("filename", storedFilename);
      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`ส่ง n8n ไม่สำเร็จ (HTTP ${res.status})`);

      const saveRes  = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: pdfFile.name, pdfId: pdfData.pdfId ?? null, pdfPath: pdfData.pdfPath ?? null }),
      });
      const saveData = await saveRes.json();

      const optimistic: Quotation = saveData.quotation ?? {
        _id: `temp-${Date.now()}`, filename: pdfFile.name,
        status: "sent", createdAt: new Date().toISOString(),
        pdfId: null, pdfPath: null,
      };
      setQuotations([optimistic]);
      setUploadStatus("success");
      setUploadMessage("ส่งสำเร็จ!");
      resetPdf();
      switchView("history");
    } catch (err) {
      // ลบไฟล์และ PDF record ออกเพราะส่ง n8n ไม่สำเร็จ
      if (pdfData.pdfId) {
        try { await fetch(`/api/pdf?pdfId=${pdfData.pdfId}`, { method: "DELETE" }); } catch {}
      }
      setUploadStatus("error");
      setUploadMessage(`เกิดข้อผิดพลาด: ${(err as Error).message}`);
    }
  };

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (initializing) {
    return (
      <main className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-sm text-base-content/40">กำลังโหลด...</p>
        </div>
      </main>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-5 md:space-y-6">

        {/* ── Page Header ──────────────────────────────────────── */}
        <div>
          <p className="text-xs tracking-widest uppercase text-primary/60 font-medium mb-2">
            Quotation Request System
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {view === "upload" ? "ส่งเอกสารเพื่อขอใบเสนอราคา" : "สถานะการดำเนินการ"}
          </h1>
          <p className="text-sm md:text-base text-base-content/50 leading-relaxed mt-2 max-w-3xl">
            {view === "upload"
              ? "อัปโหลดเอกสารรายการสินค้า เช่น ใบสั่งซื้อ หรือ BOQ ระบบจะช่วยอ่านข้อมูลและแปลงเป็นรายการพร้อมใช้งาน"
              : "ติดตามสถานะเอกสารที่ส่งเข้ามาทั้งหมดของคุณ อัปเดตอัตโนมัติทุก 5 วินาที"}
          </p>
        </div>

{/* ── Animated container ───────────────────────────────── */}
        <div className={`transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>

          {/* ── Upload View ─────────────────────────────────────── */}
          {view === "upload" && (
            <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden min-h-[55vh] md:min-h-[calc(100vh-14rem)] flex flex-col">
              <div className="card-body gap-5 px-4 sm:px-6 md:px-8 flex flex-col flex-1">

                {/* Card header */}
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-base">อัปโหลดเอกสาร</p>
                  <span className="badge badge-outline badge-sm">PDF only</span>
                </div>

                {/* Drop zone or preview */}
                {!pdfPreviewUrl ? (
                  <div
                    ref={dropZoneRef}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`
                      flex flex-col items-center justify-center gap-3
                      flex-1 min-h-64 rounded-2xl border-2 border-dashed cursor-pointer
                      transition-all duration-200
                      ${isDragging
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : "border-base-300 hover:border-primary/50 hover:bg-base-200/60"
                      }
                    `}
                  >
                    <div className={`transition-colors ${isDragging ? "text-primary" : "text-base-content/25"}`}>
                      <IconUpload />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-medium text-sm">
                        <span className="hidden sm:inline">ลากไฟล์มาวาง หรือ </span>
                        <span className="text-primary underline underline-offset-2">
                          <span className="sm:hidden">แตะ</span>
                          <span className="hidden sm:inline">คลิก</span>เพื่ออัปโหลด
                        </span>
                      </p>
                      <p className="text-xs text-base-content/40">รองรับเฉพาะ PDF • ขนาดไม่เกิน 10 MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      hidden
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePdfFile(file); }}
                    />
                  </div>
                ) : (
                  <div ref={previewRef} className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-base-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="badge badge-neutral badge-sm shrink-0">PDF</span>
                        <span className="text-sm font-medium truncate">{pdfFile?.name}</span>
                        <span className="text-xs text-base-content/40 shrink-0">
                          {((pdfFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button onClick={resetPdf} className="btn btn-outline btn-sm w-full sm:w-auto">
                        เปลี่ยนไฟล์
                      </button>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-base-300 h-[55vh] sm:h-[75vh]">
                      <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />
                    </div>
                  </div>
                )}

                {fileError && (
                  <div className="alert alert-error py-2.5 text-sm">{fileError}</div>
                )}

                <div className="divider my-0" />

                {/* Footer: sender + send button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-base-content/45">ผู้ส่ง</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      <code className="text-xs bg-base-200 px-2 py-1 rounded font-mono truncate max-w-37.5 sm:max-w-none">{userId}</code>
                    </div>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!pdfFile || uploadStatus === "uploading"}
                    className="btn btn-primary gap-2 sm:w-auto w-full shadow-lg shadow-primary/20"
                  >
                    {uploadStatus === "uploading" ? (
                      <><span className="loading loading-spinner loading-sm" />กำลังส่งเอกสาร...</>
                    ) : (
                      <>ส่งเอกสารเพื่อออกใบเสนอราคา <IconArrow /></>
                    )}
                  </button>
                </div>

                <UploadBadge status={uploadStatus} message={uploadMessage} />

              </div>
            </div>
          )}

          {/* ── History View ─────────────────────────────────────── */}
          {view === "history" && (
            <div className="space-y-4">
              {historyLoading ? (
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body items-center py-20 gap-3">
                    <span className="loading loading-spinner loading-lg text-primary" />
                    <p className="text-sm text-base-content/40">กำลังโหลด...</p>
                  </div>
                </div>
              ) : quotations.length === 0 ? (
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body items-center text-center py-20 gap-2">
                    <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center text-base-content/25 mb-2">
                      <IconDoc />
                    </div>
                    <p className="font-semibold">ยังไม่มีการส่งเอกสาร</p>
                    <p className="text-sm text-base-content/45">
                      กลับไปที่แท็บ &ldquo;อัปโหลดเอกสาร&rdquo; เพื่อเริ่มต้น
                    </p>
                  </div>
                </div>
              ) : (
                quotations.map((q) => <QuotationCard key={q._id} q={q} />)
              )}

              {lastUpdated && (
                <p className="text-center text-xs text-base-content/30 pt-1">
                  อัปเดตอัตโนมัติทุก 5 วินาที · ล่าสุด {lastUpdated.toLocaleTimeString("th-TH")}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
