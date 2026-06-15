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

const addDays = (d: string | null | undefined, days: number) => {
  if (!d) return null;
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const CREDIT_DAYS = 30;

export default function BillingNoteDocument({ po }: BillingNoteProps) {
  const grand = po.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
  const dueDate = addDays(po.billedAt, CREDIT_DAYS);

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
          backgroundColor: "#ffffff",
          border: "1px solid #fecdd3",
          borderLeft: "6px solid #9f1239",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 10px rgba(159,18,57,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "44px", height: "44px",
              border: "2px dashed #fda4af",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fda4af", fontSize: "9px", textAlign: "center",
            }}>LOGO</div>
            <div>
              <p style={{ color: "#9f1239", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, fontWeight: 600 }}>บริษัท / Company</p>
              <p style={{ color: "#1e293b", fontSize: "16px", fontWeight: 700, margin: "2px 0 0" }}>หจก.แพร่สงวนพาณิชย์</p>
              <p style={{ color: "#64748b", fontSize: "10px", margin: "2px 0 0", lineHeight: "1.6" }}>
                38/10 ม.3 ต.ทุ่งกวาว อ.เมือง จ.แพร่ 54000
              </p>
              <p style={{ color: "#94a3b8", fontSize: "9.5px", margin: "1px 0 0" }}>
                โทร. 093-1625696 &nbsp;|&nbsp; เลขภาษี: 0543543000476
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#9f1239", fontSize: "22px", fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>ใบวางบิล</p>
            <div style={{
              display: "inline-block",
              backgroundColor: "#9f1239",
              color: "#ffffff",
              fontSize: "10px",
              letterSpacing: "0.2em",
              fontWeight: 600,
              borderRadius: "4px",
              padding: "2px 8px",
              marginTop: "4px",
            }}>BILLING NOTE</div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px 16px", backgroundColor: "#f8fafc" }}>
            <p style={{ color: "#94a3b8", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 6px", fontWeight: 600 }}>เรียน / To</p>
            <p style={{ color: "#1e293b", fontWeight: 600, fontSize: "14px", margin: "0 0 3px" }}>{po.userName}</p>
            <p style={{ color: "#64748b", fontSize: "11px", margin: 0 }}>{po.userEmail}</p>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px 16px", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", gap: "5px" }}>
            {[
              { label: "เลขที่ใบวางบิล", value: billingRef },
              { label: "เลขที่ PO", value: displayPoNumbers.join(", ") || "-" },
              { label: "วันที่วางบิล", value: fmtDate(po.billedAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "#94a3b8" }}>{label}</span>
                <span style={{ color: "#1e293b", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div style={{
              borderTop: "1px dashed #fecdd3",
              marginTop: "3px",
              paddingTop: "7px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}>
              <span style={{ color: "#9f1239", fontSize: "11px", fontWeight: 600 }}>เครดิต {CREDIT_DAYS} วัน · ครบกำหนดชำระ</span>
              <span style={{ color: "#9f1239", fontSize: "13px", fontWeight: 700 }}>{fmtDate(dueDate)}</span>
            </div>
          </div>
        </div>

        {/* Invoice table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: "#9f1239", color: "#ffffff" }}>
              <th style={{ padding: "10px 8px", textAlign: "center", width: "6%", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #be123c" }}>ที่</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #be123c" }}>เลขที่ใบกำกับภาษี/ใบส่งของ</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "24%", fontWeight: 600, fontSize: "12px", borderRight: "1px solid #be123c" }}>วันที่</th>
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
            <tr style={{ backgroundColor: "#9f1239" }}>
              <td colSpan={3} style={{ padding: "11px 12px", color: "#ffffff", fontWeight: 700, fontSize: "13px" }}>
                ยอดรวมทั้งสิ้น
              </td>
              <td style={{ padding: "11px 12px", textAlign: "right", color: "#ffffff", fontWeight: 700, fontSize: "14px" }}>
                {fmt(grand)} ฿
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payment terms */}
        <div style={{
          backgroundColor: "#fdf2f4",
          border: "1px solid #fecdd3",
          borderRadius: "6px",
          padding: "10px 14px",
          marginBottom: "16px",
          fontSize: "11.5px",
          color: "#475569",
          lineHeight: "1.6",
        }}>
          <p style={{ margin: "0 0 2px", color: "#9f1239", fontWeight: 700 }}>
            เงื่อนไขการชำระเงิน: เครดิต {CREDIT_DAYS} วัน
          </p>
          <p style={{ margin: "0 0 2px" }}>
            เครดิต {CREDIT_DAYS} วัน หมายถึง ต้องชำระเงินให้เสร็จสิ้นภายใน {CREDIT_DAYS} วัน นับจากวันที่วางบิลนี้
          </p>
          <p style={{ margin: 0, fontWeight: 600, color: "#9f1239" }}>
            กำหนดชำระภายในวันที่ {fmtDate(dueDate)}
          </p>
        </div>

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "20px" }}>
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
