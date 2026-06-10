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

export default function PaymentReceiptDocument({ receipt }: PaymentReceiptProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        .pr-page { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; }
        @media print {
          body * { visibility: hidden !important; }
          #payment-receipt-print-area, #payment-receipt-print-area * { visibility: visible !important; }
          #payment-receipt-print-area {
            position: absolute !important;
            top: 0; left: 0; width: 100%;
          }
        }
      `}</style>

      <div
        id="payment-receipt-print-area"
        className="pr-page"
        style={{
          backgroundColor: "#ffffff",
          color: "#1e293b",
          width: "210mm",
          minHeight: "297mm",
          padding: "14mm 16mm",
          fontSize: "13px",
          lineHeight: "1.6",
          boxSizing: "border-box",
          margin: "0 auto",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        }}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "20px",
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
            }}>LOGO</div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>บริษัท / Company</p>
              <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: 700, margin: "2px 0 0" }}>หจก.แพร่สงวนพาณิชย์</p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", margin: "2px 0 0", lineHeight: "1.6" }}>
                38/10 ม.3 ต.ทุ่งกวาว อ.เมือง จ.แพร่ 54000
              </p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "9.5px", margin: "1px 0 0" }}>
                โทร. 093-1625696 &nbsp;|&nbsp; เลขภาษี: 0543543000476
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#ffffff", fontSize: "22px", fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>ใบเสร็จรับเงิน</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", letterSpacing: "0.2em", margin: "2px 0 0" }}>PAYMENT RECEIPT</p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "11px", letterSpacing: "0.05em", margin: "6px 0 0", fontWeight: 600 }}>
              เลขที่ {receipt.proofNumber}
            </p>
          </div>
        </div>

        {/* Approved stamp */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#dcfce7",
          border: "1.5px solid #16a34a",
          borderRadius: "999px",
          padding: "5px 16px 5px 8px",
          marginBottom: "20px",
        }}>
          <span style={{
            width: "20px", height: "20px", borderRadius: "50%",
            backgroundColor: "#16a34a",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#ffffff", fontSize: "12px", fontWeight: 700, lineHeight: 1,
          }}>✓</span>
          <p style={{ color: "#15803d", fontWeight: 700, fontSize: "13px", margin: 0, letterSpacing: "0.08em" }}>
            รับชำระเงินแล้ว
          </p>
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderLeft: "3px solid #94a3b8", borderRadius: "6px", padding: "10px 14px", backgroundColor: "#f8fafc" }}>
            <p style={{ color: "#94a3b8", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>รับจาก / From</p>
            <p style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px", margin: "0 0 2px" }}>{receipt.customerName}</p>
            <p style={{ color: "#64748b", fontSize: "11px", margin: 0 }}>{receipt.customerEmail}</p>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderLeft: "3px solid #16a34a", borderRadius: "6px", padding: "10px 14px", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { label: "อ้างอิงใบวางบิล", value: receipt.billingNumber },
              ...(receipt.poNumbers.length > 0 && receipt.poNumbers.join(", ") !== receipt.billingNumber
                ? [{ label: "เลขที่ PO", value: receipt.poNumbers.join(", ") }]
                : []),
              { label: "วิธีชำระ",        value: `${METHOD_LABEL[receipt.paymentMethod] ?? receipt.paymentMethod}${receipt.bankName ? ` — ${receipt.bankName}` : ""}` },
              ...(receipt.referenceNumber ? [{ label: "เลขอ้างอิง", value: receipt.referenceNumber }] : []),
              { label: "วันที่โอน",       value: fmtDate(receipt.paymentDate) },
              { label: "วันที่อนุมัติ",    value: fmtDate(receipt.approvedAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "#94a3b8", flexShrink: 0, marginRight: "8px" }}>{label}</span>
                <span style={{ color: "#1e293b", fontWeight: 500, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment details table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: "#166534", color: "#ffffff" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #15803d" }}>รายการ</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: "12px", width: "28%" }}>จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: "#f0fdf4" }}>
              <td style={{ padding: "12px", borderBottom: "1px solid #dcfce7", borderRight: "1px solid #dcfce7" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>
                  {receipt.proofNumber}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>
                  ค่าสินค้า/บริการ{receipt.installmentNumber && receipt.installmentNumber > 1 ? ` (งวดที่ ${receipt.installmentNumber})` : ""}
                </p>
              </td>
              <td style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dcfce7", fontWeight: 600, fontSize: "14px" }}>
                {fmt(receipt.amount)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: "#166534" }}>
              <td style={{ padding: "11px 12px", color: "#ffffff", fontWeight: 700, fontSize: "13px" }}>
                ยอดรวมทั้งสิ้น
              </td>
              <td style={{ padding: "11px 12px", textAlign: "right", color: "#ffffff", fontWeight: 700, fontSize: "15px" }}>
                {fmt(receipt.amount)} ฿
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "40px" }}>
          {[
            { role: "ผู้รับเงิน / Receiver", name: "หจก.แพร่สงวนพาณิชย์" },
            { role: "ผู้ชำระเงิน / Payer", name: receipt.customerName },
          ].map(({ role, name }) => (
            <div key={role} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px" }}>{role}</p>
              <div style={{ height: "48px", borderBottom: "1px solid #94a3b8", marginBottom: "8px" }} />
              <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 4px" }}>ลงชื่อ .............................................</p>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0" }}>( {name} )</p>
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: "6px 0 0" }}>วันที่ ....../....../........</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0", textAlign: "center" }}>
          <p style={{ fontSize: "10.5px", color: "#94a3b8", margin: 0 }}>
            ขอบคุณที่ใช้บริการ — เอกสารนี้ออกโดยระบบอัตโนมัติ
          </p>
        </div>
      </div>
    </>
  );
}
