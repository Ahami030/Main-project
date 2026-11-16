import mongoose from "mongoose";

// "processing" = n8n is still extracting the RFQ; flips to "sent" when the callback arrives
export type QuotationStatus = "processing" | "sent" | "reviewing" | "completed" | "bargaining" | "confirmed";

const QuotationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    filename: { type: String, required: true },
    pdfId:   { type: String, default: null },
    pdfPath: { type: String, default: null },
    status: {
      type: String,
      enum: ["processing", "sent", "reviewing", "completed", "bargaining", "confirmed"],
      default: "sent",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Quotation ||
  mongoose.model("Quotation", QuotationSchema);
