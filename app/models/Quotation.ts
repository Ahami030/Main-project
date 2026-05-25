import mongoose from "mongoose";

export type QuotationStatus = "sent" | "reviewing" | "completed" | "bargaining";

const QuotationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    filename: { type: String, required: true },
    pdfId:   { type: String, default: null },
    pdfPath: { type: String, default: null },
    status: {
      type: String,
      enum: ["sent", "reviewing", "completed", "bargaining"],
      default: "sent",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Quotation ||
  mongoose.model("Quotation", QuotationSchema);
