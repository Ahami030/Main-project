import mongoose from "mongoose";

// "processing" = n8n is still extracting the RFQ; flips to "sent" when the callback arrives.
// "failed" = n8n reported an error (OCR / locked PDF / Gemini) or never called back in time.
export type QuotationStatus = "processing" | "sent" | "reviewing" | "completed" | "bargaining" | "confirmed" | "failed";

const QuotationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    filename: { type: String, required: true },
    pdfId:   { type: String, default: null },
    pdfPath: { type: String, default: null },
    // same number sent to n8n — lets the callback target this exact upload, not every
    // processing quotation of the user
    rfqNumber:  { type: String, default: null },
    failReason: { type: String, default: null },
    status: {
      type: String,
      enum: ["processing", "sent", "reviewing", "completed", "bargaining", "confirmed", "failed"],
      default: "sent",
    },
  },
  { timestamps: true }
);

const Quotation = mongoose.models.Quotation || mongoose.model("Quotation", QuotationSchema);
export default Quotation;

// Safety net for when n8n dies without calling back (ngrok down, container stopped).
// ponytail: runs lazily on list reads, no cron — a quotation nobody looks at stays
// "processing" until someone opens a page; add a cron if that ever matters.
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
export function expireStuckQuotations(filter: Record<string, unknown> = {}) {
  return Quotation.updateMany(
    { ...filter, status: "processing", createdAt: { $lt: new Date(Date.now() - PROCESSING_TIMEOUT_MS) } },
    { status: "failed", failReason: "ระบบประมวลผลเอกสารไม่สำเร็จภายในเวลาที่กำหนด กรุณาอัปโหลดใหม่อีกครั้ง" }
  );
}
