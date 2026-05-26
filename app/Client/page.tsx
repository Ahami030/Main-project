"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuotationStatus = "sent" | "reviewing" | "completed" | "bargaining";

interface Quotation {
  _id: string;
  filename: string;
  status: QuotationStatus;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS: { key: QuotationStatus; label: string; sublabel: string }[] = [
  { key: "sent",       label: "ส่งไฟล์แล้ว",        sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "reviewing",  label: "ตรวจสอบ / จัดทำราย", sublabel: "ทีมงานกำลังตรวจสอบเอกสาร" },
  { key: "completed",  label: "ดำเนินการเสร็จสิ้น",  sublabel: "ใบเสนอราคาพร้อมแล้ว" },
  { key: "bargaining", label: "พร้อมต่อรองราคา",     sublabel: "เอกสารพร้อมแล้ว กดเพื่อต่อรอง" },
];

const STATUS_ORDER: Record<QuotationStatus, number> = {
  sent: 0, reviewing: 1, completed: 2, bargaining: 3,
};

const STATUS_STYLE: Record<QuotationStatus, { spotlight: string; dot: string }> = {
  sent:       { spotlight: "border-success/30 bg-success/5",  dot: "bg-success" },
  reviewing:  { spotlight: "border-warning/30 bg-warning/5",  dot: "bg-warning" },
  completed:  { spotlight: "border-primary/30 bg-primary/5",  dot: "bg-primary" },
  bargaining: { spotlight: "border-accent/30  bg-accent/5",   dot: "bg-accent"  },
};

const STATUS_BADGE: Record<QuotationStatus, { cls: string; label: string }> = {
  sent:       { cls: "badge-success", label: "ส่งแล้ว" },
  reviewing:  { cls: "badge-warning", label: "กำลังดำเนินการ" },
  completed:  { cls: "badge-primary", label: "เสร็จสิ้น" },
  bargaining: { cls: "badge-accent",  label: "พร้อมต่อรอง" },
};

const PROCESS_STEPS = [
  { step: "01", title: "อัปโหลดเอกสาร",  desc: "แนบไฟล์ PDF รายการสินค้า ใบสั่งซื้อ หรือ BOQ" },
  { step: "02", title: "ระบบประมวลผล",   desc: "AI อ่านและจัดโครงสร้างข้อมูลอัตโนมัติ พร้อมส่งทีมงาน" },
  { step: "03", title: "ออกใบเสนอราคา",  desc: "ทีมงานจัดทำใบเสนอราคาตามรายการสินค้า" },
  { step: "04", title: "ต่อรองราคา",     desc: "พูดคุยและต่อรองราคากับทีมงานได้โดยตรง" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page(): JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [learnMore, setLearnMore]   = useState(false);

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

  const latest      = quotations[0] ?? null;
  const currentStep = latest ? STEPS.find((s) => s.key === latest.status)! : null;
  const nextStep    = latest ? (STEPS[STATUS_ORDER[latest.status] + 1] ?? null) : null;
  const isInProgress = latest?.status === "sent" || latest?.status === "reviewing";

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-6">

        {/* ── User Card ───────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">
                  ยินดีต้อนรับ, {session?.user?.name ?? "ผู้ใช้"}
                </h2>
                <p className="text-sm text-base-content/50 mt-0.5">
                  {session?.user?.email}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center">
                {(session?.user?.name ?? "U")[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Section ────────────────────────────────── */}
        {loading ? (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body items-center py-20">
              <span className="loading loading-spinner loading-lg" />
            </div>
          </div>

        ) : latest ? (
          /* ── Status Card (has quotation) ── */
          <div className="card bg-base-100 shadow-md">
            <div className="card-body space-y-5">

              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-widest uppercase text-primary/60 font-medium mb-1">
                    Quotation Request
                  </p>
                  <p className="font-semibold truncate max-w-sm">{latest.filename}</p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {new Date(latest.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`badge badge-sm ${STATUS_BADGE[latest.status].cls}`}>
                  {STATUS_BADGE[latest.status].label}
                </span>
              </div>

              {/* Status spotlight */}
              <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${STATUS_STYLE[latest.status].spotlight}`}>
                <span className={`w-3 h-3 rounded-full shrink-0 ${STATUS_STYLE[latest.status].dot} ${isInProgress ? "animate-pulse" : ""}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{currentStep!.label}</p>
                  <p className="text-sm text-base-content/60 mt-0.5">{currentStep!.sublabel}</p>
                </div>
                {isInProgress && <span className="loading loading-dots loading-sm opacity-40" />}
              </div>

              {/* Stepper */}
              <ul className="steps steps-horizontal w-full text-xs">
                {STEPS.map((step, i) => {
                  const done = i <= STATUS_ORDER[latest.status];
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

              {/* Next step hint */}
              {nextStep && latest.status !== "bargaining" && (
                <div className="flex items-center gap-2 text-xs text-base-content/35">
                  <div className="flex-1 h-px bg-base-300" />
                  <span>ขั้นถัดไป: {nextStep.label}</span>
                  <div className="flex-1 h-px bg-base-300" />
                </div>
              )}

              {/* Bargain CTA */}
              {latest.status === "bargaining" && (
                <button
                  onClick={() => router.push("/Client/Bargain")}
                  className="btn btn-accent w-full font-semibold gap-2"
                >
                  <span>ไปยังหน้าต่อรองราคา</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

            </div>
          </div>

        ) : (
          /* ── Hero CTA (no quotation yet) ── */
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="md:flex md:items-center md:justify-between gap-8">

                <div className="space-y-4 flex-1">
                  <p className="text-xs tracking-widest uppercase text-primary/60 font-medium">
                    Quotation Request System
                  </p>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                    ส่งเอกสาร<br className="hidden md:block" />เพื่อจัดทำใบเสนอราคา
                  </h2>
                  <p className="text-base-content/60 leading-relaxed max-w-md">
                    อัปโหลดไฟล์รายการสินค้า ทีมงานจะจัดทำใบเสนอราคาและพร้อมต่อรองกับคุณ
                  </p>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => router.push("/Client/quotation")}
                      className="btn btn-primary"
                    >
                      เริ่มต้น →
                    </button>
                    <button
                      onClick={() => setLearnMore(true)}
                      className="btn btn-outline"
                    >
                      Learn more
                    </button>
                  </div>
                </div>

                {/* Process grid illustration */}
                <div className="mt-6 md:mt-0 grid grid-cols-2 gap-3 md:w-64 shrink-0">
                  {PROCESS_STEPS.map((s) => (
                    <div key={s.step} className="rounded-xl bg-base-200 px-3 py-3 space-y-1">
                      <p className="text-xs font-semibold text-primary">{s.step}</p>
                      <p className="text-xs font-medium leading-tight">{s.title}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}

      </section>

      {/* ── Learn More Modal ──────────────────────────────── */}
      {learnMore && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-lg">
            <button
              onClick={() => setLearnMore(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            >
              ✕
            </button>
            <h3 className="font-semibold text-lg mb-1">ขั้นตอนการใช้งาน</h3>
            <p className="text-sm text-base-content/60 mb-6">ระบบออกใบเสนอราคาทำงานอย่างไร</p>

            <div className="space-y-1">
              {PROCESS_STEPS.map((s, i) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {s.step}
                    </div>
                    {i < PROCESS_STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-base-300 my-1" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-sm text-base-content/60 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button
                onClick={() => { setLearnMore(false); router.push("/Client/quotation"); }}
                className="btn btn-primary"
              >
                เริ่มต้นเลย →
              </button>
              <button onClick={() => setLearnMore(false)} className="btn btn-ghost">
                ปิด
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setLearnMore(false)} />
        </div>
      )}
    </main>
  );
}
