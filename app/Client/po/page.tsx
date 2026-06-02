"use client";
import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UploadStatus = "idle" | "uploading" | "success" | "error";
type POStatus = "pending" | "accepted" | "billed";
type View = "upload" | "history";

interface BillingInfo {
  _id: string;
  billingNumber: string;
  poNumbers: string[];
  status: string;
}

interface PO {
  _id: string;
  poNumber: string;
  status: POStatus;
  fileOrigName: string;
  fileMimeType: string;
  createdAt: string;
  billedAt?: string;
  billingId?: BillingInfo | null;  // populated from Billing collection
}

const STEPS: { key: POStatus; label: string; sublabel: string }[] = [
  { key: "pending",  label: "ส่งไฟล์แล้ว",      sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "accepted", label: "กำลังดำเนินการ",    sublabel: "admin รับเรื่องแล้ว กำลังจัดสินค้า" },
  { key: "billed",   label: "วางบิลแล้ว",        sublabel: "ออกใบวางบิลเรียบร้อยแล้ว" },
];

const STATUS_ORDER: Record<POStatus, number> = {
  pending: 0, accepted: 1, billed: 2,
};

const STATUS_STYLE: Record<POStatus, {
  spotlight: string; dot: string; bar: string; badge: string; label: string;
}> = {
  pending:  { spotlight: "border-warning/25 bg-warning/5",   dot: "bg-warning", bar: "from-warning to-warning/30",  badge: "badge-warning",  label: "รอตรวจสอบ" },
  accepted: { spotlight: "border-info/25 bg-info/5",         dot: "bg-info",    bar: "from-info to-info/30",         badge: "badge-info",     label: "กำลังดำเนินการ" },
  billed:   { spotlight: "border-success/40 bg-success/10",  dot: "bg-success", bar: "from-success to-success/40",  badge: "badge-success",  label: "วางบิลแล้ว" },
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

// ─── PO Card ─────────────────────────────────────────────────────────────────
function POCard({ po, onViewBilling }: { po: PO; onViewBilling?: () => void }) {
  const date = new Date(po.createdAt).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const currentStep  = STEPS.find((s) => s.key === po.status)!;
  const nextStep     = STEPS[STATUS_ORDER[po.status] + 1] ?? null;
  const isInProgress = po.status === "pending" || po.status === "accepted";
  const { spotlight, dot, bar, badge, label } = STATUS_STYLE[po.status];

  // Billing group info (populated from Billing collection)
  const billingGroup    = po.status === "billed" && po.billingId ? po.billingId : null;
  const otherPoNumbers  = billingGroup
    ? billingGroup.poNumbers.filter((pn) => pn !== po.poNumber)
    : [];
  const isBillingGroup  = Boolean(billingGroup);

  // Override sublabel for billed status based on billing type
  const billedSublabel = isBillingGroup
    ? `ใบวางบิล ${billingGroup!.billingNumber}${otherPoNumbers.length > 0 ? ` · รวมกับ ${otherPoNumbers.join(", ")}` : ""}`
    : "ออกใบวางบิลเรียบร้อยแล้ว";

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div className={`h-1 bg-linear-to-r ${bar}`} />
      <div className="card-body gap-5 pt-5 px-6 md:px-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center shrink-0 text-base-content/35">
              <IconDoc />
            </div>
            <div className="min-w-0">
              <p className="text-xs tracking-widest uppercase text-primary/60 font-medium mb-0.5">
                Purchase Order
              </p>
              <p className="font-semibold leading-snug">{po.poNumber}</p>
              <p className="text-xs text-base-content/40 mt-0.5 truncate max-w-xs">
                {po.fileOrigName} · {date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isBillingGroup && (
              <span className="badge badge-outline badge-xs text-base-content/40 font-mono hidden sm:inline-flex">
                {billingGroup!.billingNumber}
              </span>
            )}
            <span className={`badge badge-sm ${badge}`}>{label}</span>
          </div>
        </div>

        <div className="divider my-0" />

        {/* Two-column */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Left: spotlight + CTA */}
          <div className="flex-1 flex flex-col gap-4">
            <div
              onClick={po.status === "billed" ? onViewBilling : undefined}
              className={`rounded-2xl border px-5 py-5 flex items-center gap-4 ${spotlight} ${po.status === "billed" && onViewBilling ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
            >
              <span className={`w-3 h-3 rounded-full shrink-0 ${dot} ${isInProgress ? "animate-pulse" : ""}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{currentStep.label}</p>
                <p className="text-sm text-base-content/50 mt-0.5 truncate">
                  {po.status === "billed" ? billedSublabel : currentStep.sublabel}
                </p>
                {/* Billing group: show all PO numbers as badges */}
                {isBillingGroup && billingGroup!.poNumbers.length > 1 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {billingGroup!.poNumbers.map((pn) => (
                      <span
                        key={pn}
                        className={`badge badge-xs font-mono ${pn === po.poNumber ? "badge-success" : "badge-ghost"}`}
                      >
                        {pn}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {isInProgress && <span className="loading loading-dots loading-sm opacity-30" />}
              {po.status === "billed" && (
                <svg className="w-4 h-4 text-base-content/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>

            {nextStep && (
              <div className="flex items-center gap-3 text-xs text-base-content/30">
                <div className="flex-1 h-px bg-base-300" />
                <span>ขั้นถัดไป · {nextStep.label}</span>
                <div className="flex-1 h-px bg-base-300" />
              </div>
            )}
            {po.status === "billed" && (
              <button
                onClick={onViewBilling}
                className="btn btn-success w-full font-semibold gap-2 shadow-lg shadow-success/20"
              >
                {isBillingGroup ? `ดูใบวางบิล ${billingGroup!.billingNumber}` : "ดูใบวางบิล"}
                <IconArrow />
              </button>
            )}
          </div>

          {/* Right: vertical steps timeline */}
          <div className="md:w-52 shrink-0 flex flex-col">
            {STEPS.map((step, i) => {
              const done    = i <= STATUS_ORDER[po.status];
              const current = i === STATUS_ORDER[po.status];
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
                      <p className="text-xs text-base-content/40 mt-0.5">
                        {po.status === "billed" ? billedSublabel : step.sublabel}
                      </p>
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
export default function ClientPOPage(): JSX.Element {
  const { data: session } = useSession();
  const router            = useRouter();
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const previewRef        = useRef<HTMLDivElement>(null);
  const dropZoneRef       = useRef<HTMLDivElement>(null);
  const hasAutoScrolled   = useRef(false);

  const [view, setView]             = useState<View>("upload");
  const [initializing, setInitializing] = useState(true);
  const [visible, setVisible]       = useState(false);

  const switchView = useCallback((next: View) => {
    setVisible(false);
    setTimeout(() => { setView(next); setVisible(true); }, 220);
  }, []);

  const [isDragging, setIsDragging]     = useState(false);
  const [file, setFile]                 = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [fileError, setFileError]       = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const [orders, setOrders]             = useState<PO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setHistoryLoading(true);
    try {
      const res  = await fetch("/api/po");
      const data = await res.json();
      const list: PO[] = Array.isArray(data) ? data : [];
      setOrders(list);
      setLastUpdated(new Date());
      if (list.length > 0) setView("history");
    } finally {
      if (!silent) setHistoryLoading(false);
      setInitializing(false);
      setVisible(true);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (view !== "history") return;
    const id = setInterval(() => fetchOrders(true), 8000);
    return () => clearInterval(id);
  }, [view, fetchOrders]);

  const handleFile = (f: File) => {
    if (f.size > 20 * 1024 * 1024) { setFileError("ไฟล์ต้องมีขนาดไม่เกิน 20MB"); return; }
    setFileError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    const canPreview = f.type.startsWith("image/") || f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    setPreviewUrl(canPreview ? URL.createObjectURL(f) : null);
    setUploadStatus("idle");
    setUploadMessage("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const resetFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setPreviewUrl(null);
    setFileError(null); setUploadStatus("idle"); setUploadMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewUrl) return;
    const t = setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => clearTimeout(t);
  }, [previewUrl]);

  useEffect(() => {
    if (!visible || view !== "upload" || hasAutoScrolled.current) return;
    hasAutoScrolled.current = true;
    const t = setTimeout(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, 200);
    return () => clearTimeout(t);
  }, [visible, view]);

  const handleSend = async () => {
    if (!file) { setUploadStatus("error"); setUploadMessage("กรุณาเลือกไฟล์ก่อน"); return; }

    setUploadStatus("uploading");
    setUploadMessage("กำลังอัปโหลดไฟล์…");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/po/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "อัปโหลดไฟล์ไม่สำเร็จ");
      }
      const { filePath, originalName, mimeType } = await uploadRes.json();

      setUploadMessage("กำลังบันทึกข้อมูล…");
      const createRes = await fetch("/api/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, fileOrigName: originalName, fileMimeType: mimeType }),
      });
      if (!createRes.ok) throw new Error("สร้างใบสั่งซื้อไม่สำเร็จ");

      setUploadStatus("success");
      setUploadMessage("สร้างใบสั่งซื้อสำเร็จ!");
      resetFile();
      await fetchOrders();
      switchView("history");
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage(`เกิดข้อผิดพลาด: ${(err as Error).message}`);
    }
  };

  const isImage = !!(file?.type.startsWith("image/"));
  const isPdf   = !!(file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")));

  // ─── Loading screen ────────────────────────────────────────────────────────
  if (!session || initializing) {
    return (
      <main className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-sm text-base-content/40">กำลังโหลด...</p>
        </div>
      </main>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-5 md:space-y-6">

        {/* ── Page Header ──────────────────────────────────────── */}
        <div>
          <p className="text-xs tracking-widest uppercase text-primary/60 font-medium mb-2">
            Purchase Order System
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {view === "upload" ? "ส่งรายการสินค้าเพื่อสั่งซื้อ" : "สถานะใบสั่งซื้อ"}
          </h1>
          <p className="text-sm md:text-base text-base-content/50 leading-relaxed mt-2 max-w-3xl">
            {view === "upload"
              ? "อัปโหลดรายการสินค้าที่ต้องการสั่งซื้อ รองรับไฟล์ทุกประเภท เช่น PDF, รูปภาพ, Word, Excel"
              : "ติดตามสถานะใบสั่งซื้อของคุณ อัปเดตอัตโนมัติทุก 8 วินาที"}
          </p>

          {/* View toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => switchView("upload")}
              className={`btn btn-sm ${view === "upload" ? "btn-primary" : "btn-ghost"}`}
            >
              + สร้างใบสั่งซื้อ
            </button>
            {orders.length > 0 && (
              <button
                onClick={() => switchView("history")}
                className={`btn btn-sm ${view === "history" ? "btn-primary" : "btn-ghost"}`}
              >
                รายการทั้งหมด ({orders.length})
              </button>
            )}
          </div>
        </div>

        {/* ── Animated container ───────────────────────────────── */}
        <div className={`transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>

          {/* ── Upload View ──────────────────────────────────────── */}
          {view === "upload" && (
            <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden min-h-[55vh] md:min-h-[calc(100vh-18rem)] flex flex-col">
              <div className="card-body gap-5 px-4 sm:px-6 md:px-8 flex flex-col flex-1">

                {/* Card header */}
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-base">อัปโหลดรายการสินค้า</p>
                  <span className="badge badge-outline badge-sm">ทุกประเภทไฟล์</span>
                </div>

                {/* Drop zone or file info + preview */}
                {!file ? (
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
                      <p className="text-xs text-base-content/40">PDF, รูปภาพ, Word, Excel และอื่นๆ · ขนาดไม่เกิน 20 MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                  </div>
                ) : (
                  <div ref={previewRef} className="flex flex-col gap-3">
                    {/* File info bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-base-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="badge badge-neutral badge-sm shrink-0">
                          {file.name.split(".").pop()?.toUpperCase() ?? "FILE"}
                        </span>
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        <span className="text-xs text-base-content/40 shrink-0">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button onClick={resetFile} className="btn btn-outline btn-sm w-full sm:w-auto">
                        เปลี่ยนไฟล์
                      </button>
                    </div>

                    {/* Preview: PDF or Image only */}
                    {previewUrl && (
                      <div className="rounded-xl overflow-hidden border border-base-300 h-[55vh] sm:h-[70vh]">
                        {isPdf ? (
                          <iframe src={previewUrl} className="w-full h-full" title="PDF Preview" />
                        ) : isImage ? (
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-base-200" />
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {fileError && (
                  <div className="alert alert-error py-2.5 text-sm">{fileError}</div>
                )}

                <div className="divider my-0" />

                {/* Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-xs text-base-content/40">
                    ไฟล์จะถูกส่งให้ admin ตรวจสอบและดำเนินการจัดสินค้า
                  </p>
                  <button
                    onClick={handleSend}
                    disabled={!file || uploadStatus === "uploading"}
                    className="btn btn-primary gap-2 sm:w-auto w-full shadow-lg shadow-primary/20"
                  >
                    {uploadStatus === "uploading" ? (
                      <><span className="loading loading-spinner loading-sm" />กำลังส่ง...</>
                    ) : (
                      <>ส่งรายการสินค้า <IconArrow /></>
                    )}
                  </button>
                </div>

                <UploadBadge status={uploadStatus} message={uploadMessage} />

              </div>
            </div>
          )}

          {/* ── History View ──────────────────────────────────────── */}
          {view === "history" && (
            <div className="space-y-4">
              {historyLoading ? (
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body items-center py-20 gap-3">
                    <span className="loading loading-spinner loading-lg text-primary" />
                    <p className="text-sm text-base-content/40">กำลังโหลด...</p>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body items-center text-center py-20 gap-2">
                    <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center text-base-content/25 mb-2">
                      <IconDoc />
                    </div>
                    <p className="font-semibold">ยังไม่มีใบสั่งซื้อ</p>
                    <p className="text-sm text-base-content/45">
                      กดปุ่ม &ldquo;สร้างใบสั่งซื้อ&rdquo; ด้านบนเพื่อเริ่มต้น
                    </p>
                  </div>
                </div>
              ) : (
                orders.map((po) => (
                  <POCard
                    key={po._id}
                    po={po}
                    onViewBilling={po.status === "billed" ? () => router.push(`/Client/po/${po._id}`) : undefined}
                  />
                ))
              )}

              {lastUpdated && (
                <p className="text-center text-xs text-base-content/30 pt-1">
                  อัปเดตอัตโนมัติทุก 8 วินาที · ล่าสุด {lastUpdated.toLocaleTimeString("th-TH")}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
