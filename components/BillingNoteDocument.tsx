import React from "react";

export interface TaxInvoice {
  _id?: string;
  ref?: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
}

export interface BillingNoteProps {
  po: {
    poNumber?: string;          // single PO (old system, no group)
    poNumbers?: string[];       // multi-PO (billing group or single wrapped in array)
    billingGroupId?: string;    // billing group ID for display
    userName: string;
    userEmail: string;
    taxInvoices: TaxInvoice[];
    billedAt?: string | null;
    createdAt: string;
  };
  /** DOM id used as the print/PDF target. Pass "" to render without an id
   *  (e.g. an on-screen modal preview while a separate copy carries the id). */
  domId?: string;
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
};

const addDays = (d: string | null | undefined, days: number) => {
  if (!d) return null;
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const CREDIT_DAYS = 30;

// ─── Palette (fixed hex). Structure relies on borders + text colour so the
// document stays legible in B&W / when the browser drops background colours
// on print. Light tints are a colour-PDF bonus only — never load-bearing. ────
const MAROON = "#9f1239";
const INK     = "#1f2937";
const MUTED   = "#6b7280";
const FAINT   = "#9ca3af";
const LINE    = "#e5e7eb";
const TINT     = "#fdf2f4"; // very light rose — prints near-white / low ink

export default function BillingNoteDocument({ po, domId = "billing-note-print-area" }: BillingNoteProps) {
  const grand = po.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
  const dueDate = addDays(po.billedAt, CREDIT_DAYS);

  const displayPoNumbers = po.poNumbers && po.poNumbers.length > 0
    ? po.poNumbers
    : po.poNumber
      ? [po.poNumber]
      : [];

  const billingRef = po.billingGroupId ?? displayPoNumbers[0] ?? "-";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
        .bn-page { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; }
        @media print {
          @page { margin: 0; size: A4; }
          html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
          body * { visibility: hidden !important; }
          #billing-note-print-area, #billing-note-print-area * { visibility: visible !important; }
          #billing-note-print-area {
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
          }
          #billing-note-print-area .bn-page {
            box-shadow: none !important;
            min-height: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div
        id={domId || undefined}
        className="bn-page"
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          color: INK,
          width: "210mm",
          minHeight: "297mm",
          padding: "14mm 16mm 16mm",
          borderTop: `4px solid ${MAROON}`,
          fontSize: "13px",
          lineHeight: "1.6",
          boxSizing: "border-box",
          margin: "0 auto",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingBottom: "14px",
          borderBottom: `2px solid ${MAROON}`,
          marginBottom: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "50px", height: "50px",
              border: `2px dashed ${MAROON}`,
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: MAROON, fontSize: "9px", textAlign: "center", fontWeight: 600,
            }}>LOGO</div>
            <div>
              <p style={{ color: MAROON, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, fontWeight: 700 }}>บริษัท / Company</p>
              <p style={{ color: INK, fontSize: "18px", fontWeight: 800, margin: "3px 0 0" }}>หจก.แพร่สงวนพาณิชย์</p>
              <p style={{ color: MUTED, fontSize: "10.5px", margin: "5px 0 0", lineHeight: "1.6" }}>
                38/10 ม.3 ต.ทุ่งกวาว อ.เมือง จ.แพร่ 54000
              </p>
              <p style={{ color: FAINT, fontSize: "9.5px", margin: "1px 0 0" }}>
                โทร. 093-1625696 &nbsp;|&nbsp; เลขภาษี: 0543543000476
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: MAROON, fontSize: "27px", fontWeight: 800, margin: 0, letterSpacing: "0.04em" }}>ใบวางบิล</p>
            <div style={{
              display: "inline-block",
              border: `1.5px solid ${MAROON}`,
              color: MAROON,
              fontSize: "9.5px",
              letterSpacing: "0.24em",
              fontWeight: 700,
              borderRadius: "999px",
              padding: "2px 12px",
              marginTop: "8px",
            }}>BILLING NOTE</div>
          </div>
        </div>

        {/* ── Info + amount ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "14px", marginBottom: "20px" }}>

          {/* To + document details */}
          <div style={{ border: `1px solid ${LINE}`, borderRadius: "12px", padding: "16px 18px" }}>
            <p style={{ color: FAINT, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 6px", fontWeight: 700 }}>เรียน / To</p>
            <p style={{ color: INK, fontWeight: 700, fontSize: "15px", margin: "0 0 2px" }}>{po.userName}</p>
            <p style={{ color: MUTED, fontSize: "11px", margin: 0 }}>{po.userEmail}</p>

            <div style={{ borderTop: `1px dashed ${LINE}`, margin: "12px 0 0", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "เลขที่ใบวางบิล", value: billingRef },
                { label: "เลขที่ PO", value: displayPoNumbers.join(", ") || "-" },
                { label: "วันที่วางบิล", value: fmtDate(po.billedAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", gap: "10px" }}>
                  <span style={{ color: FAINT }}>{label}</span>
                  <span style={{ color: INK, fontWeight: 600, textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amount due — outlined card (ink-light, prints cleanly) */}
          <div style={{
            borderRadius: "12px",
            border: `2px solid ${MAROON}`,
            backgroundColor: TINT,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
          }}>
            <div>
              <p style={{ color: MAROON, fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0, fontWeight: 700 }}>ยอดที่ต้องชำระ</p>
              <p style={{ color: MAROON, fontSize: "30px", fontWeight: 800, margin: "4px 0 0" }}>
                {fmt(grand)} <span style={{ fontSize: "16px", fontWeight: 700 }}>฿</span>
              </p>
            </div>
            <div style={{ marginTop: "14px", borderTop: `1px solid ${MAROON}`, paddingTop: "10px", opacity: 0.95 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: MUTED, fontSize: "10.5px" }}>ครบกำหนดชำระ</span>
                <span style={{ color: INK, fontSize: "12.5px", fontWeight: 700 }}>{fmtDate(dueDate)}</span>
              </div>
              <div style={{
                display: "inline-block", marginTop: "8px",
                border: `1px solid ${MAROON}`,
                color: MAROON,
                borderRadius: "999px", padding: "1px 10px",
                fontSize: "10px", fontWeight: 700,
              }}>เครดิต {CREDIT_DAYS} วัน</div>
            </div>
          </div>
        </div>

        {/* ── Invoice table ───────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: TINT }}>
              {[
                { t: "ที่", w: "8%", a: "center" as const },
                { t: "เลขที่ใบกำกับภาษี / ใบส่งของ", w: "auto", a: "left" as const },
                { t: "วันที่", w: "24%", a: "center" as const },
                { t: "จำนวนเงิน (บาท)", w: "24%", a: "right" as const },
              ].map((h) => (
                <th key={h.t} style={{
                  padding: "10px 14px", textAlign: h.a, width: h.w,
                  fontWeight: 700, fontSize: "12px", color: MAROON,
                  borderTop: `2px solid ${MAROON}`,
                  borderBottom: `2px solid ${MAROON}`,
                }}>{h.t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {po.taxInvoices.map((inv, i) => (
              <tr key={inv._id ?? inv.ref ?? i}>
                <td style={{ padding: "10px 14px", textAlign: "center", borderBottom: `1px solid ${LINE}`, color: FAINT, fontSize: "12px" }}>
                  {i + 1}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${LINE}`, color: INK, fontWeight: 600 }}>
                  {inv.invoiceNumber}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center", borderBottom: `1px solid ${LINE}`, color: MUTED, fontSize: "12px" }}>
                  {inv.invoiceDate}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", borderBottom: `1px solid ${LINE}`, color: INK, fontWeight: 600 }}>
                  {fmt(inv.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: "12px 14px", color: MAROON, fontWeight: 700, fontSize: "13px", textAlign: "right", borderTop: `2px solid ${MAROON}` }}>
                ยอดรวมทั้งสิ้น
              </td>
              <td style={{ padding: "12px 14px", textAlign: "right", color: MAROON, fontWeight: 800, fontSize: "15px", borderTop: `2px solid ${MAROON}` }}>
                {fmt(grand)} ฿
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Payment terms ───────────────────────────────────────── */}
        <div style={{
          display: "flex",
          gap: "12px",
          backgroundColor: TINT,
          border: `1px solid ${LINE}`,
          borderLeft: `4px solid ${MAROON}`,
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "22px",
        }}>
          <div style={{
            flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%",
            border: `1.5px solid ${MAROON}`, color: MAROON,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", fontWeight: 800, lineHeight: 1,
          }}>!</div>
          <div style={{ fontSize: "11.5px", color: MUTED, lineHeight: "1.7" }}>
            <p style={{ margin: "0 0 2px", color: MAROON, fontWeight: 700 }}>
              เงื่อนไขการชำระเงิน · เครดิต {CREDIT_DAYS} วัน
            </p>
            <p style={{ margin: 0 }}>
              ต้องชำระเงินให้เสร็จสิ้นภายใน {CREDIT_DAYS} วัน นับจากวันที่วางบิลนี้
              — กำหนดชำระภายในวันที่ <strong style={{ color: MAROON }}>{fmtDate(dueDate)}</strong>
            </p>
          </div>
        </div>

        {/* ── Signatures ──────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginTop: "30px" }}>
          {[
            { role: "ผู้วางบิล / Biller", name: "หจก.แพร่สงวนพาณิชย์" },
            { role: "ผู้รับวางบิล / Receiver", name: po.userName },
          ].map(({ role, name }) => (
            <div key={role} style={{ textAlign: "center" }}>
              <div style={{ height: "44px" }} />
              <div style={{ borderBottom: `1px dashed ${FAINT}`, marginBottom: "8px" }} />
              <p style={{ fontSize: "11px", color: INK, fontWeight: 600, margin: "0 0 2px" }}>{role}</p>
              <p style={{ fontSize: "11px", color: MUTED, margin: "2px 0" }}>( {name} )</p>
              <p style={{ fontSize: "10px", color: FAINT, margin: "6px 0 0" }}>วันที่ ....../....../........</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
