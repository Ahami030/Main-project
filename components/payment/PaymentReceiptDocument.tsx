import React from "react";

export interface PaymentReceiptProps {
  receipt: {
    proofNumber: string;
    billingNumber: string;
    poNumbers: string[];
    customerName: string;
    customerEmail: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    bankName: string;
    referenceNumber: string;
    approvedAt: string;
    installmentNumber?: number;
  };
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
};

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "โอนเงินผ่านธนาคาร",
  cash:          "เงินสด",
  cheque:        "เช็ค",
};

// ─── Palette (fixed hex). Structure relies on borders + text colour so it stays
// legible in B&W / when browsers drop background colours on print. ─────────────
const GREEN  = "#166534";
const GREEN2 = "#15803d";
const INK     = "#1f2937";
const MUTED   = "#6b7280";
const FAINT   = "#9ca3af";
const LINE    = "#e5e7eb";
const TINT     = "#f0fdf4"; // green-50 — near-white / low ink

export default function PaymentReceiptDocument({ receipt }: PaymentReceiptProps) {
  const references = [
    { label: "อ้างอิงใบวางบิล", value: receipt.billingNumber },
    ...(receipt.poNumbers.length > 0 && receipt.poNumbers.join(", ") !== receipt.billingNumber
      ? [{ label: "เลขที่ PO", value: receipt.poNumbers.join(", ") }]
      : []),
    { label: "วิธีชำระ", value: `${METHOD_LABEL[receipt.paymentMethod] ?? receipt.paymentMethod}${receipt.bankName ? ` — ${receipt.bankName}` : ""}` },
    ...(receipt.referenceNumber ? [{ label: "เลขอ้างอิง", value: receipt.referenceNumber }] : []),
    { label: "วันที่โอน", value: fmtDate(receipt.paymentDate) },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
        .pr-page { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; }
        @media print {
          @page { margin: 0; size: A4; }
          html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
          #client-dashboard-content { display: none !important; }
          body * { visibility: hidden !important; }
          #payment-receipt-print-area, #payment-receipt-print-area * { visibility: visible !important; }
          .receipt-print-dialog, .receipt-print-box {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            display: block !important;
          }
          #payment-receipt-print-area {
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
          }
          #payment-receipt-print-area.pr-page {
            box-shadow: none !important;
            min-height: 0 !important;
          }
        }
      `}</style>

      <div
        id="payment-receipt-print-area"
        className="pr-page"
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          color: INK,
          width: "210mm",
          minHeight: "297mm",
          padding: "14mm 16mm 16mm",
          borderTop: `4px solid ${GREEN}`,
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
          borderBottom: `2px solid ${GREEN}`,
          marginBottom: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "50px", height: "50px",
              border: `2px dashed ${GREEN}`,
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: GREEN, fontSize: "9px", textAlign: "center", fontWeight: 600,
            }}>LOGO</div>
            <div>
              <p style={{ color: GREEN, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, fontWeight: 700 }}>บริษัท / Company</p>
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
            <p style={{ color: GREEN, fontSize: "26px", fontWeight: 800, margin: 0, letterSpacing: "0.04em" }}>ใบเสร็จรับเงิน</p>
            <p style={{ color: FAINT, fontSize: "9.5px", letterSpacing: "0.22em", margin: "2px 0 0", fontWeight: 600 }}>PAYMENT RECEIPT</p>
            <p style={{ color: INK, fontSize: "12px", letterSpacing: "0.04em", margin: "8px 0 0", fontWeight: 700 }}>
              เลขที่ {receipt.proofNumber}
            </p>
          </div>
        </div>

        {/* ── From + amount ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "14px", marginBottom: "20px" }}>

          {/* From + references */}
          <div style={{ border: `1px solid ${LINE}`, borderRadius: "12px", padding: "16px 18px" }}>
            <p style={{ color: FAINT, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 6px", fontWeight: 700 }}>รับจาก / From</p>
            <p style={{ color: INK, fontWeight: 700, fontSize: "15px", margin: "0 0 2px" }}>{receipt.customerName}</p>
            <p style={{ color: MUTED, fontSize: "11px", margin: 0 }}>{receipt.customerEmail}</p>

            <div style={{ borderTop: `1px dashed ${LINE}`, margin: "12px 0 0", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {references.map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", gap: "10px" }}>
                  <span style={{ color: FAINT, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: INK, fontWeight: 600, textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amount received — outlined card */}
          <div style={{
            borderRadius: "12px",
            border: `2px solid ${GREEN}`,
            backgroundColor: TINT,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
            <div>
              {/* paid badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "18px", height: "18px", borderRadius: "50%",
                  border: `1.5px solid ${GREEN2}`, color: GREEN2, fontSize: "11px", fontWeight: 800,
                }}>✓</span>
                <span style={{ color: GREEN2, fontWeight: 700, fontSize: "11px", letterSpacing: "0.04em" }}>รับชำระเงินแล้ว</span>
              </div>
              <p style={{ color: GREEN, fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0, fontWeight: 700 }}>ยอดที่รับชำระ</p>
              <p style={{ color: GREEN, fontSize: "30px", fontWeight: 800, margin: "2px 0 0" }}>
                {fmt(receipt.amount)} <span style={{ fontSize: "16px", fontWeight: 700 }}>฿</span>
              </p>
            </div>
            <div style={{ marginTop: "12px", borderTop: `1px solid ${GREEN}`, paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: MUTED, fontSize: "10.5px" }}>วันที่อนุมัติ</span>
              <span style={{ color: INK, fontSize: "12.5px", fontWeight: 700 }}>{fmtDate(receipt.approvedAt)}</span>
            </div>
          </div>
        </div>

        {/* ── Line item table ─────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: TINT }}>
              <th style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, fontSize: "12px", color: GREEN, borderTop: `2px solid ${GREEN}`, borderBottom: `2px solid ${GREEN}` }}>รายการ</th>
              <th style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, fontSize: "12px", color: GREEN, width: "30%", borderTop: `2px solid ${GREEN}`, borderBottom: `2px solid ${GREEN}` }}>จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${LINE}` }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "13px", color: INK }}>{receipt.proofNumber}</p>
                <p style={{ margin: "3px 0 0", fontSize: "11px", color: MUTED }}>
                  ค่าสินค้า/บริการ{receipt.installmentNumber && receipt.installmentNumber > 1 ? ` (งวดที่ ${receipt.installmentNumber})` : ""}
                </p>
              </td>
              <td style={{ padding: "12px 14px", textAlign: "right", borderBottom: `1px solid ${LINE}`, fontWeight: 600, fontSize: "14px", color: INK }}>
                {fmt(receipt.amount)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: "12px 14px", color: GREEN, fontWeight: 700, fontSize: "13px", textAlign: "right", borderTop: `2px solid ${GREEN}` }}>
                ยอดรวมทั้งสิ้น
              </td>
              <td style={{ padding: "12px 14px", textAlign: "right", color: GREEN, fontWeight: 800, fontSize: "15px", borderTop: `2px solid ${GREEN}` }}>
                {fmt(receipt.amount)} ฿
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Signatures ──────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginTop: "30px" }}>
          {[
            { role: "ผู้รับเงิน / Receiver", name: "หจก.แพร่สงวนพาณิชย์" },
            { role: "ผู้ชำระเงิน / Payer", name: receipt.customerName },
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

        {/* ── Footer note ─────────────────────────────────────────── */}
        <div style={{ marginTop: "28px", paddingTop: "12px", borderTop: `1px dashed ${LINE}`, textAlign: "center" }}>
          <p style={{ fontSize: "10.5px", color: FAINT, margin: 0 }}>
            ขอบคุณที่ใช้บริการ — เอกสารนี้ออกโดยระบบอัตโนมัติ
          </p>
        </div>
      </div>
    </>
  );
}
