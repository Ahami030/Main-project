"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LineItem = {
  item_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
};

type RFQData = {
  _id: string;
  rfq_number: string;
  rfq_date: string;
  due_date: string;
  buyer_company_name: string;
  vendor_company_name: string;
  line_items: LineItem[];
  terms_and_conditions: Record<string, unknown>;
};

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ITEMS_PER_PAGE = 15;

// ── Watermark (ใช้ซ้ำทุกหน้า) ─────────────────────────────────
function Watermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <span
        style={{
          transform: "rotate(-45deg)",
          fontSize: "9rem",
          fontWeight: 800,
          color: "rgba(0,0,0,0.06)",
          whiteSpace: "nowrap",
          userSelect: "none",
          letterSpacing: "0.15em",
        }}
      >
        ตัวอย่าง
      </span>
    </div>
  );
}

// ── Table header row ──────────────────────────────────────────
function TableHead() {
  return (
    <thead>
      <tr className="bg-gray-800 text-white">
        <th className="py-2 px-2 text-center w-[6%]">ลำดับ</th>
        <th className="py-2 px-3 text-left">รายการสินค้า / บริการ</th>
        <th className="py-2 px-2 text-center w-[10%]">จำนวน</th>
        <th className="py-2 px-2 text-center w-[8%]">หน่วย</th>
        <th className="py-2 px-3 text-right w-[15%]">ราคา/หน่วย (฿)</th>
        <th className="py-2 px-3 text-right w-[15%]">จำนวนเงิน (฿)</th>
      </tr>
    </thead>
  );
}

export default function PrototypePage() {
  const { id } = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/rfq/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("ไม่พบข้อมูล RFQ");
        return r.json();
      })
      .then((data) => setRfq(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-base-200">
        <p className="text-error text-lg">{error || "ไม่พบข้อมูล"}</p>
        <button className="btn btn-ghost" onClick={() => router.back()}>
          ย้อนกลับ
        </button>
      </div>
    );
  }

  // ── แบ่ง line_items เป็น chunks ────────────────────────────
  const items = rfq.line_items;
  const chunks: LineItem[][] = [];
  for (let i = 0; i < Math.max(items.length, 1); i += ITEMS_PER_PAGE) {
    chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
  }
  const totalPages = chunks.length;

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const vat = subtotal * 0.07;
  const grandTotal = subtotal + vat;

  const hasTerms =
    rfq.terms_and_conditions &&
    Object.keys(rfq.terms_and_conditions).length > 0;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-base-100 border-b border-base-300 shadow-sm">
        <button className="btn btn-ghost btn-sm gap-1" onClick={() => router.back()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ย้อนกลับ
        </button>
        <span className="text-sm text-base-content/50 flex-1">
          ใบเสนอราคา #{rfq.rfq_number}
        </span>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => window.print()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* ── Pages wrapper ── */}
      <div className="print:bg-white bg-base-200 py-8 print:py-0">
        {chunks.map((pageItems, pageIdx) => {
          const isFirst = pageIdx === 0;
          const isLast = pageIdx === totalPages - 1;
          const globalStart = pageIdx * ITEMS_PER_PAGE; // offset สำหรับ empty-row padding

          return (
            <div
              key={pageIdx}
              className={[
                "relative mx-auto bg-white text-gray-800",
                "w-[210mm] min-h-[297mm]",
                "px-[15mm] py-[12mm]",
                "shadow-xl print:shadow-none font-sans text-[13px]",
                // หน้าที่ไม่ใช่หน้าสุดท้าย: เว้นช่องระหว่างหน้าบนหน้าจอ + break สำหรับพิมพ์
                !isLast ? "mb-8 print:mb-0 break-after-page" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Watermark />

              {/* ── หน้าแรก: Header + Info ── */}
              {isFirst && (
                <>
                  <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-xs text-center leading-tight">
                        LOGO
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">บริษัท</p>
                        <p className="text-lg font-bold text-gray-800 leading-tight">[ชื่อบริษัท]</p>
                        <p className="text-xs text-gray-500 mt-0.5">ที่อยู่บริษัท กรุงเทพมหานคร 10000</p>
                        <p className="text-xs text-gray-500">โทร. 02-XXX-XXXX | อีเมล: info@company.com</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800 tracking-wide">ใบเสนอราคา</p>
                      <p className="text-sm text-gray-500 tracking-widest">QUOTATION</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="border border-gray-200 rounded p-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">เรียน / To</p>
                      <p className="font-semibold text-gray-800">{rfq.buyer_company_name || "—"}</p>
                    </div>
                    <div className="border border-gray-200 rounded p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">เลขที่</span>
                        <span className="font-medium">{rfq.rfq_number || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">วันที่</span>
                        <span className="font-medium">{rfq.rfq_date || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">ยืนยันภายใน</span>
                        <span className="font-medium">{rfq.due_date || "—"}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── หน้าถัดไป: mini header ── */}
              {!isFirst && (
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-300">
                  <p className="text-sm font-semibold text-gray-600">[ชื่อบริษัท] — ใบเสนอราคา</p>
                  <p className="text-xs text-gray-400">
                    เลขที่ {rfq.rfq_number} | หน้า {pageIdx + 1}/{totalPages}
                  </p>
                </div>
              )}

              {/* ── ตารางรายการ ── */}
              <table className="w-full border-collapse mb-6 text-sm">
                <TableHead />
                <tbody>
                  {pageItems.map((item, idx) => {
                    const globalIdx = globalStart + idx;
                    const amount = item.quantity * item.unit_price;
                    return (
                      <tr key={globalIdx} className={globalIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-2 px-2 text-center border-b border-gray-100">
                          {item.item_number ?? globalIdx + 1}
                        </td>
                        <td className="py-2 px-3 border-b border-gray-100">{item.description || "—"}</td>
                        <td className="py-2 px-2 text-center border-b border-gray-100">{item.quantity}</td>
                        <td className="py-2 px-2 text-center border-b border-gray-100">{item.unit || "—"}</td>
                        <td className="py-2 px-3 text-right border-b border-gray-100">{fmt(item.unit_price)}</td>
                        <td className="py-2 px-3 text-right border-b border-gray-100 font-medium">{fmt(amount)}</td>
                      </tr>
                    );
                  })}
                  {/* empty rows เมื่อรายการน้อยกว่า 5 (หน้าแรกหน้าเดียว) */}
                  {isFirst && isLast && pageItems.length < 5 &&
                    Array.from({ length: 5 - pageItems.length }).map((_, i) => (
                      <tr key={`empty-${i}`} className={(pageItems.length + i) % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="py-3 px-2 border-b border-gray-100">&nbsp;</td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* ── หน้าสุดท้าย: Summary + Terms + Signature ── */}
              {isLast && (
                <>
                  <div className="flex justify-end mb-8">
                    <div className="w-64 border border-gray-200 rounded overflow-hidden text-sm">
                      <div className="flex justify-between px-4 py-2 bg-gray-50">
                        <span className="text-gray-600">ยอดรวมสุทธิ</span>
                        <span className="font-medium">{fmt(subtotal)} ฿</span>
                      </div>
                      <div className="flex justify-between px-4 py-2">
                        <span className="text-gray-600">ภาษีมูลค่าเพิ่ม 7%</span>
                        <span className="font-medium">{fmt(vat)} ฿</span>
                      </div>
                      <div className="flex justify-between px-4 py-2 bg-gray-800 text-white font-bold">
                        <span>รวมทั้งสิ้น</span>
                        <span>{fmt(grandTotal)} ฿</span>
                      </div>
                    </div>
                  </div>

                  {hasTerms && (
                    <div className="mb-8 p-3 border border-gray-200 rounded bg-gray-50">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                        เงื่อนไขและข้อกำหนด
                      </p>
                      <div className="text-xs text-gray-600 space-y-1">
                        {Object.entries(rfq.terms_and_conditions).map(([k, v]) => (
                          <p key={k}>
                            <span className="font-medium">{k}:</span> {String(v)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-8 mt-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-8">ผู้เสนอราคา / Authorized by</p>
                      <div className="border-t border-gray-400 pt-2">
                        <p className="text-xs text-gray-500">ลงชื่อ .................................................</p>
                        <p className="text-xs text-gray-500 mt-1">
                          ({rfq.vendor_company_name || "................................."})
                        </p>
                        <p className="text-xs text-gray-400 mt-1">วันที่ ....../....../........</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-8">ผู้อนุมัติ / Approved by</p>
                      <div className="border-t border-gray-400 pt-2">
                        <p className="text-xs text-gray-500">ลงชื่อ .................................................</p>
                        <p className="text-xs text-gray-500 mt-1">(.................................)</p>
                        <p className="text-xs text-gray-400 mt-1">วันที่ ....../....../........</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
