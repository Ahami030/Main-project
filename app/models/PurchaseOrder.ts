import mongoose from "mongoose";

export type POStatus = "pending" | "accepted" | "billed";

const TaxInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    invoiceDate:   { type: String, required: true },
    amount:        { type: Number, required: true },
  },
  { _id: true }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poNumber:     { type: String, unique: true },
    userId:       { type: String, required: true },
    userName:     { type: String, required: true },
    userEmail:    { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "billed"],
      default: "pending",
    },
    filePath:     { type: String, required: true },
    fileOrigName: { type: String, required: true },
    fileMimeType: { type: String, default: "" },
    taxInvoices:  { type: [TaxInvoiceSchema], default: [] },
    billedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

export async function generatePONumber(): Promise<string> {
  const PO = mongoose.models.PurchaseOrder ||
    mongoose.model("PurchaseOrder", PurchaseOrderSchema);
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await PO.findOne(
    { poNumber: { $regex: `^${prefix}` } },
    { poNumber: 1 }
  ).sort({ poNumber: -1 }).lean() as { poNumber?: string } | null;

  const lastNum = last?.poNumber
    ? parseInt(last.poNumber.replace(prefix, ""), 10)
    : 0;
  const next = String(lastNum + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

export default mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", PurchaseOrderSchema);
