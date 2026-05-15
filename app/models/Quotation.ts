import mongoose from "mongoose";

export type QuotationStatus = "sent" | "reviewing" | "completed";

const QuotationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    filename: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "reviewing", "completed"],
      default: "sent",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Quotation ||
  mongoose.model("Quotation", QuotationSchema);
