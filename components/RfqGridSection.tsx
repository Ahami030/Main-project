"use client";

import Link from "next/link";
import { ReactNode, useRef, useState } from "react";

// ---------- Types ----------
export type RfqJob = {
  id: string;
  fileName: string;     // เช่น "RFQ-2026-632_text.pdf"
  submittedAt: string;  // เช่น "22 พ.ย. 2569 · 17:06"
  currentStep: number;  // ขั้นปัจจุบัน 1–6, 0 = ประมวลผลไม่สำเร็จ
  due?: string;         // "ต้องการภายใน ..." (ถ้ามี)
};

type Props = {
  jobs: RfqJob[];                        // งานทั้งหมด (เรียงใหม่ → เก่า) — คอมโพเนนต์จะเรียงงานใกล้เสร็จขึ้นก่อนเอง
  newHref: string;                       // การ์ด "+" ส่งเอกสารใหม่
  allHref: string;                       // ลิงก์ "ดูรายละเอียดทั้งหมด"
  actions?: (id: string) => ReactNode;   // ปุ่มของงานที่เลือก (ต่อรอง / พิมพ์ / อัปโหลดใหม่)
  collapsedCount?: number;               // จำนวนงานตอนย่อ (ไม่นับการ์ด "+")
  expandedCount?: number;                // จำนวนงานตอนขยาย (ไม่นับการ์ด "+")
};

const STEPS = [
  { label: "กำลังประมวลผลเอกสาร", desc: "ระบบกำลังอ่านและสกัดข้อมูลจากไฟล์" },
  { label: "ส่งไฟล์แล้ว",          desc: "ระบบได้รับเอกสารของคุณแล้ว" },
  { label: "ตรวจสอบ / จัดทำราย",   desc: "ทีมงานกำลังตรวจสอบเอกสาร" },
  { label: "ดำเนินการเสร็จสิ้น",    desc: "ใบเสนอราคาพร้อมแล้ว" },
  { label: "พร้อมต่อรองราคา",       desc: "เอกสารพร้อมแล้ว กดเพื่อต่อรอง" },
  { label: "ยืนยันแล้ว",            desc: "ลูกค้ายืนยันรับราคาเรียบร้อย" },
];

// ---------- สีของ badge ตามขั้น ----------
function statusStyle(step: number) {
  if (step < 1) return "bg-error/10 text-error ring-error/30";                  // ไม่สำเร็จ
  if (step >= STEPS.length) return "bg-success/10 text-success ring-success/30"; // ยืนยันแล้ว
  if (step >= 5) return "bg-info/10 text-info ring-info/30";                     // พร้อมต่อรอง
  if (step >= 3) return "bg-warning/15 text-warning ring-warning/30";            // กำลังดำเนินการ
  return "bg-base-200 text-base-content/60 ring-base-300";                       // เพิ่งส่ง
}

const CheckIcon = (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronIcon = ({ up }: { up?: boolean }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${up ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const btnBase =
  "inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function RfqGridSection({
  jobs,
  newHref,
  allHref,
  actions,
  collapsedCount = 2,
  expandedCount = 5,
}: Props) {
  // งานที่ใกล้เสร็จ/เสร็จแล้วขึ้นก่อน, ขั้นเท่ากันคงลำดับเดิม (ใหม่ → เก่า), งานที่ล้มเหลว (0) ไปท้ายสุด
  const sorted = [...jobs].sort((a, b) => b.currentStep - a.currentStep);

  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);
  const [expanded, setExpanded] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // งานที่เลือกหายไป (เช่นถูกลบ) → ใช้งานแรกแทน
  const selected = sorted.find((j) => j.id === selectedId) ?? sorted[0] ?? null;

  const visibleJobs = sorted.slice(0, expanded ? expandedCount : collapsedCount);
  const extraOnExpand = Math.min(sorted.length, expandedCount) - collapsedCount;
  const hasMoreThanExpanded = sorted.length > expandedCount;

  function collapse() {
    setExpanded(false);
    if (sorted.findIndex((j) => j.id === selected?.id) >= collapsedCount) setSelectedId(sorted[0]?.id ?? null);
    const top = gridRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 80) gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="w-full rounded-[2.5rem] border border-base-300/70 bg-base-100 p-6 shadow-mc transition-shadow duration-300 hover:shadow-mc-lg sm:p-8 md:px-9">
      {/* ===== หัวข้อ ===== */}
      <div className="mb-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/55">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Quotation Request
        </p>
        <h2 className="mt-1 text-lg font-medium tracking-mc">
          ใบขอราคาของคุณ
          <span className="ml-1.5 text-sm font-normal text-base-content/55">· {jobs.length} งาน</span>
        </h2>
      </div>

      {/* ===== กริดการ์ด: มือถือ 1 คอลัมน์ / แท็บเล็ต 2 / จอใหญ่ 3 ===== */}
      <div ref={gridRef} className="grid scroll-mt-20 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ponytail: "+" เป็นลิงก์ไปหน้าอัปโหลด (ต้องกรอกวันที่ต้องการด้วย) — ไม่รับ drag-drop ตรงนี้ */}
        <Link
          href={newHref}
          className="group order-first flex min-h-[168px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 p-5 text-center transition hover:border-accent hover:bg-accent/10 sm:order-last"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-content shadow-md shadow-secondary/20 transition group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </span>
          <span className="mt-3 text-sm font-medium">ส่งเอกสารใหม่</span>
          <span className="mt-0.5 text-xs text-secondary/80">อัปโหลดไฟล์เพื่อขอใบเสนอราคา</span>
          <span className="mt-1 text-[11px] text-secondary/60">PDF · สูงสุด 10 MB</span>
        </Link>

        {/* --- การ์ดงานแต่ละชิ้น --- */}
        {visibleJobs.map((job) => {
          const pct = Math.round((job.currentStep / STEPS.length) * 100);
          const active = job.id === selected?.id;
          return (
            <button
              key={job.id}
              type="button"
              onClick={() => setSelectedId(job.id)}
              aria-pressed={active}
              className={`flex min-h-[168px] flex-col rounded-2xl border bg-base-100 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                active ? "border-base-content ring-1 ring-base-content" : "border-base-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/10 text-[10px] font-semibold tracking-wide text-error">
                  PDF
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${statusStyle(job.currentStep)}`}>
                  {STEPS[job.currentStep - 1]?.label ?? "ไม่สำเร็จ"}
                </span>
              </div>

              <p className="mt-3 truncate text-sm font-medium" title={job.fileName}>
                {job.fileName}
              </p>
              <p className="text-xs text-base-content/40">{job.submittedAt}</p>
              {job.due && <p className="text-xs text-base-content/50">ต้องการภายใน {job.due}</p>}

              {/* progress ดันไปชิดล่างการ์ด ให้ทุกใบสูงเท่ากัน */}
              <div className="mt-auto pt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-200">
                  <div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-base-content/55">
                  {job.currentStep < 1 ? "ประมวลผลไม่สำเร็จ" : `ขั้นที่ ${job.currentStep} จาก ${STEPS.length}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== ปุ่มแสดงเพิ่ม / ย่อลง / ดูรายละเอียดทั้งหมด ===== */}
      {sorted.length > collapsedCount && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              className={`${btnBase} border border-base-300 text-base-content/80 hover:bg-base-200`}
            >
              แสดงเพิ่มอีก {extraOnExpand} งาน <ChevronIcon />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={collapse}
                aria-expanded={true}
                className={`${btnBase} border border-base-300 text-base-content/80 hover:bg-base-200`}
              >
                ย่อลง <ChevronIcon up />
              </button>
              {hasMoreThanExpanded && (
                <Link href={allHref} className={`${btnBase} bg-primary font-medium text-primary-content hover:opacity-90`}>
                  ดูรายละเอียดทั้งหมด ({jobs.length} งาน)
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== รายละเอียดงานที่เลือก (timeline) ===== */}
      {selected && (
        <div className="mt-6 rounded-2xl bg-base-200 p-5 sm:p-6">
          <p className="mb-4 text-sm text-base-content/55">
            สถานะของ <span className="font-medium text-base-content">{selected.fileName}</span>
          </p>

          {/* timeline แนวนอนบนจอใหญ่ / แนวตั้งบนมือถือ */}
          <ol className="grid gap-3 md:grid-cols-6 md:gap-2">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = n <= selected.currentStep;
              const current = n === selected.currentStep;
              return (
                <li key={s.label} className="relative flex items-start gap-3 md:flex-col md:items-center md:text-center">
                  {n < STEPS.length && (
                    <span
                      className={`absolute left-[calc(50%+14px)] top-3 hidden h-px w-[calc(100%-20px)] md:block ${
                        n < selected.currentStep ? "bg-base-content" : "bg-base-300"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      done ? "bg-primary text-primary-content" : "border border-base-300 bg-base-100 text-base-content/40"
                    }`}
                  >
                    {done ? CheckIcon : n}
                  </span>
                  <div className="md:mt-2">
                    <p className={`text-xs ${current ? "font-medium" : done ? "text-base-content/70" : "text-base-content/40"}`}>
                      {s.label}
                    </p>
                    {current && <p className="mt-0.5 text-[11px] text-base-content/55">{s.desc}</p>}
                  </div>
                </li>
              );
            })}
          </ol>

          {actions?.(selected.id)}
        </div>
      )}
    </section>
  );
}
