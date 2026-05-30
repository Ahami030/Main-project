"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ChatNotificationBubble from "@/components/client/ChatNotificationBubble";
import QuotationDocument, { RFQData } from "@/components/QuotationDocument";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuotationStatus = "sent" | "reviewing" | "completed" | "bargaining" | "confirmed";

interface Quotation {
  _id: string;
  filename: string;
  status: QuotationStatus;
  createdAt: string;
  pdfId:   string | null;
  pdfPath: string | null;
}

type POStatus = "pending" | "accepted" | "billed";

interface POOrder {
  _id: string;
  poNumber: string;
  status: POStatus;
  fileOrigName: string;
  fileMimeType: string;
  createdAt: string;
  billedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS: { key: QuotationStatus; label: string; sublabel: string }[] = [
  { key: "sent",       label: "ส่งไฟล์แล้ว",        sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "reviewing",  label: "ตรวจสอบ / จัดทำราย", sublabel: "ทีมงานกำลังตรวจสอบเอกสาร" },
  { key: "completed",  label: "ดำเนินการเสร็จสิ้น",  sublabel: "ใบเสนอราคาพร้อมแล้ว" },
  { key: "bargaining", label: "พร้อมต่อรองราคา",     sublabel: "เอกสารพร้อมแล้ว กดเพื่อต่อรอง" },
  { key: "confirmed",  label: "ยืนยันแล้ว",          sublabel: "ลูกค้ายืนยันรับราคาเรียบร้อย" },
];

const STATUS_ORDER: Record<QuotationStatus, number> = {
  sent: 0, reviewing: 1, completed: 2, bargaining: 3, confirmed: 4,
};

const STATUS_META: Record<QuotationStatus, {
  spotlight: string; dot: string; bar: string; badge: string; label: string;
}> = {
  sent:       { spotlight: "border-success/25 bg-success/5",  dot: "bg-success", bar: "from-success to-success/30",   badge: "badge-success", label: "ส่งแล้ว" },
  reviewing:  { spotlight: "border-warning/25 bg-warning/5",  dot: "bg-warning", bar: "from-warning to-warning/30",   badge: "badge-warning", label: "กำลังดำเนินการ" },
  completed:  { spotlight: "border-primary/25 bg-primary/5",  dot: "bg-primary", bar: "from-primary to-primary/30",   badge: "badge-primary", label: "เสร็จสิ้น" },
  bargaining: { spotlight: "border-accent/25  bg-accent/5",   dot: "bg-accent",  bar: "from-accent  to-accent/30",    badge: "badge-accent",  label: "พร้อมต่อรอง" },
  confirmed:  { spotlight: "border-success/40 bg-success/10", dot: "bg-success", bar: "from-success to-success/40",   badge: "badge-success", label: "ยืนยันแล้ว" },
};

const PROCESS_STEPS = [
  { step: "01", title: "อัปโหลดเอกสาร",  desc: "แนบไฟล์ PDF รายการสินค้า ใบสั่งซื้อ หรือ BOQ" },
  { step: "02", title: "ระบบประมวลผล",   desc: "AI อ่านและจัดโครงสร้างข้อมูลอัตโนมัติ พร้อมส่งทีมงาน" },
  { step: "03", title: "ออกใบเสนอราคา",  desc: "ทีมงานจัดทำใบเสนอราคาตามรายการสินค้า" },
  { step: "04", title: "ต่อรองราคา",     desc: "พูดคุยและต่อรองราคากับทีมงานได้โดยตรง" },
];

const PO_STEPS: { key: POStatus; label: string; sublabel: string }[] = [
  { key: "pending",  label: "ส่งไฟล์แล้ว",   sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "accepted", label: "กำลังดำเนินการ", sublabel: "admin รับเรื่องแล้ว กำลังจัดสินค้า" },
  { key: "billed",   label: "วางบิลแล้ว",     sublabel: "ออกใบวางบิลเรียบร้อยแล้ว" },
];

const PO_STATUS_ORDER: Record<POStatus, number> = { pending: 0, accepted: 1, billed: 2 };

const PO_STATUS_META: Record<POStatus, { spotlight: string; dot: string; bar: string; badge: string; label: string }> = {
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page(): JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();

  // ── Page state ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [learnMore, setLearnMore]   = useState(false);
  const [modalQuotation, setModalQuotation] = useState<Quotation | null>(null);
  const [rfqForModal, setRfqForModal]             = useState<RFQData | null>(null);
  const [rfqForModalLoading, setRfqForModalLoading] = useState(false);

  const userId =
    (session?.user as any)?.id ??
    (session as any)?.id ??
    (session as any)?.sessionId ??
    "ไม่พบข้อมูล";
  const name  = session?.user?.name  ?? "ผู้ใช้";
  const email = session?.user?.email ?? "";
  const uid   = (session?.user as { id?: string })?.id ?? "";

  // ── Fetch quotations ─────────────────────────────────────────────────────
  const fetchQuotations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch("/api/quotation");
      const data = await res.json();
      setQuotations(data.quotations ?? []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);
  useEffect(() => {
    const id = setInterval(() => fetchQuotations(true), 5000);
    return () => clearInterval(id);
  }, [fetchQuotations]);

  // ── Fetch PO orders ──────────────────────────────────────────────────────
  const [poOrders, setPoOrders]     = useState<POOrder[]>([]);
  const [poLoading, setPoLoading]   = useState(true);

  const fetchPOOrders = useCallback(async (silent = false) => {
    if (!silent) setPoLoading(true);
    try {
      const res  = await fetch("/api/po");
      const data = await res.json();
      setPoOrders(Array.isArray(data) ? data : []);
    } finally {
      if (!silent) setPoLoading(false);
    }
  }, []);

  useEffect(() => { fetchPOOrders(); }, [fetchPOOrders]);
  useEffect(() => {
    const id = setInterval(() => fetchPOOrders(true), 8000);
    return () => clearInterval(id);
  }, [fetchPOOrders]);

  // ── Fetch RFQ when document modal opens ─────────────────────────────────
  useEffect(() => {
    if (!modalQuotation || !userId || userId === "ไม่พบข้อมูล") return;
    setRfqForModal(null);
    setRfqForModalLoading(true);
    fetch(`/api/rfq?userId=${userId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: RFQData[]) => {
        if (Array.isArray(data) && data.length > 0) setRfqForModal(data[0]);
      })
      .finally(() => setRfqForModalLoading(false));
  }, [modalQuotation, userId]);

  const [printReady, setPrintReady]         = useState(false);
  const [downloadReady, setDownloadReady]   = useState(false);
  const [printConfirmed, setPrintConfirmed] = useState(false);

  const handlePrint = () => {
    if (!rfqForModal) return;
    setPrintConfirmed(modalQuotation?.status === "confirmed");
    setPrintReady(true);
  };

  const handleDirectPrint = async () => {
    if (!userId || userId === "ไม่พบข้อมูล" || !latest) return;
    try {
      const res  = await fetch(`/api/rfq?userId=${userId}`, { cache: "no-store" });
      const data: RFQData[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      setRfqForModal(data[0]);
      setPrintConfirmed(latest.status === "confirmed");
      setPrintReady(true);
    } catch {}
  };

  const handleDownloadPdf = () => {
    if (!rfqForModal) return;
    setPrintConfirmed(modalQuotation?.status === "confirmed");
    setDownloadReady(true);
  };

  const handleDirectDownload = async () => {
    if (!userId || userId === "ไม่พบข้อมูล" || !latest) return;
    try {
      const res  = await fetch(`/api/rfq?userId=${userId}`, { cache: "no-store" });
      const data: RFQData[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      setRfqForModal(data[0]);
      setPrintConfirmed(latest.status === "confirmed");
      setDownloadReady(true);
    } catch {}
  };

  useEffect(() => {
    if (!printReady) return;
    const id = setTimeout(() => {
      const orig = document.title;
      document.title = rfqForModal?.rfq_number ?? "quotation";
      window.print();
      document.title = orig;
      setPrintReady(false);
    }, 80);
    return () => clearTimeout(id);
  }, [printReady, rfqForModal]);

  useEffect(() => {
    if (!downloadReady || !rfqForModal) return;
    const generate = async () => {
      await new Promise<void>(r => setTimeout(r, 200));
      try { await document.fonts.ready; } catch {}
      const container = document.getElementById("quotation-print-area");
      if (!container) { setDownloadReady(false); return; }
      const pageEls = container.querySelectorAll<HTMLElement>("[data-pdf-page]");
      if (pageEls.length === 0) { setDownloadReady(false); return; }
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);
        const stripStyles = (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
          clonedDoc.querySelectorAll("style").forEach(el => {
            if (!el.textContent?.includes("fonts.googleapis.com")) el.remove();
          });
        };
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        for (let i = 0; i < pageEls.length; i++) {
          if (i > 0) pdf.addPage();
          const canvas = await html2canvas(pageEls[i], {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            onclone: stripStyles,
          });
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
        }
        pdf.save(`${rfqForModal.rfq_number ?? "quotation"}.pdf`);
      } finally {
        setDownloadReady(false);
      }
    };
    generate();
  }, [downloadReady, rfqForModal]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const latest      = quotations[0] ?? null;
  const meta        = latest ? STATUS_META[latest.status] : null;
  const currentStep = latest ? STEPS.find((s) => s.key === latest.status)! : null;
  const isInProgress = latest?.status === "sent" || latest?.status === "reviewing";

  const poLatest       = poOrders[0] ?? null;
  const poMeta         = poLatest ? PO_STATUS_META[poLatest.status] : null;
  const poCurrentStep  = poLatest ? PO_STEPS.find((s) => s.key === poLatest.status)! : null;
  const poIsInProgress = poLatest?.status === "pending" || poLatest?.status === "accepted";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-4 md:space-y-5">

        {/* ── User Card ─────────────────────────────────────────── */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body py-5 px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent text-primary-content font-bold text-lg flex items-center justify-center">
                    <span>{name[0]?.toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold text-base leading-snug">
                    Welcome &ldquo;{name}&rdquo;
                  </h2>
                  <p className="text-sm text-base-content/55 mt-0.5">
                    You are logged in as {email}
                  </p>
                  {uid && (
                    <p className="text-xs text-base-content/35 mt-0.5">
                      Your id is: {uid}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-success font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                ออนไลน์
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Section ──────────────────────────────────────── */}
        {loading ? (

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body items-center py-24 gap-3">
              <span className="loading loading-spinner loading-lg text-primary" />
              <p className="text-sm text-base-content/40">กำลังโหลด...</p>
            </div>
          </div>

        ) : latest && meta && currentStep ? (

          /* ── Status Card (มี quotation อยู่) ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${meta.bar}`} />
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
                    <p className="font-semibold leading-snug truncate max-w-lg">
                      {latest.filename}
                    </p>
                    <p className="text-xs text-base-content/40 mt-0.5">
                      {new Date(latest.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span className={`badge shrink-0 ${meta.badge}`}>{meta.label}</span>
              </div>

              <div className="divider my-0" />

              <div className="flex flex-col md:flex-row gap-6">

                {/* Left: spotlight + CTA */}
                <div className="flex-1 flex flex-col gap-4">
                  <div
                    onClick={
                      latest.status === "bargaining" || latest.status === "confirmed"
                        ? () => setModalQuotation(latest)
                        : undefined
                    }
                    className={`rounded-2xl border px-5 py-5 flex items-center gap-4 ${meta.spotlight} ${
                      latest.status === "bargaining" || latest.status === "confirmed"
                        ? "cursor-pointer hover:opacity-90 transition-opacity"
                        : ""
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${meta.dot} ${isInProgress ? "animate-pulse" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{currentStep.label}</p>
                      <p className="text-sm text-base-content/50 mt-0.5">{currentStep.sublabel}</p>
                    </div>
                    {isInProgress && <span className="loading loading-dots loading-sm opacity-30" />}
                    {(latest.status === "bargaining" || latest.status === "confirmed") && (
                      <svg className="w-4 h-4 text-base-content/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>

                  {/* Next step hint */}
                  {latest.status !== "bargaining" && latest.status !== "confirmed" && (
                    STEPS[STATUS_ORDER[latest.status] + 1] ? (
                      <div className="flex items-center gap-3 text-xs text-base-content/30">
                        <div className="flex-1 h-px bg-base-300" />
                        <span>ขั้นถัดไป · {STEPS[STATUS_ORDER[latest.status] + 1].label}</span>
                        <div className="flex-1 h-px bg-base-300" />
                      </div>
                    ) : null
                  )}
                  {latest.status === "bargaining" && (
                    <button
                      onClick={() => router.push("/Client/Bargain")}
                      className="btn btn-accent w-full font-semibold gap-2 shadow-lg shadow-accent/20"
                    >
                      ไปยังหน้าต่อรองราคา
                      <IconArrow />
                    </button>
                  )}
                  {latest.status === "confirmed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleDirectPrint}
                        disabled={printReady}
                        className="btn btn-success flex-1 font-semibold gap-2 shadow-lg shadow-success/20"
                      >
                        {printReady ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        )}
                        พิมพ์
                      </button>
                      <button
                        onClick={handleDirectDownload}
                        disabled={downloadReady}
                        className="btn btn-outline btn-success flex-1 font-semibold gap-2"
                      >
                        {downloadReady ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                        ดาวน์โหลด
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: steps timeline */}
                <div className="md:w-64 shrink-0 flex flex-col gap-0">
                  {STEPS.map((step, i) => {
                    const done    = i <= STATUS_ORDER[latest.status];
                    const current = i === STATUS_ORDER[latest.status];
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
                          <p className={`text-sm font-medium leading-tight ${current ? "text-base-content" : done ? "text-base-content/70" : "text-base-content/30"}`}>
                            {step.label}
                          </p>
                          {current && (
                            <p className="text-xs text-base-content/45 mt-0.5">{step.sublabel}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>

        ) : (

          /* ── Hero CTA (ยังไม่มี quotation) ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-accent" />
            <div className="card-body py-10 px-8 gap-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">

                {/* Left: text */}
                <div className="flex-1">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Quotation Request System
                  </span>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.2] mb-4">
                    ส่งเอกสาร<br />
                    เพื่อจัดทำ<span className="text-primary">ใบเสนอราคา</span>
                  </h1>
                  <p className="text-base text-base-content/50 leading-relaxed max-w-md mb-8">
                    อัปโหลดไฟล์รายการสินค้า ทีมงานจะจัดทำใบเสนอราคา
                    และพร้อมต่อรองกับคุณในทุกขั้นตอน
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push("/Client/quotation")}
                      className="btn btn-primary btn-lg gap-2 shadow-lg shadow-primary/20"
                    >
                      เริ่มต้นเลย
                      <IconArrow />
                    </button>
                    <button
                      onClick={() => setLearnMore(true)}
                      className="btn btn-outline btn-lg"
                    >
                      ดูขั้นตอน
                    </button>
                  </div>
                </div>

                {/* Right: step list */}
                <div className="hidden md:flex flex-col gap-3 w-72 shrink-0">
                  {[
                    { label: "อัปโหลดเอกสาร",    sub: "รองรับ PDF สูงสุด 10 MB" },
                    { label: "ระบบประมวลผล AI",   sub: "แปลงข้อมูลอัตโนมัติ" },
                    { label: "ออกใบเสนอราคา",    sub: "ทีมงานจัดทำให้ทันที" },
                    { label: "ต่อรองราคาออนไลน์", sub: "Chat โดยตรงกับทีมงาน" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-base-200 px-4 py-3">
                      <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">{item.label}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        )}

        {/* ── PO Section ────────────────────────────────────────── */}
        {poLoading ? (

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body items-center py-12 gap-3">
              <span className="loading loading-spinner loading-lg text-secondary" />
              <p className="text-sm text-base-content/40">กำลังโหลดใบสั่งซื้อ...</p>
            </div>
          </div>

        ) : poLatest && poMeta && poCurrentStep ? (

          /* ── PO Status Card ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className={`h-1 bg-linear-to-r ${poMeta.bar}`} />
            <div className="card-body gap-5 pt-5 px-6 md:px-8">

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center shrink-0 text-base-content/35">
                    <IconDoc />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs tracking-widest uppercase text-secondary/60 font-medium mb-0.5">
                      Purchase Order
                    </p>
                    <p className="font-semibold leading-snug">{poLatest.poNumber}</p>
                    <p className="text-xs text-base-content/40 mt-0.5 truncate max-w-xs">
                      {poLatest.fileOrigName} · {new Date(poLatest.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span className={`badge shrink-0 ${poMeta.badge}`}>{poMeta.label}</span>
              </div>

              <div className="divider my-0" />

              <div className="flex flex-col md:flex-row gap-6">

                {/* Left: spotlight + CTA */}
                <div className="flex-1 flex flex-col gap-4">
                  <div
                    onClick={poLatest.status === "billed" ? () => router.push(`/Client/po/${poLatest._id}`) : undefined}
                    className={`rounded-2xl border px-5 py-5 flex items-center gap-4 ${poMeta.spotlight} ${poLatest.status === "billed" ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${poMeta.dot} ${poIsInProgress ? "animate-pulse" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{poCurrentStep.label}</p>
                      <p className="text-sm text-base-content/50 mt-0.5">{poCurrentStep.sublabel}</p>
                    </div>
                    {poIsInProgress && <span className="loading loading-dots loading-sm opacity-30" />}
                    {poLatest.status === "billed" && (
                      <svg className="w-4 h-4 text-base-content/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>

                  {PO_STEPS[PO_STATUS_ORDER[poLatest.status] + 1] && (
                    <div className="flex items-center gap-3 text-xs text-base-content/30">
                      <div className="flex-1 h-px bg-base-300" />
                      <span>ขั้นถัดไป · {PO_STEPS[PO_STATUS_ORDER[poLatest.status] + 1].label}</span>
                      <div className="flex-1 h-px bg-base-300" />
                    </div>
                  )}
                  {poLatest.status === "billed" && (
                    <button
                      onClick={() => router.push(`/Client/po/${poLatest._id}`)}
                      className="btn btn-success w-full font-semibold gap-2 shadow-lg shadow-success/20"
                    >
                      ดูใบวางบิล
                      <IconArrow />
                    </button>
                  )}
                </div>

                {/* Right: steps timeline */}
                <div className="md:w-64 shrink-0 flex flex-col gap-0">
                  {PO_STEPS.map((step, i) => {
                    const done    = i <= PO_STATUS_ORDER[poLatest.status];
                    const current = i === PO_STATUS_ORDER[poLatest.status];
                    return (
                      <div key={step.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                            ${done ? "bg-secondary text-secondary-content" : "bg-base-200 text-base-content/30"}`}>
                            {done ? "✓" : i + 1}
                          </div>
                          {i < PO_STEPS.length - 1 && (
                            <div className={`w-px flex-1 my-1 ${done ? "bg-secondary/40" : "bg-base-300"}`} />
                          )}
                        </div>
                        <div className="pb-4 pt-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${current ? "text-base-content" : done ? "text-base-content/70" : "text-base-content/30"}`}>
                            {step.label}
                          </p>
                          {current && (
                            <p className="text-xs text-base-content/45 mt-0.5">{step.sublabel}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>

        ) : (

          /* ── PO Hero CTA ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className="h-1 bg-linear-to-r from-secondary to-info" />
            <div className="card-body py-10 px-8 gap-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">

                {/* Left: text */}
                <div className="flex-1">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    Purchase Order System
                  </span>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.2] mb-4">
                    ส่งรายการสินค้า<br />
                    เพื่อ<span className="text-secondary">สั่งซื้อ</span>
                  </h2>
                  <p className="text-base text-base-content/50 leading-relaxed max-w-md mb-8">
                    อัปโหลดรายการสินค้าที่ต้องการสั่งซื้อ ทีมงานจะจัดของและออกใบวางบิลให้คุณ
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push("/Client/po")}
                      className="btn btn-secondary btn-lg gap-2 shadow-lg shadow-secondary/20"
                    >
                      เริ่มสั่งซื้อ
                      <IconArrow />
                    </button>
                  </div>
                </div>

                {/* Right: step list */}
                <div className="hidden md:flex flex-col gap-3 w-72 shrink-0">
                  {[
                    { label: "อัปโหลดรายการสินค้า",  sub: "รองรับทุกประเภทไฟล์ สูงสุด 20 MB" },
                    { label: "admin ตรวจสอบและจัดของ", sub: "รับเรื่องและจัดเตรียมสินค้า" },
                    { label: "ออกใบกำกับภาษี/ใบส่งของ", sub: "เขียนบนกระดาษพร้อมส่ง" },
                    { label: "รับใบวางบิล",            sub: "ดูและพิมพ์ใบวางบิลออนไลน์" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-base-200 px-4 py-3">
                      <div className="w-6 h-6 rounded-full bg-secondary/15 text-secondary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">{item.label}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        )}

      </div>

      <ChatNotificationBubble />

      {/* ── Learn More Modal ──────────────────────────────────── */}
      {learnMore && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-lg overflow-hidden p-0">
            <div className="bg-base-200 px-6 py-5 border-b border-base-300">
              <button
                onClick={() => setLearnMore(false)}
                className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              >✕</button>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">How it works</p>
              <h3 className="font-bold text-lg">ขั้นตอนการใช้งาน</h3>
              <p className="text-sm text-base-content/50 mt-0.5">ระบบออกใบเสนอราคาทำงานอย่างไร</p>
            </div>
            <div className="px-6 py-6 space-y-0">
              {PROCESS_STEPS.map((s, i) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full border-2 border-primary/30 bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {s.step}
                    </div>
                    {i < PROCESS_STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-base-300 my-1.5" />
                    )}
                  </div>
                  <div className="pb-6 pt-1.5 min-w-0">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-sm text-base-content/50 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-base-300 px-6 py-4 flex gap-3 justify-end">
              <button onClick={() => setLearnMore(false)} className="btn btn-ghost btn-sm">
                ปิด
              </button>
              <button
                onClick={() => { setLearnMore(false); router.push("/Client/quotation"); }}
                className="btn btn-primary btn-sm gap-2"
              >
                เริ่มต้นเลย
                <IconArrow />
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setLearnMore(false)} />
        </div>
      )}

      {/* ── Print styles + print-only area ─────────────────────── */}
      {(modalQuotation || printReady) && (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
          .rfq-version-bar { display: none !important; }
          @media print {
            @page { margin: 0; size: A4; }
            body * { visibility: hidden !important; }
            #quotation-print-area {
              display: block !important;
              visibility: visible !important;
              position: absolute !important;
              top: 0 !important; left: 0 !important;
              width: 100% !important;
              background: white !important;
              overflow: visible !important;
              z-index: 9999 !important;
            }
            #quotation-print-area * { visibility: visible !important; }
            html, body {
              background: white !important; overflow: visible !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>
      )}

      {/* ── Print/Download area (rendered on demand) ── */}
      {(printReady || downloadReady) && rfqForModal && (
        <div
          id="quotation-print-area"
          aria-hidden="true"
          style={
            downloadReady
              ? { position: "fixed", top: 0, left: 0, zIndex: -1, pointerEvents: "none" }
              : { position: "fixed", top: "-9999px", left: "-9999px", pointerEvents: "none" }
          }
        >
          <QuotationDocument rfq={rfqForModal} confirmed={printConfirmed} />
        </div>
      )}

      {/* ── Document Modal ────────────────────────────────────── */}
      {modalQuotation && (
        <>
          <dialog className="modal modal-open">
            <div className="modal-box w-11/12 max-w-4xl h-[92vh] p-0 overflow-hidden flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-base-100 border-b border-base-300 shrink-0">
                <div>
                  <p className="font-semibold text-sm leading-tight">ใบเสนอราคา</p>
                  {rfqForModal && (
                    <p className="text-xs text-base-content/40 mt-0.5">{rfqForModal.rfq_number}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrint}
                    disabled={!rfqForModal || printReady}
                    className="btn btn-ghost btn-sm gap-1.5 text-xs disabled:opacity-40"
                  >
                    {printReady
                      ? <span className="loading loading-spinner loading-xs" />
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    }
                    พิมพ์
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={!rfqForModal || downloadReady}
                    className="btn btn-primary btn-sm gap-1.5 text-xs disabled:opacity-40"
                  >
                    {downloadReady ? (
                      <><span className="loading loading-spinner loading-xs" />กำลังสร้าง...</>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        ดาวน์โหลด PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setModalQuotation(null)}
                    className="btn btn-ghost btn-sm btn-circle"
                    aria-label="ปิด"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Document area */}
              <div className="flex-1 overflow-auto bg-base-200 p-4">
                {rfqForModalLoading ? (
                  <div className="flex items-center justify-center h-full gap-3">
                    <span className="loading loading-spinner loading-lg text-primary" />
                  </div>
                ) : rfqForModal ? (
                  <QuotationDocument
                    rfq={rfqForModal}
                    confirmed={modalQuotation.status === "confirmed"}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/30">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">ไม่พบข้อมูลเอกสาร</p>
                  </div>
                )}
              </div>

            </div>
            <div className="modal-backdrop" onClick={() => setModalQuotation(null)} />
          </dialog>
        </>
      )}

    </main>
  );
}
