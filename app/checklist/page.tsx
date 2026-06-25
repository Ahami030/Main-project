// TODO: DELETE THIS PAGE AFTER SUBMISSION — หน้านี้ใช้ชั่วคราวสำหรับส่งครูเท่านั้น
"use client";

import { useEffect, useRef, useState } from "react";

// ── Data ───────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "6.1", title: "ระบบจัดการสมาชิก", sub: [
    { id: "6.1.1", title: "การสมัครสมาชิก", items: [
      { id: "6.1.1-1", label: "กรอกแบบฟอร์มสมัครสมาชิก" },
      { id: "6.1.1-2", label: "บันทึกข้อมูลเข้าสู่ระบบ" },
    ]},
    { id: "6.1.2", title: "การเข้าสู่ระบบ", items: [
      { id: "6.1.2-1", label: "เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน" },
      { id: "6.1.2-2", label: "แก้ไขข้อมูลส่วนตัว" },
      { id: "6.1.2-3", label: "บันทึกข้อมูล" },
    ]},
  ]},
  { id: "6.2", title: "ระบบใบเสนอราคา", sub: [
    { id: "6.2.1", title: "การกรอกแบบฟอร์มใบเสนอราคา (ลูกค้า)", items: [
      { id: "6.2.1-1", label: "อัปโหลดไฟล์รายการสินค้า (PDF เท่านั้น)" },
      { id: "6.2.1-2", label: "แสดงรายละเอียดเอกสารก่อนส่งเข้าสู่ระบบ" },
      { id: "6.2.1-3", label: "ส่งไฟล์เข้าสู่ระบบ Workflow ของ n8n" },
    ]},
    { id: "6.2.2", title: "ระบบต่อรองใบเสนอราคา (ฉบับร่าง)", items: [
      { id: "6.2.2-1", label: "รับข้อมูล JSON ที่แปลงจากไฟล์ PDF ผ่าน AI และ n8n" },
      { id: "6.2.2-2", label: "แสดงข้อมูลรายการสินค้า/บริการเพื่อตรวจสอบ" },
      { id: "6.2.2-3", label: "แก้ไขรายละเอียดรายการสินค้า/บริการ" },
      { id: "6.2.2-4", label: "ส่งข้อมูลความต้องการลูกค้ากลับพนักงาน" },
      { id: "6.2.2-5", label: "ส่งใบเสนอราคา (ฉบับร่าง) กลับลูกค้า" },
    ]},
    { id: "6.2.3", title: "ระบบจัดการใบเสนอราคา (พนักงาน)", items: [
      { id: "6.2.3-1", label: "แสดงรายละเอียดข้อมูลรายการสินค้า" },
      { id: "6.2.3-2", label: "จัดการข้อมูลพื้นฐานของระบบ" },
      { id: "6.2.3-3", label: "ออกใบเสนอราคา (ฉบับสมบูรณ์)" },
      { id: "6.2.3-4", label: "ส่งใบเสนอราคา (ฉบับสมบูรณ์) ให้ลูกค้า" },
    ]},
  ]},
  { id: "6.3", title: "ระบบใบสั่งซื้อ", sub: [
    { id: "6.3.1", title: "การกรอกแบบฟอร์มใบสั่งซื้อ (ลูกค้า)", items: [
      { id: "6.3.1-1", label: "อัปโหลดไฟล์รายการสินค้า (PDF เท่านั้น)" },
      { id: "6.3.1-2", label: "แสดงรายละเอียดเอกสารก่อนส่งเข้าสู่ระบบ" },
    ]},
    { id: "6.3.2", title: "การตรวจสอบและยืนยันใบสั่งซื้อ (พนักงาน)", items: [
      { id: "6.3.2-1", label: "ตรวจสอบข้อมูลใบสั่งซื้อ" },
      { id: "6.3.2-2", label: "ยืนยันใบสั่งซื้อ" },
      { id: "6.3.2-3", label: "พิมพ์เอกสารใบสั่งซื้อ" },
    ]},
  ]},
  { id: "6.4", title: "ระบบใบวางบิล", sub: [
    { id: "6.4.x", title: "ฟีเจอร์", items: [
      { id: "6.4.1", label: "จัดการข้อมูลพื้นฐานของระบบ" },
      { id: "6.4.2", label: "เพิ่มข้อมูลใบส่งของ/ใบกำกับภาษี" },
      { id: "6.4.3", label: "จัดเก็บและแสดงวันหมดอายุของใบวางบิล" },
      { id: "6.4.4", label: "สรุปรายการยอดเงินและรายละเอียดทั้งหมด" },
      { id: "6.4.5", label: "พิมพ์เอกสารใบวางบิล" },
    ]},
  ]},
  { id: "6.5", title: "ระบบตรวจสอบการชำระเงิน", sub: [
    { id: "6.5.x", title: "ฟีเจอร์", items: [
      { id: "6.5.1", label: "ส่งหลักฐานการโอนเงิน" },
      { id: "6.5.2", label: "ตรวจสอบข้อมูลการโอนเงิน" },
      { id: "6.5.3", label: "ยืนยันหลักฐานการชำระเงิน" },
    ]},
  ]},
  { id: "6.6", title: "ระบบผู้ดูแลระบบ (Admin)", sub: [
    { id: "6.6.1", title: "การจัดการผู้ใช้งาน", items: [
      { id: "6.6.1-1", label: "เพิ่มผู้ใช้งานเข้าสู่ระบบ" },
      { id: "6.6.1-2", label: "แก้ไขข้อมูลผู้ใช้งาน" },
      { id: "6.6.1-3", label: "ลบผู้ใช้งานออกจากระบบ" },
    ]},
    { id: "6.6.2", title: "การกำหนดสิทธิ์การเข้าถึงระบบ", items: [
      { id: "6.6.2-1", label: "กำหนดประเภทผู้ใช้งาน (Admin / พนักงาน / ลูกค้า)" },
      { id: "6.6.2-2", label: "กำหนดสิทธิ์การเข้าถึงเมนูต่าง ๆ" },
      { id: "6.6.2-3", label: "แก้ไขสิทธิ์การใช้งาน" },
    ]},
    { id: "6.6.3", title: "การควบคุมเอกสารและการอนุมัติ", items: [
      { id: "6.6.3-1", label: "ตรวจสอบสถานะใบเสนอราคาทั้งหมด" },
      { id: "6.6.3-2", label: "ตรวจสอบสถานะใบสั่งซื้อ" },
      { id: "6.6.3-3", label: "อนุมัติ / ปฏิเสธเอกสาร" },
      { id: "6.6.3-4", label: "ดูประวัติเอกสาร (ใบเสนอราคา, ใบสั่งซื้อ, ใบวางบิล)" },
    ]},
  ]},
];

const ALL_ITEMS = SECTIONS.flatMap(s => s.sub.flatMap(sub => sub.items));
const TOTAL = ALL_ITEMS.length;

type ItemState = { checked: boolean; note: string };

// ── Component ──────────────────────────────────────────────────────────────
export default function ChecklistPage() {
  const [theme, setTheme]       = useState("mastercard");
  const [state, setState]       = useState<Record<string, ItemState>>({});
  const [loading, setLoading]   = useState(true);
  const [destroyed, setDestroyed] = useState(false);
  const [modal, setModal]       = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const printRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pick = () => setTheme(localStorage.getItem("theme") || "mastercard");
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch("/api/checklist")
      .then(r => r.json())
      .then((rows: { itemId: string; checked: boolean; note: string }[]) => {
        const map: Record<string, ItemState> = {};
        rows.forEach(r => { map[r.itemId] = { checked: r.checked, note: r.note }; });
        setState(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const patch = (itemId: string, update: Partial<ItemState>) =>
    fetch("/api/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, ...update }),
    });

  const toggleCheck = (itemId: string) => {
    const next = !state[itemId]?.checked;
    setState(prev => ({ ...prev, [itemId]: { checked: next, note: prev[itemId]?.note ?? "" } }));
    patch(itemId, { checked: next });
  };

  const changeNote = (itemId: string, note: string) => {
    setState(prev => ({ ...prev, [itemId]: { checked: prev[itemId]?.checked ?? false, note } }));
    clearTimeout(debounceRefs.current[itemId]);
    debounceRefs.current[itemId] = setTimeout(() => patch(itemId, { note }), 500);
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);
    try {
      await document.fonts.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH  = (canvas.height * pageW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -y, pageW, imgH);
        y += pageH;
      }
      pdf.save("checklist.pdf");
    } finally { setPdfLoading(false); }
  };

  const CONFIRM_PHRASE = "ทำลายตัวเอง";
  const openModal = () => { setConfirmText(""); setModal(true); };
  const selfDestruct = async () => {
    if (confirmText !== CONFIRM_PHRASE) return;
    setDeleting(true);
    await fetch("/api/checklist", { method: "DELETE" });
    localStorage.setItem("checklist_destroyed", "1");
    setModal(false);
    setDestroyed(true);
  };

  const checkedCount = Object.values(state).filter(v => v.checked).length;
  const pct = TOTAL > 0 ? Math.round((checkedCount / TOTAL) * 100) : 0;

  // per-section helpers
  const sectionItems = (s: typeof SECTIONS[number]) => s.sub.flatMap(sub => sub.items);
  const sectionChecked = (s: typeof SECTIONS[number]) =>
    sectionItems(s).filter(it => state[it.id]?.checked).length;

  if (destroyed) return (
    <div className="fixed inset-0 z-50 bg-error flex flex-col items-center justify-center gap-4 text-error-content">
      <svg className="w-16 h-16 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-2xl font-bold">ข้อมูลถูกลบแล้ว</p>
      <p className="opacity-60 text-sm">หน้านี้จะถูกลบออกจาก codebase ในภายหลัง</p>
    </div>
  );

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-warning font-mono mb-1">// TODO: DELETE THIS PAGE AFTER SUBMISSION</p>
            <h1 className="text-2xl font-bold text-base-content">Checklist งานระบบ</h1>
            <p className="text-sm text-base-content/50 mt-0.5">ใช้ชั่วคราวสำหรับส่งครู — หน้านี้จะถูกลบออกภายหลัง</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={pdfLoading || loading}
              className="flex items-center gap-2 px-4 py-2 bg-base-content text-base-100 text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pdfLoading
                ? <span className="w-4 h-4 border-2 border-base-100/30 border-t-base-100 rounded-full animate-spin" />
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
              }
              Export PDF
            </button>
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-error text-error-content text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              ทำลายตัวเอง
            </button>
          </div>
        </div>

        {/* ── Printable area ── */}
        <div ref={printRef} className="space-y-5 bg-base-200 pb-2">

          {/* Overall progress */}
          <div className="bg-base-100 rounded-2xl border border-base-300 p-5 shadow-sm">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-base-content/40 uppercase tracking-widest mb-0.5">ความคืบหน้าทั้งหมด</p>
                <p className="text-3xl font-bold text-base-content tabular-nums">
                  {pct}<span className="text-lg text-base-content/40 font-normal">%</span>
                </p>
              </div>
              <p className="text-sm text-base-content/50 font-mono mb-1">{checkedCount} / {TOTAL} รายการ</p>
            </div>
            <div className="w-full h-3 bg-base-300 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? "var(--color-success)"
                    : `linear-gradient(90deg, var(--color-success) 0%, var(--color-primary) 100%)`,
                }}
              />
            </div>
            {pct === 100 && (
              <p className="text-xs text-success font-semibold mt-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                ครบทุกรายการแล้ว!
              </p>
            )}
          </div>

          {/* Sections */}
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : SECTIONS.map(section => {
            const sDone  = sectionChecked(section);
            const sTotal = sectionItems(section).length;
            const sFull  = sDone === sTotal;
            return (
              <div key={section.id} className={`rounded-2xl border shadow-sm overflow-hidden transition-colors duration-300 ${
                sFull ? "border-success/40 bg-success/5" : "border-base-300 bg-base-100"
              }`}>

                {/* Section header */}
                <div className={`px-5 py-3.5 flex items-center justify-between transition-colors duration-300 ${
                  sFull ? "bg-success text-success-content" : "bg-neutral text-neutral-content"
                }`}>
                  <div className="flex items-center gap-2.5">
                    {sFull && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <h2 className="font-bold text-sm">{section.id} {section.title}</h2>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    sFull ? "bg-success-content/20 text-success-content" : "bg-neutral-content/15 text-neutral-content/70"
                  }`}>
                    {sDone}/{sTotal}
                  </span>
                </div>

                {/* Subsections */}
                {section.sub.map(sub => (
                  <div key={sub.id}>
                    <div className="px-5 py-2 bg-base-200/60 border-b border-base-300/50">
                      <p className="text-xs font-semibold text-base-content/45 uppercase tracking-wide">
                        {sub.id} {sub.title}
                      </p>
                    </div>
                    <ul className="divide-y divide-base-200/80">
                      {sub.items.map((item, idx) => {
                        const s = state[item.id];
                        const done = !!s?.checked;
                        return (
                          <li
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            className={`px-5 py-3.5 cursor-pointer transition-all duration-200 border-l-4 ${
                              done
                                ? "bg-success/8 border-l-success"
                                : "border-l-transparent hover:bg-base-200/60 hover:border-l-base-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Custom checkbox */}
                              <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                                done
                                  ? "bg-success border-success"
                                  : "border-base-content/25 bg-base-100"
                              }`}>
                                {done && (
                                  <svg className="w-3 h-3 text-success-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <span className={`text-sm transition-all duration-200 ${
                                  done ? "line-through text-base-content/35" : "text-base-content"
                                }`}>
                                  {idx + 1}) {item.label}
                                </span>
                                {done && s?.note && (
                                  <p className="text-xs text-success/70 mt-0.5 not-italic">{s.note}</p>
                                )}
                                {!done && (
                                  <textarea
                                    className="mt-1.5 w-full text-xs text-base-content/60 bg-base-200 border border-base-300 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-base-content/30 transition-colors placeholder:text-base-content/20"
                                    rows={1}
                                    placeholder="เพิ่มหมายเหตุ..."
                                    value={s?.note ?? ""}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => changeNote(item.id, e.target.value)}
                                    onFocus={e => { e.target.rows = 3; }}
                                    onBlur={e => { if (!e.target.value) e.target.rows = 1; }}
                                  />
                                )}
                              </div>

                              {done && (
                                <span className="shrink-0 text-xs text-success font-semibold mt-0.5">✓ เสร็จ</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Self-destruct modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-base-content">ยืนยันการทำลายข้อมูล</h3>
                <p className="text-sm text-base-content/50 mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="bg-error/8 border border-error/20 rounded-xl p-3 text-sm text-error space-y-1">
              <p className="font-medium">สิ่งที่จะเกิดขึ้น:</p>
              <ul className="list-disc list-inside space-y-0.5 opacity-80">
                <li>ข้อมูล checkbox และหมายเหตุทั้งหมดจะถูกลบออกจาก database</li>
                <li>link checklist จะหายออกจาก navbar</li>
                <li>ไม่สามารถกู้คืนได้</li>
              </ul>
            </div>
            <div>
              <label className="text-sm text-base-content/60 block mb-1.5">
                พิมพ์ <span className="font-mono font-bold text-base-content">ทำลายตัวเอง</span> เพื่อยืนยัน
              </label>
              <input
                type="text"
                autoFocus
                className="w-full border border-base-300 rounded-xl px-3 py-2 text-sm font-mono bg-base-200 focus:outline-none focus:border-error/50 transition-colors"
                placeholder="ทำลายตัวเอง"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") selfDestruct(); }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 py-2.5 rounded-xl border border-base-300 text-sm text-base-content hover:bg-base-200 transition-colors"
                onClick={() => setModal(false)}
              >
                ยกเลิก
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-error text-error-content text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={confirmText !== CONFIRM_PHRASE || deleting}
                onClick={selfDestruct}
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-error-content/30 border-t-error-content rounded-full animate-spin" />}
                ยืนยันการทำลาย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
