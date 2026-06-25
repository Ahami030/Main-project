// TODO: DELETE THIS PAGE AFTER SUBMISSION — หน้านี้ใช้ชั่วคราวสำหรับส่งครูเท่านั้น
"use client";

import { useEffect, useRef, useState } from "react";

// ── Checklist data ─────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "6.1", title: "ระบบจัดการสมาชิก",
    sub: [
      { id: "6.1.1", title: "การสมัครสมาชิก", items: [
        { id: "6.1.1-1", label: "กรอกแบบฟอร์มสมัครสมาชิก" },
        { id: "6.1.1-2", label: "บันทึกข้อมูลเข้าสู่ระบบ" },
      ]},
      { id: "6.1.2", title: "การเข้าสู่ระบบ", items: [
        { id: "6.1.2-1", label: "เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน" },
        { id: "6.1.2-2", label: "แก้ไขข้อมูลส่วนตัว" },
        { id: "6.1.2-3", label: "บันทึกข้อมูล" },
      ]},
    ],
  },
  {
    id: "6.2", title: "ระบบใบเสนอราคา",
    sub: [
      { id: "6.2.1", title: "การกรอกแบบฟอร์มใบเสนอราคา (ลูกค้า)", items: [
        { id: "6.2.1-1", label: "อัปโหลดไฟล์รายการสินค้า (PDF เท่านั้น)" },
        { id: "6.2.1-2", label: "แสดงรายละเอียดเอกสารก่อนส่งเข้าสู่ระบบ" },
        { id: "6.2.1-3", label: "ส่งไฟล์เข้าสู่ระบบ Workflow ของ n8n" },
      ]},
      { id: "6.2.2", title: "ระบบต่อรองใบเสนอราคา (ฉบับร่าง)", items: [
        { id: "6.2.2-1", label: "รับข้อมูล JSON ที่แปลงจากไฟล์ PDF ผ่าน AI และ n8n Workflow" },
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
    ],
  },
  {
    id: "6.3", title: "ระบบใบสั่งซื้อ",
    sub: [
      { id: "6.3.1", title: "การกรอกแบบฟอร์มใบสั่งซื้อ (ลูกค้า)", items: [
        { id: "6.3.1-1", label: "อัปโหลดไฟล์รายการสินค้า (PDF เท่านั้น)" },
        { id: "6.3.1-2", label: "แสดงรายละเอียดเอกสารก่อนส่งเข้าสู่ระบบ" },
      ]},
      { id: "6.3.2", title: "การตรวจสอบและยืนยันใบสั่งซื้อ (พนักงาน)", items: [
        { id: "6.3.2-1", label: "ตรวจสอบข้อมูลใบสั่งซื้อ" },
        { id: "6.3.2-2", label: "ยืนยันใบสั่งซื้อ" },
        { id: "6.3.2-3", label: "พิมพ์เอกสารใบสั่งซื้อ" },
      ]},
    ],
  },
  {
    id: "6.4", title: "ระบบใบวางบิล",
    sub: [
      { id: "6.4.x", title: "ฟีเจอร์", items: [
        { id: "6.4.1", label: "จัดการข้อมูลพื้นฐานของระบบ" },
        { id: "6.4.2", label: "เพิ่มข้อมูลใบส่งของ/ใบกำกับภาษี" },
        { id: "6.4.3", label: "จัดเก็บและแสดงวันหมดอายุของใบวางบิล" },
        { id: "6.4.4", label: "สรุปรายการยอดเงินและรายละเอียดทั้งหมด" },
        { id: "6.4.5", label: "พิมพ์เอกสารใบวางบิล" },
      ]},
    ],
  },
  {
    id: "6.5", title: "ระบบตรวจสอบการชำระเงิน",
    sub: [
      { id: "6.5.x", title: "ฟีเจอร์", items: [
        { id: "6.5.1", label: "ส่งหลักฐานการโอนเงิน" },
        { id: "6.5.2", label: "ตรวจสอบข้อมูลการโอนเงิน" },
        { id: "6.5.3", label: "ยืนยันหลักฐานการชำระเงิน" },
      ]},
    ],
  },
  {
    id: "6.6", title: "ระบบผู้ดูแลระบบ (Admin)",
    sub: [
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
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap(s => s.sub.flatMap(sub => sub.items));
const TOTAL = ALL_ITEMS.length;

type ItemState = { checked: boolean; note: string };

// ── Component ──────────────────────────────────────────────────────────────
export default function ChecklistPage() {
  const [state, setState] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(true);
  const [destroyed, setDestroyed] = useState(false);
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  const patch = (itemId: string, update: Partial<ItemState>) => {
    fetch("/api/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, ...update }),
    });
  };

  const toggleCheck = (itemId: string) => {
    const next = !state[itemId]?.checked;
    setState(prev => ({ ...prev, [itemId]: { ...prev[itemId], checked: next, note: prev[itemId]?.note ?? "" } }));
    patch(itemId, { checked: next });
  };

  const changeNote = (itemId: string, note: string) => {
    setState(prev => ({ ...prev, [itemId]: { ...prev[itemId], checked: prev[itemId]?.checked ?? false, note } }));
    clearTimeout(debounceRefs.current[itemId]);
    debounceRefs.current[itemId] = setTimeout(() => patch(itemId, { note }), 500);
  };

  const selfDestruct = async () => {
    if (!confirm("ยืนยันการลบข้อมูล checklist ทั้งหมด?")) return;
    await fetch("/api/checklist", { method: "DELETE" });
    setDestroyed(true);
  };

  const checked = Object.values(state).filter(v => v.checked).length;
  const pct = TOTAL > 0 ? Math.round((checked / TOTAL) * 100) : 0;

  if (destroyed) return (
    <div className="fixed inset-0 z-50 bg-red-950 flex flex-col items-center justify-center gap-4 text-white">
      <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-2xl font-bold">ข้อมูลถูกลบแล้ว</p>
      <p className="text-red-300 text-sm">หน้านี้จะถูกลบออกจาก codebase ในภายหลัง</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-orange-500 font-mono mb-1">// TODO: DELETE THIS PAGE AFTER SUBMISSION</p>
            <h1 className="text-2xl font-bold text-gray-900">Checklist งานระบบ</h1>
            <p className="text-sm text-gray-500 mt-0.5">ใช้ชั่วคราวสำหรับส่งครู — หน้านี้จะถูกลบออกภายหลัง</p>
          </div>
          <button
            onClick={selfDestruct}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            ทำลายตัวเอง
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">ความคืบหน้า</span>
            <span className="font-mono text-gray-500">{checked} / {TOTAL} ({pct}%)</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Sections */}
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : SECTIONS.map(section => (
          <div key={section.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-900 text-white">
              <h2 className="font-semibold text-sm">{section.id} {section.title}</h2>
            </div>
            {section.sub.map(sub => (
              <div key={sub.id}>
                <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{sub.id} {sub.title}</p>
                </div>
                <ul className="divide-y divide-gray-50">
                  {sub.items.map((item, idx) => {
                    const s = state[item.id];
                    return (
                      <li key={item.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-0.5 w-4 h-4 rounded text-green-600 border-gray-300 cursor-pointer shrink-0"
                            checked={!!s?.checked}
                            onChange={() => toggleCheck(item.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              className={`text-sm cursor-pointer ${s?.checked ? "line-through text-gray-400" : "text-gray-800"}`}
                              onClick={() => toggleCheck(item.id)}
                            >
                              {idx + 1}) {item.label}
                            </label>
                            <textarea
                              className="mt-1.5 w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                              rows={1}
                              placeholder="เพิ่มหมายเหตุ..."
                              value={s?.note ?? ""}
                              onChange={e => changeNote(item.id, e.target.value)}
                              onFocus={e => { e.target.rows = 3; }}
                              onBlur={e => { if (!e.target.value) e.target.rows = 1; }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}

      </div>
    </div>
  );
}
