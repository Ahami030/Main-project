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
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
};

export default function BillingNoteDocument({ po }: BillingNoteProps) {
  const grand = po.taxInvoices.reduce((s, inv) => s + inv.amount, 0);

  // Resolve display PO numbers: prefer poNumbers array, fall back to single poNumber
  const displayPoNumbers = po.poNumbers && po.poNumbers.length > 0
    ? po.poNumbers
    : po.poNumber
      ? [po.poNumber]
      : [];

  const billingRef = po.billingGroupId ?? displayPoNumbers[0] ?? "-";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        .bn-page { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; }
        @media print {
          body * { visibility: hidden !important; }
          #billing-note-print-area, #billing-note-print-area * { visibility: visible !important; }
          #billing-note-print-area {
            position: absolute !important;
            top: 0; left: 0; width: 100%;
          }
        }
      `}</style>

      <div
        id="billing-note-print-area"
        className="bn-page"
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
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
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
            <p style={{ color: "#ffffff", fontSize: "22px", fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>ใบวางบิล</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", letterSpacing: "0.2em", margin: "2px 0 0" }}>BILLING NOTE</p>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "10px 14px", backgroundColor: "#f8fafc" }}>
            <p style={{ color: "#94a3b8", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>เรียน / To</p>
            <p style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px", margin: "0 0 2px" }}>{po.userName}</p>
            <p style={{ color: "#64748b", fontSize: "11px", margin: 0 }}>{po.userEmail}</p>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "10px 14px", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { label: "เลขที่ใบวางบิล", value: billingRef },
              { label: "เลขที่ PO", value: displayPoNumbers.join(", ") || "-" },
              { label: "วันที่วางบิล", value: fmtDate(po.billedAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "#94a3b8", flexShrink: 0, marginRight: "8px" }}>{label}</span>
                <span style={{ color: "#1e293b", fontWeight: 500, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
              <th style={{ padding: "10px 8px", textAlign: "center", width: "6%", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #334155" }}>ที่</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #334155" }}>เลขที่ใบกำกับภาษี/ใบส่งของ</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "24%", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #334155" }}>วันที่</th>
              <th style={{ padding: "10px 12px", textAlign: "right", width: "22%", fontWeight: 600, fontSize: "12px" }}>จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {po.taxInvoices.map((inv, i) => (
              <tr key={inv._id ?? inv.ref ?? i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                <td style={{ padding: "9px 8px", textAlign: "center", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", color: "#64748b", fontSize: "12px" }}>
                  {i + 1}
                </td>
                <td style={{ padding: "9px 12px", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", color: "#1e293b", fontWeight: 500 }}>
                  {inv.invoiceNumber}
                </td>
                <td style={{ padding: "9px 12px", textAlign: "center", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", color: "#475569", fontSize: "12px" }}>
                  {inv.invoiceDate}
                </td>
                <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: "1px solid #f1f5f9", color: "#1e293b" }}>
                  {fmt(inv.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: "#1e293b" }}>
              <td colSpan={3} style={{ padding: "11px 12px", color: "#ffffff", fontWeight: 700, fontSize: "13px" }}>
                ยอดรวมทั้งสิ้น
              </td>
              <td style={{ padding: "11px 12px", textAlign: "right", color: "#ffffff", fontWeight: 700, fontSize: "14px" }}>
                {fmt(grand)} ฿
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "40px" }}>
          {[
            { role: "ผู้วางบิล / Biller", name: "หจก.แพร่สงวนพาณิชย์" },
            { role: "ผู้รับวางบิล / Receiver", name: po.userName },
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
      </div>
    </>
  );
}
