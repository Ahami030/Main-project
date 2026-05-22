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

function convertToThaiWords(n: number): string {
  if (n === 0) return "";
  const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000);
    const r = n % 1_000_000;
    return convertToThaiWords(m) + "ล้าน" + convertToThaiWords(r);
  }
  const s = n.toString();
  const len = s.length;
  let result = "";
  for (let i = 0; i < len; i++) {
    const d = parseInt(s[i]);
    const pos = len - 1 - i;
    if (d === 0) continue;
    if (pos === 1) {
      result += d === 1 ? "สิบ" : d === 2 ? "ยี่สิบ" : digits[d] + "สิบ";
    } else if (pos === 0) {
      const tens = len >= 2 ? parseInt(s[len - 2]) : 0;
      result += d === 1 && tens !== 0 ? "เอ็ด" : digits[d];
    } else {
      result += digits[d] + positions[pos];
    }
  }
  return result;
}

function thaiNumberToWords(amount: number): string {
  if (amount === 0) return "ศูนย์บาทถ้วน";
  const [intStr, decStr] = amount.toFixed(2).split(".");
  const dec = parseInt(decStr);
  const intWords = convertToThaiWords(parseInt(intStr));
  return dec === 0
    ? intWords + "บาทถ้วน"
    : intWords + "บาท" + convertToThaiWords(dec) + "สตางค์";
}

const ITEMS_PER_PAGE = 15;

// ── Watermark ──────────────────────────────────────────────────
function Watermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <span style={{
        transform: "rotate(-45deg)",
        fontSize: "8rem",
        fontWeight: 800,
        color: "rgba(99,102,241,0.05)",
        whiteSpace: "nowrap",
        userSelect: "none",
        letterSpacing: "0.2em",
      }}>
        ตัวอย่าง
      </span>
    </div>
  );
}

// ── Table header row ───────────────────────────────────────────
function TableHead() {
  return (
    <thead>
      <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
        <th style={{ padding: "10px 8px", textAlign: "center", width: "6%", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #334155" }}>ที่</th>
        <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #334155" }}>รายการ</th>
        <th style={{ padding: "10px 8px", textAlign: "center", width: "16%", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #334155" }}>จำนวน / หน่วย</th>
        <th style={{ padding: "10px 10px", textAlign: "right", width: "16%", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #334155" }}>
          ราคามาตรฐาน<br />
          <span style={{ fontWeight: 400, fontSize: "10px", opacity: 0.7 }}>ราคากลาง</span>
        </th>
        <th style={{ padding: "10px 10px", textAlign: "right", width: "16%", fontWeight: 600, fontSize: "12px" }}>
          จำนวนเงิน<br />
          <span style={{ fontWeight: 400, fontSize: "10px", opacity: 0.7 }}>ที่ซื้อ / จ้าง</span>
        </th>
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
      .then((r) => { if (!r.ok) throw new Error("ไม่พบข้อมูล RFQ"); return r.json(); })
      .then((data) => setRfq(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  if (error || !rfq) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-base-200">
      <p className="text-error text-lg">{error || "ไม่พบข้อมูล"}</p>
      <button className="btn btn-ghost" onClick={() => router.back()}>ย้อนกลับ</button>
    </div>
  );

  // ── แบ่งหน้า ────────────────────────────────────────────────
  const items = rfq.line_items;
  const chunks: LineItem[][] = [];
  for (let i = 0; i < Math.max(items.length, 1); i += ITEMS_PER_PAGE)
    chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
  const totalPages = chunks.length;

  // ราคาสินค้า = ยอดรวมที่รวม VAT แล้ว (unit_price เป็นราคา VAT-inclusive)
  const grandTotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const vat = grandTotal * 7 / 107;          // แยก VAT ออกจากราคา (7/107)
  const subtotal = grandTotal - vat;         // ราคาก่อน VAT

  const pageBase = {
    position: "relative" as const,
    backgroundColor: "#ffffff",
    color: "#1e293b",
    width: "210mm",
    minHeight: "297mm",
    padding: "14mm 16mm",
    fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
    fontSize: "13px",
    lineHeight: "1.6",
    boxSizing: "border-box" as const,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        @media print {
          @page { margin: 0; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-base-100 border-b border-base-300 shadow-sm">
        <button className="btn btn-ghost btn-sm gap-1" onClick={() => router.back()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ย้อนกลับ
        </button>
        <span className="text-sm text-base-content/50 flex-1">ใบเสนอราคา #{rfq.rfq_number}</span>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => window.print()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* ── Pages ── */}
      <div style={{ backgroundColor: "#e2e8f0", padding: "32px 0" }} className="print:bg-white print:p-0">
        {chunks.map((pageItems, pageIdx) => {
          const isFirst = pageIdx === 0;
          const isLast = pageIdx === totalPages - 1;
          const globalStart = pageIdx * ITEMS_PER_PAGE;

          return (
            <div
              key={pageIdx}
              style={{
                ...pageBase,
                marginLeft: "auto",
                marginRight: "auto",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                marginBottom: isLast ? 0 : "24px",
              }}
              className={!isLast ? "break-after-page print:mb-0" : ""}
            >
              <Watermark />

              {/* ════════════════════════════════
                  หน้าแรก: Header + ข้อมูลเอกสาร
              ════════════════════════════════ */}
              {isFirst && (
                <>
                  {/* Document header banner */}
                  <div style={{
                    background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "44px", height: "44px",
                        border: "2px dashed rgba(255,255,255,0.3)",
                        borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "rgba(255,255,255,0.3)", fontSize: "9px", textAlign: "center",
                      }}>
                        LOGO
                      </div>
                      <div>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>บริษัท / Company</p>
                        <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: 700, margin: "2px 0 0" }}>หจก.แพร่สงวนพาณิชย์</p>
                        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", margin: "2px 0 0", lineHeight: "1.6" }}>
                          38/10 ม.3 ต.ทุ่งกวาว อ.เมือง จ.แพร่ 54000
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "9.5px", margin: "1px 0 0", letterSpacing: "0.02em" }}>
                          โทร. 093-1625696 &nbsp;|&nbsp; เลขภาษี: 0543543000476
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ color: "#ffffff", fontSize: "22px", fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>ใบเสนอราคา</p>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", letterSpacing: "0.2em", margin: "2px 0 0" }}>QUOTATION</p>
                    </div>
                  </div>

                  {/* Meta row: doc number + dates */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    gap: "10px", marginBottom: "14px",
                  }}>
                    <div style={{
                      border: "1px solid #e2e8f0", borderRadius: "6px",
                      padding: "10px 14px", backgroundColor: "#f8fafc",
                    }}>
                      <p style={{ color: "#94a3b8", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>เรียน / To</p>
                      <p style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px", margin: 0 }}>{rfq.buyer_company_name || "—"}</p>
                    </div>
                    <div style={{
                      border: "1px solid #e2e8f0", borderRadius: "6px",
                      padding: "10px 14px", backgroundColor: "#f8fafc",
                      display: "flex", flexDirection: "column" as const, gap: "3px",
                    }}>
                      {[
                        { label: "เลขที่", value: rfq.rfq_number },
                        { label: "เสนอมา ณ วันที่", value: rfq.rfq_date },
                        { label: "ยืนยันภายใน", value: rfq.due_date },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#94a3b8" }}>{label}</span>
                          <span style={{ color: "#1e293b", fontWeight: 500 }}>{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intro paragraph */}
                  <div style={{
                    backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: "6px", padding: "10px 14px", marginBottom: "14px",
                    fontSize: "12px", lineHeight: "1.8", color: "#475569",
                  }}>
                    <p style={{ margin: "0 0 4px" }}>
                      ข้าพเจ้า <strong style={{ color: "#1e293b" }}>{rfq.vendor_company_name || "[ชื่อบริษัทผู้เสนอ]"}</strong>{" "}
                      ขอเสนอราคาสินค้ารวมทั้งบริการและกำหนดเวลาส่งมอบตามรายการดังต่อไปนี้
                    </p>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "11px" }}>
                      ข้าพเจ้าขอรับรองว่าเป็นผู้มีคุณสมบัติครบถ้วนตามที่กำหนดและไม่เป็นผู้ทิ้งงานทางราชการ
                    </p>
                  </div>
                </>
              )}

              {/* หน้าถัดไป: mini header */}
              {!isFirst && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: "14px", paddingBottom: "10px",
                  borderBottom: "2px solid #1e293b",
                }}>
                  <p style={{ fontWeight: 700, color: "#1e293b", margin: 0 }}>หจก.แพร่สงวนพาณิชย์ — ใบเสนอราคา</p>
                  <p style={{ color: "#94a3b8", fontSize: "11px", margin: 0 }}>
                    เลขที่ {rfq.rfq_number} | หน้า {pageIdx + 1}/{totalPages}
                  </p>
                </div>
              )}

              {/* ════════════════════
                  ตารางรายการ
              ════════════════════ */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                <TableHead />
                <tbody>
                  {pageItems.map((item, idx) => {
                    const globalIdx = globalStart + idx;
                    const amount = item.quantity * item.unit_price;
                    const isEven = globalIdx % 2 === 0;
                    return (
                      <tr key={globalIdx} style={{ backgroundColor: isEven ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "9px 8px", textAlign: "center", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", color: "#64748b", fontSize: "12px" }}>
                          {item.item_number ?? globalIdx + 1}
                        </td>
                        <td style={{ padding: "9px 12px", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", color: "#1e293b" }}>
                          {item.description || "—"}
                        </td>
                        <td style={{ padding: "9px 8px", textAlign: "center", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", color: "#475569", fontSize: "12px" }}>
                          {item.quantity} {item.unit || ""}
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", color: "#475569" }}>
                          {fmt(item.unit_price)}
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontWeight: 500 }}>
                          {fmt(amount)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* empty rows */}
                  {isFirst && isLast && pageItems.length < 8 &&
                    Array.from({ length: 8 - pageItems.length }).map((_, i) => (
                      <tr key={`e${i}`} style={{ backgroundColor: (pageItems.length + i) % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        {[0, 1, 2, 3, 4].map((_, j) => (
                          <td key={j} style={{ padding: "9px 8px", borderBottom: "1px solid #f1f5f9", borderRight: j < 4 ? "1px solid #f1f5f9" : undefined }}>&nbsp;</td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* ════════════════════
                  หน้าสุดท้าย
              ════════════════════ */}
              {isLast && (
                <>
                  {/* Summary */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "16px" }}>
                    {/* Amount in words (placeholder) */}
                    <div style={{ flex: 1, fontSize: "11px", color: "#64748b", paddingTop: "4px" }}>
                      <span style={{ fontStyle: "italic" }}>(</span>
                      <span style={{ fontStyle: "italic", color: "#475569" }}>
                        {grandTotal > 0 ? thaiNumberToWords(grandTotal) : "—"}
                      </span>
                      <span style={{ fontStyle: "italic" }}>)</span>
                    </div>

                    {/* Summary box */}
                    <div style={{ width: "220px", border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden", fontSize: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", backgroundColor: "#1e293b", borderBottom: "1px solid #334155" }}>
                        <span style={{ color: "#ffffff", fontWeight: 600 }}>รวมเงิน</span>
                        <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "13px" }}>{fmt(grandTotal)} ฿</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ color: "#64748b" }}>ภาษีมูลค่าเพิ่ม 7%</span>
                        <span style={{ color: "#ef4444", fontWeight: 500 }}>-{fmt(vat)} ฿</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", backgroundColor: "#ffffff" }}>
                        <span style={{ color: "#64748b" }}>ราคาสินค้า</span>
                        <span style={{ color: "#1e293b", fontWeight: 600 }}>{fmt(subtotal)} ฿</span>
                      </div>
                    </div>
                  </div>

                  {/* Conditions */}
                  {(() => {
                    const tc = rfq.terms_and_conditions as Record<string, string>;
                    const deliveryTime = tc?.delivery_time || "7 วัน";
                    const paymentTerms = tc?.payment_terms;
                    const deliveryLocation = tc?.delivery_location;
                    return (
                      <div style={{
                        backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
                        borderRadius: "6px", padding: "12px 16px", marginBottom: "20px",
                        fontSize: "12px", color: "#475569", lineHeight: "1.9",
                      }}>
                        {/* Amount in words */}
                        <p style={{ margin: "0 0 6px", textAlign: "center", color: "#1e293b", fontWeight: 500 }}>
                          จำนวนเงินรวมทั้งสิ้น {fmt(grandTotal)} บาท ({thaiNumberToWords(grandTotal)})
                        </p>
                        <div style={{ borderTop: "1px solid #e2e8f0", marginBottom: "8px" }} />
                        {/* Numbered conditions */}
                        <p style={{ margin: "0 0 2px" }}>
                          1. ราคานี้เป็นราคาที่รวมภาษีมูลค่าเพิ่ม รวมทั้งภาษีอากรอื่นและค่าใช้จ่ายทั้งปวงไว้ด้วยแล้ว
                        </p>
                        {paymentTerms && (
                          <p style={{ margin: "0 0 2px" }}>
                            2. เงื่อนไขการชำระเงิน: {paymentTerms}
                          </p>
                        )}
                        <p style={{ margin: "0 0 2px" }}>
                          {paymentTerms ? "3" : "2"}. ราคาที่ยื่นเสนอยืนอยู่ได้ภายในกำหนด 15 วัน นับตั้งแต่วันที่ได้ยื่นใบเสนอราคา
                        </p>
                        <p style={{ margin: "0 0 2px" }}>
                          {paymentTerms ? "4" : "3"}. กำหนดส่งมอบพัสดุตามรายละเอียดรายการข้างต้นภายใน {deliveryTime} นับถัดจากวันลงนาม
                          {deliveryLocation && <> ณ {deliveryLocation}</>}
                        </p>
                        {/* Proposal date */}
                        <p style={{ textAlign: "center", marginTop: "10px", marginBottom: 0, color: "#64748b", fontSize: "11px" }}>
                          เสนอมา ณ วันที่ {rfq.rfq_date || "......"}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Signatures */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    {/* Buyer / negotiator */}
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 24px" }}>ผู้ต่อรองราคา / Negotiator</p>
                      <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "8px" }}>
                        <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 2px" }}>ลงชื่อ .............................................</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0" }}>( {rfq.buyer_company_name || "................................."} )</p>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "4px 0 0" }}>วันที่ ....../....../........</p>
                      </div>
                    </div>

                    {/* Vendor / proposer */}
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 24px" }}>ผู้เสนอราคา / Authorized by</p>
                      <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "8px" }}>
                        <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 2px" }}>ลงชื่อ .............................................</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0" }}>( {rfq.vendor_company_name || "................................."} )</p>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "4px 0 0" }}>วันที่ ....../....../........</p>
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
