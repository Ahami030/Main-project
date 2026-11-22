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

// A customer can have several quotations at once, so "the quotation of this RFQ" is the
// one with the same RFQ number. Quotations made before rfqNumber existed fall back to the
// customer's latest one without a number (the old one-job-per-customer behaviour).
export async function findQuotationForRfq(rfq: { rfq_number?: string | null; USER_ID?: string | null }) {
  if (rfq.rfq_number) {
    const exact = await Quotation.findOne({ rfqNumber: rfq.rfq_number });
    if (exact) return exact;
  }
  if (!rfq.USER_ID) return null;
  return Quotation.findOne({ userId: rfq.USER_ID, rfqNumber: null }).sort({ createdAt: -1 });
}

// Several jobs at once are fine, but cap the unfinished ones so a customer can't flood the
// staff queue by mashing upload. Checked in /api/rfq/upload (before n8n sees the file) and
// again in POST /api/quotation. Returns the Thai error message, or null when under the cap.
const MAX_OPEN_QUOTATIONS = 5;
export async function openQuotationLimitMessage(userId: string) {
  const open = await Quotation.countDocuments({ userId, status: { $in: ["processing", "sent", "reviewing"] } });
  return open >= MAX_OPEN_QUOTATIONS
    ? `มีเอกสารที่รอดำเนินการอยู่ ${open} รายการ (สูงสุด ${MAX_OPEN_QUOTATIONS}) กรุณารอให้ทีมงานดำเนินการก่อน`
    : null;
}

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
