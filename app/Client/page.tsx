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

const STATUS_META: Record<QuotationStatus, {
  spotlight: string; dot: string; bar: string; badge: string; label: string;
}> = {
  sent:       { spotlight: "border-success/25 bg-success/5",  dot: "bg-success", bar: "from-success to-success/30",   badge: "badge-success", label: "ส่งแล้ว" },
  reviewing:  { spotlight: "border-warning/25 bg-warning/5",  dot: "bg-warning", bar: "from-warning to-warning/30",   badge: "badge-warning", label: "กำลังดำเนินการ" },
  completed:  { spotlight: "border-primary/25 bg-primary/5",  dot: "bg-primary", bar: "from-primary to-primary/30",   badge: "badge-primary", label: "เสร็จสิ้น" },
  bargaining: { spotlight: "border-accent/25  bg-accent/5",   dot: "bg-accent",  bar: "from-accent  to-accent/30",    badge: "badge-accent",  label: "พร้อมต่อรอง" },
};

const PROCESS_STEPS = [
  { step: "01", title: "อัปโหลดเอกสาร",  desc: "แนบไฟล์ PDF รายการสินค้า ใบสั่งซื้อ หรือ BOQ" },
  { step: "02", title: "ระบบประมวลผล",   desc: "AI อ่านและจัดโครงสร้างข้อมูลอัตโนมัติ พร้อมส่งทีมงาน" },
  { step: "03", title: "ออกใบเสนอราคา",  desc: "ทีมงานจัดทำใบเสนอราคาตามรายการสินค้า" },
  { step: "04", title: "ต่อรองราคา",     desc: "พูดคุยและต่อรองราคากับทีมงานได้โดยตรง" },
];

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
  const meta        = latest ? STATUS_META[latest.status] : null;
  const currentStep = latest ? STEPS.find((s) => s.key === latest.status)! : null;
  const nextStep    = latest ? (STEPS[STATUS_ORDER[latest.status] + 1] ?? null) : null;
  const isInProgress = latest?.status === "sent" || latest?.status === "reviewing";
  const name  = session?.user?.name  ?? "ผู้ใช้";
  const email = session?.user?.email ?? "";

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 space-y-4">

        {/* ── User Card ─────────────────────────────────────────── */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="avatar placeholder shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-content font-bold text-base flex items-center justify-center">
                  <span>{name[0].toUpperCase()}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug truncate">{name}</p>
                <p className="text-xs text-base-content/45 truncate">{email}</p>
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

          /* ── Status Card ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${meta.bar}`} />
            <div className="card-body gap-5 pt-5">

              {/* File header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center shrink-0 text-base-content/35">
                    <IconDoc />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-snug truncate max-w-xs">
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
                <span className={`badge badge-sm shrink-0 ${meta.badge}`}>{meta.label}</span>
              </div>

              {/* Divider */}
              <div className="divider my-0" />

              {/* Status spotlight */}
              <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${meta.spotlight}`}>
                <span className={`w-3 h-3 rounded-full shrink-0 ${meta.dot} ${isInProgress ? "animate-pulse" : ""}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{currentStep.label}</p>
                  <p className="text-xs text-base-content/50 mt-0.5">{currentStep.sublabel}</p>
                </div>
                {isInProgress && <span className="loading loading-dots loading-sm opacity-30" />}
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
                      <span className={done ? "font-medium" : "text-base-content/30"}>
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Next step / Bargain CTA */}
              {nextStep && latest.status !== "bargaining" && (
                <div className="flex items-center gap-3 text-xs text-base-content/30">
                  <div className="flex-1 h-px bg-base-300" />
                  <span>ขั้นถัดไป · {nextStep.label}</span>
                  <div className="flex-1 h-px bg-base-300" />
                </div>
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

            </div>
          </div>

        ) : (

          /* ── Hero CTA ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-accent" />
            <div className="card-body py-14 md:py-20 gap-0">

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
          </div>
        )}

      </div>

      {/* ── Learn More Modal ──────────────────────────────────── */}
      {learnMore && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-lg overflow-hidden p-0">

            {/* Modal header */}
            <div className="bg-base-200 px-6 py-5 border-b border-base-300">
              <button
                onClick={() => setLearnMore(false)}
                className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              >✕</button>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">How it works</p>
              <h3 className="font-bold text-lg">ขั้นตอนการใช้งาน</h3>
              <p className="text-sm text-base-content/50 mt-0.5">ระบบออกใบเสนอราคาทำงานอย่างไร</p>
            </div>

            {/* Steps */}
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

            {/* Modal footer */}
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
    </main>
  );
}
